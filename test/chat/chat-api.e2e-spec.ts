/**
 * In-process e2e tests for every HTTP route + the socket gateway.
 *
 * - Boots AppModule with the same global setup as src/main.ts.
 * - Outbound calls are stubbed: LINE SDK, Facebook Graph (HttpService), mailer.
 *   No real customer is ever messaged.
 * - Uses the DB from .env. All rows created here use `e2e_` / `e2e-` markers
 *   and are hard-deleted in afterAll.
 *
 * Run: npx env-cmd -- jest --config test/jest-e2e.json test/chat --runInBand --forceExit
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
import { of } from 'rxjs';
import request from 'supertest';
import { io, Socket } from 'socket.io-client';
import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';
import { LineBotClient } from '@line/bot-sdk';

import { AppModule } from '@/app.module';
import validationOptions from '@/utils/validation-options';
import { ResolvePromisesInterceptor } from '@/utils/serializer.interceptor';
import { MailerService } from '@/mailer/mailer.service';

const RUN = Date.now().toString(36);
const LINE_USER = `e2e_line_${RUN}`;
const FB_USER = `e2e_fb_${RUN}`;
const API_CONTACT = `e2e_api_${RUN}`;
const NEW_USER_EMAIL = `e2e-${RUN}@example.com`;
const ADMIN = { email: 'admin@example.com', password: 'secret' };
const STAFF = { email: 'john.doe@example.com', password: 'secret' };

// ---------- outbound stubs ----------
const lineClient = {
  getProfile: jest.fn((userId: string) =>
    Promise.resolve({
      userId,
      displayName: `E2E Line ${userId}`,
      pictureUrl: 'https://example.com/p.png',
    }),
  ),
  replyMessage: jest.fn(() => Promise.resolve({})),
  pushMessage: jest.fn(() => Promise.resolve({})),
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
        last_name: 'Facebook',
        profile_pic: 'https://example.com/fb.png',
      },
    }),
  ),
  post: jest.fn(() => of({ data: { recipient_id: FB_USER, message_id: 'm' } })),
};
const mailer = { sendMail: jest.fn(() => Promise.resolve(undefined)) };

// ---------- helpers ----------
let app: INestApplication;
let http: ReturnType<typeof request>;
let baseUrl: string;
let ds: DataSource;
let adminToken: string;
let staffToken: string;
let adminId: number;
let staffId: number;

const api = (p: string) => `/api/v1${p}`;

async function login(creds: { email: string; password: string }) {
  const res = await request(app.getHttpServer())
    .post(api('/auth/email/login'))
    .send(creds);
  expect(res.status).toBe(200);
  return res.body as {
    token: string;
    refreshToken: string;
    user: { id: number };
  };
}

function lineTextEvent(userId: string, text: string, ts = Date.now()) {
  return {
    destination: 'Uxxxx',
    events: [
      {
        type: 'message',
        mode: 'active',
        timestamp: ts,
        source: { type: 'user', userId },
        webhookEventId: randomUUID(),
        deliveryContext: { isRedelivery: false },
        replyToken: randomUUID(),
        message: { id: randomUUID(), type: 'text', quoteToken: 'q', text },
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

function connectSocket(token?: string): Socket {
  return io(baseUrl, {
    transports: ['websocket'],
    auth: token ? { token } : {},
    reconnection: false,
    forceNew: true,
  });
}

function waitFor<T = any>(
  socket: Socket,
  event: string,
  predicate: (data: T) => boolean = () => true,
  ms = 4000,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off(event, handler);
      reject(new Error(`timeout waiting for "${event}"`));
    }, ms);
    const handler = (data: T) => {
      if (!predicate(data)) return;
      clearTimeout(timer);
      socket.off(event, handler);
      resolve(data);
    };
    socket.on(event, handler);
  });
}

function notReceived(socket: Socket, event: string, ms = 600) {
  return new Promise<boolean>((resolve) => {
    const handler = () => {
      clearTimeout(timer);
      resolve(false);
    };
    const timer = setTimeout(() => {
      socket.off(event, handler);
      resolve(true);
    }, ms);
    socket.on(event, handler);
  });
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
  // same as src/main.ts
  useContainer(app.select(AppModule), { fallbackOnErrors: true });
  app.setGlobalPrefix('api', { exclude: ['/'] });
  app.enableVersioning({ type: VersioningType.URI });
  app.useGlobalPipes(new ValidationPipe(validationOptions));
  app.useGlobalInterceptors(
    new ResolvePromisesInterceptor(),
    new ClassSerializerInterceptor(app.get(Reflector)),
  );
  await app.listen(0); // random port, needed for socket.io
  const addr = app.getHttpServer().address();
  baseUrl = `http://127.0.0.1:${addr.port}`;
  http = request(app.getHttpServer());
  ds = app.get(DataSource);

  const a = await login(ADMIN);
  adminToken = a.token;
  adminId = Number(a.user.id);
  const s = await login(STAFF);
  staffToken = s.token;
  staffId = Number(s.user.id);
}, 60000);

afterAll(async () => {
  if (ds?.isInitialized) {
    const convs = `SELECT cv.id FROM conversations cv JOIN contact c ON c.id = cv."contactId" WHERE c."customerId" LIKE 'e2e\\_%'`;
    await ds.query(
      `UPDATE conversations SET "lastMessageId" = NULL WHERE id IN (${convs})`,
    );
    await ds.query(`DELETE FROM message WHERE "conversationId" IN (${convs})`);
    await ds.query(`DELETE FROM conversations WHERE id IN (${convs})`);
    await ds.query(`DELETE FROM contact WHERE "customerId" LIKE 'e2e\\_%'`);
    const users = `SELECT id FROM "user" WHERE email LIKE 'e2e-%@example.com' OR "firstName" = 'E2E-created'`;
    await ds.query(`DELETE FROM session WHERE "userId" IN (${users})`);
    await ds.query(`DELETE FROM "user" WHERE id IN (${users})`);
  }
  await app?.close();
});

// =====================================================================
describe('Home', () => {
  it('should pass – GET /', async () => {
    const res = await http.get('/');
    expect(res.status).toBe(200);
  });
});

// =====================================================================
describe('Auth (email)', () => {
  let token: string;
  let refreshToken: string;

  it('should pass – POST /auth/email/login – wrong password → 422', async () => {
    const res = await request(app.getHttpServer())
      .post(api('/auth/email/login'))
      .send({ email: ADMIN.email, password: 'wrong-pass' });
    expect(res.status).toBe(422);
  });

  it('should pass – POST /auth/email/register → 204 (sends confirm mail)', async () => {
    const res = await request(app.getHttpServer())
      .post(api('/auth/email/register'))
      .send({
        email: NEW_USER_EMAIL,
        password: 'secret123',
        firstName: 'E2E',
        lastName: 'User',
      });
    expect(res.status).toBe(204);
    expect(mailer.sendMail).toHaveBeenCalled();
  });

  it('should pass – POST /auth/email/register – invalid body → 422', async () => {
    const res = await request(app.getHttpServer())
      .post(api('/auth/email/register'))
      .send({ email: 'not-an-email' });
    expect(res.status).toBe(422);
  });

  it('should pass – POST /auth/email/login (new user) → 200', async () => {
    const r = await login({ email: NEW_USER_EMAIL, password: 'secret123' });
    token = r.token;
    refreshToken = r.refreshToken;
    expect(token).toBeTruthy();
  });

  it('should pass – GET /auth/me → 200 / no token → 401', async () => {
    const ok = await request(app.getHttpServer())
      .get(api('/auth/me'))
      .auth(token, { type: 'bearer' });
    expect(ok.status).toBe(200);
    expect(ok.body.email).toBe(NEW_USER_EMAIL);
    const no = await request(app.getHttpServer()).get(api('/auth/me'));
    expect(no.status).toBe(401);
  });

  it('should pass – PATCH /auth/me → 200', async () => {
    const res = await request(app.getHttpServer())
      .patch(api('/auth/me'))
      .auth(token, { type: 'bearer' })
      .send({ firstName: 'E2E-renamed' });
    expect(res.status).toBe(200);
    expect(res.body.firstName).toBe('E2E-renamed');
  });

  it('should pass – POST /auth/refresh → 200', async () => {
    const res = await request(app.getHttpServer())
      .post(api('/auth/refresh'))
      .auth(refreshToken, { type: 'bearer' });
    expect(res.status).toBe(200);
    token = res.body.token;
  });

  it('should pass – POST /auth/email/confirm – bad hash → 4xx', async () => {
    const res = await request(app.getHttpServer())
      .post(api('/auth/email/confirm'))
      .send({ hash: 'bad-hash' });
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
  });

  it('should pass – POST /auth/email/confirm/new – bad hash → 4xx', async () => {
    const res = await request(app.getHttpServer())
      .post(api('/auth/email/confirm/new'))
      .send({ hash: 'bad-hash' });
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
  });

  it('should pass – POST /auth/forgot/password → 204', async () => {
    const res = await request(app.getHttpServer())
      .post(api('/auth/forgot/password'))
      .send({ email: NEW_USER_EMAIL });
    expect(res.status).toBe(204);
  });

  it('should pass – POST /auth/reset/password – bad hash → 4xx', async () => {
    const res = await request(app.getHttpServer())
      .post(api('/auth/reset/password'))
      .send({ hash: 'bad-hash', password: 'secret456' });
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
  });

  it('should pass – POST /auth/logout → 204', async () => {
    const res = await request(app.getHttpServer())
      .post(api('/auth/logout'))
      .auth(token, { type: 'bearer' });
    expect(res.status).toBe(204);
  });

  it('should pass – DELETE /auth/me → 204', async () => {
    const r = await login({ email: NEW_USER_EMAIL, password: 'secret123' });
    const res = await request(app.getHttpServer())
      .delete(api('/auth/me'))
      .auth(r.token, { type: 'bearer' });
    expect(res.status).toBe(204);
  });
});

describe('Auth (social) – validation only, no external calls', () => {
  it.each(['facebook', 'google', 'apple'])(
    'should pass – POST /auth/%s/login – empty body → 422',
    async (provider) => {
      const res = await request(app.getHttpServer())
        .post(api(`/auth/${provider}/login`))
        .send({});
      expect(res.status).toBe(422);
    },
  );
});

// =====================================================================
describe('Users (admin only)', () => {
  let userId: number;

  it('should pass – GET /users as staff → 403', async () => {
    const res = await request(app.getHttpServer())
      .get(api('/users'))
      .auth(staffToken, { type: 'bearer' });
    expect(res.status).toBe(403);
  });

  it('should pass – POST /users → 201', async () => {
    const res = await request(app.getHttpServer())
      .post(api('/users'))
      .auth(adminToken, { type: 'bearer' })
      .send({
        email: `e2e-admin-created-${RUN}@example.com`,
        password: 'secret123',
        firstName: 'E2E-created',
        lastName: 'User',
        role: { id: 2 },
        status: { id: 1 },
      });
    expect(res.status).toBe(201);
    userId = res.body.id;
  });

  it('should pass – GET /users → 200', async () => {
    const res = await request(app.getHttpServer())
      .get(api('/users?page=1&limit=10'))
      .auth(adminToken, { type: 'bearer' });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('should pass – GET /users/:id → 200', async () => {
    const res = await request(app.getHttpServer())
      .get(api(`/users/${userId}`))
      .auth(adminToken, { type: 'bearer' });
    expect(res.status).toBe(200);
  });

  it('should pass – PATCH /users/:id → 200', async () => {
    const res = await request(app.getHttpServer())
      .patch(api(`/users/${userId}`))
      .auth(adminToken, { type: 'bearer' })
      .send({ lastName: 'Patched' });
    expect(res.status).toBe(200);
    expect(res.body.lastName).toBe('Patched');
  });

  it('should pass – DELETE /users/:id → 204', async () => {
    const res = await request(app.getHttpServer())
      .delete(api(`/users/${userId}`))
      .auth(adminToken, { type: 'bearer' });
    expect(res.status).toBe(204);
  });
});

// =====================================================================
describe('Files (local driver)', () => {
  let filePath: string | undefined;

  afterAll(() => {
    if (filePath) {
      const local = path.join(process.cwd(), 'files', path.basename(filePath));
      if (fs.existsSync(local)) fs.unlinkSync(local);
    }
  });

  it('should pass – POST /files/upload without token → 401', async () => {
    const res = await request(app.getHttpServer()).post(api('/files/upload'));
    expect(res.status).toBe(401);
  });

  it('should pass – POST /files/upload → 201, GET /files/:path → 200', async () => {
    // 1x1 PNG
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=',
      'base64',
    );
    const up = await request(app.getHttpServer())
      .post(api('/files/upload'))
      .auth(adminToken, { type: 'bearer' })
      .attach('file', png, 'e2e.png');
    expect(up.status).toBe(201);
    filePath = up.body.file?.path;
    expect(filePath).toBeTruthy();

    const name = path.basename(filePath!);
    const get = await request(app.getHttpServer()).get(api(`/files/${name}`));
    expect(get.status).toBe(200);
  });
});

// =====================================================================
describe('Webhooks – LINE (SDK stubbed)', () => {
  it('should pass – POST /webhooks/line with no events → 200', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/webhooks/line')
      .send({ destination: 'U', events: [] });
    expect(res.status).toBe(200);
  });

  it('should pass – POST /webhooks/line new customer → contact + conversation + message + welcome reply', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/webhooks/line')
      .send(lineTextEvent(LINE_USER, 'hello 1'));
    expect(res.status).toBe(200);
    expect(lineClient.getProfile).toHaveBeenCalledWith(LINE_USER);
    expect(lineClient.replyMessage).toHaveBeenCalled();

    const convId = await conversationIdFor(LINE_USER);
    expect(convId).toBeTruthy();
    const [{ count }] = await ds.query(
      `SELECT COUNT(*)::int AS count FROM message WHERE "conversationId" = $1`,
      [convId],
    );
    expect(count).toBe(1);
  });

  it('should pass – POST /webhooks/line/push → 200, message stored as admin', async () => {
    const convId = await conversationIdFor(LINE_USER);
    const res = await request(app.getHttpServer())
      .post('/api/webhooks/line/push')
      .send({
        customerId: LINE_USER,
        message: 'admin reply',
        adminId,
        conversationId: convId,
      });
    expect(res.status).toBe(200);
    expect(lineClient.pushMessage).toHaveBeenCalled();
    const rows = await ds.query(
      `SELECT "senderType" FROM message WHERE "conversationId" = $1 AND content = 'admin reply'`,
      [convId],
    );
    expect(rows[0]?.senderType).toBe('admin');
  });

  it('should pass – POST /webhooks/line/push – missing fields → 422', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/webhooks/line/push')
      .send({ message: 'x' });
    expect(res.status).toBe(422);
  });
});

describe('Webhooks – Facebook (Graph stubbed)', () => {
  it('should pass – POST /webhooks/facebook message → 200, contact+message stored', async () => {
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
                message: { mid: 'mid.1', text: 'hi from fb' },
              },
            ],
          },
        ],
      });
    expect(res.status).toBe(200);
    expect(await conversationIdFor(FB_USER)).toBeTruthy();
  });

  it('should pass – POST /webhooks/facebook/push → 200', async () => {
    const convId = await conversationIdFor(FB_USER);
    const res = await request(app.getHttpServer())
      .post('/api/webhooks/facebook/push')
      .send({
        recipient: { id: FB_USER },
        messaging_type: 'RESPONSE',
        message: { text: 'fb admin reply' },
        adminId,
        conversationId: convId,
      });
    expect(res.status).toBe(200);
    expect(httpService.post).toHaveBeenCalled();
  });
});

describe('Webhooks – TikTok', () => {
  it('should pass – POST /webhooks/tiktok → 200', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/webhooks/tiktok')
      .send({ hello: 'world' });
    expect(res.status).toBe(200);
  });
});

// =====================================================================
describe('Contacts', () => {
  let contactId: string;

  it('should pass – POST /contacts → 201 with contactPlatform saved', async () => {
    const res = await request(app.getHttpServer()).post(api('/contacts')).send({
      customerId: API_CONTACT,
      displayName: 'E2E API contact',
      contactPlatform: 'line',
    });
    expect(res.status).toBe(201);
    contactId = res.body.id;
  });

  it('should pass – GET /contacts – no token → 401, admin → 200', async () => {
    const no = await request(app.getHttpServer()).get(api('/contacts'));
    expect(no.status).toBe(401);
    const ok = await request(app.getHttpServer())
      .get(api('/contacts'))
      .auth(adminToken, { type: 'bearer' });
    expect(ok.status).toBe(200);
  });

  it('should pass – GET /contacts/:id → 200', async () => {
    const id =
      contactId ??
      (
        await ds.query(`SELECT id FROM contact WHERE "customerId" = $1`, [
          LINE_USER,
        ])
      )[0].id;
    const res = await request(app.getHttpServer()).get(api(`/contacts/${id}`));
    expect(res.status).toBe(200);
  });

  it('should pass – PATCH /contacts/:id → 200', async () => {
    const id =
      contactId ??
      (
        await ds.query(`SELECT id FROM contact WHERE "customerId" = $1`, [
          LINE_USER,
        ])
      )[0].id;
    const res = await request(app.getHttpServer())
      .patch(api(`/contacts/${id}`))
      .send({ displayName: 'E2E renamed' });
    expect(res.status).toBe(200);
    expect(res.body.displayName).toBe('E2E renamed');
  });
});

// =====================================================================
describe('Conversations + Messages', () => {
  let tempContactId: string;
  let tempConvId: string;

  beforeAll(async () => {
    // a bare contact (no conversation yet) for POST /conversations
    const rows = await ds.query(
      `INSERT INTO contact ("customerId","displayName","contactPlatform")
       VALUES ($1,'E2E temp','line') RETURNING id`,
      [`e2e_tmp_${RUN}`],
    );
    tempContactId = rows[0].id;
  });

  it('should pass – POST /conversations → 201', async () => {
    const res = await request(app.getHttpServer())
      .post(api('/conversations'))
      .send({ contactId: tempContactId });
    expect(res.status).toBe(201);
    tempConvId = res.body.id;
  });

  it('should pass – GET /conversations → 200 (paginated)', async () => {
    const res = await request(app.getHttpServer()).get(
      api('/conversations?page=1&limit=50'),
    );
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('should pass – GET /conversations/:id → 200 with messages', async () => {
    const convId = await conversationIdFor(LINE_USER);
    const res = await request(app.getHttpServer()).get(
      api(`/conversations/${convId}`),
    );
    expect(res.status).toBe(200);
    expect(res.body.messages?.length).toBeGreaterThan(0);
  });

  it('should pass – GET /conversations/:id unknown → 404', async () => {
    const res = await request(app.getHttpServer()).get(
      api(`/conversations/${randomUUID()}`),
    );
    expect(res.status).toBe(404);
  });

  it('should pass – PATCH /conversations/:id → 200', async () => {
    const convId = tempConvId ?? (await conversationIdFor(LINE_USER));
    const res = await request(app.getHttpServer())
      .patch(api(`/conversations/${convId}`))
      .send({});
    expect(res.status).toBe(200);
  });

  it('should pass – GET /messages/:conversationId → 200 and includes customer messages', async () => {
    const convId = await conversationIdFor(LINE_USER);
    const res = await request(app.getHttpServer()).get(
      api(`/messages/${convId}?page=1&limit=50`),
    );
    expect(res.status).toBe(200);
    const list = res.body.data ?? res.body.massages ?? [];
    expect(list.some((m: any) => m.senderType === 'user')).toBe(true);
  });

  it('should pass – DELETE /conversations/:id → 200', async () => {
    // POST /conversations may fail (see report); create one directly then.
    const convId =
      tempConvId ??
      (
        await ds.query(
          `INSERT INTO conversations ("contactId") VALUES ($1) RETURNING id`,
          [tempContactId],
        )
      )[0].id;
    const res = await request(app.getHttpServer()).delete(
      api(`/conversations/${convId}`),
    );
    expect(res.status).toBe(200);
  });
});

// =====================================================================
describe('Conversation reads (per admin)', () => {
  let convId: string;
  let firstMsgId: string;
  let latestMsgId: string;

  const unreadFor = async (token: string, id: string) => {
    const res = await request(app.getHttpServer())
      .get(api('/conversation-reads/unread'))
      .auth(token, { type: 'bearer' });
    expect(res.status).toBe(200);
    return (
      res.body.conversations.find((c: any) => c.conversationId === id)
        ?.unreadCount ?? 0
    );
  };

  beforeAll(async () => {
    convId = await conversationIdFor(LINE_USER);
    await request(app.getHttpServer())
      .post('/api/webhooks/line')
      .send(lineTextEvent(LINE_USER, 'hello 2', Date.now() + 1000));
    const msgs = await ds.query(
      `SELECT id FROM message WHERE "conversationId" = $1 AND "senderType" = 'user' ORDER BY timestamp ASC`,
      [convId],
    );
    firstMsgId = msgs[0].id;
    latestMsgId = msgs[msgs.length - 1].id;
  });

  it('should pass – no token → 401', async () => {
    const res = await request(app.getHttpServer()).get(
      api('/conversation-reads/unread'),
    );
    expect(res.status).toBe(401);
  });

  it('should pass – GET /conversation-reads/unread – customer msgs count, admin replies do not', async () => {
    expect(await unreadFor(adminToken, convId)).toBe(2);
  });

  it('should pass – POST /conversation-reads/:id → 200, admin unread becomes 0', async () => {
    const res = await request(app.getHttpServer())
      .post(api(`/conversation-reads/${convId}`))
      .auth(adminToken, { type: 'bearer' })
      .send({});
    expect(res.status).toBe(200);
    expect(res.body.userId).toBe(adminId);
    expect(await unreadFor(adminToken, convId)).toBe(0);
  });

  it('should pass – per admin: staff still sees 2 unread', async () => {
    expect(await unreadFor(staffToken, convId)).toBe(2);
  });

  it('should pass – POST with messageId → staff read up to first message → 1 unread', async () => {
    const res = await request(app.getHttpServer())
      .post(api(`/conversation-reads/${convId}`))
      .auth(staffToken, { type: 'bearer' })
      .send({ messageId: firstMsgId });
    expect(res.status).toBe(200);
    expect(await unreadFor(staffToken, convId)).toBe(1);
  });

  it('should pass – read pointer never moves backwards', async () => {
    await request(app.getHttpServer())
      .post(api(`/conversation-reads/${convId}`))
      .auth(adminToken, { type: 'bearer' })
      .send({ messageId: firstMsgId });
    const me = await request(app.getHttpServer())
      .get(api(`/conversation-reads/${convId}/me`))
      .auth(adminToken, { type: 'bearer' });
    expect(me.status).toBe(200);
    expect(me.body.lastReadMessageId).not.toBe(firstMsgId);
    expect(await unreadFor(adminToken, convId)).toBe(0);
  });

  it('should pass – GET /conversation-reads/:id/readers → both admins', async () => {
    const res = await request(app.getHttpServer())
      .get(api(`/conversation-reads/${convId}/readers`))
      .auth(adminToken, { type: 'bearer' });
    expect(res.status).toBe(200);
    const ids = res.body.map((r: any) => r.userId).sort();
    expect(ids).toEqual([adminId, staffId].sort());
    expect(res.body[0].user?.password).toBeUndefined();
  });

  it('should pass – new customer message makes it unread again', async () => {
    await request(app.getHttpServer())
      .post('/api/webhooks/line')
      .send(lineTextEvent(LINE_USER, 'hello 3', Date.now() + 2000));
    expect(await unreadFor(adminToken, convId)).toBe(1);
    expect(latestMsgId).toBeTruthy();
  });

  it('should pass – unknown messageId → 404, non-uuid conversationId → 400', async () => {
    const a = await request(app.getHttpServer())
      .post(api(`/conversation-reads/${convId}`))
      .auth(adminToken, { type: 'bearer' })
      .send({ messageId: randomUUID() });
    expect(a.status).toBe(404);
    const b = await request(app.getHttpServer())
      .post(api('/conversation-reads/not-a-uuid'))
      .auth(adminToken, { type: 'bearer' })
      .send({});
    expect(b.status).toBe(400);
  });
});

// =====================================================================
describe('WebSocket gateway', () => {
  const sockets: Socket[] = [];
  afterAll(() => sockets.forEach((s) => s.close()));

  it('should pass – rejects connection without token', async () => {
    const s = connectSocket();
    sockets.push(s);
    const err = await new Promise<Error>((resolve) =>
      s.on('connect_error', resolve),
    );
    expect(err.message).toBe('Unauthorized');
  });

  it('should pass – rejects connection with an invalid token', async () => {
    const s = connectSocket('garbage.token.value');
    sockets.push(s);
    const err = await new Promise<Error>((resolve) =>
      s.on('connect_error', resolve),
    );
    expect(err.message).toBe('Unauthorized');
  });

  it('should pass – accepts a valid token', async () => {
    const s = connectSocket(adminToken);
    sockets.push(s);
    await new Promise<void>((resolve, reject) => {
      s.on('connect', () => resolve());
      s.on('connect_error', reject);
    });
    expect(s.connected).toBe(true);
  });

  it('should pass – new-message is emitted AFTER save (has id + conversationId)', async () => {
    const s = sockets[2];
    const convId = await conversationIdFor(LINE_USER);
    const got = waitFor<any>(
      s,
      'new-message',
      (m) => m.content === 'socket test',
    );
    await request(app.getHttpServer())
      .post('/api/webhooks/line')
      .send(lineTextEvent(LINE_USER, 'socket test', Date.now() + 3000));
    const msg = await got;
    expect(msg.id).toMatch(/[0-9a-f-]{36}/);
    expect(msg.conversationId).toBe(convId);
    expect(msg.senderType).toBe('user');
  });

  it('should pass – conversation-read is emitted when an admin marks read', async () => {
    const s = sockets[2];
    const convId = await conversationIdFor(LINE_USER);
    const got = waitFor<any>(
      s,
      'conversation-read',
      (e) => e.conversationId === convId,
    );
    await request(app.getHttpServer())
      .post(api(`/conversation-reads/${convId}`))
      .auth(staffToken, { type: 'bearer' })
      .send({});
    const evt = await got;
    expect(evt.userId).toBe(staffId);
  });

  it('should pass – client-sent new-message is NOT re-broadcast (no spoofing)', async () => {
    const sender = sockets[2];
    const listener = connectSocket(staffToken);
    sockets.push(listener);
    await new Promise<void>((r) => listener.on('connect', () => r()));
    const silent = notReceived(listener, 'new-message');
    sender.emit('new-message', { content: 'fake', conversationId: 'x' });
    expect(await silent).toBe(true);
  });

  it('should pass – join/leave-conversation → conversation-viewers presence', async () => {
    const admin = sockets[2];
    const staff = sockets[3];
    const convId = await conversationIdFor(LINE_USER);

    const ack1 = await admin.emitWithAck('join-conversation', {
      conversationId: convId,
    });
    expect(ack1).toEqual({ ok: true });

    const both = waitFor<any>(
      admin,
      'conversation-viewers',
      (e) => e.conversationId === convId && e.userIds.length === 2,
    );
    await staff.emitWithAck('join-conversation', { conversationId: convId });
    expect((await both).userIds.sort()).toEqual([adminId, staffId].sort());

    const onlyAdmin = waitFor<any>(
      admin,
      'conversation-viewers',
      (e) => e.conversationId === convId && e.userIds.length === 1,
    );
    staff.close(); // disconnect should also update presence
    expect((await onlyAdmin).userIds).toEqual([adminId]);

    const left = await admin.emitWithAck('leave-conversation', {
      conversationId: convId,
    });
    expect(left).toEqual({ ok: true });
  });

  it('should pass – join-conversation without id → { ok: false }', async () => {
    const ack = await sockets[2].emitWithAck('join-conversation', {});
    expect(ack).toEqual({ ok: false });
  });
});

// =====================================================================
// Runs LAST on purpose: with the global ResolvePromisesInterceptor (main.ts),
// this handler returns the Express `res`, and the interceptor deep-walks the
// whole req/socket/server graph, stalling the event loop (it breaks socket
// handshakes for later tests). See report.
describe('Webhooks – Facebook verify (GET)', () => {
  it('should pass – GET /webhooks/facebook verify – right token → 200 challenge', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/webhooks/facebook')
      .query({
        'hub.mode': 'subscribe',
        'hub.verify_token': 'PCM_BOT',
        'hub.challenge': 'abc123',
      });
    expect(res.status).toBe(200);
    expect(res.text).toBe('abc123');
  });

  it('should pass – GET /webhooks/facebook verify – wrong token → 403', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/webhooks/facebook')
      .query({
        'hub.mode': 'subscribe',
        'hub.verify_token': 'nope',
        'hub.challenge': 'abc123',
      });
    expect(res.status).toBe(403);
  });

  it('should pass – GET /webhooks/facebook without query → responds (4xx), does not hang', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/webhooks/facebook')
      .timeout(2000)
      .then(
        (r) => r,
        (e: Error) => ({ status: 0, error: e.message }),
      );
    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});
