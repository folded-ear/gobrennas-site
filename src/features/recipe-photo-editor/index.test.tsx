import { act, cleanup, render, screen, userEvent, waitFor } from "@/test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PhotoEditor } from "./index";
import { deferred, soupPhoto, stubPhotoBrowser } from "./test/browser";
import type { UploadPhoto } from "./types";
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
    vi.unstubAllGlobals();
  });

  it("previews selection immediately, reports real progress, and waits for upload confirmation", async () => {
    const user = userEvent.setup();
    const pending = deferred<string>();
    const upload = vi.fn<UploadPhoto>(() => pending.promise);
    render(<Editor upload={upload} />);
    await user.upload(screen.getByLabelText("Recipe photo"), soupPhoto());
    expect(
      screen.getByRole("img", { name: "Selected recipe photo" }),
    ).toHaveAttribute("src", "blob:photo-1");
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

  it("retries upload without losing the selected image or focus", async () => {
    const user = userEvent.setup();
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
    await user.click(
      screen.getByRole("button", { name: "Retry photo upload" }),
    );
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Save" })).toBeEnabled(),
    );
    expect(upload.mock.calls[1][0]).toBe(file);
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
    expect(browser.revokeObjectURL).toHaveBeenCalledWith("blob:photo-1");
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
    await user.click(screen.getByRole("button", { name: "Discard photo" }));
    expect(screen.getByRole("button", { name: "Save" })).toBeEnabled();
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
    expect(browser.revokeObjectURL).toHaveBeenCalledWith("blob:photo-1");
  });
});
