import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { soupPhoto, stubPhotoBrowser } from "./test/browser";
import { putPhoto, uploadPhoto, type ScratchUpload } from "./upload-photo";

const upload: ScratchUpload = {
  url: "https://photos.example.test/upload",
  filename: "scratch/soup.jpg",
  contentType: "image/jpeg",
  cacheControl: "max-age=31536000",
};

describe("photo upload transport", () => {
  let browser: ReturnType<typeof stubPhotoBrowser>;
  beforeEach(() => {
    browser = stubPhotoBrowser();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends the file and signed headers directly to S3 and reports progress", async () => {
    const file = soupPhoto();
    const onProgress = vi.fn();
    const result = putPhoto(file, upload, {
      signal: new AbortController().signal,
      onProgress,
    });
    const request = browser.requests[0];
    expect([request.method, request.url, request.body]).toEqual([
      "PUT",
      upload.url,
      file,
    ]);
    expect(Object.fromEntries(request.headers)).toEqual({
      "Content-Type": "image/jpeg",
      "Cache-Control": upload.cacheControl,
    });
    request.progress(3, 4);
    expect(onProgress).toHaveBeenCalledWith(75);
    request.respond(204);
    await expect(result).resolves.toBeUndefined();
  });

  it.each([400, 403, 500])(
    "does not accept an HTTP %s response as a successful upload",
    async (status) => {
      const result = putPhoto(soupPhoto(), upload, {
        signal: new AbortController().signal,
        onProgress: () => {},
      });
      browser.requests[0].respond(status);
      await expect(result).rejects.toThrow("Photo upload failed");
    },
  );

  it.each(["onerror", "ontimeout"] as const)(
    "rejects a transport %s",
    async (event) => {
      const result = putPhoto(soupPhoto(), upload, {
        signal: new AbortController().signal,
        onProgress: () => {},
      });
      browser.requests[0][event]?.();
      await expect(result).rejects.toThrow(/Photo upload (failed|timed out)/);
    },
  );

  it("aborts the request when selection changes", async () => {
    const controller = new AbortController();
    const result = putPhoto(soupPhoto(), upload, {
      signal: controller.signal,
      onProgress: () => {},
    });
    controller.abort();
    await expect(result).rejects.toMatchObject({ name: "AbortError" });
    expect(browser.requests[0].aborted).toBe(true);
  });

  it("rejects malformed signing responses before starting a PUT", async () => {
    await expect(
      uploadPhoto(soupPhoto(), async () => ({ ...upload, filename: "" }), {
        signal: new AbortController().signal,
        onProgress: () => {},
      }),
    ).rejects.toThrow();
    expect(browser.requests).toHaveLength(0);
  });
});
