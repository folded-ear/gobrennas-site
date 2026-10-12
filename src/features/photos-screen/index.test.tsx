import { TextractJobStatus } from "@/__generated__/graphql";
import { PollJobsDocument } from "@/features/page-engine/__generated__/pollJobs.generated";
import { RecipePhotoUploadDocument } from "@/lib/recipe-photo/__generated__/recipePhotoUpload.generated";
import { stubPhotoBrowser } from "@/lib/recipe-photo/test/browser";
import {
  act,
  buildInMemoryCache,
  cleanup,
  render,
  screen,
  userEvent,
  waitFor,
  within,
} from "@/test";
import type { MockLink } from "@apollo/client/testing";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CreatePhotoJobDocument } from "./__generated__/createPhotoJob.generated";
import { DeletePhotoJobDocument } from "./__generated__/deletePhotoJob.generated";
import { PhotoJobsDocument } from "./__generated__/photoJobs.generated";
import { RetryPhotoJobDocument } from "./__generated__/retryPhotoJob.generated";
import { PhotosScreen } from "./index";
import { jobList, photoJob, type ListedPhotoJob } from "./test/jobs";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ back: vi.fn() }),
}));

const { PENDING, READY, ERROR } = TextractJobStatus;
const RAVIOLI = photoJob("8777749749830", "ravioli.jpg", READY);
const GNOCCHI = photoJob("8777749749831", "gnocchi.jpg", PENDING);
const RISOTTO = photoJob("8777749749832", "risotto.jpg", ERROR, {
  errorMessage: "The photo held no document.",
  retryable: true,
});

const photoFile = (name: string) =>
  new File(["a page of a cookbook"], name, { type: "image/jpeg" });

const listed = (jobs: readonly ListedPhotoJob[]): MockLink.MockedResponse => ({
  request: { query: PhotoJobsDocument },
  result: { data: jobList(jobs) },
});

/** The scratch upload a chosen photo asks for. */
const scratch = (name: string): MockLink.MockedResponse => ({
  request: {
    query: RecipePhotoUploadDocument,
    variables: { contentType: "image/jpeg", originalFilename: name },
  },
  result: {
    data: {
      profile: {
        __typename: "ProfileQuery",
        scratchFile: {
          __typename: "ScratchUpload",
          url: `https://photos.example.test/scratch/${name}`,
          filename: `scratch/${name}`,
          contentType: "image/jpeg",
          cacheControl: "max-age=31536000",
        },
      },
    },
  },
});

/** The job an uploaded scratch file becomes. */
const creates = (job: ListedPhotoJob): MockLink.MockedResponse => ({
  request: {
    query: CreatePhotoJobDocument,
    variables: { filename: `scratch/${job.photo.filename}` },
  },
  result: {
    data: {
      textract: { __typename: "TextractMutation", createPreUploadedJob: job },
    },
  },
});

let browser: ReturnType<typeof stubPhotoBrowser>;

beforeEach(() => {
  browser = stubPhotoBrowser();
});

afterEach(() => {
  // Unmounting releases previews, which needs the stubbed browser.
  cleanup();
  vi.unstubAllGlobals();
});

function renderPhotos({
  jobs = [] as readonly ListedPhotoJob[],
  mocks = [] as readonly MockLink.MockedResponse[],
  /** How the job list answers, when not simply with the jobs. */
  listing = [listed(jobs)] as readonly MockLink.MockedResponse[],
  /** Whether the engine's own polls fail, as with the server down. */
  pollsFail = false,
  picksForUser = false,
} = {}) {
  const cache = buildInMemoryCache();
  const onPick = vi.fn<(jobId: string) => void>();
  /** The jobs the server has, which the engine's own polls answer with. */
  let onServer = jobs;
  const view = render(
    <PhotosScreen isOpen picksForUser={picksForUser} onPick={onPick} />,
    {
      cache,
      mocks: [
        ...listing,
        {
          request: { query: PollJobsDocument },
          maxUsageCount: Number.POSITIVE_INFINITY,
          ...(pollsFail
            ? { error: new Error("offline") }
            : { result: () => ({ data: jobList(onServer) }) }),
        },
        ...mocks,
      ],
    },
  );
  /** I change the server's jobs and land a poll of them at once. */
  const poll = (next: readonly ListedPhotoJob[]) => {
    onServer = next;
    cache.writeQuery({ query: PhotoJobsDocument, data: jobList(next) });
  };
  return { onPick, poll, ...view };
}

const tileOf = (name: string) =>
  screen.findByRole("listitem", { name: new RegExp(name) });

