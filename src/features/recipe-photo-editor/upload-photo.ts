import { z } from "zod";
import { preparePhoto } from "./prepare-photo";
import { PhotoUploadError, type UploadOptions } from "./types";

const scratchUploadSchema = z.object({
  url: z.url().refine((url) => new URL(url).protocol === "https:"),
  filename: z.string().min(1),
  contentType: z.string().min(1),
  cacheControl: z.string().min(1),
});

export type ScratchUpload = z.infer<typeof scratchUploadSchema>;
type RequestUpload = (file: File, signal: AbortSignal) => Promise<unknown>;

export async function uploadPhoto(
  original: File,
  requestUpload: RequestUpload,
  options: UploadOptions,
): Promise<string> {
  const file = await preparePhoto(original, options.signal);
  const upload = scratchUploadSchema.parse(
    await requestUpload(file, options.signal),
  );
  options.signal.throwIfAborted();
  if (upload.contentType !== file.type)
    throw new PhotoUploadError("Unexpected photo upload format.");
  await putPhoto(file, upload, options);
  return upload.filename;
}

/** XHR exposes upload progress; success is only reported after S3 accepts the PUT. */
export function putPhoto(
  file: File,
  upload: ScratchUpload,
  { signal, onProgress }: UploadOptions,
): Promise<void> {
  signal.throwIfAborted();
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    const cleanup = () => signal.removeEventListener("abort", abort);
    const fail = (error: Error) => {
      cleanup();
      reject(error);
    };
    const abort = () => {
      request.abort();
      fail(new DOMException("Photo upload canceled", "AbortError"));
    };
    request.upload.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0) {
        onProgress(
          Math.min(100, Math.round((event.loaded / event.total) * 100)),
        );
      }
    };
    request.onload = () => {
      if (request.status >= 200 && request.status < 300) {
        cleanup();
        resolve();
      } else fail(new PhotoUploadError("Photo upload failed. Please retry."));
    };
    request.onerror = () =>
      fail(
        new PhotoUploadError(
          "Photo upload failed. Check your connection and retry.",
        ),
      );
    request.ontimeout = () =>
      fail(new PhotoUploadError("Photo upload timed out. Please retry."));
    request.onabort = () =>
      fail(new DOMException("Photo upload canceled", "AbortError"));
    signal.addEventListener("abort", abort, { once: true });
    try {
      request.open("PUT", upload.url);
      request.timeout = 120_000;
      request.setRequestHeader("Content-Type", upload.contentType);
      request.setRequestHeader("Cache-Control", upload.cacheControl);
      request.send(file);
    } catch {
      fail(new PhotoUploadError("Photo upload could not start. Please retry."));
    }
  });
}
