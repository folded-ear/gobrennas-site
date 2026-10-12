"use client";

import { usePageEngine } from "@/features/page-engine";
import { useMutation } from "@apollo/client/react";
import { toast } from "@heroui/react";
import { useCallback, useState } from "react";
import { DeletePhotoJobDocument } from "./__generated__/deletePhotoJob.generated";
import { RetryPhotoJobDocument } from "./__generated__/retryPhotoJob.generated";

const JOB_TYPENAME = "TextractJob";

/**
 * I give a way to have a failed photo job read again, and say whether
 * that's under way. A job that isn't taken back is said so in a toast.
 */
export function useReadPhotoAgain(): {
  readonly isRetrying: boolean;
  readonly readAgain: (id: string) => Promise<void>;
} {
  const engine = usePageEngine();
  const [retry] = useMutation(RetryPhotoJobDocument);
  const [isRetrying, setIsRetrying] = useState(false);
  const readAgain = useCallback(
    async (id: string) => {
      setIsRetrying(true);
      try {
        const result = await retry({ variables: { id } });
        if (result.data?.textract.retryJob.id !== id) {
          throw new Error("No matching photo job was returned.");
        }
        engine.jobsChanged();
      } catch {
        toast.danger("Couldn’t read the photo again", {
          description: "Please try again.",
        });
      } finally {
        setIsRetrying(false);
      }
    },
    [engine, retry],
  );
  return { isRetrying, readAgain };
}

/**
 * I give a way to delete a photo job, photo and all, and forget it here.
 * It rejects when the job isn't deleted.
 */
export function useDeletePhotoJob(): (id: string) => Promise<void> {
  const [remove] = useMutation(DeletePhotoJobDocument);
  return useCallback(
    async (id) => {
      await remove({
        variables: { id },
        update(cache, { data }) {
          if (data?.textract.deleteJob.id !== id) {
            throw new Error("No matching deletion was returned.");
          }
          cache.evict({
            id: cache.identify({ __typename: JOB_TYPENAME, id }),
          });
          cache.gc();
        },
      });
    },
    [remove],
  );
}
