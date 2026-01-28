import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class S3Service {
  private readonly client: S3Client;

  constructor(private readonly config: ConfigService) {
    this.client = new S3Client({
      region: this.config.get('S3_REGION') || 'us-east-1',
      endpoint: this.config.get('S3_ENDPOINT'),
      forcePathStyle: true,
      credentials: {
        accessKeyId: this.config.get('S3_ACCESS_KEY'),
        secretAccessKey: this.config.get('S3_SECRET_KEY'),
      },
    });
  }

  async putObject(params: { bucket: string; key: string; body: Buffer; contentType: string }) {
    const cmd = new PutObjectCommand({
      Bucket: params.bucket,
      Key: params.key,
      Body: params.body,
      ContentType: params.contentType,
    });
    await this.client.send(cmd);
  }

  async deleteObject(bucket: string, key: string) {
    await this.client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  }

  async presignGetUrl(bucket: string, key: string, expiresSeconds: number) {
    const cmd = new GetObjectCommand({ Bucket: bucket, Key: key });
    return getSignedUrl(this.client, cmd, { expiresIn: expiresSeconds });
  }
}
