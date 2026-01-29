import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import * as path from 'path';
import { In, Repository } from 'typeorm';
import { File } from './entities/file.entity';
import { S3Service } from './s3.service';

@Injectable()
export class FilesService {
  constructor(
    @InjectRepository(File) private readonly repo: Repository<File>,
    private readonly s3: S3Service,
    private readonly config: ConfigService,
  ) { }

  private sanitizeFilename(name: string) {
    return name.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 180);
  }

  async upload(params: {
    file: Express.Multer.File;
    app: string;
    visibility: 'public' | 'private';
    tenantId?: string | null;
    ownerId?: string | null;
  }) {
    if (!params.file) throw new BadRequestException('file is required');

    const bucket = this.config.get('S3_BUCKET');
    const ext = path.extname(params.file.originalname || '');
    const base = this.sanitizeFilename(path.basename(params.file.originalname, ext));
    const filename = `${base}_${randomUUID()}${ext}`;

    const prefix = params.visibility === 'public' ? 'public' : 'private';
    const objectKey = `${prefix}/${params.app}/${filename}`;

    await this.s3.putObject({
      bucket,
      key: objectKey,
      body: params.file.buffer,
      contentType: params.file.mimetype || 'application/octet-stream',
    });

    const entity = this.repo.create({
      app: params.app,
      tenantId: params.tenantId ?? null,
      ownerId: params.ownerId ?? null,
      visibility: params.visibility,
      bucket,
      objectKey,
      originalName: params.file.originalname,
      mimeType: params.file.mimetype,
      size: params.file.size,
    });

    await this.repo.save(entity);

    return entity;
  }

  async getDownloadUrl(fileId: string) {
    const file = await this.repo.findOne({ where: { id: fileId } });
    if (!file) throw new NotFoundException('File not found');

    if (file.visibility === 'public') {
      const base = this.config.get('S3_PUBLIC_BASE_URL');
      return { url: `${base}/${file.objectKey}` };
    }

    const expires = Number(this.config.get('PRESIGN_EXPIRES_SECONDS') || 600);
    const url = await this.s3.presignGetUrl(file.bucket, file.objectKey, expires);
    return { url };
  }

  async getDownloadUrlsBatch(ids: string[]) {
    const cleanIds = Array.from(
      new Set(
        (ids || [])
          .filter((x) => typeof x === 'string')
          .map((x) => x.trim())
          .filter((x) => x.length > 0),
      ),
    ).slice(0, 1000);

    if (cleanIds.length === 0) return { urls: {} as Record<string, string> };

    const files = await this.repo.find({ where: { id: In(cleanIds) } });

    const expires = Number(this.config.get('PRESIGN_EXPIRES_SECONDS') || 600);
    const base = this.config.get('S3_PUBLIC_BASE_URL');

    const urlsEntries = await Promise.all(
      files.map(async (f) => {
        if (f.visibility === 'public') {
          return [f.id, `${base}/${f.objectKey}`] as const;
        }
        const url = await this.s3.presignGetUrl(f.bucket, f.objectKey, expires);
        return [f.id, url] as const;
      }),
    );

    const urls: Record<string, string> = {};
    for (const [id, url] of urlsEntries) urls[id] = url;

    return { urls };
  }

  async remove(fileId: string) {
    const file = await this.repo.findOne({ where: { id: fileId } });
    if (!file) throw new NotFoundException('File not found');

    await this.s3.deleteObject(file.bucket, file.objectKey);
    await this.repo.delete({ id: fileId });

    return { ok: true };
  }

  async list(app: string, tenantId?: string) {
    return this.repo.find({
      where: { app, tenantId: tenantId ?? null },
      order: { createdAt: 'DESC' },
      take: 200,
    });
  }
}
