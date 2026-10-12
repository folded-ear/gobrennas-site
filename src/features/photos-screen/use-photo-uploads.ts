import { preparePhoto } from "@/lib/recipe-photo/prepare-photo";
import {
  PhotoUploadError,
  TEXT_EXTRACTION_TYPES,
  type UploadPhoto,
} from "@/lib/recipe-photo/types";
import { useEffect, useRef, useState } from "react";

/** How many photos are prepared and uploaded at once. */
const UPLOAD_CONCURRENCY = 3;
const FAILURE_MESSAGE = "Couldn’t add this photo. Try again.";

/** A chosen photo on its way to becoming a job. */
export type PhotoUpload = {
  readonly key: string;
  readonly name: string;
  /** A local preview of the photo. */
  readonly previewUrl: string;
  /** Which choosing of photos I came in with; later ones number higher. */
  readonly batch: number;
  readonly phase: "preparing" | "uploading" | "creating" | "created" | "failed";
  /** How much of my upload has been sent. */
  readonly percent?: number;
  /** Why I failed. */
  readonly message?: string;
  /** My job, once I have one. */
  readonly jobId?: string;
};

type Work = {
  upload: UploadPhoto;
  /** I make an uploaded scratch file a job, giving the job's id. */
  createJob: (filename: string, signal: AbortSignal) => Promise<string>;
};

/**
 * I take chosen photos to jobs: prepared, uploaded, then created, a few
 * at a time in the order chosen. When my caller unmounts, whatever has
 * no job yet is dropped.
 */
export function usePhotoUploads({ upload, createJob }: Work) {
  const [uploads, setUploads] = useState<readonly PhotoUpload[]>([]);
  const files = useRef(new Map<string, File>());
  const previews = useRef(new Map<string, string>());
  const controllers = useRef(new Map<string, AbortController>());
  const queue = useRef<string[]>([]);
  const running = useRef(0);
  const batches = useRef(0);

  useEffect(() => {
    const out = controllers.current;
    const waiting = queue;
    const shown = previews.current;
    return () => {
      waiting.current = [];
      out.forEach((it) => it.abort());
      shown.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  function patch(key: string, change: Partial<PhotoUpload>) {
    setUploads((all) =>
      all.map((it) => (it.key === key ? { ...it, ...change } : it)),
    );
  }

  async function run(key: string) {
    const file = files.current.get(key);
    if (file === undefined) return;
    const controller = new AbortController();
    controllers.current.set(key, controller);
    const { signal } = controller;
    try {
      const prepared = await preparePhoto(file, signal, TEXT_EXTRACTION_TYPES);
      patch(key, { phase: "uploading", percent: 0 });
      const filename = await upload(prepared, {
        signal,
        onProgress: (percent) => {
          if (!signal.aborted) patch(key, { percent });
        },
      });
      signal.throwIfAborted();
      patch(key, { phase: "creating", percent: undefined });
      const jobId = await createJob(filename, signal);
      if (!signal.aborted) patch(key, { phase: "created", jobId });
    } catch (failure) {
      if (signal.aborted) return;
      patch(key, {
        phase: "failed",
        percent: undefined,
        message:
          failure instanceof PhotoUploadError
            ? failure.message
            : FAILURE_MESSAGE,
      });
    } finally {
      controllers.current.delete(key);
      running.current -= 1;
      pump();
    }
  }

  function pump() {
    while (running.current < UPLOAD_CONCURRENCY && queue.current.length > 0) {
      running.current += 1;
      void run(queue.current.shift()!);
    }
  }

  return {
    uploads,
    /** I start on photos chosen together, as one batch. */
    add(chosen: readonly File[]) {
      if (chosen.length === 0) return;
      const batch = ++batches.current;
      const added = chosen.map((file): PhotoUpload => {
        const key = crypto.randomUUID();
        const previewUrl = URL.createObjectURL(file);
        files.current.set(key, file);
        previews.current.set(key, previewUrl);
        queue.current.push(key);
        return { key, name: file.name, previewUrl, batch, phase: "preparing" };
      });
      setUploads((all) => [...all, ...added]);
      pump();
    },
    /** I start a failed photo over, from the file I still hold. */
    retry(key: string) {
      patch(key, { phase: "preparing", message: undefined });
      queue.current.push(key);
      pump();
    },
    /** I drop a photo that has no job. */
    dismiss(key: string) {
      controllers.current.get(key)?.abort();
      queue.current = queue.current.filter((it) => it !== key);
      files.current.delete(key);
      const previewUrl = previews.current.get(key);
      if (previewUrl !== undefined) URL.revokeObjectURL(previewUrl);
      previews.current.delete(key);
      setUploads((all) => all.filter((it) => it.key !== key));
    },
  };
}
