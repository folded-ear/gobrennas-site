export type PhotoFocus = [number, number];

export type UploadOptions = {
  signal: AbortSignal;
  onProgress: (percent: number) => void;
};

export type UploadPhoto = (
  file: File,
  options: UploadOptions,
) => Promise<string>;

export const PHOTO_ACCEPT =
  "image/jpeg,image/png,image/webp,image/gif,image/avif";
export const MAX_PHOTO_BYTES = 1024 * 1024;

/** A message intended to be shown beside the photo controls. */
export class PhotoUploadError extends Error {}

export function validatePhoto(file: File): void {
  if (!PHOTO_ACCEPT.split(",").includes(file.type) || file.size === 0) {
    throw new PhotoUploadError("Choose a JPEG, PNG, WebP, GIF, or AVIF image.");
  }
}

export function clampFocus(value: number): number {
  return Math.max(0, Math.min(1, value));
}
