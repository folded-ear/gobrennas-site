import { RecipePhotoUploadDocument } from "@/lib/recipe-photo/__generated__/recipePhotoUpload.generated";
import { soupPhoto, stubPhotoBrowser } from "@/lib/recipe-photo/test/browser";
import {
  act,
  buildInMemoryCache,
  cleanup,
  fireEvent,
  render,
  screen,
  seedFragment,
  userEvent,
  waitFor,
} from "@/test";
import type { MockLink } from "@apollo/client/testing";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CardPhotoFragmentDoc } from "./__generated__/cardPhoto.generated";
import {
  SetCardPhotoDocument,
  type SetCardPhotoMutation,
} from "./__generated__/setCardPhoto.generated";
import { CardPhoto } from "./photo";

const PHOTO = {
  __typename: "Photo" as const,
  url: "/soup.jpg",
  focus: [0.5, 0.5],
};
const SAVED: SetCardPhotoMutation = {
  library: {
    __typename: "LibraryMutation",
    setRecipePhoto: { __typename: "Recipe", id: "soup", photo: PHOTO },
  },
};

function scratch(filename = "scratch/soup.jpg"): MockLink.MockedResponse {
  return {
    request: {
      query: RecipePhotoUploadDocument,
      variables: { contentType: "image/jpeg", originalFilename: "soup.jpg" },
    },
    result: {
      data: {
        profile: {
          __typename: "ProfileQuery",
          scratchFile: {
            __typename: "ScratchUpload",
            url: `https://photos.example.test/${filename}`,
            filename,
            contentType: "image/jpeg",
            cacheControl: "max-age=31536000",
          },
        },
      },
    },
  };
}

function saved(
  filename = "scratch/soup.jpg",
): MockLink.MockedResponse<SetCardPhotoMutation> {
  return {
    request: {
      query: SetCardPhotoDocument,
      variables: { id: "soup", filename },
    },
    result: { data: SAVED },
  };
}

function show({
  mine = true,
  photo = null as typeof PHOTO | null,
  mocks = [] as MockLink.MockedResponse[],
} = {}) {
  const cache = buildInMemoryCache();
  const recipe = seedFragment(cache, CardPhotoFragmentDoc, "cardPhoto", {
    __typename: "Recipe",
    id: "soup",
    name: "Lentil soup",
    mine,
    photo,
  });
  const view = render(<CardPhoto recipe={recipe} />, { cache, mocks });
  return { ...view, cache };
}

// userEvent has no file drag-and-drop API; dispatch the browser drop event.
function drop(file: File) {
  fireEvent.drop(
    screen.getByRole("button", { name: "Add photo: Lentil soup" }),
    { dataTransfer: { files: [file] } },
  );
}

