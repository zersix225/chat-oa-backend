/**
 * e2e tests for pictures / files in chat (LINE + Facebook, receive + send).
 *
 * - Same global setup as src/main.ts; LINE SDK, Facebook Graph (HttpService)
 *   and downloads (global fetch) are stubbed. No real customer is messaged.
 * - Rows use the `e2e_media_` marker; rows and stored files are removed in
 *   afterAll.
 *
 * Run: npx env-cmd -- jest --config test/jest-e2e.json test/chat/media --runInBand --forceExit
 */
import {
  ClassSerializerInterceptor,
  INestApplication,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { useContainer } from 'class-validator';
import { DataSource } from 'typeorm';
import { of, throwError } from 'rxjs';
import request from 'supertest';
import { io, Socket } from 'socket.io-client';
import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';
import { HTTPFetchError, LineBotClient } from '@line/bot-sdk';
import sharp from 'sharp';

import { AppModule } from '@/app.module';
import validationOptions from '@/utils/validation-options';
import { ResolvePromisesInterceptor } from '@/utils/serializer.interceptor';
import { MailerService } from '@/mailer/mailer.service';

const RUN = Date.now().toString(36);
const LINE_USER = `e2e_media_line_${RUN}`;
const FB_USER = `e2e_media_fb_${RUN}`;
const ADMIN = { email: 'admin@example.com', password: 'secret' };

// 1x1 PNG
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=',
  'base64',
);
const PDF = Buffer.from('%PDF-1.4\n%e2e\n');

// ---------- outbound stubs ----------
const lineContent = new Map<string, { body: Buffer; type: string } | Error>();
const lineClient = {
  getProfile: jest.fn((userId: string) =>
    Promise.resolve({ userId, displayName: `E2E Media ${userId}` }),
  ),
  replyMessage: jest.fn(() => Promise.resolve({})),
  pushMessage: jest.fn<Promise<object>, [unknown]>(() => Promise.resolve({})),
  getMessageContentTranscodingByMessageId: jest.fn(() =>
    Promise.resolve({ status: 'succeeded' }),
  ),
  getMessageContentWithHttpInfo: jest.fn((messageId: string) => {
    const c = lineContent.get(messageId);
    if (!c) return Promise.reject(new Error('not found'));
    if (c instanceof Error) return Promise.reject(c);
    return Promise.resolve({
      body: Readable.from([c.body]),
      httpResponse: new Response(null, {
        headers: { 'content-type': c.type },
      }),
    });
  }),
};
jest
  .spyOn(LineBotClient, 'fromChannelAccessToken')
  .mockReturnValue(lineClient as unknown as LineBotClient);

const httpService = {
  get: jest.fn(() =>
    of({
      data: {
        id: FB_USER,
        first_name: 'E2E',
        last_name: 'Media',
        profile_pic: 'https://example.com/fb.png',
      },
    }),
  ),
  post: jest.fn<unknown, [string, unknown]>(() =>
    of({ data: { recipient_id: FB_USER, message_id: 'm' } }),
  ),
};
const mailer = { sendMail: jest.fn(() => Promise.resolve(undefined)) };

// Downloads of Facebook attachment URLs.
const realFetch = global.fetch;
const fetchSpy = jest
  .spyOn(global, 'fetch')
  .mockImplementation((input: string | URL | Request, init?: RequestInit) => {
    const url = input instanceof Request ? input.url : input.toString();
    if (url.startsWith('https://cdn.fb.example/')) {
      return Promise.resolve(
        new Response(new Uint8Array(PNG), {
          headers: { 'content-type': 'image/png' },
        }),
      );
    }
    return realFetch(input, init);
  });

// ---------- helpers ----------
let app: INestApplication;
let baseUrl: string;
let ds: DataSource;
let adminToken: string;
let adminId: number;
let backendDomain: string;
const uploadedFileIds: string[] = [];
// Files the server creates on its own (LINE previews / converted images).
const generatedPaths: string[] = [];

