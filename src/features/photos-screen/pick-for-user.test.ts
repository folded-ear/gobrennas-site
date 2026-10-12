import { TextractJobStatus } from "@/__generated__/graphql";
import { describe, expect, it } from "vitest";
import { jobToPick } from "./pick-for-user";
import type { PhotoUpload } from "./use-photo-uploads";

const RAVIOLI_JOB = "8777749749830";
const GNOCCHI_JOB = "8777749749831";

const upload = (
  name: string,
  batch: number,
  over: Partial<PhotoUpload>,
): PhotoUpload => ({
  key: name,
  name,
  previewUrl: `blob:${name}`,
  batch,
  phase: "preparing",
  ...over,
});

const created = (name: string, batch: number, jobId: string) =>
  upload(name, batch, { phase: "created", jobId });

const job = (id: string, status: TextractJobStatus) => ({ id, status });

describe("the job picked for the user", () => {
  it("is none when nothing was chosen", () => {
    expect(
      jobToPick([], [job(RAVIOLI_JOB, TextractJobStatus.READY)]),
    ).toBeUndefined();
  });

  it("is the first photo's, once it's ready", () => {
    expect(
      jobToPick(
        [created("ravioli.jpg", 1, RAVIOLI_JOB)],
        [job(RAVIOLI_JOB, TextractJobStatus.READY)],
      ),
    ).toEqual({ batch: 1, jobId: RAVIOLI_JOB });
  });

  it.each([TextractJobStatus.PENDING, TextractJobStatus.ERROR])(
    "is none while the first photo's job is %s",
    (status) => {
      expect(
        jobToPick(
          [created("ravioli.jpg", 1, RAVIOLI_JOB)],
          [job(RAVIOLI_JOB, status)],
        ),
      ).toBeUndefined();
    },
  );

  it("is none until the first photo's job is listed", () => {
    expect(
      jobToPick([created("ravioli.jpg", 1, RAVIOLI_JOB)], []),
    ).toBeUndefined();
  });

  it("waits for every photo of the batch to get its job", () => {
    const jobs = [job(RAVIOLI_JOB, TextractJobStatus.READY)];
    const ravioli = created("ravioli.jpg", 1, RAVIOLI_JOB);

    expect(
      jobToPick(
        [ravioli, upload("gnocchi.jpg", 1, { phase: "uploading" })],
        jobs,
      ),
    ).toBeUndefined();
    expect(
      jobToPick([ravioli, created("gnocchi.jpg", 1, GNOCCHI_JOB)], jobs),
    ).toEqual({ batch: 1, jobId: RAVIOLI_JOB });
  });

  it("doesn't wait on a later photo that failed", () => {
    expect(
      jobToPick(
        [
          created("ravioli.jpg", 1, RAVIOLI_JOB),
          upload("gnocchi.jpg", 1, { phase: "failed" }),
        ],
        [job(RAVIOLI_JOB, TextractJobStatus.READY)],
      ),
    ).toEqual({ batch: 1, jobId: RAVIOLI_JOB });
  });

  it("is none when the first photo failed, whatever the rest did", () => {
    expect(
      jobToPick(
        [
          upload("ravioli.jpg", 1, { phase: "failed" }),
          created("gnocchi.jpg", 1, GNOCCHI_JOB),
        ],
        [job(GNOCCHI_JOB, TextractJobStatus.READY)],
      ),
    ).toBeUndefined();
  });

  it("looks only at the batch chosen last", () => {
    const jobs = [
      job(RAVIOLI_JOB, TextractJobStatus.READY),
      job(GNOCCHI_JOB, TextractJobStatus.READY),
    ];

    expect(
      jobToPick(
        [
          created("ravioli.jpg", 1, RAVIOLI_JOB),
          created("gnocchi.jpg", 2, GNOCCHI_JOB),
        ],
        jobs,
      ),
    ).toEqual({ batch: 2, jobId: GNOCCHI_JOB });
    expect(
      jobToPick(
        [
          created("ravioli.jpg", 1, RAVIOLI_JOB),
          upload("gnocchi.jpg", 2, { phase: "preparing" }),
        ],
        jobs,
      ),
    ).toBeUndefined();
  });
});
