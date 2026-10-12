"use client";

import { TextractJobStatus } from "@/__generated__/graphql";
import { DeleteDialog } from "@/components/delete-dialog";
import { DeleteIcon } from "@/components/icons";
import { PhotoChooser } from "@/components/photo-chooser";
import { Screen } from "@/components/screen";
import { usePageEngine, useWatchJobs } from "@/features/page-engine";
import {
  PhotoJobFragment,
  PhotoJobFragmentDoc,
} from "@/lib/photo-jobs/__generated__/photoJob.generated";
import {
  useDeletePhotoJob,
  useRetryPhotoJob,
} from "@/lib/photo-jobs/use-photo-job-actions";
import { useUploadPhoto } from "@/lib/recipe-photo/use-upload-photo";
import { FragmentType } from "@apollo/client";
import { useFragment, useMutation, useQuery } from "@apollo/client/react";
import { Alert, Button, Skeleton, toast } from "@heroui/react";
import { X } from "lucide-react";
import Image from "next/image";
import {
  type ReactNode,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
} from "react";
import { CreatePhotoJobDocument } from "./__generated__/createPhotoJob.generated";
import { PhotoJobsDocument } from "./__generated__/photoJobs.generated";
import { jobToPick } from "./pick-for-user";
import { type PhotoUpload, usePhotoUploads } from "./use-photo-uploads";

const READING = "Reading text…";
const UNREADABLE = "Text couldn’t be read from this photo.";
/** A tile's photo is about half a phone wide, less on wider screens. */
const TILE_SIZES = "(min-width: 64rem) 25vw, (min-width: 40rem) 33vw, 50vw";
const LOADING_TILES = 3;

type PhotosScreenProps = {
  isOpen: boolean;
  /**
   * Whether I pick on the user's behalf once photos they just chose are
   * ready, rather than waiting for a press.
   */
  picksForUser?: boolean;
  onPick: (jobId: string) => void;
};

/**
 * I show the user's photos and take new ones. A photo whose text has been
 * read can be picked. Photos I'm still uploading when I close are dropped;
 * those that already have a job carry on.
 */
export function PhotosScreen({
  isOpen,
  picksForUser = false,
  onPick,
}: PhotosScreenProps) {
  return (
    <Screen
      label="Photos"
      isOpen={isOpen}
      header={<h2 className="pb-sm text-xl">Photos</h2>}
    >
      <Photos picksForUser={picksForUser} onPick={onPick} />
    </Screen>
  );
}

function Photos({
  picksForUser,
  onPick,
}: Required<Pick<PhotosScreenProps, "picksForUser" | "onPick">>) {
  useWatchJobs(true);
  const engine = usePageEngine();
  const query = useQuery(PhotoJobsDocument);
  const uploadPhoto = useUploadPhoto();
  const [createJob] = useMutation(CreatePhotoJobDocument);
  const { uploads, add, retry, dismiss } = usePhotoUploads({
    upload: uploadPhoto,
    async createJob(filename, signal) {
      const result = await createJob({
        variables: { filename },
        context: { fetchOptions: { signal } },
      });
      const id = result.data?.textract.createPreUploadedJob.id;
      if (id === undefined) throw new Error("No photo job was returned.");
      engine.jobsChanged();
      return id;
    },
  });

  const jobs = query.data?.textract.listJobs ?? [];
  const listed = new Set(jobs.map((it) => it.id));
  const working = uploads.filter(
    (it) => it.jobId === undefined || !listed.has(it.jobId),
  );

  const toPick = picksForUser ? jobToPick(uploads, jobs) : undefined;
  const pickedBatch = useRef(0);
  const pick = useEffectEvent((batch: number, jobId: string) => {
    if (pickedBatch.current === batch) return;
    pickedBatch.current = batch;
    onPick(jobId);
  });
  const batchToPick = toPick?.batch;
  const jobIdToPick = toPick?.jobId;
  useEffect(() => {
    if (batchToPick !== undefined && jobIdToPick !== undefined) {
      pick(batchToPick, jobIdToPick);
    }
  }, [batchToPick, jobIdToPick]);

  const isLoading = query.loading && query.data === undefined;
  const hasFailed = query.error !== undefined && query.data === undefined;
  return (
    <div className="flex flex-col gap-md">
      <PhotoChooser
        multiple
        label="Choose photos"
        inputLabel="Cookbook photos"
        onChoose={add}
      />
      {hasFailed ? (
        <div className="flex flex-col items-start gap-sm">
          <Alert status="danger" role="alert">
            <Alert.Content>
              <Alert.Title>Couldn’t load photos</Alert.Title>
              <Alert.Description>
                Photos you choose now are still uploaded.
              </Alert.Description>
            </Alert.Content>
          </Alert>
          <Button
            variant="secondary"
            onPress={() => {
              void query.refetch().catch(() => {
                /* The query shows the error. */
              });
            }}
          >
            Retry
          </Button>
        </div>
      ) : null}
      {isLoading ? (
        <div role="status" aria-label="Loading photos" className={GRID_CLASSES}>
          {Array.from({ length: LOADING_TILES }, (_, i) => (
            <Skeleton key={i} className="aspect-[4/3] w-full" />
          ))}
        </div>
      ) : null}
      {working.length > 0 || jobs.length > 0 ? (
        <ul aria-label="Photos" className={GRID_CLASSES}>
          {working.map((it) => (
            <UploadTile
              key={it.key}
              upload={it}
              onRetry={() => retry(it.key)}
              onDismiss={() => dismiss(it.key)}
            />
          ))}
          {jobs.map((it) => (
            <JobTile key={it.id} job={it} onPick={onPick} />
          ))}
        </ul>
      ) : null}
      {!isLoading && !hasFailed && working.length === 0 && jobs.length === 0 ? (
        <p className="text-sm text-muted">No photos yet.</p>
      ) : null}
    </div>
  );
}