/** '/api/v1/files/x.jpg' from a full URL sent to LINE. */
const pathOf = (url: string) => new URL(url).pathname;

const api = (p: string) => `/api/v1${p}`;

function lineMessageEvent(userId: string, message: Record<string, unknown>) {
  return {
    destination: 'Uxxxx',
    events: [
      {
        type: 'message',
        mode: 'active',
        timestamp: Date.now(),
        source: { type: 'user', userId },
        webhookEventId: randomUUID(),
        deliveryContext: { isRedelivery: false },
        replyToken: randomUUID(),
        message: { quoteToken: 'q', ...message },
      },
    ],
  };
}

async function conversationIdFor(customerId: string): Promise<string> {
  const rows = await ds.query(
    `SELECT cv.id FROM conversations cv JOIN contact c ON c.id = cv."contactId"
     WHERE c."customerId" = $1`,
    [customerId],
  );
  return rows[0]?.id;
}

async function latestMessage(conversationId: string) {
  const rows = await ds.query(
    `SELECT m.*, f.path AS "filePath" FROM message m
     LEFT JOIN file f ON f.id = m."fileId"
     WHERE m."conversationId" = $1 ORDER BY m.timestamp DESC, m.ctid DESC LIMIT 1`,
    [conversationId],
  );
  return rows[0];
}

function localFile(filePath: string) {
  return path.join(process.cwd(), 'files', path.basename(filePath));
}

async function upload(buffer: Buffer, name: string) {
  const res = await request(app.getHttpServer())
    .post(api('/files/upload'))
    .auth(adminToken, { type: 'bearer' })
    .attach('file', buffer, name);
  if (res.body?.file?.id) uploadedFileIds.push(res.body.file.id);
  return res;
}

// ---------- lifecycle ----------
beforeAll(async () => {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(HttpService)
    .useValue(httpService)
    .overrideProvider(MailerService)
    .useValue(mailer)
    .compile();

  app = moduleRef.createNestApplication({ cors: true });
  useContainer(app.select(AppModule), { fallbackOnErrors: true });
  app.setGlobalPrefix('api', { exclude: ['/'] });
  app.enableVersioning({ type: VersioningType.URI });
  app.useGlobalPipes(new ValidationPipe(validationOptions));
  app.useGlobalInterceptors(
    new ResolvePromisesInterceptor(),
    new ClassSerializerInterceptor(app.get(Reflector)),
  );
  await app.listen(0);
  baseUrl = `http://127.0.0.1:${app.getHttpServer().address().port}`;
  ds = app.get(DataSource);
  backendDomain = process.env.BACKEND_DOMAIN ?? '';

  const res = await request(app.getHttpServer())
    .post(api('/auth/email/login'))
    .send(ADMIN);
  adminToken = res.body.token;
  adminId = Number(res.body.user.id);
}, 60000);

afterAll(async () => {
  fetchSpy.mockRestore();
  if (ds?.isInitialized) {
    const convs = `SELECT cv.id FROM conversations cv JOIN contact c ON c.id = cv."contactId" WHERE c."customerId" LIKE 'e2e\\_media\\_%'`;
    const msgFiles: { fileId: string }[] = await ds.query(
      `SELECT DISTINCT "fileId" FROM message WHERE "conversationId" IN (${convs}) AND "fileId" IS NOT NULL`,
    );
    const fileIds = [
      ...new Set([...uploadedFileIds, ...msgFiles.map((r) => r.fileId)]),
    ];
    await ds.query(
      `UPDATE conversations SET "lastMessageId" = NULL WHERE id IN (${convs})`,
    );
    await ds.query(`DELETE FROM message WHERE "conversationId" IN (${convs})`);
    await ds.query(`DELETE FROM conversations WHERE id IN (${convs})`);
    await ds.query(
      `DELETE FROM contact WHERE "customerId" LIKE 'e2e\\_media\\_%'`,
    );
    if (generatedPaths.length) {
      for (const p of generatedPaths) {
        if (fs.existsSync(localFile(p))) fs.unlinkSync(localFile(p));
      }
      await ds.query(`DELETE FROM file WHERE path = ANY($1)`, [generatedPaths]);
    }
    if (fileIds.length) {
      const files: { path: string }[] = await ds.query(
        `SELECT path FROM file WHERE id = ANY($1)`,
        [fileIds],
      );
      for (const f of files) {
        if (fs.existsSync(localFile(f.path))) fs.unlinkSync(localFile(f.path));
      }
      await ds.query(`DELETE FROM file WHERE id = ANY($1)`, [fileIds]);
    }
  }
  await app?.close();
});

