"use client";

import { DeleteDialog } from "@/components/delete-dialog";
import { useDeletePhotoJob } from "@/lib/photo-jobs/use-photo-job-actions";

type DeletePhotoDialogProps = {
  jobId: string;
  /** The photo's filename. */
  name: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
};

/** I ask before a photo is deleted, then delete it, job and all. */
export function DeletePhotoDialog({
  jobId,
  name,
  isOpen,
  onOpenChange,
}: DeletePhotoDialogProps) {
  const remove = useDeletePhotoJob();
  return (
    <DeleteDialog
      heading={`Delete “${name}”?`}
      confirmLabel="Delete photo"
      pendingLabel="Deleting photo"
      failureTitle="Couldn’t delete photo"
      failureDescription="The photo is still here. Try again, or cancel."
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      onDelete={() => remove(jobId)}
    >
      <p>This permanently deletes the photo and the text read from it.</p>
    </DeleteDialog>
  );
}
