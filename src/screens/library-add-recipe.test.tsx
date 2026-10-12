import { TextractJobStatus } from "@/__generated__/graphql";
import { PollJobsDocument } from "@/features/page-engine/__generated__/pollJobs.generated";
import { PhotoJobsDocument } from "@/features/photos-screen/__generated__/photoJobs.generated";
import { ADD_RECIPE_PATH, addRecipeFromPhotoHref } from "@/lib/routes";
import { render, screen, userEvent, within } from "@/test";
import type { MockLink } from "@apollo/client/testing";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LibraryAddRecipe } from "./library-add-recipe";

const router = {
  back: () => window.history.back(),
  push: vi.fn(),
  replace: vi.fn(),
};

vi.mock("next/navigation", () => ({
  useRouter: () => router,
}));

const JOB_ID = "8777749749830";

const JOB_LIST = {
  textract: {
    __typename: "TextractQuery" as const,
    listJobs: [
      {
        __typename: "TextractJob" as const,
        id: JOB_ID,
        status: TextractJobStatus.READY,
        errorMessage: null,
        retryable: false,
        photo: {
          __typename: "FileInfo" as const,
          url: "https://photos.example.test/textract/risotto.jpg",
          filename: "risotto.jpg",
        },
      },
    ],
  },
};

const MOCKS: readonly MockLink.MockedResponse[] = [
  {
    request: { query: PhotoJobsDocument },
    maxUsageCount: Number.POSITIVE_INFINITY,
    result: { data: JOB_LIST },
  },
  {
    request: { query: PollJobsDocument },
    maxUsageCount: Number.POSITIVE_INFINITY,
    result: { data: JOB_LIST },
  },
];

beforeEach(() => {
  window.history.replaceState(null, "");
  router.push.mockReset();
  router.replace.mockReset();
});

async function addFromPhoto() {
  await userEvent.click(
    screen.getByRole("button", { name: "More ways to add a recipe" }),
  );
  await userEvent.click(
    await screen.findByRole("menuitem", { name: "Add From Photo" }),
  );
  return screen.findByRole("dialog", { name: "Photos" });
}

describe("LibraryAddRecipe", () => {
  it("links to the add form, with no Photos screen open", () => {
    render(<LibraryAddRecipe />, { mocks: MOCKS });

    expect(screen.getByRole("link", { name: "Add Recipe" })).toHaveAttribute(
      "href",
      ADD_RECIPE_PATH,
    );
    expect(screen.queryByRole("dialog", { name: "Photos" })).toBeNull();
  });

  it("opens the Photos screen to add from a photo, picking nothing already there", async () => {
    render(<LibraryAddRecipe />, { mocks: MOCKS });

    const photos = await addFromPhoto();

    expect(
      await within(photos).findByRole("button", { name: "Use risotto.jpg" }),
    ).toBeEnabled();
    expect(
      within(photos).getByRole("button", { name: "Choose photos" }),
    ).toBeEnabled();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("puts the add form, on the picked photo, in the Photos screen's place", async () => {
    render(<LibraryAddRecipe />, { mocks: MOCKS });
    const photos = await addFromPhoto();

    await userEvent.click(
      await within(photos).findByRole("button", { name: "Use risotto.jpg" }),
    );

    expect(router.replace).toHaveBeenCalledExactlyOnceWith(
      addRecipeFromPhotoHref(JOB_ID),
    );
    expect(router.push).not.toHaveBeenCalled();
  });
});