// =====================================================================
describe('Uploads – allowed types', () => {
  it('should pass – PDF upload is accepted', async () => {
    const res = await upload(PDF, 'e2e.pdf');
    expect(res.status).toBe(201);
    expect(res.body.file.path).toMatch(/\.pdf$/);
  });

  it('should pass – .exe upload is rejected with 422', async () => {
    const res = await upload(Buffer.from('MZ'), 'e2e.exe');
    expect(res.status).toBe(422);
  });
});

describe('LINE – customer sends media', () => {
  it('should pass – image is downloaded, stored and linked to the message', async () => {
    const id = `img-${RUN}`;
    lineContent.set(id, { body: PNG, type: 'image/png' });
    const res = await request(app.getHttpServer())
      .post('/api/webhooks/line')
      .send(
        lineMessageEvent(LINE_USER, {
          id,
          type: 'image',
          contentProvider: { type: 'line' },
        }),
      );
    expect(res.status).toBe(200);

    const msg = await latestMessage(await conversationIdFor(LINE_USER));
    expect(msg.messageType).toBe('image');
    expect(msg.fileId).toBeTruthy();
    expect(msg.filePath).toMatch(/\.png$/);
    expect(fs.readFileSync(localFile(msg.filePath))).toEqual(PNG);
  });

  it('should pass – GET /messages/:conversationId returns file with full URL', async () => {
    const convId = await conversationIdFor(LINE_USER);
    const res = await request(app.getHttpServer()).get(
      api(`/messages/${convId}`),
    );
    expect(res.status).toBe(200);
    const image = res.body.massages.find(
      (m: { messageType: string }) => m.messageType === 'image',
    );
    expect(image.file.path).toMatch(
      new RegExp(`^${backendDomain}/api/v1/files/.+\\.png$`),
    );
  });

  it('should pass – GET /conversations/:id and list return file with full URL', async () => {
    const convId = await conversationIdFor(LINE_USER);
    const one = await request(app.getHttpServer())
      .get(api(`/conversations/${convId}`))
      .auth(adminToken, { type: 'bearer' });
    expect(one.status).toBe(200);
    const image = one.body.messages.find(
      (m: { messageType: string }) => m.messageType === 'image',
    );
    expect(image.conversationId).toBe(convId);
    expect(image.file.path).toMatch(
      new RegExp(`^${backendDomain}/api/v1/files/.+\\.png$`),
    );

    const list = await request(app.getHttpServer())
      .get(api('/conversations'))
      .query({ limit: 50 })
      .auth(adminToken, { type: 'bearer' });
    expect(list.status).toBe(200);
    const conv = list.body.data.find((c: { id: string }) => c.id === convId);
    expect(conv.lastMessage.messageType).toBe('image');
    expect(conv.lastMessage.file.path).toMatch(
      new RegExp(`^${backendDomain}/api/v1/files/`),
    );
  });

  it('should pass – file keeps its original name in content', async () => {
    const id = `file-${RUN}`;
    lineContent.set(id, { body: PDF, type: 'application/pdf' });
    await request(app.getHttpServer())
      .post('/api/webhooks/line')
      .send(
        lineMessageEvent(LINE_USER, {
          id,
          type: 'file',
          fileName: 'quotation.pdf',
          fileSize: PDF.length,
        }),
      )
      .expect(200);

    const msg = await latestMessage(await conversationIdFor(LINE_USER));
    expect(msg.messageType).toBe('file');
    expect(msg.content).toBe('quotation.pdf');
    expect(msg.filePath).toMatch(/\.pdf$/);
  });

  it('should pass – video waits for LINE transcoding, then is stored', async () => {
    const id = `vid-${RUN}`;
    lineContent.set(id, { body: Buffer.from('fake-mp4'), type: 'video/mp4' });
    await request(app.getHttpServer())
      .post('/api/webhooks/line')
      .send(
        lineMessageEvent(LINE_USER, {
          id,
          type: 'video',
          duration: 1000,
          contentProvider: { type: 'line' },
        }),
      )
      .expect(200);

    expect(
      lineClient.getMessageContentTranscodingByMessageId,
    ).toHaveBeenCalledWith(id);
    const msg = await latestMessage(await conversationIdFor(LINE_USER));
    expect(msg.messageType).toBe('video');
    expect(msg.filePath).toMatch(/\.mp4$/);
  });

  it('should pass – sticker is saved with its image URL, no file', async () => {
    await request(app.getHttpServer())
      .post('/api/webhooks/line')
      .send(
        lineMessageEvent(LINE_USER, {
          id: `stk-${RUN}`,
          type: 'sticker',
          packageId: '446',
          stickerId: '1988',
          stickerResourceType: 'STATIC',
        }),
      )
      .expect(200);

    const msg = await latestMessage(await conversationIdFor(LINE_USER));
    expect(msg.messageType).toBe('sticker');
    expect(msg.fileId).toBeNull();
    expect(msg.content).toBe(
      'https://stickershop.line-scdn.net/stickershop/v1/sticker/1988/android/sticker.png',
    );
  });

  it('should pass – download failure still saves the message (without file)', async () => {
    const id = `broken-${RUN}`;
    lineContent.set(id, new Error('LINE 500'));
    await request(app.getHttpServer())
      .post('/api/webhooks/line')
      .send(
        lineMessageEvent(LINE_USER, {
          id,
          type: 'image',
          contentProvider: { type: 'line' },
        }),
      )
      .expect(200);

    const msg = await latestMessage(await conversationIdFor(LINE_USER));
    expect(msg.messageType).toBe('image');
    expect(msg.fileId).toBeNull();
  });
});

