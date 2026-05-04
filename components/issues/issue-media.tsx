"use client";

import * as React from "react";

import {
  ExternalLink,
  ImageIcon,
  Paperclip,
  UploadCloud,
  Video,
  X,
} from "lucide-react";
import { useParams } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { FieldDescription, FieldLabel } from "@/components/ui/field";
import { cn } from "@/lib/utils";
import {
  ISSUE_IMAGE_MAX_BYTES,
  ISSUE_VIDEO_MAX_BYTES,
  type IssueMediaListItem,
  type IssueMediaType,
} from "@/routes/issues/types";

interface IssueMediaPickerPatch {
  media?: IssueMediaListItem[];
  mediaFiles?: File[];
  removeMediaIds?: string[];
}

const ISSUE_MEDIA_ACCEPT = "image/*,video/*";
const LOCAL_OBJECT_URL_REVOKE_MS = 60_000;

const MEDIA_LABEL: Record<IssueMediaType, string> = {
  image: "Image",
  video: "Video",
};

function getRouteParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0 KB";
  }

  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }

  return `${(bytes / 1024 / 1024).toFixed(bytes >= 10 * 1024 * 1024 ? 0 : 1)} MB`;
}

function getMediaTypeFromMimeType(mimeType: string): IssueMediaType | null {
  if (mimeType.startsWith("image/")) {
    return "image";
  }

  if (mimeType.startsWith("video/")) {
    return "video";
  }

  return null;
}

function getMediaIcon(mediaType: IssueMediaType, className?: string) {
  return mediaType === "image" ? (
    <ImageIcon className={className} />
  ) : (
    <Video className={className} />
  );
}

function getFileKey(file: File) {
  return `${file.name}:${file.size}:${file.lastModified}`;
}

function validateSelectedFile(file: File) {
  const mediaType = getMediaTypeFromMimeType(file.type);

  if (!mediaType) {
    toast.error(`${file.name} is not an image or video.`);
    return null;
  }

  const maxBytes = mediaType === "image" ? ISSUE_IMAGE_MAX_BYTES : ISSUE_VIDEO_MAX_BYTES;

  if (file.size > maxBytes) {
    toast.error(`${file.name} must be ${formatBytes(maxBytes)} or smaller.`);
    return null;
  }

  return mediaType;
}

function openUrlInNewTab(url: string) {
  const nextWindow = window.open(url, "_blank");

  if (!nextWindow) {
    toast.error("Allow popups for this site to open media in a new tab.");
    return false;
  }

  nextWindow.opener = null;
  return true;
}

function openLocalFileInNewTab(file: File) {
  const mediaType = validateSelectedFile(file);

  if (!mediaType) {
    return;
  }

  const objectUrl = URL.createObjectURL(file);
  const didOpen = openUrlInNewTab(objectUrl);

  window.setTimeout(() => URL.revokeObjectURL(objectUrl), LOCAL_OBJECT_URL_REVOKE_MS);

  if (!didOpen) {
    URL.revokeObjectURL(objectUrl);
  }
}

function useIssueMediaOpener() {
  const params = useParams<{ teamId?: string | string[]; projectId?: string | string[] }>();
  const teamId = getRouteParam(params.teamId);
  const projectId = getRouteParam(params.projectId);

  function openExistingMedia(issueId: string, media: IssueMediaListItem) {
    if (!teamId || !projectId) {
      toast.error("Project route is missing.");
      return;
    }

    openUrlInNewTab(
      `/api/teams/${teamId}/projects/${projectId}/issues/${issueId}/media/${media.id}`
    );
  }

  return { openExistingMedia };
}

export function IssueMediaSummary({
  issueId,
  media,
  className,
  compact = false,
}: {
  issueId: string;
  media: IssueMediaListItem[];
  className?: string;
  compact?: boolean;
}) {
  const { openExistingMedia } = useIssueMediaOpener();

  if (media.length === 0) {
    return (
      <div className={cn("inline-flex items-center gap-1.5 text-xs text-muted-foreground", className)}>
        <Paperclip className="h-3.5 w-3.5" />
        {compact ? "None" : "No media"}
      </div>
    );
  }

  return (
    <div className={cn("flex flex-wrap items-center justify-center gap-1.5", className)}>
      {media.map((mediaItem, index) => (
        <Button
          key={mediaItem.id}
          type="button"
          variant="outline"
          size="sm"
          className={cn("h-7 gap-1.5 px-2", compact && "w-7 px-0")}
          title={`${MEDIA_LABEL[mediaItem.mediaType]}: ${mediaItem.originalName}`}
          onClick={(event) => {
            event.stopPropagation();
            openExistingMedia(issueId, mediaItem);
          }}
        >
          {getMediaIcon(mediaItem.mediaType, "h-3.5 w-3.5")}
          {compact ? (
            <span className="sr-only">
              {MEDIA_LABEL[mediaItem.mediaType]} {index + 1}
            </span>
          ) : (
            `${MEDIA_LABEL[mediaItem.mediaType]} ${index + 1}`
          )}
        </Button>
      ))}
    </div>
  );
}