describe("library photo shortcut", () => {
  let browser: ReturnType<typeof stubPhotoBrowser>;
  beforeEach(() => {
    browser = stubPhotoBrowser();
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("uploads a dropped photo once and replaces the placeholder with the centered saved photo", async () => {
    const { cache } = show({ mocks: [scratch(), saved()] });
    expect(
      screen.getByRole("button", { name: "Add photo: Lentil soup" }),
    ).toBeVisible();

    drop(soupPhoto());
    await waitFor(() => expect(browser.requests).toHaveLength(1));
    expect(
      screen.getByRole("button", { name: "Add photo: Lentil soup" }),
    ).toBeDisabled();
    act(() => browser.requests[0].progress(65, 100));
    expect(screen.getByRole("status")).toHaveTextContent("Uploading 65%");
    drop(soupPhoto());
    expect(browser.requests).toHaveLength(1);
    expect(
      cache.readFragment({
        id: "Ingredient:soup",
        fragment: CardPhotoFragmentDoc,
        fragmentName: "cardPhoto",
      })?.photo,
    ).toBeNull();
    act(() => browser.requests[0].respond());

    await waitFor(() =>
      expect(
        screen.queryByRole("button", { name: "Add photo: Lentil soup" }),
      ).not.toBeInTheDocument(),
    );
    expect(screen.getByRole("img", { name: "Lentil soup" })).toHaveAttribute(
      "src",
      expect.stringContaining("soup.jpg"),
    );
    expect(screen.getByRole("img", { name: "Lentil soup" })).toHaveStyle({
      objectPosition: "50% 50%",
    });
    expect(
      cache.readFragment({
        id: "Ingredient:soup",
        fragment: CardPhotoFragmentDoc,
        fragmentName: "cardPhoto",
      }),
    ).toMatchObject({
      name: "Lentil soup",
      mine: true,
      photo: { url: "/soup.jpg" },
    });
  });

  it("rejects non-images and allows choosing a valid photo afterward", async () => {
    show({ mocks: [scratch(), saved()] });
    drop(new File(["notes"], "notes.txt", { type: "text/plain" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Choose a JPEG, PNG, WebP, GIF, or AVIF image.",
    );
    expect(browser.requests).toHaveLength(0);

    await userEvent.upload(
      screen.getByLabelText("Photo for Lentil soup"),
      soupPhoto(),
    );
    await waitFor(() => expect(browser.requests).toHaveLength(1));
    act(() => browser.requests[0].respond());

    await waitFor(() =>
      expect(
        screen.queryByRole("button", { name: "Add photo: Lentil soup" }),
      ).not.toBeInTheDocument(),
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it.each(["upload", "save"])(
    "lets the user try again after a %s failure, with a fresh scratch upload",
    async (failure) => {
      const firstSave = saved();
      show({
        mocks: [
          scratch(),
          ...(failure === "save"
            ? [{ request: firstSave.request, error: new Error("Save failed") }]
            : []),
          scratch("scratch/retry.jpg"),
          saved("scratch/retry.jpg"),
        ],
      });
      drop(soupPhoto());
      await waitFor(() => expect(browser.requests).toHaveLength(1));
      act(() => browser.requests[0].respond(failure === "upload" ? 403 : 200));
      expect(await screen.findByRole("alert")).toHaveTextContent(
        failure === "upload" ? "Photo upload failed" : "Couldn’t save photo",
      );
      expect(
        screen.getByRole("button", { name: "Add photo: Lentil soup" }),
      ).toBeEnabled();

      drop(soupPhoto());
      await waitFor(() => expect(browser.requests).toHaveLength(2));
      act(() => browser.requests[1].respond());

      await waitFor(() =>
        expect(
          screen.queryByRole("button", { name: "Add photo: Lentil soup" }),
        ).not.toBeInTheDocument(),
      );
      expect(browser.requests[1].url).toBe(
        "https://photos.example.test/scratch/retry.jpg",
      );
    },
  );

  it.each([
    { mine: false, photo: null },
    { mine: true, photo: PHOTO },
  ])(
    "keeps a recipe with mine=$mine and photo=$photo read-only",
    ({ mine, photo }) => {
      show({ mine, photo });
      expect(
        screen.getByRole("img", { name: "Lentil soup" }),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "Add photo: Lentil soup" }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByLabelText("Photo for Lentil soup"),
      ).not.toBeInTheDocument();
    },
  );

  it("opens the file chooser from the keyboard", async () => {
    show();
    const choose = vi.spyOn(
      screen.getByLabelText("Photo for Lentil soup"),
      "click",
    );
    await userEvent.tab();
    expect(
      screen.getByRole("button", { name: "Add photo: Lentil soup" }),
    ).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    expect(choose).toHaveBeenCalledOnce();
    choose.mockRestore();
  });

  it("cancels an active upload when the card unmounts", async () => {
    const { unmount } = show({ mocks: [scratch()] });
    drop(soupPhoto());
    await waitFor(() => expect(browser.requests).toHaveLength(1));
    unmount();
    expect(browser.requests[0].aborted).toBe(true);
  });
});