describe('LINE – admin sends files', () => {
  it('should pass – push with fileId sends an image message and stores it', async () => {
    const up = await upload(PNG, 'e2e.png');
    const convId = await conversationIdFor(LINE_USER);
    lineClient.pushMessage.mockClear();

    const res = await request(app.getHttpServer())
      .post('/api/webhooks/line/push')
      .send({
        customerId: LINE_USER,
        message: 'here is the picture',
        fileId: up.body.file.id,
        fileName: 'shop-photo.png',
        adminId,
        conversationId: convId,
      });
    expect(res.status).toBe(200);

    const sent = lineClient.pushMessage.mock.calls[0][0] as {
      messages: {
        type: string;
        originalContentUrl: string;
        previewImageUrl: string;
      }[];
    };
    expect(sent.messages.map((m) => m.type)).toEqual(['text', 'image']);
    // LINE gets the public domain (e.g. ngrok); the frontend gets BACKEND_DOMAIN.
    const publicDomain = process.env.PUBLIC_BACKEND_DOMAIN || backendDomain;
    // PNG under 10 MB is sent as is.
    expect(sent.messages[1].originalContentUrl).toBe(
      publicDomain + up.body.file.path.slice(backendDomain.length),
    );
    // Separate small JPEG preview (LINE limit 1 MB).
    const preview = sent.messages[1].previewImageUrl;
    expect(preview.startsWith(publicDomain)).toBe(true);
    expect(preview).toMatch(/\.jpg$/);
    generatedPaths.push(pathOf(preview));
    const previewBytes = fs.readFileSync(localFile(pathOf(preview)));
    expect(previewBytes.length).toBeLessThan(1024 * 1024);

    const msg = await latestMessage(convId);
    expect(msg.messageType).toBe('image');
    expect(msg.senderType).toBe('admin');
    expect(msg.content).toBe('shop-photo.png');
    expect(msg.fileId).toBe(up.body.file.id);
  });

  it('should pass – GIF is converted to JPEG for LINE (JPEG/PNG only)', async () => {
    const gif = await sharp({
      create: { width: 40, height: 30, channels: 3, background: '#3366cc' },
    })
      .gif()
      .toBuffer();
    const up = await upload(gif, 'e2e.gif');
    lineClient.pushMessage.mockClear();

    const res = await request(app.getHttpServer())
      .post('/api/webhooks/line/push')
      .send({
        customerId: LINE_USER,
        fileId: up.body.file.id,
        adminId,
        conversationId: await conversationIdFor(LINE_USER),
      });
    expect(res.status).toBe(200);

    const image = (
      lineClient.pushMessage.mock.calls[0][0] as {
        messages: { originalContentUrl: string; previewImageUrl: string }[];
      }
    ).messages[0];
    expect(image.originalContentUrl).toMatch(/\.jpg$/);
    generatedPaths.push(
      pathOf(image.originalContentUrl),
      pathOf(image.previewImageUrl),
    );
    const meta = await sharp(
      fs.readFileSync(localFile(pathOf(image.originalContentUrl))),
    ).metadata();
    expect(meta.format).toBe('jpeg');
  });

  it('should pass – PDF is sent as a download link and stored as a file message', async () => {
    const up = await upload(PDF, 'e2e.pdf');
    const convId = await conversationIdFor(LINE_USER);
    lineClient.pushMessage.mockClear();

    const res = await request(app.getHttpServer())
      .post('/api/webhooks/line/push')
      .send({
        customerId: LINE_USER,
        fileId: up.body.file.id,
        fileName: 'quotation.pdf',
        adminId,
        conversationId: convId,
      });
    expect(res.status).toBe(200);

    const publicDomain = process.env.PUBLIC_BACKEND_DOMAIN || backendDomain;
    const sent = lineClient.pushMessage.mock.calls[0][0] as {
      messages: { type: string; text: string }[];
    };
    expect(sent.messages).toEqual([
      {
        type: 'text',
        text: `📎 quotation.pdf\n${publicDomain}${up.body.file.path.slice(backendDomain.length)}`,
      },
    ]);

    const msg = await latestMessage(convId);
    expect(msg.messageType).toBe('file');
    expect(msg.content).toBe('quotation.pdf');
    expect(msg.fileId).toBe(up.body.file.id);
  });

  it('should pass – push with unknown fileId → 404', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/webhooks/line/push')
      .send({
        customerId: LINE_USER,
        fileId: randomUUID(),
        adminId,
        conversationId: await conversationIdFor(LINE_USER),
      });
    expect(res.status).toBe(404);
  });

  it('should pass – push with neither message nor fileId → 422', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/webhooks/line/push')
      .send({
        customerId: LINE_USER,
        adminId,
        conversationId: await conversationIdFor(LINE_USER),
      });
    expect(res.status).toBe(422);
  });
});

