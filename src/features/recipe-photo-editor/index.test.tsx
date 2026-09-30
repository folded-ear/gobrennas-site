import { act, cleanup, render, screen, userEvent, waitFor } from "@/test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PhotoEditor } from "./index";
import { deferred, soupPhoto, stubPhotoBrowser } from "./test/browser";
import { MAX_PHOTO_BYTES, type UploadPhoto } from "./types";
import { usePhotoUpload } from "./use-photo-upload";

function Editor({
  upload,
  disabled = false,
}: {
  upload: UploadPhoto;
  disabled?: boolean;
}) {
  const photo = usePhotoUpload(upload);
  return (
    <>
      <PhotoEditor photo={photo} isDisabled={disabled} onEdit={() => {}} />
      <button disabled={!photo.canSave()}>Save</button>
      <output aria-label="Uploaded photo">
        {photo.savedPhoto()?.filename ?? "none"}
      </output>
    </>
  );
}

describe("recipe photo editor", () => {
  let browser: ReturnType<typeof stubPhotoBrowser>;
  beforeEach(() => {
    browser = stubPhotoBrowser();
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("previews a prepared selection, reports real progress, and waits for upload confirmation", async () => {
    const user = userEvent.setup();
    const pending = deferred<string>();
    const upload = vi.fn<UploadPhoto>(() => pending.promise);
    render(<Editor upload={upload} />);
    await user.upload(screen.getByLabelText("Recipe photo"), soupPhoto());
    expect(
      screen.getByRole("img", { name: "Selected recipe photo" }),
    ).toHaveAttribute("src", "blob:photo-2");
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
    act(() => upload.mock.calls[0][1].onProgress(65));
    expect(
      screen.getByRole("progressbar", { name: /^Photo upload/ }),
    ).toHaveAttribute("aria-valuenow", "65");
    act(() => upload.mock.calls[0][1].onProgress(100));
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
    await act(async () => pending.resolve("scratch/soup.jpg"));
    expect(screen.getByRole("button", { name: "Save" })).toBeEnabled();
    expect(screen.getByLabelText("Uploaded photo")).toHaveTextContent(
      "scratch/soup.jpg",
    );
  });

  it("supports keyboard focus adjustment, clamps at image edges, and updates the crop preview", async () => {
    const user = userEvent.setup();
    render(<Editor upload={async () => "scratch/soup.jpg"} />);
    await user.upload(screen.getByLabelText("Recipe photo"), soupPhoto());
    const picker = screen.getByRole("button", { name: "Photo focus" });
    picker.focus();
    await user.keyboard("{ArrowRight}{ArrowUp}");
    expect(
      screen.getByRole("img", { name: "Narrow crop preview" }),
    ).toHaveStyle({ objectPosition: "51% 49%" });
    await user.keyboard("{Shift>}{ArrowRight>10/}{ArrowUp>10/}{/Shift}");
    expect(
      screen.getByRole("img", { name: "Narrow crop preview" }),
    ).toHaveStyle({
      objectPosition: "100% 0%",
    });
    await user.keyboard("{Enter}");
    expect(
      screen.getByRole("img", { name: "Narrow crop preview" }),
    ).toHaveStyle({
      objectPosition: "50% 50%",
    });
  });

  it("retries upload without losing the selected image or focus and clears stale selection errors", async () => {
    const user = userEvent.setup({ applyAccept: false });
    const upload = vi
      .fn<UploadPhoto>()
      .mockRejectedValueOnce(new Error("Offline"))
      .mockResolvedValueOnce("scratch/retry.jpg");
    render(<Editor upload={upload} />);
    const file = soupPhoto();
    await user.upload(screen.getByLabelText("Recipe photo"), file);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Photo upload failed. Please retry.",
    );
    screen.getByRole("button", { name: "Photo focus" }).focus();
    await user.keyboard("{ArrowLeft}");
    await user.upload(
      screen.getByLabelText("Recipe photo"),
      new File(["pdf"], "menu.pdf", { type: "application/pdf" }),
    );
    expect(
      screen.getByText("Choose a JPEG, PNG, WebP, GIF, or AVIF image."),
    ).toBeVisible();
    await user.click(
      screen.getByRole("button", { name: "Retry photo upload" }),
    );
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Save" })).toBeEnabled(),
    );
    expect(upload.mock.calls[1][0]).toBe(file);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: "Narrow crop preview" }),
    ).toHaveStyle({
      objectPosition: "49% 50%",
    });
  });

  it("cancels superseded uploads and ignores their late completion", async () => {
    const user = userEvent.setup();
    const old = deferred<string>();
    const upload = vi
      .fn<UploadPhoto>()
      .mockImplementationOnce(() => old.promise)
      .mockResolvedValueOnce("scratch/new.jpg");
    render(<Editor upload={upload} />);
    await user.upload(screen.getByLabelText("Recipe photo"), soupPhoto());
    await user.upload(
      screen.getByLabelText("Recipe photo"),
      new File(["pie"], "pie.jpg", { type: "image/jpeg" }),
    );
    expect(upload.mock.calls[0][1].signal.aborted).toBe(true);
    await act(async () => old.resolve("scratch/old.jpg"));
    expect(screen.getByLabelText("Uploaded photo")).toHaveTextContent(
      "scratch/new.jpg",
    );
    expect(browser.revokeObjectURL).toHaveBeenCalledWith("blob:photo-2");
  });

  it("discards an unsaved upload and permits saving without a photo", async () => {
    const user = userEvent.setup();
    const pending = deferred<string>();
    const upload = vi.fn<UploadPhoto>(() => pending.promise);
    render(<Editor upload={upload} />);
    await user.upload(screen.getByLabelText("Recipe photo"), soupPhoto());
    await user.click(screen.getByRole("button", { name: "Discard photo" }));
    expect(upload.mock.calls[0][1].signal.aborted).toBe(true);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save" })).toBeEnabled();
    await act(async () => pending.resolve("scratch/late.jpg"));
    expect(screen.getByLabelText("Uploaded photo")).toHaveTextContent("none");
  });

  it("rejects unsupported files with a useful message", async () => {
    const user = userEvent.setup({ applyAccept: false });
    const upload = vi.fn<UploadPhoto>();
    render(<Editor upload={upload} />);
    await user.upload(
      screen.getByLabelText("Recipe photo"),
      new File(["pdf"], "menu.pdf", { type: "application/pdf" }),
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Choose a JPEG, PNG, WebP, GIF, or AVIF image",
    );
    expect(upload).not.toHaveBeenCalled();
    expect(
      screen.queryByRole("button", { name: "Retry photo upload" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save" })).toBeEnabled();
    await user.upload(screen.getByLabelText("Recipe photo"), soupPhoto());
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it.each([
    { name: "menu.pdf", type: "application/pdf", content: "pdf" },
    { name: "photo.heic", type: "image/heic", content: "heic" },
    { name: "empty.jpg", type: "image/jpeg", content: "" },
  ])(
    "preserves an uploaded photo and its focus after selecting $name",
    async ({ name, type, content }) => {
      const user = userEvent.setup({ applyAccept: false });
      const upload = vi.fn<UploadPhoto>().mockResolvedValue("scratch/soup.jpg");
      render(<Editor upload={upload} />);
      await user.upload(screen.getByLabelText("Recipe photo"), soupPhoto());
      screen.getByRole("button", { name: "Photo focus" }).focus();
      await user.keyboard("{ArrowLeft}");

      await user.upload(
        screen.getByLabelText("Recipe photo"),
        new File([content], name, { type }),
      );

      expect(screen.getByRole("alert")).toHaveTextContent(
        "Choose a JPEG, PNG, WebP, GIF, or AVIF image",
      );
      expect(
        screen.getByRole("img", { name: "Selected recipe photo" }),
      ).toHaveAttribute("src", "blob:photo-2");
      expect(
        screen.getByRole("img", { name: "Narrow crop preview" }),
      ).toHaveStyle({ objectPosition: "49% 50%" });
      expect(screen.getByLabelText("Uploaded photo")).toHaveTextContent(
        "scratch/soup.jpg",
      );
      expect(screen.getByRole("button", { name: "Save" })).toBeEnabled();
      expect(
        screen.queryByRole("button", { name: "Retry photo upload" }),
      ).not.toBeInTheDocument();
      expect(upload).toHaveBeenCalledTimes(1);
      expect(browser.revokeObjectURL).not.toHaveBeenCalledWith("blob:photo-2");
      await user.click(screen.getByRole("button", { name: "Discard photo" }));
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    },
  );

  it("keeps an in-progress upload running after an invalid replacement", async () => {
    const user = userEvent.setup({ applyAccept: false });
    const pending = deferred<string>();
    const upload = vi.fn<UploadPhoto>(() => pending.promise);
    render(<Editor upload={upload} />);
    await user.upload(screen.getByLabelText("Recipe photo"), soupPhoto());

    await user.upload(
      screen.getByLabelText("Recipe photo"),
      new File(["pdf"], "menu.pdf", { type: "application/pdf" }),
    );

    expect(upload.mock.calls[0][1].signal.aborted).toBe(false);
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
    await act(async () => pending.resolve("scratch/soup.jpg"));
    expect(screen.getByLabelText("Uploaded photo")).toHaveTextContent(
      "scratch/soup.jpg",
    );
    expect(screen.getByRole("button", { name: "Save" })).toBeEnabled();
  });

  it.each(["decode", "dimensions", "resize"] as const)(
    "preserves the current photo when replacement preparation fails at %s",
    async (failure) => {
      const user = userEvent.setup();
      const upload = vi.fn<UploadPhoto>().mockResolvedValue("scratch/soup.jpg");
      render(<Editor upload={upload} />);
      await user.upload(screen.getByLabelText("Recipe photo"), soupPhoto());
      screen.getByRole("button", { name: "Photo focus" }).focus();
      await user.keyboard("{ArrowLeft}");
      const images = controlImageDecoding();
      if (failure === "resize") {
        vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
          fillStyle: "",
          fillRect: vi.fn(),
          drawImage: vi.fn(),
        } as unknown as CanvasRenderingContext2D);
        vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(
          (callback) => callback(new Blob([new Uint8Array(MAX_PHOTO_BYTES)])),
        );
      }
      const replacement = new File(
        [new Uint8Array(failure === "resize" ? MAX_PHOTO_BYTES : 8)],
        "replacement.avif",
        { type: "image/avif" },
      );
      await user.upload(screen.getByLabelText("Recipe photo"), replacement);
      expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
      expect(screen.getByText("Preparing photo…")).toBeVisible();
      await act(async () => {
        if (failure === "decode") images[0].onerror?.();
        else {
          if (failure === "dimensions") images[0].naturalWidth = 0;
          images[0].onload?.();
        }
      });
      expect(screen.getByRole("alert")).toHaveTextContent(
        failure === "decode"
          ? "couldn’t be opened"
          : failure === "dimensions"
            ? "no usable dimensions"
            : "still too large",
      );
      expect(
        screen.getByRole("img", { name: "Selected recipe photo" }),
      ).toHaveAttribute("src", "blob:photo-2");
      expect(
        screen.getByRole("img", { name: "Narrow crop preview" }),
      ).toHaveStyle({ objectPosition: "49% 50%" });
      expect(screen.getByLabelText("Uploaded photo")).toHaveTextContent(
        "scratch/soup.jpg",
      );
      expect(screen.getByRole("button", { name: "Save" })).toBeEnabled();
      expect(
        screen.queryByRole("button", { name: "Retry photo upload" }),
      ).not.toBeInTheDocument();
      expect(upload).toHaveBeenCalledTimes(1);
      expect(browser.revokeObjectURL).toHaveBeenCalledWith("blob:photo-3");
      expect(browser.revokeObjectURL).not.toHaveBeenCalledWith("blob:photo-2");
    },
  );

  it("only uploads the latest selection when decoding overlaps", async () => {
    const user = userEvent.setup();
    const images = controlImageDecoding();
    const upload = vi.fn<UploadPhoto>().mockResolvedValue("scratch/latest.jpg");
    render(<Editor upload={upload} />);
    await user.upload(screen.getByLabelText("Recipe photo"), soupPhoto());
    const lateLoad = images[0].onload;
    const latest = new File(["pie"], "pie.jpg", { type: "image/jpeg" });
    await user.upload(screen.getByLabelText("Recipe photo"), latest);
    await act(async () => lateLoad?.());
    expect(upload).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
    await act(async () => images[1].onload?.());
    expect(upload).toHaveBeenCalledTimes(1);
    expect(upload.mock.calls[0][0]).toBe(latest);
    expect(screen.getByLabelText("Uploaded photo")).toHaveTextContent(
      "scratch/latest.jpg",
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it.each(["discard", "unmount"] as const)(
    "cancels pending preparation on %s",
    async (action) => {
      const user = userEvent.setup();
      const images = controlImageDecoding();
      const upload = vi.fn<UploadPhoto>();
      const { unmount } = render(<Editor upload={upload} />);
      await user.upload(screen.getByLabelText("Recipe photo"), soupPhoto());
      const lateLoad = images[0].onload;
      if (action === "discard")
        await user.click(screen.getByRole("button", { name: "Discard photo" }));
      else unmount();
      await act(async () => lateLoad?.());
      expect(upload).not.toHaveBeenCalled();
      expect(browser.revokeObjectURL).toHaveBeenCalledWith("blob:photo-1");
      if (action === "discard") {
        expect(screen.getByRole("button", { name: "Save" })).toBeEnabled();
        expect(screen.queryByRole("img")).not.toBeInTheDocument();
        expect(screen.queryByText("Preparing photo…")).not.toBeInTheDocument();
      }
    },
  );

  it("reuses the resized file on upload retry", async () => {
    const user = userEvent.setup();
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      fillStyle: "",
      fillRect: vi.fn(),
      drawImage: vi.fn(),
    } as unknown as CanvasRenderingContext2D);
    const encode = vi
      .spyOn(HTMLCanvasElement.prototype, "toBlob")
      .mockImplementation((callback) =>
        callback(new Blob(["resized image"], { type: "image/jpeg" })),
      );
    const upload = vi
      .fn<UploadPhoto>()
      .mockRejectedValueOnce(new Error("Offline"))
      .mockResolvedValueOnce("scratch/retry.jpg");
    render(<Editor upload={upload} />);
    await user.upload(
      screen.getByLabelText("Recipe photo"),
      new File([new Uint8Array(MAX_PHOTO_BYTES)], "large.png", {
        type: "image/png",
      }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Photo upload failed",
    );
    const prepared = upload.mock.calls[0][0];
    expect(prepared.name).toBe("large.jpg");
    expect(prepared.type).toBe("image/jpeg");
    expect(prepared.size).toBeLessThan(MAX_PHOTO_BYTES);
    await user.click(
      screen.getByRole("button", { name: "Retry photo upload" }),
    );
    expect(screen.getByRole("button", { name: "Save" })).toBeEnabled();
    expect(upload.mock.calls[1][0]).toBe(prepared);
    expect(encode).toHaveBeenCalledTimes(1);
  });

  it("cancels a pending candidate when the next pick is invalid", async () => {
    const user = userEvent.setup({ applyAccept: false });
    const images = controlImageDecoding();
    const upload = vi.fn<UploadPhoto>();
    render(<Editor upload={upload} />);
    await user.upload(screen.getByLabelText("Recipe photo"), soupPhoto());
    const lateLoad = images[0].onload;
    await user.upload(
      screen.getByLabelText("Recipe photo"),
      new File(["pdf"], "menu.pdf", { type: "application/pdf" }),
    );
    await act(async () => lateLoad?.());
    expect(upload).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Save" })).toBeEnabled();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Choose a JPEG, PNG, WebP, GIF, or AVIF image",
    );
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("disables selection and focus changes while saving", async () => {
    const user = userEvent.setup();
    const upload = async () => "scratch/soup.jpg";
    const { rerender } = render(<Editor upload={upload} />);
    await user.upload(screen.getByLabelText("Recipe photo"), soupPhoto());
    rerender(<Editor upload={upload} disabled />);
    for (const name of [
      "Choose another photo",
      "Discard photo",
      "Photo focus",
    ]) {
      expect(screen.getByRole("button", { name })).toBeDisabled();
    }
  });

  it("cancels uploads and releases the preview on unmount", async () => {
    const user = userEvent.setup();
    const upload = vi.fn<UploadPhoto>(() => new Promise(() => {}));
    const { unmount } = render(<Editor upload={upload} />);
    await user.upload(screen.getByLabelText("Recipe photo"), soupPhoto());
    unmount();
    expect(upload.mock.calls[0][1].signal.aborted).toBe(true);
    expect(browser.revokeObjectURL).toHaveBeenCalledWith("blob:photo-2");
  });
});

function controlImageDecoding() {
  const images: ControlledImage[] = [];
  class ControlledImage {
    naturalWidth = 1600;
    naturalHeight = 1200;
    src = "";
    onload?: (() => void) | null;
    onerror?: (() => void) | null;
    constructor() {
      images.push(this);
    }
  }
  vi.stubGlobal("Image", ControlledImage);
  return images;
}
