import "server-only";

import { S3Client } from "@aws-sdk/client-s3";

interface SeaweedS3Config {
  endpoint: string;
  publicEndpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  region: string;
}

let seaweedS3Client: S3Client | null = null;
let seaweedS3PublicClient: S3Client | null = null;

function readRequiredEnv(name: string) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is required for SeaweedFS uploads.`);
  }

  return value;
}

export function getSeaweedS3Config(): SeaweedS3Config {
  const endpoint = readRequiredEnv("SEAWEED_S3_ENDPOINT");

  return {
    endpoint,
    publicEndpoint: process.env.SEAWEED_S3_PUBLIC_ENDPOINT?.trim() || endpoint,
    accessKeyId: readRequiredEnv("SEAWEED_ACCESS_KEY"),
    secretAccessKey: readRequiredEnv("SEAWEED_SECRET_KEY"),
    bucket: readRequiredEnv("SEAWEED_BUCKET"),
    region: process.env.SEAWEED_S3_REGION?.trim() || "us-east-1",
  };
}

export function getSeaweedS3Client() {
  if (seaweedS3Client) {
    return seaweedS3Client;
  }

  const config = getSeaweedS3Config();

  seaweedS3Client = new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    forcePathStyle: true,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });

  return seaweedS3Client;
}

export function getSeaweedS3PublicClient() {
  if (seaweedS3PublicClient) {
    return seaweedS3PublicClient;
  }

  const config = getSeaweedS3Config();

  seaweedS3PublicClient = new S3Client({
    region: config.region,
    endpoint: config.publicEndpoint,
    forcePathStyle: true,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });

  return seaweedS3PublicClient;
}
