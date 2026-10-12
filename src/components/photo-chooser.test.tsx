import { fireEvent, render, screen, userEvent } from "@/test";
import { describe, expect, it, vi } from "vitest";
import { PhotoChooser } from "./photo-chooser";

const photo = (name: string) =>
  new File(["a page of a cookbook"], name, { type: "image/jpeg" });

const RAVIOLI = photo("ravioli.jpg");
const GNOCCHI = photo("gnocchi.jpg");

function renderChooser(
  props: Partial<Parameters<typeof PhotoChooser>[0]> = {},
) {
  const onChoose = vi.fn<(files: File[]) => void>();
  render(
    <PhotoChooser
      label="Choose photo"
      inputLabel="Cookbook photos"
      onChoose={onChoose}
      {...props}
    />,
  );
  return onChoose;
}

const dropOn = (target: HTMLElement, files: File[]) =>
  // userEvent has no drop.
  fireEvent.drop(target, { dataTransfer: { files } });

describe("PhotoChooser", () => {
  it("offers to choose a photo or drop one", () => {
    renderChooser();

    expect(screen.getByRole("button", { name: "Choose photo" })).toBeEnabled();
    expect(screen.getByText("Or drop an image here.")).toBeVisible();
  });

  it("gives the photo picked", async () => {
    const onChoose = renderChooser();

    await userEvent.upload(screen.getByLabelText("Cookbook photos"), RAVIOLI);

    expect(onChoose).toHaveBeenCalledExactlyOnceWith([RAVIOLI]);
  });

  it("gives the photo dropped", () => {
    const onChoose = renderChooser();

    dropOn(screen.getByText("Or drop an image here."), [RAVIOLI]);

    expect(onChoose).toHaveBeenCalledExactlyOnceWith([RAVIOLI]);
  });

  it("gives only the first of several dropped, taking one", () => {
    const onChoose = renderChooser();

    dropOn(screen.getByText("Or drop an image here."), [RAVIOLI, GNOCCHI]);

    expect(onChoose).toHaveBeenCalledExactlyOnceWith([RAVIOLI]);
  });

  it("gives every photo picked or dropped, taking several", async () => {
    const onChoose = renderChooser({ multiple: true });

    await userEvent.upload(screen.getByLabelText("Cookbook photos"), [
      RAVIOLI,
      GNOCCHI,
    ]);
    dropOn(screen.getByText("Or drop images here."), [GNOCCHI, RAVIOLI]);

    expect(onChoose.mock.calls).toEqual([
      [[RAVIOLI, GNOCCHI]],
      [[GNOCCHI, RAVIOLI]],
    ]);
  });

  it("gives nothing while disabled", () => {
    const onChoose = renderChooser({ isDisabled: true });

    dropOn(screen.getByText("Or drop an image here."), [RAVIOLI]);

    expect(screen.getByRole("button", { name: "Choose photo" })).toBeDisabled();
    expect(onChoose).not.toHaveBeenCalled();
  });

  it("gives nothing for a drop with no files", () => {
    const onChoose = renderChooser();

    dropOn(screen.getByText("Or drop an image here."), []);

    expect(onChoose).not.toHaveBeenCalled();
  });
});
