import { MAX_PHOTO_BYTES, PhotoUploadError, validatePhoto } from "./types";

/** Decode even small files so corrupt/unsupported images fail before uploading. */
export async function preparePhoto(
  file: File,
  signal: AbortSignal,
): Promise<File> {
  signal.throwIfAborted();
  validatePhoto(file);
  const url = URL.createObjectURL(file);
  const image = new Image();
  try {
    await new Promise<void>((resolve, reject) => {
      const cleanup = () => {
        signal.removeEventListener("abort", abort);
        image.onload = null;
        image.onerror = null;
      };
      const abort = () => {
        cleanup();
        image.src = "";
        reject(new DOMException("Photo preparation canceled", "AbortError"));
      };
      image.onload = () => {
        cleanup();
        resolve();
      };
      image.onerror = () => {
        cleanup();
        reject(
          new PhotoUploadError(
            "This image couldn’t be opened. Try another photo.",
          ),
        );
      };
      signal.addEventListener("abort", abort, { once: true });
      image.src = url;
    });
    signal.throwIfAborted();
    if (!image.naturalWidth || !image.naturalHeight) {
      throw new PhotoUploadError(
        "This image has no usable dimensions. Try another photo.",
      );
    }
    if (file.size < MAX_PHOTO_BYTES) return file;

    const canvas = document.createElement("canvas");
    let scale = Math.min(0.9, Math.sqrt(MAX_PHOTO_BYTES / file.size) * 0.8);
    // Match the legacy 1 MiB target, with a bounded loop rather than recursion.
    for (let attempt = 0; attempt < 8; attempt++) {
      signal.throwIfAborted();
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const context = canvas.getContext("2d");
      if (!context)
        throw new PhotoUploadError("This browser couldn’t resize the photo.");
      context.fillStyle = "white";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (result) => {
            if (result) resolve(result);
            else
              reject(
                new PhotoUploadError("This browser couldn’t resize the photo."),
              );
          },
          "image/jpeg",
          0.9,
        );
      });
      signal.throwIfAborted();
      if (blob.size > 0 && blob.size < MAX_PHOTO_BYTES) {
        return new File([blob], `${file.name.replace(/\.[^.]+$/, "")}.jpg`, {
          type: "image/jpeg",
        });
      }
      scale *= 0.7;
    }
    throw new PhotoUploadError(
      "This photo is still too large. Try a smaller image.",
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}
