import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { preparePhoto } from "./prepare-photo";
import { soupPhoto, stubPhotoBrowser } from "./test/browser";
import { MAX_PHOTO_BYTES } from "./types";

describe("preparing recipe photos", () => {
  let browser: ReturnType<typeof stubPhotoBrowser>;
  beforeEach(() => {
    browser = stubPhotoBrowser();
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("keeps small, decodable images unchanged and releases the decode URL", async () => {
    const file = soupPhoto();
    await expect(
      preparePhoto(file, new AbortController().signal),
    ).resolves.toBe(file);
    expect(browser.revokeObjectURL).toHaveBeenCalledWith("blob:photo-1");
  });

  it("rejects corrupt images and releases their URL", async () => {
    vi.stubGlobal(
      "Image",
      class {
        onerror?: () => void;
        set src(value: string) {
          if (value) queueMicrotask(() => this.onerror?.());
        }
      },
    );
    await expect(
      preparePhoto(soupPhoto(), new AbortController().signal),
    ).rejects.toThrow("couldn’t be opened");
    expect(browser.revokeObjectURL).toHaveBeenCalledWith("blob:photo-1");
  });

  it("can cancel preparation while decoding", async () => {
    vi.stubGlobal(
      "Image",
      class {
        src = "";
      },
    );
    const controller = new AbortController();
    const result = preparePhoto(soupPhoto(), controller.signal);
    controller.abort();
    await expect(result).rejects.toMatchObject({ name: "AbortError" });
    expect(browser.revokeObjectURL).toHaveBeenCalledWith("blob:photo-1");
  });

  it("reduces a large image below 1 MiB and identifies the encoded JPEG correctly", async () => {
    const drawImage = vi.fn();
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      fillStyle: "",
      fillRect: vi.fn(),
      drawImage,
    } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(
      (callback) =>
        callback(new Blob([new Uint8Array(200_000)], { type: "image/jpeg" })),
    );
    const file = new File([new Uint8Array(MAX_PHOTO_BYTES + 1)], "dinner.png", {
      type: "image/png",
    });
    const prepared = await preparePhoto(file, new AbortController().signal);
    expect(prepared.type).toBe("image/jpeg");
    expect(prepared.name).toBe("dinner.jpg");
    expect(prepared.size).toBe(200_000);
    const [, , , width, height] = drawImage.mock.calls[0];
    expect(width).toBeLessThan(1600);
    expect(width / height).toBeCloseTo(4 / 3, 2);
  });

  it("stops with a recoverable error if resizing cannot reach the limit", async () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      fillStyle: "",
      fillRect: vi.fn(),
      drawImage: vi.fn(),
    } as unknown as CanvasRenderingContext2D);
    const encode = vi
      .spyOn(HTMLCanvasElement.prototype, "toBlob")
      .mockImplementation((callback) =>
        callback(new Blob([new Uint8Array(MAX_PHOTO_BYTES)])),
      );
    await expect(
      preparePhoto(
        new File([new Uint8Array(MAX_PHOTO_BYTES)], "dinner.jpg", {
          type: "image/jpeg",
        }),
        new AbortController().signal,
      ),
    ).rejects.toThrow("still too large");
    expect(encode).toHaveBeenCalledTimes(8);
  });
});
