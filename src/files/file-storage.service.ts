import { Injectable, PayloadTooLargeException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomStringGenerator } from '@nestjs/common/utils/random-string-generator.util';
import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { Readable } from 'node:stream';
import { AllConfigType } from '@/config/config.type';
import { FileDriver } from './config/file-config.type';
import { FileRepository } from './infrastructure/persistence/file.repository';
import { FileType } from './domain/file';
import {
  extensionFromMime,
  getExtension,
  mimeFromExtension,
} from './file-types';

const LOCAL_DIR = './files';

export type StoreFileInput = {
  buffer: Buffer;
  /** Original name, used for the extension when the content type is unknown. */
  fileName?: string | null;
  contentType?: string | null;
};

/**
 * Stores files the server itself fetches (e.g. media sent to LINE / Facebook)
 * using the same driver as uploads, and builds public URLs for stored files.
 */
@Injectable()
export class FileStorageService {
  private s3?: S3Client;

  constructor(
    private readonly configService: ConfigService<AllConfigType>,
    private readonly fileRepository: FileRepository,
  ) {}

  get maxFileSize(): number {
    return this.configService.get('file.maxFileSize', { infer: true }) ?? 0;
  }

  private get driver(): FileDriver {
    return (
      this.configService.get('file.driver', { infer: true }) ?? FileDriver.LOCAL
    );
  }

  private getS3(): S3Client {
    this.s3 ??= new S3Client({
      region: this.configService.get('file.awsS3Region', { infer: true }),
      credentials: {
        accessKeyId: this.configService.getOrThrow('file.accessKeyId', {
          infer: true,
        }),
        secretAccessKey: this.configService.getOrThrow('file.secretAccessKey', {
          infer: true,
        }),
      },
    });
    return this.s3;
  }

  async store(input: StoreFileInput): Promise<FileType> {
    if (input.buffer.length > this.maxFileSize) {
      throw new PayloadTooLargeException('File too large');
    }

    const ext =
      extensionFromMime(input.contentType) ??
      (input.fileName ? getExtension(input.fileName) : '');
    const name = ext
      ? `${randomStringGenerator()}.${ext}`
      : randomStringGenerator();

    if (this.driver === FileDriver.LOCAL) {
      await mkdir(LOCAL_DIR, { recursive: true });
      await writeFile(join(LOCAL_DIR, name), input.buffer);
      const apiPrefix = this.configService.get('app.apiPrefix', {
        infer: true,
      });
      // Same path format as FilesLocalService (multer writes "files/<name>").
      return this.fileRepository.create({
        path: `/${apiPrefix}/v1/files/${name}`,
      });
    }

    await this.getS3().send(
      new PutObjectCommand({
        Bucket: this.configService.getOrThrow('file.awsDefaultS3Bucket', {
          infer: true,
        }),
        Key: name,
        Body: input.buffer,
        ContentType: input.contentType ?? mimeFromExtension(ext),
      }),
    );
    return this.fileRepository.create({ path: name });
  }

  /** Download a URL (max `maxFileSize`) and store it. */
  async storeFromUrl(url: string, fileName?: string | null): Promise<FileType> {
    const res = await fetch(url);
    if (!res.ok || !res.body) {
      throw new Error(`Download failed (${res.status}) for ${url}`);
    }
    const length = Number(res.headers.get('content-length') ?? 0);
    if (length > this.maxFileSize) {
      throw new PayloadTooLargeException('File too large');
    }
    const buffer = await this.readLimited(
      Readable.fromWeb(res.body as Parameters<typeof Readable.fromWeb>[0]),
    );
    return this.store({
      buffer,
      fileName: fileName ?? new URL(url).pathname,
      contentType: res.headers.get('content-type'),
    });
  }

  /** Read a stream into memory, aborting once it exceeds `maxFileSize`. */
  async readLimited(stream: Readable): Promise<Buffer> {
    const chunks: Buffer[] = [];
    let size = 0;
    for await (const chunk of stream) {
      const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      size += buf.length;
      if (size > this.maxFileSize) {
        stream.destroy();
        throw new PayloadTooLargeException('File too large');
      }
      chunks.push(buf);
    }
    return Buffer.concat(chunks);
  }

  /**
   * Absolute URL that LINE / Facebook can fetch. For S3 this is a signed URL
   * valid for 1 hour (enough for the platform to download it).
   */
  async getPublicUrl(file: Pick<FileType, 'path'>): Promise<string> {
    if (this.driver === FileDriver.LOCAL) {
      // PUBLIC_BACKEND_DOMAIN (e.g. an ngrok https URL in dev) so LINE /
      // Facebook can fetch it; falls back to BACKEND_DOMAIN.
      const domain = this.configService.getOrThrow('app.publicBackendDomain', {
        infer: true,
      });
      return domain.replace(/\/+$/, '') + file.path;
    }
    return getSignedUrl(
      this.getS3(),
      new GetObjectCommand({
        Bucket: this.configService.getOrThrow('file.awsDefaultS3Bucket', {
          infer: true,
        }),
        Key: file.path,
      }),
      { expiresIn: 3600 },
    );
  }

  /** Read a stored file's bytes (any driver). */
  async read(file: Pick<FileType, 'path'>): Promise<Buffer> {
    if (this.driver === FileDriver.LOCAL) {
      return readFile(join(LOCAL_DIR, basename(file.path)));
    }
    const res = await this.getS3().send(
      new GetObjectCommand({
        Bucket: this.configService.getOrThrow('file.awsDefaultS3Bucket', {
          infer: true,
        }),
        Key: file.path,
      }),
    );
    if (!res.Body) throw new Error(`Empty S3 object ${file.path}`);
    return Buffer.from(await res.Body.transformToByteArray());
  }

  findById(id: string) {
    return this.fileRepository.findById(id);
  }
}