const GRID_CLASSES = "grid grid-cols-2 gap-sm sm:grid-cols-3 lg:grid-cols-4";

function Tile({
  name,
  photo,
  children,
}: {
  name: string;
  photo: ReactNode;
  children: ReactNode;
}) {
  return (
    <li
      aria-label={name}
      className="flex min-w-0 flex-col overflow-hidden rounded-field border border-border"
    >
      <div className="relative aspect-[4/3] w-full">{photo}</div>
      <div className="flex min-w-0 flex-col gap-xs p-xs">
        <p className="truncate text-sm">{name}</p>
        {children}
      </div>
    </li>
  );
}

function progressOf({ phase, percent }: PhotoUpload): string {
  switch (phase) {
    case "preparing":
      return "Preparing…";
    case "uploading":
      return `Uploading ${percent ?? 0}%…`;
    case "creating":
      return "Starting…";
    default:
      return READING;
  }
}

function UploadTile({
  upload,
  onRetry,
  onDismiss,
}: {
  upload: PhotoUpload;
  onRetry: () => void;
  onDismiss: () => void;
}) {
  const { name, previewUrl, phase, message } = upload;
  return (
    <Tile
      name={name}
      photo={
        <Image
          src={previewUrl}
          alt=""
          fill
          unoptimized
          className="object-cover opacity-40"
        />
      }
    >
      {phase === "failed" ? (
        <>
          <p role="alert" className="text-xs text-danger">
            {message}
          </p>
          <div className="flex items-center justify-end gap-xs">
            <Button
              size="sm"
              variant="secondary"
              aria-label={`Retry ${name}`}
              onPress={onRetry}
            >
              Retry
            </Button>
            <Button
              isIconOnly
              size="sm"
              variant="tertiary"
              aria-label={`Dismiss ${name}`}
              onPress={onDismiss}
            >
              <X aria-hidden="true" size={16} />
            </Button>
          </div>
        </>
      ) : (
        <p role="status" className="text-xs text-muted">
          {progressOf(upload)}
        </p>
      )}
    </Tile>
  );
}

function JobTile({
  job,
  onPick,
}: {
  job: FragmentType<PhotoJobFragment>;
  onPick: (jobId: string) => void;
}) {
  const { data, complete } = useFragment({
    fragment: PhotoJobFragmentDoc,
    fragmentName: "photoJob",
    from: job,
  });
  const engine = usePageEngine();
  const retry = useRetryPhotoJob();
  const remove = useDeletePhotoJob();
  const [isRetrying, setIsRetrying] = useState(false);
  const [isAsking, setIsAsking] = useState(false);
  if (!complete) return null;
  const { id, status, photo } = data;
  const name = photo.filename;

  async function readAgain() {
    setIsRetrying(true);
    try {
      await retry(id);
      engine.jobsChanged();
    } catch {
      toast.danger("Couldn’t read the photo again", {
        description: "Please try again.",
      });
    } finally {
      setIsRetrying(false);
    }
  }

  const picture = (
    <Image
      src={photo.url}
      alt=""
      fill
      sizes={TILE_SIZES}
      className={
        status === TextractJobStatus.READY
          ? "object-cover"
          : "object-cover opacity-40"
      }
    />
  );
  return (
    <Tile
      name={name}
      photo={
        status === TextractJobStatus.READY ? (
          <Button
            variant="ghost"
            aria-label={`Use ${name}`}
            className="absolute inset-0 h-full w-full min-w-0 rounded-none p-0"
            onPress={() => onPick(id)}
          >
            {picture}
          </Button>
        ) : (
          picture
        )
      }
    >
      {status === TextractJobStatus.PENDING ? (
        <p role="status" className="text-xs text-muted">
          {READING}
        </p>
      ) : null}
      {status === TextractJobStatus.ERROR ? (
        <p role="alert" className="text-xs text-danger">
          {data.errorMessage ?? UNREADABLE}
        </p>
      ) : null}
      <div className="flex items-center justify-end gap-xs">
        {status === TextractJobStatus.ERROR && data.retryable ? (
          <Button
            size="sm"
            variant="secondary"
            aria-label={`Read ${name} again`}
            isDisabled={isRetrying}
            onPress={() => {
              void readAgain();
            }}
          >
            Retry
          </Button>
        ) : null}
        <Button
          isIconOnly
          size="sm"
          variant="tertiary"
          aria-label={`Delete ${name}`}
          onPress={() => setIsAsking(true)}
        >
          <DeleteIcon aria-hidden size="small" />
        </Button>
      </div>
      <DeleteDialog
        heading={`Delete “${name}”?`}
        confirmLabel="Delete photo"
        pendingLabel="Deleting photo"
        failureTitle="Couldn’t delete photo"
        failureDescription="The photo is still here. Try again, or cancel."
        isOpen={isAsking}
        onOpenChange={setIsAsking}
        onDelete={() => remove(id)}
      >
        <p>This permanently deletes the photo and the text read from it.</p>
      </DeleteDialog>
    </Tile>
  );
}
