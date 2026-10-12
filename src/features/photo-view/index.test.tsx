import { TextractJobStatus } from "@/__generated__/graphql";
import { PollJobsDocument } from "@/features/page-engine/__generated__/pollJobs.generated";
import { DeletePhotoJobDocument } from "@/lib/photo-jobs/__generated__/deletePhotoJob.generated";
import type { RecipeDraftWrites } from "@/lib/recipe-draft-writes";
import {
  buildInMemoryCache,
  render,
  screen,
  userEvent,
  waitFor,
  within,
} from "@/test";
import type { MockLink } from "@apollo/client/testing";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  PhotoJobLinesDocument,
  type PhotoJobLinesQuery,
} from "./__generated__/photoJobLines.generated";
import { PhotoView } from "./index";
import { COOKBOOK_PAGE_LINES, COOKBOOK_PAGE_PARTS } from "./test/cookbook-page";

type Job = PhotoJobLinesQuery["textract"]["jobById"];
type Line = NonNullable<Job["lines"]>[number];

const { PENDING, READY, ERROR } = TextractJobStatus;
const JOB_ID = "8777749749830";
/** How big the overlay is on screen, so a pointer's pixels are thousandths. */
const LAYER_PX = 1000;

const job = (over: Partial<Job> = {}): Job => ({
  __typename: "TextractJob",
  id: JOB_ID,
  status: READY,
  errorMessage: null,
  retryable: false,
  photo: {
    __typename: "FileInfo",
    url: "https://photos.example.test/textract/cookbook-page.jpg",
    filename: "cookbook-page.jpg",
  },
  lines: COOKBOOK_PAGE_LINES as unknown as Line[],
  ...over,
});

/** A line of my own, in a single upright column, n lines down. */
const line = (text: string, n: number): Line => ({
  __typename: "TextractLine",
  text,
  box: {
    __typename: "TextractBox",
    left: 0.1,
    top: 0.1 * (n + 1),
    width: 0.6,
    height: 0.05,
  },
});

/** A recipe of my own, set as cookbooks often are. */
const RISOTTO = job({
  lines: [
    line("SPRING PEA", 0),
    line("RISOTTO with MINT", 1),
    line("2 TBSP OLIVE OIL", 2),
    line("1 cup ARBORIO RICE", 3),
    line("WARM THE STOCK. Add the rice", 4),
    line("and stir until it is tender.", 5),
  ],
});

const answers = (answer: Job): MockLink.MockedResponse => ({
  request: { query: PhotoJobLinesDocument, variables: { id: JOB_ID } },
  result: {
    data: { textract: { __typename: "TextractQuery", jobById: answer } },
  },
});

beforeEach(() => {
  vi.spyOn(SVGElement.prototype, "getBoundingClientRect").mockReturnValue(
    new DOMRect(0, 0, LAYER_PX, LAYER_PX),
  );
  // jsdom has no pointer capture.
  Element.prototype.setPointerCapture = vi.fn();
});

afterEach(() => {
  vi.restoreAllMocks();
});

function renderView({
  loads = [answers(job())] as readonly MockLink.MockedResponse[],
  mocks = [] as readonly MockLink.MockedResponse[],
  isDisabled = false,
} = {}) {
  const cache = buildInMemoryCache();
  const writes = {
    setTitle: vi.fn<RecipeDraftWrites["setTitle"]>(),
    appendIngredients: vi.fn<RecipeDraftWrites["appendIngredients"]>(),
    appendDirections: vi.fn<RecipeDraftWrites["appendDirections"]>(),
  };
  const onClose = vi.fn();
  render(
    <PhotoView
      jobId={JOB_ID}
      writes={writes}
      isDisabled={isDisabled}
      onClose={onClose}
    />,
    {
      cache,
      mocks: [
        ...loads,
        {
          request: { query: PollJobsDocument },
          maxUsageCount: Number.POSITIVE_INFINITY,
          error: new Error("offline"),
        },
        ...mocks,
      ],
    },
  );
  return { cache, writes, onClose };
}

const overlay = () =>
  screen.findByRole("img", { name: "Lines of text on the photo" });

const textBox = () => screen.getByRole("textbox", { name: "Selected text" });

/** I give a view-space point as the pointer's pixels. */
const at = (x: number, y: number) => ({
  clientX: x * LAYER_PX,
  clientY: y * LAYER_PX,
});

