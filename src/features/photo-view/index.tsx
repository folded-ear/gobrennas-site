"use client";

import { TextractJobStatus } from "@/__generated__/graphql";
import { DeleteDialog } from "@/components/delete-dialog";
import { usePageEngine, useWatchJobs } from "@/features/page-engine";
import {
  noAllCaps,
  noAllCapsForProse,
  noAllCapsForTitle,
} from "@/lib/no-all-caps";
import {
  useDeletePhotoJob,
  useRetryPhotoJob,
} from "@/lib/photo-jobs/use-photo-job-actions";
import type { RecipeDraftWrites } from "@/lib/recipe-draft-writes";
import { useQuery } from "@apollo/client/react";
import {
  Alert,
  Button,
  ButtonGroup,
  Label,
  Skeleton,
  TextArea,
  TextField,
  toast,
} from "@heroui/react";
import { RotateCcw, RotateCw, X } from "lucide-react";
import Image from "next/image";
import {
  type CSSProperties,
  type ReactNode,
  useEffect,
  useEffectEvent,
  useState,
} from "react";
import {
  PhotoJobLinesDocument,
  type PhotoJobLinesQuery,
} from "./__generated__/photoJobLines.generated";
import {
  type Box,
  isSideways,
  type QuarterTurns,
  toView,
  turn,
} from "./geometry";
import { inReadingOrder } from "./reading-order";
import { type Selection, useLineSelection } from "./use-line-selection";

type Job = PhotoJobLinesQuery["textract"]["jobById"];
type Line = NonNullable<Job["lines"]>[number];

const LINE_BREAK = "\n";
const WHITESPACE_RUNS = /\s+/g;
/** A photo's shape before it has loaded: width over height. */
const UNKNOWN_ASPECT_RATIO = 4 / 3;
/** The photo is the full width of a phone, and half of anything wider. */
const PHOTO_SIZES = "(min-width: 48rem) 50vw, 100vw";
const UNREADABLE = "Text couldn’t be read from this photo.";

type PhotoViewProps = {
  jobId: string;
  /** How I send text into the recipe being written. */
  writes: RecipeDraftWrites;
  isDisabled: boolean;
  onClose: () => void;
};

/**
 * I show a photo with the lines of text read from it. Lines are selected
 * on the photo, corrected in my text box, and sent into a recipe's title,
 * ingredients, or directions.
 */
export function PhotoView({
  jobId,
  writes,
  isDisabled,
  onClose,
}: PhotoViewProps) {
  const query = useQuery(PhotoJobLinesDocument, {
    variables: { id: jobId },
    // Once loaded, the job is asked for again only on purpose, and not
    // because it was deleted from under me.
    nextFetchPolicy: "cache-only",
  });
  const job = query.data?.textract.jobById;
  const status = job?.status;
  const awaitsLines =
    status === TextractJobStatus.READY && (job?.lines ?? null) === null;
  useWatchJobs(status === TextractJobStatus.PENDING);
  function load() {
    void query.refetch().catch(() => {
      /* The query shows the error. */
    });
  }
  // A poll says a watched job is ready, but only I ask for its lines.
  const loadLines = useEffectEvent(load);
  useEffect(() => {
    if (awaitsLines) loadLines();
  }, [awaitsLines]);

  return (
    <section
      aria-label="Photo"
      className="@container flex flex-col gap-sm rounded-field border border-border p-sm"
    >
      <div className="flex items-center justify-between gap-sm">
        <h2 className="min-w-0 truncate text-sm font-medium">
          {job?.photo.filename ?? "Photo"}
        </h2>
        <Button
          isIconOnly
          size="sm"
          variant="tertiary"
          aria-label="Close photo"
          onPress={onClose}
        >
          <X aria-hidden="true" size={16} />
        </Button>
      </div>
      {job === undefined ? (
        query.error ? (
          <Problem
            title="Couldn’t load the photo"
            description="Try again, or close it."
          >
            <Button variant="secondary" onPress={load}>
              Retry
            </Button>
          </Problem>
        ) : (
          <Skeleton
            role="status"
            aria-label="Loading photo"
            className="aspect-[4/3] w-full"
          />
        )
      ) : status === TextractJobStatus.ERROR ? (
        <Unreadable job={job} onDeleted={onClose} />
      ) : job.lines === null || status !== TextractJobStatus.READY ? (
        <p role="status" className="text-sm text-muted">
          Reading text…
        </p>
      ) : job.lines.length === 0 ? (
        <p className="text-sm text-muted">No text was found in this photo.</p>
      ) : (
        <Lines
          // A different job's lines are a different selection.
          key={job.id}
          photo={job.photo}
          lines={job.lines}
          writes={writes}
          isDisabled={isDisabled}
        />
      )}
    </section>
  );
}