describe('Facebook – media', () => {
  it('should pass – image attachment is downloaded and stored', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/webhooks/facebook')
      .send({
        object: 'page',
        entry: [
          {
            id: 'PAGE',
            time: Date.now(),
            messaging: [
              {
                sender: { id: FB_USER },
                recipient: { id: 'PAGE' },
                timestamp: Date.now(),
                message: {
                  mid: 'mid.media',
                  attachments: [
                    {
                      type: 'image',
                      payload: { url: 'https://cdn.fb.example/photo.png?x=1' },
                    },
                  ],
                },
              },
            ],
          },
        ],
      });
    expect(res.status).toBe(200);

    const msg = await latestMessage(await conversationIdFor(FB_USER));
    expect(msg.messageType).toBe('image');
    expect(msg.filePath).toMatch(/\.png$/);
    expect(fs.readFileSync(localFile(msg.filePath))).toEqual(PNG);
  });

  it('should pass – push with a PDF sends a file attachment and stores it', async () => {
    const up = await upload(PDF, 'e2e.pdf');
    const convId = await conversationIdFor(FB_USER);
    httpService.post.mockClear();

    const res = await request(app.getHttpServer())
      .post('/api/webhooks/facebook/push')
      .send({
        recipient: { id: FB_USER },
        messaging_type: 'RESPONSE',
        fileId: up.body.file.id,
        adminId,
        conversationId: convId,
      });
    expect(res.status).toBe(200);

    const body = httpService.post.mock.calls[0][1] as {
      recipient: { id: string };
      message: { attachment: { type: string; payload: { url: string } } };
    };
    expect(body.recipient.id).toBe(FB_USER);
    expect(body.message.attachment.type).toBe('file');
    expect(body.message.attachment.payload.url).toMatch(/\.pdf$/);

    const msg = await latestMessage(convId);
    expect(msg.messageType).toBe('file');
    expect(msg.fileId).toBe(up.body.file.id);
  });
});

