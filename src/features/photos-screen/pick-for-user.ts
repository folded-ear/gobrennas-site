import { TextractJobStatus } from "@/__generated__/graphql";
import type { PhotoUpload } from "./use-photo-uploads";

type ListedJob = { readonly id: string; readonly status: TextractJobStatus };

/**
 * I give the job to pick on the user's behalf: the first photo's of the
 * batch chosen last, once every photo in that batch has a job or has
 * failed, and that first job is ready. Until then, and if the first
 * photo fails, there is none.
 */
export function jobToPick(
  uploads: readonly PhotoUpload[],
  jobs: readonly ListedJob[],
): { readonly batch: number; readonly jobId: string } | undefined {
  const batch = Math.max(0, ...uploads.map((it) => it.batch));
  const chosen = uploads.filter((it) => it.batch === batch);
  if (
    chosen.length === 0 ||
    chosen.some((it) => it.phase !== "created" && it.phase !== "failed")
  ) {
    return undefined;
  }
  const { jobId } = chosen[0];
  const job = jobs.find((it) => it.id === jobId);
  return jobId !== undefined && job?.status === TextractJobStatus.READY
    ? { batch, jobId }
    : undefined;
}