const choose = (...files: File[]) =>
  userEvent.upload(screen.getByLabelText("Cookbook photos"), files);

/** I answer the nth upload to storage. */
const stored = async (n: number, status = 200) => {
  await waitFor(() => expect(browser.requests.length).toBeGreaterThan(n));
  browser.requests[n].respond(status);
};

describe("PhotosScreen", () => {
  it("shows nothing while closed", () => {
    render(<PhotosScreen isOpen={false} onPick={vi.fn()} />);

    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("offers to choose photos above the user's photos, each by its state", async () => {
    renderPhotos({ jobs: [RAVIOLI, GNOCCHI, RISOTTO] });

    expect(
      within(screen.getByRole("dialog", { name: "Photos" })).getByRole(
        "button",
        { name: "Choose photos" },
      ),
    ).toBeEnabled();
    expect(
      within(await tileOf("ravioli.jpg")).getByRole("button", {
        name: "Use ravioli.jpg",
      }),
    ).toBeEnabled();
    expect(await tileOf("gnocchi.jpg")).toHaveTextContent("Reading text…");
    expect(await tileOf("risotto.jpg")).toHaveTextContent(
      "The photo held no document.",
    );
    expect(
      screen
        .getAllByRole("listitem")
        .map((it) => it.getAttribute("aria-label")),
    ).toEqual(["ravioli.jpg", "gnocchi.jpg", "risotto.jpg"]);
  });

  it("says so when the user has no photos", async () => {
    renderPhotos();

    expect(await screen.findByText("No photos yet.")).toBeVisible();
  });

  it("offers another try when the photos can't be loaded", async () => {
    renderPhotos({
      pollsFail: true,
      listing: [
        { request: { query: PhotoJobsDocument }, error: new Error("offline") },
        listed([RAVIOLI]),
      ],
    });

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Couldn’t load photos",
    );
    await userEvent.click(screen.getByRole("button", { name: "Retry" }));

    expect(await tileOf("ravioli.jpg")).toBeVisible();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("picks a ready photo when it's pressed", async () => {
    const { onPick } = renderPhotos({ jobs: [GNOCCHI, RAVIOLI] });

    await userEvent.click(
      await screen.findByRole("button", { name: "Use ravioli.jpg" }),
    );

    expect(onPick).toHaveBeenCalledExactlyOnceWith(RAVIOLI.id);
    expect(
      screen.queryByRole("button", { name: "Use gnocchi.jpg" }),
    ).toBeNull();
  });

  it("takes a chosen photo to a job, then shows the job once it's listed", async () => {
    const soup = photoJob("8777749749840", "soup.jpg", PENDING);
    const { poll, onPick } = renderPhotos({
      mocks: [scratch("soup.jpg"), creates(soup)],
    });
    await screen.findByText("No photos yet.");

    await choose(photoFile("soup.jpg"));
    const tile = await tileOf("soup.jpg");
    await stored(0);

    await waitFor(() => expect(tile).toHaveTextContent("Reading text…"));
    poll([{ ...soup, status: READY }]);
    expect(
      await screen.findByRole("button", { name: "Use soup.jpg" }),
    ).toBeEnabled();
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
    expect(onPick).not.toHaveBeenCalled();
  });

  it("says how far an upload has got", async () => {
    renderPhotos({ mocks: [scratch("soup.jpg")] });

    await choose(photoFile("soup.jpg"));
    const tile = await tileOf("soup.jpg");
    await waitFor(() => expect(browser.requests).toHaveLength(1));
    act(() => browser.requests[0].progress(40, 100));

    await waitFor(() => expect(tile).toHaveTextContent("Uploading 40%…"));
  });

  it("offers a failed upload another try from the same file, or to be dismissed", async () => {
    const soup = photoJob("8777749749840", "soup.jpg", PENDING);
    renderPhotos({
      mocks: [
        scratch("soup.jpg"),
        scratch("soup.jpg"),
        creates(soup),
        scratch("stew.jpg"),
      ],
    });

    await choose(photoFile("soup.jpg"), photoFile("stew.jpg"));
    await stored(0, 500);
    await stored(1, 500);
    const soupTile = await tileOf("soup.jpg");
    await waitFor(() =>
      expect(within(soupTile).getByRole("alert")).toHaveTextContent(
        "Photo upload failed. Please retry.",
      ),
    );

    await userEvent.click(
      within(soupTile).getByRole("button", { name: "Retry soup.jpg" }),
    );
    await stored(2);
    await waitFor(() => expect(soupTile).toHaveTextContent("Reading text…"));

    await userEvent.click(
      await screen.findByRole("button", { name: "Dismiss stew.jpg" }),
    );
    expect(screen.queryByRole("listitem", { name: /stew.jpg/ })).toBeNull();
  });

  it("drops an upload that has no job when it closes", async () => {
    const { unmount } = renderPhotos({ mocks: [scratch("soup.jpg")] });
    await choose(photoFile("soup.jpg"));
    await waitFor(() => expect(browser.requests).toHaveLength(1));

    unmount();

    expect(browser.requests[0].aborted).toBe(true);
  });

  it("asks before deleting a photo, then drops it", async () => {
    renderPhotos({
      jobs: [RAVIOLI, GNOCCHI],
      mocks: [
        {
          request: {
            query: DeletePhotoJobDocument,
            variables: { id: RAVIOLI.id },
          },
          result: {
            data: {
              textract: {
                __typename: "TextractMutation",
                deleteJob: { __typename: "Deletion", id: RAVIOLI.id },
              },
            },
          },
        },
      ],
    });

    await userEvent.click(
      await screen.findByRole("button", { name: "Delete ravioli.jpg" }),
    );
    const asking = await screen.findByRole("alertdialog", {
      name: "Delete “ravioli.jpg”?",
    });
    await userEvent.click(
      within(asking).getByRole("button", { name: "Delete photo" }),
    );

    await waitFor(() =>
      expect(screen.queryByRole("listitem", { name: /ravioli/ })).toBeNull(),
    );
    expect(await tileOf("gnocchi.jpg")).toBeVisible();
  });

  it("keeps a photo when its deletion is cancelled", async () => {
    renderPhotos({ jobs: [RAVIOLI] });

    await userEvent.click(
      await screen.findByRole("button", { name: "Delete ravioli.jpg" }),
    );
    await userEvent.click(
      within(await screen.findByRole("alertdialog")).getByRole("button", {
        name: "Cancel",
      }),
    );

    expect(await tileOf("ravioli.jpg")).toBeVisible();
  });

  it("reads a failed photo again when asked, if it can be", async () => {
    renderPhotos({
      jobs: [RISOTTO],
      mocks: [
        {
          request: {
            query: RetryPhotoJobDocument,
            variables: { id: RISOTTO.id },
          },
          result: {
            data: {
              textract: {
                __typename: "TextractMutation",
                retryJob: {
                  ...RISOTTO,
                  status: PENDING,
                  errorMessage: null,
                  retryable: false,
                },
              },
            },
          },
        },
      ],
    });
    const tile = await tileOf("risotto.jpg");

    await userEvent.click(
      within(tile).getByRole("button", { name: "Read risotto.jpg again" }),
    );

    await waitFor(() => expect(tile).toHaveTextContent("Reading text…"));
  });

  it("offers no retry for a failed photo that can't be read again", async () => {
    renderPhotos({ jobs: [{ ...RISOTTO, retryable: false }] });

    const tile = await tileOf("risotto.jpg");

    expect(
      within(tile).queryByRole("button", { name: "Read risotto.jpg again" }),
    ).toBeNull();
    expect(
      within(tile).getByRole("button", { name: "Delete risotto.jpg" }),
    ).toBeEnabled();
  });

  describe("picking for the user", () => {
    const soup = photoJob("8777749749840", "soup.jpg", PENDING);

    async function chooseSoup(picksForUser: boolean) {
      const rendered = renderPhotos({
        picksForUser,
        mocks: [scratch("soup.jpg"), creates(soup)],
      });
      await choose(photoFile("soup.jpg"));
      const tile = await tileOf("soup.jpg");
      await stored(0);
      await waitFor(() => expect(tile).toHaveTextContent("Reading text…"));
      return rendered;
    }

    it("picks the chosen photo once it's ready", async () => {
      const { onPick, poll } = await chooseSoup(true);
      expect(onPick).not.toHaveBeenCalled();

      poll([{ ...soup, status: READY }]);

      await waitFor(() =>
        expect(onPick).toHaveBeenCalledExactlyOnceWith(soup.id),
      );
    });

    it("leaves the picking to the user when not allowed to", async () => {
      const { onPick, poll } = await chooseSoup(false);

      poll([{ ...soup, status: READY }]);

      await screen.findByRole("button", { name: "Use soup.jpg" });
      expect(onPick).not.toHaveBeenCalled();
    });

    it("picks nothing for a photo already there", async () => {
      const { onPick } = renderPhotos({ picksForUser: true, jobs: [RAVIOLI] });

      await screen.findByRole("button", { name: "Use ravioli.jpg" });

      expect(onPick).not.toHaveBeenCalled();
    });
  });
});
