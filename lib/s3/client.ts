/**
 * AWS S3 Client for Resume Storage
 * Handles file uploads with KMS encryption
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  type PutObjectCommandInput,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { nanoid } from 'nanoid';

const isLocalS3 = process.env.AWS_S3_LOCAL === 'true';
const region = process.env.AWS_REGION || 'us-east-1';
const localEndpoint =
  process.env.AWS_S3_LOCAL_ENDPOINT || 'http://localhost:4566';

const s3Client = new S3Client({
  region,
  endpoint: isLocalS3 ? localEndpoint : undefined,
  forcePathStyle: isLocalS3 ? true : undefined,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'test',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'test',
  },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET || 'local-bucket';
const KMS_KEY_ID = process.env.AWS_KMS_KEY_ID;

export interface UploadOptions {
  key?: string;
  contentType?: string;
  metadata?: Record<string, string>;
}

export interface UploadResult {
  key: string;
  url: string;
  bucket: string;
}

/**
 * Upload a file to S3 with optional KMS encryption
 */
export async function uploadFile(
  buffer: Buffer,
  options: UploadOptions = {}
): Promise<UploadResult> {
  const key = options.key || `resumes/${nanoid()}.pdf`;

  const params: PutObjectCommandInput = {
    Bucket: BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: options.contentType || 'application/pdf',
    Metadata: options.metadata,
    ServerSideEncryption: KMS_KEY_ID ? 'aws:kms' : 'AES256',
    ...(KMS_KEY_ID && { SSEKMSKeyId: KMS_KEY_ID }),
  };

  const command = new PutObjectCommand(params);
  await s3Client.send(command);

  return {
    key,
    url: isLocalS3
      ? `${localEndpoint.replace(/\/$/, '')}/${BUCKET_NAME}/${key}`
      : `https://${BUCKET_NAME}.s3.${region}.amazonaws.com/${key}`,
    bucket: BUCKET_NAME,
  };
}

/**
 * Get a file from S3
 */
export async function getFile(key: string): Promise<Buffer> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  const response = await s3Client.send(command);

  if (!response.Body) {
    throw new Error('No file body returned from S3');
  }

  const chunks: Uint8Array[] = [];
  for await (const chunk of response.Body as any) {
    chunks.push(chunk);
  }

  return Buffer.concat(chunks);
}

/**
 * Get a pre-signed URL for temporary access
 */
export async function getPresignedUrl(
  key: string,
  expiresIn: number = 3600
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  return await getSignedUrl(s3Client, command, { expiresIn });
}

/**
 * Delete a file from S3 (for 30-day retention cleanup)
 */
export async function deleteFile(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  await s3Client.send(command);
}

/**
 * Upload resume file with standardized naming
 */
export async function uploadResume(
  buffer: Buffer,
  userId?: string
): Promise<UploadResult> {
  const timestamp = Date.now();
  const randomId = nanoid(10);
  const key = userId
    ? `resumes/${userId}/${timestamp}-${randomId}.pdf`
    : `resumes/anonymous/${timestamp}-${randomId}.pdf`;

  return uploadFile(buffer, {
    key,
    contentType: 'application/pdf',
    metadata: {
      uploadedAt: new Date().toISOString(),
      userId: userId || 'anonymous',
    },
  });
}

export { s3Client };
