"use client";

import { useMutation } from "@apollo/client/react";
import { useCallback } from "react";
import { DeletePhotoJobDocument } from "./__generated__/deletePhotoJob.generated";
import { RetryPhotoJobDocument } from "./__generated__/retryPhotoJob.generated";

const JOB_TYPENAME = "TextractJob";

/**
 * I give a way to have a failed photo job read again. It rejects when the
 * job isn't taken back.
 */
export function useRetryPhotoJob(): (id: string) => Promise<void> {
  const [retry] = useMutation(RetryPhotoJobDocument);
  return useCallback(
    async (id) => {
      const result = await retry({ variables: { id } });
      if (result.data?.textract.retryJob.id !== id) {
        throw new Error("No matching photo job was returned.");
      }
    },
    [retry],
  );
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