/** I drag from one view-space point to another. */
async function drag(from: [number, number], to: [number, number]) {
  const target = await overlay();
  await userEvent.pointer([
    { keys: "[MouseLeft>]", target, coords: at(...from) },
    { target, coords: at(...to) },
    { keys: "[/MouseLeft]", target, coords: at(...to) },
  ]);
}

async function tap(x: number, y: number) {
  const target = await overlay();
  await userEvent.pointer([
    { keys: "[MouseLeft>]", target, coords: at(x, y) },
    { keys: "[/MouseLeft]", target, coords: at(x, y) },
  ]);
}

const rotateRight = async () => {
  await overlay();
  await userEvent.click(screen.getByRole("button", { name: "Rotate right" }));
};

/** The names of a part's lines of the cookbook page, top to bottom. */
const part = (
  name: keyof typeof COOKBOOK_PAGE_PARTS,
  from: number,
  to: number,
) =>
  Array.from(
    { length: to - from + 1 },
    (_, i) => `${name} ${String(from + i).padStart(2, "0")}`,
  ).join("\n");

const linesIn = async (state: "unused" | "selected" | "used") =>
  // Boxes drawn on a photo have no role to find them by.
  (await overlay()).querySelectorAll(`[data-state="${state}"]`).length;

describe("PhotoView", () => {
  it("shows the photo with a box on each line, and nothing selected", async () => {
    renderView();

    expect(await linesIn("unused")).toBe(COOKBOOK_PAGE_LINES.length);
    expect(
      screen.getByRole("img", { name: "cookbook-page.jpg" }),
    ).toBeVisible();
    expect(textBox()).toHaveValue("");
    for (const name of ["Set Title", "Add Ingredients", "Add Directions"]) {
      expect(screen.getByRole("button", { name })).toBeDisabled();
    }
  });

  it("selects the lines a drag touches, in reading order", async () => {
    renderView();
    await rotateRight();

    await drag([0.17, 0.31], [0.52, 0.62]);

    expect(textBox()).toHaveValue(part("left", 7, 21));
    expect(await linesIn("selected")).toBe(15);
  });

  it("replaces the selection with a fresh drag", async () => {
    renderView();
    await rotateRight();
    await drag([0.17, 0.31], [0.52, 0.62]);

    await drag([0.17, 0.31], [0.52, 0.36]);

    expect(textBox()).toHaveValue(part("left", 7, 8));
  });

  it("selects the one line under a tap, and nothing under a tap on none", async () => {
    renderView();
    await rotateRight();

    await tap(0.3, 0.33);
    expect(textBox()).toHaveValue("left 07");

    await tap(0.05, 0.05);
    expect(textBox()).toHaveValue("");
    expect(await linesIn("selected")).toBe(0);
  });

  it("keeps the selection through a turn, reading it the new way up", async () => {
    renderView();
    await rotateRight();
    await drag([0.17, 0.31], [0.52, 0.36]);

    await rotateRight();
    await rotateRight();

    expect(await linesIn("selected")).toBe(2);
    expect(textBox()).toHaveValue("left 08\nleft 07");
  });

  it("keeps a hand edit until the selection changes", async () => {
    renderView({ loads: [answers(RISOTTO)] });
    await tap(0.3, 0.12);
    await userEvent.type(textBox(), " SOUP");

    await tap(0.3, 0.12);
    expect(textBox()).toHaveValue("SPRING PEA SOUP");

    await tap(0.3, 0.22);
    expect(textBox()).toHaveValue("RISOTTO with MINT");
  });

  it("sets the title from the text on one line, capitals rewritten", async () => {
    const { writes } = renderView({ loads: [answers(RISOTTO)] });
    await drag([0.2, 0.08], [0.4, 0.22]);
    expect(textBox()).toHaveValue("SPRING PEA\nRISOTTO with MINT");

    await userEvent.click(screen.getByRole("button", { name: "Set Title" }));

    expect(writes.setTitle).toHaveBeenCalledExactlyOnceWith(
      "Spring Pea Risotto with Mint",
    );
  });

  it("adds each line as an ingredient, capitals rewritten", async () => {
    const { writes } = renderView({ loads: [answers(RISOTTO)] });
    await drag([0.2, 0.28], [0.4, 0.42]);

    await userEvent.click(
      screen.getByRole("button", { name: "Add Ingredients" }),
    );

    expect(writes.appendIngredients).toHaveBeenCalledExactlyOnceWith([
      "2 Tbsp olive oil",
      "1 cup arborio rice",
    ]);
  });

  it("adds the text as directions, capitals rewritten as prose", async () => {
    const { writes } = renderView({ loads: [answers(RISOTTO)] });
    await drag([0.2, 0.48], [0.4, 0.62]);

    await userEvent.click(
      screen.getByRole("button", { name: "Add Directions" }),
    );

    expect(writes.appendDirections).toHaveBeenCalledExactlyOnceWith(
      "Warm the stock. Add the rice\nand stir until it is tender.",
    );
  });

  it("sends the text as corrected by hand", async () => {
    const { writes } = renderView({ loads: [answers(RISOTTO)] });
    await tap(0.3, 0.12);
    await userEvent.type(textBox(), " SOUP");

    await userEvent.click(screen.getByRole("button", { name: "Set Title" }));

    expect(writes.setTitle).toHaveBeenCalledExactlyOnceWith("Spring Pea Soup");
  });

  it("marks lines as used once their text is sent, selected or not", async () => {
    renderView({ loads: [answers(RISOTTO)] });
    await drag([0.2, 0.28], [0.4, 0.42]);
    await userEvent.click(
      screen.getByRole("button", { name: "Add Ingredients" }),
    );
    expect(await linesIn("used")).toBe(0);

    await tap(0.3, 0.12);

    expect(await linesIn("used")).toBe(2);
    expect(await linesIn("selected")).toBe(1);
  });

  it("sends nothing while disabled", async () => {
    renderView({ loads: [answers(RISOTTO)], isDisabled: true });
    await tap(0.3, 0.12);

    expect(textBox()).toHaveValue("SPRING PEA");
    for (const name of ["Set Title", "Add Ingredients", "Add Directions"]) {
      expect(screen.getByRole("button", { name })).toBeDisabled();
    }
  });

  it("closes when asked", async () => {
    const { onClose } = renderView();
    await overlay();

    await userEvent.click(screen.getByRole("button", { name: "Close photo" }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("says so when the photo held no text", async () => {
    renderView({ loads: [answers(job({ lines: [] }))] });

    expect(
      await screen.findByText("No text was found in this photo."),
    ).toBeVisible();
  });

  it("waits on a photo still being read, then loads its lines", async () => {
    const { cache } = renderView({
      loads: [answers(job({ status: PENDING, lines: null })), answers(RISOTTO)],
    });
    expect(await screen.findByText("Reading text…")).toBeVisible();

    // As a poll of the job list would leave it.
    cache.modify({
      id: cache.identify({ __typename: "TextractJob", id: JOB_ID }),
      fields: { status: () => READY },
    });

    expect(await linesIn("unused")).toBe(RISOTTO.lines!.length);
  });

  it("says why a photo couldn't be read, and offers to read it again", async () => {
    renderView({
      loads: [
        answers(
          job({
            status: ERROR,
            lines: null,
            errorMessage: "The photo held no document.",
            retryable: true,
          }),
        ),
      ],
    });

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The photo held no document.",
    );
    expect(screen.getByRole("button", { name: "Retry" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Delete photo" })).toBeEnabled();
  });

  it("offers no retry for a photo that can't be read again, and closes once it's deleted", async () => {
    const { onClose } = renderView({
      loads: [answers(job({ status: ERROR, lines: null }))],
      mocks: [
        {
          request: { query: DeletePhotoJobDocument, variables: { id: JOB_ID } },
          result: {
            data: {
              textract: {
                __typename: "TextractMutation",
                deleteJob: { __typename: "Deletion", id: JOB_ID },
              },
            },
          },
        },
      ],
    });
    await screen.findByRole("alert");
    expect(screen.queryByRole("button", { name: "Retry" })).toBeNull();

    await userEvent.click(screen.getByRole("button", { name: "Delete photo" }));
    await userEvent.click(
      within(await screen.findByRole("alertdialog")).getByRole("button", {
        name: "Delete photo",
      }),
    );

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  it("offers another try when the photo can't be loaded", async () => {
    renderView({
      loads: [
        {
          request: { query: PhotoJobLinesDocument, variables: { id: JOB_ID } },
          error: new Error("offline"),
        },
        answers(RISOTTO),
      ],
    });
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Couldn’t load the photo",
    );

    await userEvent.click(screen.getByRole("button", { name: "Retry" }));

    expect(await linesIn("unused")).toBe(RISOTTO.lines!.length);
  });
});