function Problem({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col items-start gap-sm">
      <Alert status="danger" role="alert">
        <Alert.Content>
          <Alert.Title>{title}</Alert.Title>
          <Alert.Description>{description}</Alert.Description>
        </Alert.Content>
      </Alert>
      <div className="flex gap-sm">{children}</div>
    </div>
  );
}

function Unreadable({ job, onDeleted }: { job: Job; onDeleted: () => void }) {
  const engine = usePageEngine();
  const retry = useRetryPhotoJob();
  const remove = useDeletePhotoJob();
  const [isRetrying, setIsRetrying] = useState(false);
  const [isAsking, setIsAsking] = useState(false);
  const name = job.photo.filename;

  async function readAgain() {
    setIsRetrying(true);
    try {
      await retry(job.id);
      engine.jobsChanged();
    } catch {
      toast.danger("Couldn’t read the photo again", {
        description: "Please try again.",
      });
    } finally {
      setIsRetrying(false);
    }
  }

  return (
    <Problem
      title="Couldn’t read this photo"
      description={job.errorMessage ?? UNREADABLE}
    >
      {job.retryable ? (
        <Button
          variant="secondary"
          isDisabled={isRetrying}
          onPress={() => {
            void readAgain();
          }}
        >
          Retry
        </Button>
      ) : null}
      <Button variant="danger-soft" onPress={() => setIsAsking(true)}>
        Delete photo
      </Button>
      <DeleteDialog
        heading={`Delete “${name}”?`}
        confirmLabel="Delete photo"
        pendingLabel="Deleting photo"
        failureTitle="Couldn’t delete photo"
        failureDescription="The photo is still here. Try again, or cancel."
        isOpen={isAsking}
        onOpenChange={setIsAsking}
        onDelete={async () => {
          await remove(job.id);
          onDeleted();
        }}
      >
        <p>This permanently deletes the photo and the text read from it.</p>
      </DeleteDialog>
    </Problem>
  );
}

/** I give the bitmap's place in its layer, turned q quarters. */
function turned(q: QuarterTurns, aspectRatio: number): CSSProperties {
  const sideways = isSideways(q);
  return {
    // Turned a quarter, the bitmap's width lies along the layer's height.
    width: sideways ? `${100 * aspectRatio}%` : "100%",
    height: sideways ? `${100 / aspectRatio}%` : "100%",
    transform: `translate(-50%, -50%) rotate(${q * 90}deg)`,
  };
}