describe('Platform rejects the message', () => {
  it("should pass – Facebook error → 502 with Facebook's reason", async () => {
    const up = await upload(PDF, 'e2e.pdf');
    httpService.post.mockReturnValueOnce(
      throwError(() =>
        Object.assign(new Error('Request failed with status code 400'), {
          response: {
            data: { error: { message: '(#100) Upload attachment failure.' } },
          },
        }),
      ),
    );
    const res = await request(app.getHttpServer())
      .post('/api/webhooks/facebook/push')
      .send({
        recipient: { id: FB_USER },
        messaging_type: 'RESPONSE',
        fileId: up.body.file.id,
        adminId,
        conversationId: await conversationIdFor(FB_USER),
      });
    expect(res.status).toBe(502);
    expect(res.body.message).toBe(
      'Facebook rejected the message: (#100) Upload attachment failure.',
    );
  });

  it("should pass – LINE error → 502 with LINE's reason", async () => {
    lineClient.pushMessage.mockRejectedValueOnce(
      new HTTPFetchError('Bad Request', {
        status: 400,
        statusText: 'Bad Request',
        headers: new Headers(),
        body: JSON.stringify({
          message: 'The request body has 1 error(s)',
          details: [
            {
              message: 'Must be a valid HTTPS URL',
              property: 'messages[0].originalContentUrl',
            },
          ],
        }),
      }),
    );
    const res = await request(app.getHttpServer())
      .post('/api/webhooks/line/push')
      .send({
        customerId: LINE_USER,
        message: 'will fail',
        adminId,
        conversationId: await conversationIdFor(LINE_USER),
      });
    expect(res.status).toBe(502);
    expect(res.body.message).toBe(
      'LINE rejected the message: The request body has 1 error(s) – messages[0].originalContentUrl Must be a valid HTTPS URL',
    );
  });
});

describe('WebSocket – media in new-message', () => {
  let socket: Socket;
  afterAll(() => socket?.close());

  it('should pass – new-message carries messageType and full file URL', async () => {
    socket = io(baseUrl, {
      transports: ['websocket'],
      auth: { token: adminToken },
      reconnection: false,
      forceNew: true,
    });
    await new Promise<void>((resolve, reject) => {
      socket.on('connect', () => resolve());
      socket.on('connect_error', reject);
    });

    const id = `ws-img-${RUN}`;
    lineContent.set(id, { body: PNG, type: 'image/png' });
    const received = new Promise<any>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('timeout')), 4000);
      socket.on('new-message', (m) => {
        if (m.messageType !== 'image' || !m.file) return;
        clearTimeout(timer);
        resolve(m);
      });
    });

    await request(app.getHttpServer())
      .post('/api/webhooks/line')
      .send(
        lineMessageEvent(LINE_USER, {
          id,
          type: 'image',
          contentProvider: { type: 'line' },
        }),
      )
      .expect(200);

    const m = await received;
    expect(m.conversationId).toBe(await conversationIdFor(LINE_USER));
    expect(m.file.path).toMatch(
      new RegExp(`^${backendDomain}/api/v1/files/.+\\.png$`),
    );
  });
});
