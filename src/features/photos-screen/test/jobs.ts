import { TextractJobStatus } from "@/__generated__/graphql";

/** A photo job as the API lists it. */
export function photoJob(
  id: string,
  filename: string,
  status: TextractJobStatus,
  over: { errorMessage?: string; retryable?: boolean } = {},
) {
  return {
    __typename: "TextractJob" as const,
    id,
    status,
    errorMessage: null as string | null,
    retryable: false,
    ...over,
    photo: {
      __typename: "FileInfo" as const,
      url: `https://photos.example.test/textract/${filename}`,
      filename,
    },
  };
}

export type ListedPhotoJob = ReturnType<typeof photoJob>;

/** The job list as its query answers. */
export const jobList = (jobs: readonly ListedPhotoJob[]) => ({
  textract: { __typename: "TextractQuery" as const, listJobs: [...jobs] },
});