function Lines({
  photo,
  lines,
  writes,
  isDisabled,
}: {
  photo: Job["photo"];
  lines: readonly Line[];
  writes: RecipeDraftWrites;
  isDisabled: boolean;
}) {
  const [q, setQ] = useState<QuarterTurns>(0);
  const [aspectRatio, setAspectRatio] = useState(UNKNOWN_ASPECT_RATIO);
  const [text, setText] = useState("");
  const [used, setUsed] = useState<Selection>(new Set());
  const viewBoxes = lines.map((it) => toView(it.box, q));

  /** I give the selected lines' text as the photo reads when turned q. */
  function textOf(selected: Selection, q: QuarterTurns) {
    return inReadingOrder([...selected], (i) => toView(lines[i].box, q))
      .map((i) => lines[i].text)
      .join(LINE_BREAK);
  }

  const { selected, drawn, handlers } = useLineSelection(viewBoxes, (next) =>
    setText(textOf(next, q)),
  );

  function rotate(by: 1 | -1) {
    const next = turn(q, by);
    setQ(next);
    setText(textOf(selected, next));
  }

  /** I send my text somewhere, and mark the lines it came from as used. */
  function send(write: () => void) {
    write();
    setUsed(new Set([...used, ...selected]));
  }

  const hasNoText = text.trim() === "";
  return (
    <div className="grid items-start gap-md @2xl:grid-cols-2">
      <div className="flex min-w-0 flex-col gap-xs">
        <div className="flex justify-between">
          <Button
            isIconOnly
            size="sm"
            variant="tertiary"
            aria-label="Rotate left"
            onPress={() => rotate(-1)}
          >
            <RotateCcw aria-hidden="true" size={16} />
          </Button>
          <Button
            isIconOnly
            size="sm"
            variant="tertiary"
            aria-label="Rotate right"
            onPress={() => rotate(1)}
          >
            <RotateCw aria-hidden="true" size={16} />
          </Button>
        </div>
        <div
          className="relative w-full overflow-hidden"
          style={{
            aspectRatio: isSideways(q) ? 1 / aspectRatio : aspectRatio,
          }}
        >
          <div
            className="pointer-events-none absolute left-1/2 top-1/2"
            style={turned(q, aspectRatio)}
          >
            <Image
              src={photo.url}
              alt={photo.filename}
              fill
              sizes={PHOTO_SIZES}
              draggable={false}
              className="select-none"
              onLoad={({ currentTarget: it }) => {
                if (it.naturalWidth > 0 && it.naturalHeight > 0) {
                  setAspectRatio(it.naturalWidth / it.naturalHeight);
                }
              }}
            />
          </div>
          <svg
            role="img"
            aria-label="Lines of text on the photo"
            viewBox="0 0 1 1"
            preserveAspectRatio="none"
            className="absolute inset-0 h-full w-full cursor-crosshair touch-none select-none"
            {...handlers}
          >
            {viewBoxes.map((box, i) => (
              <LineBox
                key={i}
                box={box}
                state={
                  selected.has(i) ? "selected" : used.has(i) ? "used" : "unused"
                }
              />
            ))}
            {drawn ? (
              <rect
                {...rectOf(drawn)}
                vectorEffect="non-scaling-stroke"
                className="fill-warning/30 stroke-warning"
              />
            ) : null}
          </svg>
        </div>
      </div>
      <div className="flex min-w-0 flex-col gap-sm">
        <TextField value={text} onChange={setText} isDisabled={isDisabled}>
          <Label className="text-xs">Selected text</Label>
          <TextArea
            rows={4}
            className="field-sizing-content min-h-24 max-h-[min(32rem,60vh)] w-full overflow-auto whitespace-pre px-sm py-xs font-mono text-xs"
          />
        </TextField>
        <ButtonGroup>
          <Button
            variant="secondary"
            isDisabled={isDisabled || hasNoText}
            onPress={() =>
              send(() =>
                writes.setTitle(
                  noAllCapsForTitle(text.replace(WHITESPACE_RUNS, " ").trim()),
                ),
              )
            }
          >
            Set Title
          </Button>
          <Button
            variant="secondary"
            isDisabled={isDisabled || hasNoText}
            onPress={() =>
              send(() =>
                writes.appendIngredients(noAllCaps(text).split(LINE_BREAK)),
              )
            }
          >
            Add Ingredients
          </Button>
          <Button
            variant="secondary"
            isDisabled={isDisabled || hasNoText}
            onPress={() =>
              send(() => writes.appendDirections(noAllCapsForProse(text)))
            }
          >
            Add Directions
          </Button>
        </ButtonGroup>
      </div>
    </div>
  );
}

const rectOf = (box: Box) => ({
  x: box.left,
  y: box.top,
  width: box.width,
  height: box.height,
});

const LINE_STATE_CLASSES = {
  unused: "fill-none stroke-danger",
  selected: "fill-accent/40 stroke-danger",
  used: "fill-muted/20 stroke-muted",
} as const;

function LineBox({
  box,
  state,
}: {
  box: Box;
  state: keyof typeof LINE_STATE_CLASSES;
}) {
  return (
    <rect
      {...rectOf(box)}
      data-state={state}
      vectorEffect="non-scaling-stroke"
      className={LINE_STATE_CLASSES[state]}
    />
  );
}
