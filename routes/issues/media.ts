import "server-only";

import { and, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import { issueMedia, issues } from "@/db/schema";
import { RouteError } from "@/routes/errors";
import { getProjectForTeam } from "@/routes/projects/queries";
import { getTeamForUser } from "@/routes/teams/queries";

import {
  createIssueMediaSignedUrl,
  deleteIssueMediaObject,
  uploadIssueMediaFile,
  validateUploadedIssueMedia,
} from "./media-storage";
import {
  ISSUE_MEDIA_TYPES,
  type IssueMediaListItem,
  type IssueMediaType,
  type IssueMediaUploadResponse,
  type UploadedIssueMediaInput,
} from "./types";

interface IssueActor {
  id: string;
}

interface IssueMediaRecord {
  id: string;
  issueId: string;
  projectId: string;
  mediaType: string;
  bucket: string;
  objectKey: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number | string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

function toIsoString(value: Date | string) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function toIssueMediaListItem(row: IssueMediaRecord): IssueMediaListItem {
  return {
    id: row.id,
    mediaType: row.mediaType as IssueMediaType,
    originalName: row.originalName,
    mimeType: row.mimeType,
    sizeBytes: Number(row.sizeBytes ?? 0),
    createdAt: toIsoString(row.createdAt),
    updatedAt: toIsoString(row.updatedAt),
  };
}

function normalizeIssueMediaType(value: unknown): IssueMediaType {
  if (value === "image" || value === "video") {
    return value;
  }

  throw new RouteError("Choose a valid media type.");
}

function normalizeRemoveMediaIds(values: string[] | undefined) {
  if (!values?.length) {
    return [];
  }

  return Array.from(
    new Set(
      values
        .map((value) => value.trim())
        .filter(Boolean)
    )
  );
}

function normalizeUploadedMedia(
  teamId: string,
  projectId: string,
  media: UploadedIssueMediaInput[] | undefined
) {
  if (!media?.length) {
    return [];
  }

  const mediaByObjectKey = new Map<string, UploadedIssueMediaInput>();

  for (const mediaItem of media) {
    const normalizedMedia = validateUploadedIssueMedia(teamId, projectId, mediaItem);

    if (mediaByObjectKey.has(normalizedMedia.objectKey)) {
      throw new RouteError("The same media file cannot be attached twice.");
    }

    mediaByObjectKey.set(normalizedMedia.objectKey, normalizedMedia);
  }

  return Array.from(mediaByObjectKey.values());
}

export function validateIssueMediaMutationInput(
  teamId: string,
  projectId: string,
  uploadedMedia?: UploadedIssueMediaInput[],
  removeMediaIds?: string[]
) {
  normalizeUploadedMedia(teamId, projectId, uploadedMedia);
  normalizeRemoveMediaIds(removeMediaIds);
}

async function requireEditableProjectForUser(
  actor: IssueActor,
  teamId: string,
  projectId: string
) {
  const team = await getTeamForUser(actor.id, teamId);

  if (!team) {
    throw new RouteError("Team not found.", 404);
  }

  if (!team.canEdit) {
    throw new RouteError("You only have read access to this team.", 403);
  }

  const project = await getProjectForTeam(actor.id, teamId, projectId);

  if (!project) {
    throw new RouteError("Project not found.", 404);
  }
}

async function deleteMediaObjectsBestEffort(mediaRows: { bucket: string; objectKey: string }[]) {
  await Promise.all(
    mediaRows.map(async (mediaRow) => {
      try {
        await deleteIssueMediaObject(mediaRow);
      } catch (error) {
        console.warn("Could not delete issue media from SeaweedFS.", error);
      }
    })
  );
}

export async function uploadIssueMediaForProject(
  actor: IssueActor,
  teamId: string,
  projectId: string,
  mediaType: IssueMediaType,
  file: File
): Promise<IssueMediaUploadResponse> {
  await requireEditableProjectForUser(actor, teamId, projectId);

  const media = await uploadIssueMediaFile({
    teamId,
    projectId,
    mediaType: normalizeIssueMediaType(mediaType),
    file,
  });

  return {
    media,
    message: `${media.mediaType === "image" ? "Image" : "Video"} uploaded.`,
  };
}

export async function listIssueMediaForIssueIds(issueIds: string[]) {
  if (issueIds.length === 0) {
    return new Map<string, IssueMediaListItem[]>();
  }

  const mediaRows = await db
    .select({
      id: issueMedia.id,
      issueId: issueMedia.issueId,
      projectId: issueMedia.projectId,
      mediaType: issueMedia.mediaType,
      bucket: issueMedia.bucket,
      objectKey: issueMedia.objectKey,
      originalName: issueMedia.originalName,
      mimeType: issueMedia.mimeType,
      sizeBytes: issueMedia.sizeBytes,
      createdAt: issueMedia.createdAt,
      updatedAt: issueMedia.updatedAt,
    })
    .from(issueMedia)
    .where(inArray(issueMedia.issueId, issueIds));

  const mediaByIssueId = new Map<string, IssueMediaListItem[]>();
  const mediaTypeOrder = new Map<IssueMediaType, number>([
    ["image", 0],
    ["video", 1],
  ]);

  for (const mediaRow of mediaRows) {
    const issueMediaItems = mediaByIssueId.get(mediaRow.issueId) ?? [];

    issueMediaItems.push(toIssueMediaListItem(mediaRow));
    mediaByIssueId.set(mediaRow.issueId, issueMediaItems);
  }

  for (const mediaItems of mediaByIssueId.values()) {
    mediaItems.sort(
      (left, right) =>
        (mediaTypeOrder.get(left.mediaType) ?? 99) -
          (mediaTypeOrder.get(right.mediaType) ?? 99) ||
        new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()
    );
  }

  return mediaByIssueId;
}

export async function listIssueMediaForIssueId(issueId: string) {
  const mediaByIssueId = await listIssueMediaForIssueIds([issueId]);

  return mediaByIssueId.get(issueId) ?? [];
}

export async function updateIssueMediaRecords(options: {
  actor: IssueActor;
  teamId: string;
  projectId: string;
  issueId: string;
  uploadedMedia?: UploadedIssueMediaInput[];
  removeMediaIds?: string[];
}) {
  const normalizedUploadedMedia = normalizeUploadedMedia(
    options.teamId,
    options.projectId,
    options.uploadedMedia
  );
  const removeMediaIds = normalizeRemoveMediaIds(options.removeMediaIds);

  if (removeMediaIds.length === 0 && normalizedUploadedMedia.length === 0) {
    return;
  }

  let existingMediaRows: { id: string; bucket: string; objectKey: string }[] = [];

  await db.transaction(async (tx) => {
    if (removeMediaIds.length > 0) {
      existingMediaRows = await tx
        .select({
          id: issueMedia.id,
          bucket: issueMedia.bucket,
          objectKey: issueMedia.objectKey,
        })
        .from(issueMedia)
        .where(
          and(
            eq(issueMedia.projectId, options.projectId),
            eq(issueMedia.issueId, options.issueId),
            inArray(issueMedia.id, removeMediaIds)
          )
        );

      if (existingMediaRows.length > 0) {
        await tx
          .delete(issueMedia)
          .where(
            and(
              eq(issueMedia.projectId, options.projectId),
              eq(issueMedia.issueId, options.issueId),
              inArray(issueMedia.id, removeMediaIds)
            )
          );
      }
    }

    if (normalizedUploadedMedia.length > 0) {
      await tx.insert(issueMedia).values(
        normalizedUploadedMedia.map((mediaItem) => ({
          projectId: options.projectId,
          issueId: options.issueId,
          mediaType: mediaItem.mediaType,
          bucket: mediaItem.bucket,
          objectKey: mediaItem.objectKey,
          originalName: mediaItem.originalName,
          mimeType: mediaItem.mimeType,
          sizeBytes: mediaItem.sizeBytes,
          createdBy: options.actor.id,
        }))
      );
    }
  });

  await deleteMediaObjectsBestEffort(existingMediaRows);
}

export async function deleteIssueMediaObjectsForIssue(projectId: string, issueId: string) {
  const mediaRows = await db
    .select({
      bucket: issueMedia.bucket,
      objectKey: issueMedia.objectKey,
    })
    .from(issueMedia)
    .where(and(eq(issueMedia.projectId, projectId), eq(issueMedia.issueId, issueId)));

  await deleteMediaObjectsBestEffort(mediaRows);
}

export async function getIssueMediaSignedUrlForUser(
  userId: string,
  teamId: string,
  projectId: string,
  issueId: string,
  mediaId: string
): Promise<{ url: string } | null> {
  const project = await getProjectForTeam(userId, teamId, projectId);

  if (!project) {
    return null;
  }

  const [mediaRow] = await db
    .select({
      bucket: issueMedia.bucket,
      objectKey: issueMedia.objectKey,
    })
    .from(issueMedia)
    .innerJoin(issues, eq(issueMedia.issueId, issues.id))
    .where(
      and(
        eq(issues.projectId, projectId),
        eq(issues.id, issueId),
        eq(issueMedia.projectId, projectId),
        eq(issueMedia.id, mediaId)
      )
    )
    .limit(1);

  if (!mediaRow) {
    return null;
  }

  return {
    url: await createIssueMediaSignedUrl(mediaRow),
  };
}

export function isIssueMediaType(value: string): value is IssueMediaType {
  return (ISSUE_MEDIA_TYPES as readonly string[]).includes(value);
}