function ExistingMediaRow({
  issueId,
  media,
  disabled,
  onRemove,
}: {
  issueId: string;
  media: IssueMediaListItem;
  disabled?: boolean;
  onRemove: () => void;
}) {
  const { openExistingMedia } = useIssueMediaOpener();

  return (
    <div className="flex min-w-0 items-center gap-3 rounded-lg border border-border/70 bg-muted/20 px-3 py-2">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-background text-muted-foreground">
        {getMediaIcon(media.mediaType, "h-4 w-4")}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-foreground">{media.originalName}</div>
        <div className="text-xs text-muted-foreground">
          {MEDIA_LABEL[media.mediaType]} - {formatBytes(media.sizeBytes)}
        </div>
      </div>
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        title="Open in new tab"
        onClick={() => openExistingMedia(issueId, media)}
      >
        <ExternalLink className="h-3.5 w-3.5" />
        <span className="sr-only">Open in new tab</span>
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="text-destructive hover:text-destructive"
        title="Remove media"
        disabled={disabled}
        onClick={onRemove}
      >
        <X className="h-3.5 w-3.5" />
        <span className="sr-only">Remove media</span>
      </Button>
    </div>
  );
}

function SelectedFileRow({
  file,
  disabled,
  onRemove,
}: {
  file: File;
  disabled?: boolean;
  onRemove: () => void;
}) {
  const mediaType = getMediaTypeFromMimeType(file.type) ?? "image";

  return (
    <div className="flex min-w-0 items-center gap-3 rounded-lg border border-cyan-500/20 bg-cyan-500/5 px-3 py-2">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-background text-cyan-700 dark:text-cyan-300">
        {getMediaIcon(mediaType, "h-4 w-4")}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-foreground">{file.name}</div>
        <div className="text-xs text-muted-foreground">
          {MEDIA_LABEL[mediaType]} - {formatBytes(file.size)} - ready to upload
        </div>
      </div>
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        title="Open in new tab"
        onClick={() => openLocalFileInNewTab(file)}
      >
        <ExternalLink className="h-3.5 w-3.5" />
        <span className="sr-only">Open in new tab</span>
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="text-destructive hover:text-destructive"
        title="Remove file"
        disabled={disabled}
        onClick={onRemove}
      >
        <X className="h-3.5 w-3.5" />
        <span className="sr-only">Remove file</span>
      </Button>
    </div>
  );
}

export function IssueMediaPicker({
  issueId,
  media,
  mediaFiles,
  removeMediaIds,
  disabled,
  onChange,
}: {
  issueId: string;
  media: IssueMediaListItem[];
  mediaFiles: File[];
  removeMediaIds: string[];
  disabled?: boolean;
  onChange: (patch: IssueMediaPickerPatch) => void;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const activeMedia = media.filter((mediaItem) => !removeMediaIds.includes(mediaItem.id));
  const totalAttachmentCount = activeMedia.length + mediaFiles.length;

  function appendFiles(fileList: FileList | File[]) {
    if (disabled) {
      return;
    }

    const currentFileKeys = new Set(mediaFiles.map(getFileKey));
    const acceptedFiles: File[] = [];

    for (const file of Array.from(fileList)) {
      if (!validateSelectedFile(file)) {
        continue;
      }

      const fileKey = getFileKey(file);

      if (currentFileKeys.has(fileKey)) {
        continue;
      }

      currentFileKeys.add(fileKey);
      acceptedFiles.push(file);
    }

    if (acceptedFiles.length === 0) {
      return;
    }

    onChange({ mediaFiles: [...mediaFiles, ...acceptedFiles] });
  }

  return (
    <div className="rounded-xl border border-border/70 bg-background p-3 shadow-sm">
      <div className="mb-3 flex min-w-0 items-center justify-between gap-3">
        <div className="min-w-0">
          <FieldLabel>Evidence</FieldLabel>
          <FieldDescription>
            Attach screenshots and screen recordings for this issue.
          </FieldDescription>
        </div>
        <Paperclip className="h-4 w-4 shrink-0 text-muted-foreground" />
      </div>

      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        className={cn(
          "min-w-0 rounded-xl border border-dashed border-border/80 bg-muted/20 p-4 transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          isDragging && "border-primary bg-muted/60",
          disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:bg-muted/40"
        )}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(event) => {
          if ((event.key === "Enter" || event.key === " ") && !disabled) {
            event.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(event) => {
          event.preventDefault();

          if (!disabled) {
            setIsDragging(true);
          }
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          appendFiles(event.dataTransfer.files);
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ISSUE_MEDIA_ACCEPT}
          multiple
          className="sr-only"
          disabled={disabled}
          onChange={(event) => {
            if (event.target.files) {
              appendFiles(event.target.files);
            }

            event.currentTarget.value = "";
          }}
        />

        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-background text-muted-foreground">
            <UploadCloud className="h-5 w-5" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium text-foreground">
              Drop images or videos here, or browse
            </div>
            <div className="mt-1 text-sm text-muted-foreground">
              Images up to {formatBytes(ISSUE_IMAGE_MAX_BYTES)}. Videos up to{" "}
              {formatBytes(ISSUE_VIDEO_MAX_BYTES)}.
            </div>
          </div>
          {totalAttachmentCount > 0 ? (
            <div className="shrink-0 rounded-full bg-background px-2 py-1 text-xs text-muted-foreground">
              {totalAttachmentCount} file{totalAttachmentCount === 1 ? "" : "s"}
            </div>
          ) : null}
        </div>
      </div>

      {totalAttachmentCount > 0 ? (
        <div className="mt-3 grid gap-2">
          {activeMedia.map((mediaItem) => (
            <ExistingMediaRow
              key={mediaItem.id}
              issueId={issueId}
              media={mediaItem}
              disabled={disabled}
              onRemove={() =>
                onChange({
                  removeMediaIds: [...removeMediaIds, mediaItem.id],
                })
              }
            />
          ))}
          {mediaFiles.map((file) => (
            <SelectedFileRow
              key={getFileKey(file)}
              file={file}
              disabled={disabled}
              onRemove={() =>
                onChange({
                  mediaFiles: mediaFiles.filter((mediaFile) => getFileKey(mediaFile) !== getFileKey(file)),
                })
              }
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
