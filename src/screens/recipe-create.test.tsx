import { TextractJobStatus } from "@/__generated__/graphql";
import { PollJobsDocument } from "@/features/page-engine/__generated__/pollJobs.generated";
import { PhotoJobLinesDocument } from "@/features/photo-view/__generated__/photoJobLines.generated";
import { PhotoJobsDocument } from "@/features/photos-screen/__generated__/photoJobs.generated";
import { RecipeLabelSuggestionsDocument } from "@/features/recipe-form/__generated__/recipeLabelSuggestions.generated";
import { render, screen, userEvent, waitFor, within } from "@/test";
import type { MockLink } from "@apollo/client/testing";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RecipeCreate } from "./recipe-create";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    back: () => window.history.back(),
    replace: vi.fn(),
  }),
}));

const JOB_ID = "8777749749830";
/** How big the photo's overlay is on screen. */
const LAYER_PX = 1000;

const PHOTO = {
  __typename: "FileInfo" as const,
  url: "https://photos.example.test/textract/risotto.jpg",
  filename: "risotto.jpg",
};

const LISTED = {
  __typename: "TextractJob" as const,
  id: JOB_ID,
  status: TextractJobStatus.READY,
  errorMessage: null,
  retryable: false,
  photo: PHOTO,
};

const JOB_LIST = {
  textract: { __typename: "TextractQuery" as const, listJobs: [LISTED] },
};

const MOCKS: readonly MockLink.MockedResponse[] = [
  {
    request: { query: RecipeLabelSuggestionsDocument },
    maxUsageCount: Number.POSITIVE_INFINITY,
    result: { data: { labels: { __typename: "LabelsQuery", all: [] } } },
  },
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
  {
    request: { query: PhotoJobLinesDocument, variables: { id: JOB_ID } },
    maxUsageCount: Number.POSITIVE_INFINITY,
    result: {
      data: {
        textract: {
          __typename: "TextractQuery",
          jobById: {
            ...LISTED,
            lines: [
              {
                __typename: "TextractLine",
                text: "SPRING PEA RISOTTO",
                box: {
                  __typename: "TextractBox",
                  left: 0.1,
                  top: 0.1,
                  width: 0.6,
                  height: 0.05,
                },
              },
            ],
          },
        },
      },
    },
  },
];

beforeEach(() => {
  window.history.replaceState(null, "");
  vi.spyOn(SVGElement.prototype, "getBoundingClientRect").mockReturnValue(
    new DOMRect(0, 0, LAYER_PX, LAYER_PX),
  );
  // jsdom has no pointer capture.
  Element.prototype.setPointerCapture = vi.fn();
});

const title = () => screen.getByRole("textbox", { name: "Title" });

/** I open the Photos screen and pick the one photo there. */
async function pickThePhoto() {
  await userEvent.click(screen.getByRole("button", { name: "Photos" }));
  const photos = await screen.findByRole("dialog", { name: "Photos" });
  await userEvent.click(
    await within(photos).findByRole("button", { name: "Use risotto.jpg" }),
  );
  await waitFor(() =>
    expect(screen.queryByRole("dialog", { name: "Photos" })).toBeNull(),
  );
}

describe("RecipeCreate", () => {
  it("shows the form alone until a photo is picked", () => {
    render(<RecipeCreate />, { mocks: MOCKS });

    expect(title()).toHaveValue("");
    expect(screen.queryByRole("region", { name: "Photo" })).toBeNull();
    expect(screen.queryByRole("dialog", { name: "Photos" })).toBeNull();
  });

  it("opens the Photos screen from its header, leaving photos to be picked", async () => {
    render(<RecipeCreate />, { mocks: MOCKS });

    await userEvent.click(screen.getByRole("button", { name: "Photos" }));

    const photos = await screen.findByRole("dialog", { name: "Photos" });
    expect(
      await within(photos).findByRole("button", { name: "Use risotto.jpg" }),
    ).toBeEnabled();
    expect(screen.queryByRole("region", { name: "Photo" })).toBeNull();
  });

  it("shows a picked photo above the form, with the draft as it was", async () => {
    render(<RecipeCreate />, { mocks: MOCKS });
    await userEvent.type(title(), "Risotto");

    await pickThePhoto();

    const photo = await screen.findByRole("region", { name: "Photo" });
    expect(title()).toHaveValue("Risotto");
    expect(
      photo.compareDocumentPosition(title()) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("writes text from the photo into the form", async () => {
    render(<RecipeCreate />, { mocks: MOCKS });
    await pickThePhoto();
    const lines = await screen.findByRole("img", {
      name: "Lines of text on the photo",
    });

    await userEvent.pointer([
      {
        keys: "[MouseLeft>]",
        target: lines,
        coords: { clientX: 300, clientY: 120 },
      },
      { keys: "[/MouseLeft]", target: lines },
    ]);
    await userEvent.click(screen.getByRole("button", { name: "Set Title" }));

    expect(title()).toHaveValue("Spring Pea Risotto");
    expect(screen.getByRole("button", { name: "Save recipe" })).toBeEnabled();
  });

  it("keeps the draft when the photo is closed", async () => {
    render(<RecipeCreate />, { mocks: MOCKS });
    await userEvent.type(title(), "Risotto");
    await pickThePhoto();
    await screen.findByRole("region", { name: "Photo" });

    await userEvent.click(screen.getByRole("button", { name: "Close photo" }));

    expect(screen.queryByRole("region", { name: "Photo" })).toBeNull();
    expect(title()).toHaveValue("Risotto");
  });

  it("opens on the photo it's handed", async () => {
    render(<RecipeCreate initialJobId={JOB_ID} />, { mocks: MOCKS });

    expect(
      await screen.findByRole("img", { name: "Lines of text on the photo" }),
    ).toBeVisible();
    expect(screen.queryByRole("dialog", { name: "Photos" })).toBeNull();
  });
});
