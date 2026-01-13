import type { FileEntry, PublicFileWithStatus } from "$app/components/ProductEdit/state";
import type { SubtitleFile } from "$app/components/SubtitleList/Row";

export const checkFilesUploading = (files?: FileEntry[], publicFiles?: PublicFileWithStatus[]): boolean => {
  const isUploadingFile = (file: FileEntry | SubtitleFile) =>
    file.status.type === "unsaved" && file.status.uploadStatus.type === "uploading";

  const publicFilesUploading =
    publicFiles?.some((f) => f.status?.type === "unsaved" && f.status.uploadStatus.type === "uploading") ?? false;

  const filesUploading =
    files?.some((file) => isUploadingFile(file) || file.subtitle_files.some(isUploadingFile)) ?? false;

  return publicFilesUploading || filesUploading;
};
