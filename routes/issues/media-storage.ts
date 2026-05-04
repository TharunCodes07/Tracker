import "server-only";

import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "node:crypto";

import { getSeaweedS3Client, getSeaweedS3Config, getSeaweedS3PublicClient } from "@/lib/seaweed-s3";
import { RouteError } from "@/routes/errors";
import {
  ISSUE_IMAGE_MAX_BYTES,
  ISSUE_VIDEO_MAX_BYTES,
  type IssueMediaType,
  type UploadedIssueMediaInput,
} from "@/routes/issues/types";

const SIGNED_URL_TTL_SECONDS = 60 * 5;
const MAX_ORIGINAL_NAME_LENGTH = 255;
const MIME_FALLBACK_BY_TYPE: Record<IssueMediaType, string> = {
  image: "image/jpeg",
  video: "video/mp4",
};
const EXTENSION_FALLBACK_BY_TYPE: Record<IssueMediaType, string> = {
  image: "jpg",
  video: "mp4",
};

function getIssueMediaObjectPrefix(teamId: string, projectId: string, mediaType?: IssueMediaType) {
  return mediaType
    ? `issue-media/${teamId}/${projectId}/${mediaType}/`
    : `issue-media/${teamId}/${projectId}/`;
}

function getIssueMediaSizeLimit(mediaType: IssueMediaType) {
  return mediaType === "image" ? ISSUE_IMAGE_MAX_BYTES : ISSUE_VIDEO_MAX_BYTES;
}

function formatSizeLimit(bytes: number) {
  return `${Math.round(bytes / 1024 / 1024)} MB`;
}

function normalizeOriginalName(name: string) {
  const normalizedName = name.trim() || "upload";

  return normalizedName.length > MAX_ORIGINAL_NAME_LENGTH
    ? normalizedName.slice(0, MAX_ORIGINAL_NAME_LENGTH)
    : normalizedName;
}

function getSafeFileNamePart(name: string, mediaType: IssueMediaType) {
  const normalizedName = normalizeOriginalName(name);
  const rawExtension = normalizedName.includes(".")
    ? normalizedName.split(".").pop()?.toLowerCase() ?? ""
    : "";
  const extension = rawExtension.replace(/[^a-z0-9]/g, "").slice(0, 12) ||
    EXTENSION_FALLBACK_BY_TYPE[mediaType];
  const baseName = normalizedName
    .replace(/\.[^.]*$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72) || "media";

  return `${baseName}.${extension}`;
}

function validateMediaType(mediaType: IssueMediaType, mimeType: string) {
  if (mediaType === "image" && !mimeType.startsWith("image/")) {
    throw new RouteError("Upload a valid image file.");
  }

  if (mediaType === "video" && !mimeType.startsWith("video/")) {
    throw new RouteError("Upload a valid video file.");
  }
}

export function validateUploadedIssueMedia(
  teamId: string,
  projectId: string,
  media: UploadedIssueMediaInput
) {
  if (media.mediaType !== "image" && media.mediaType !== "video") {
    throw new RouteError("Choose a valid media type.");
  }

  const bucket = getSeaweedS3Config().bucket;

  if (media.bucket !== bucket) {
    throw new RouteError("Uploaded media bucket is invalid.");
  }

  if (!media.objectKey.startsWith(getIssueMediaObjectPrefix(teamId, projectId, media.mediaType))) {
    throw new RouteError("Uploaded media is not scoped to this project.");
  }

  validateMediaType(media.mediaType, media.mimeType);

  const sizeLimit = getIssueMediaSizeLimit(media.mediaType);

  if (!Number.isFinite(media.sizeBytes) || media.sizeBytes <= 0 || media.sizeBytes > sizeLimit) {
    throw new RouteError(
      `${media.mediaType === "image" ? "Image" : "Video"} must be ${formatSizeLimit(sizeLimit)} or smaller.`
    );
  }

  return {
    mediaType: media.mediaType,
    bucket: media.bucket,
    objectKey: media.objectKey,
    originalName: normalizeOriginalName(media.originalName),
    mimeType: media.mimeType || MIME_FALLBACK_BY_TYPE[media.mediaType],
    sizeBytes: Math.trunc(media.sizeBytes),
  } satisfies UploadedIssueMediaInput;
}

export async function uploadIssueMediaFile(options: {
  teamId: string;
  projectId: string;
  mediaType: IssueMediaType;
  file: File;
}) {
  const { teamId, projectId, mediaType, file } = options;

  validateMediaType(mediaType, file.type || MIME_FALLBACK_BY_TYPE[mediaType]);

  const sizeLimit = getIssueMediaSizeLimit(mediaType);

  if (file.size <= 0) {
    throw new RouteError("The uploaded file is empty.");
  }

  if (file.size > sizeLimit) {
    throw new RouteError(
      `${mediaType === "image" ? "Image" : "Video"} must be ${formatSizeLimit(sizeLimit)} or smaller.`
    );
  }

  const config = getSeaweedS3Config();
  const client = getSeaweedS3Client();
  const originalName = normalizeOriginalName(file.name);
  const safeFileName = getSafeFileNamePart(originalName, mediaType);
  const objectKey = `${getIssueMediaObjectPrefix(teamId, projectId, mediaType)}${randomUUID()}-${safeFileName}`;
  const body = Buffer.from(await file.arrayBuffer());
  const mimeType = file.type || MIME_FALLBACK_BY_TYPE[mediaType];

  await client.send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: objectKey,
      Body: body,
      ContentType: mimeType,
    })
  );

  return {
    mediaType,
    bucket: config.bucket,
    objectKey,
    originalName,
    mimeType,
    sizeBytes: file.size,
  } satisfies UploadedIssueMediaInput;
}

export async function createIssueMediaSignedUrl(media: {
  bucket: string;
  objectKey: string;
}) {
  return getSignedUrl(
    getSeaweedS3PublicClient(),
    new GetObjectCommand({
      Bucket: media.bucket,
      Key: media.objectKey,
    }),
    {
      expiresIn: SIGNED_URL_TTL_SECONDS,
    }
  );
}

export async function deleteIssueMediaObject(media: {
  bucket: string;
  objectKey: string;
}) {
  await getSeaweedS3Client().send(
    new DeleteObjectCommand({
      Bucket: media.bucket,
      Key: media.objectKey,
    })
  );
}
