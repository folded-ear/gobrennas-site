import { vi } from "vitest";

/** Browser boundaries unavailable in jsdom: image decoding, blob URLs, and S3 PUTs. */
export function stubPhotoBrowser() {
  let nextUrl = 0;
  const createObjectURL = vi.fn(() => `blob:photo-${++nextUrl}`);
  const revokeObjectURL = vi.fn();
  vi.stubGlobal(
    "URL",
    class extends URL {
      static createObjectURL = createObjectURL;
      static revokeObjectURL = revokeObjectURL;
    },
  );
  vi.stubGlobal(
    "Image",
    class {
      naturalWidth = 1600;
      naturalHeight = 1200;
      onload?: () => void;
      onerror?: () => void;
      set src(value: string) {
        if (value) queueMicrotask(() => this.onload?.());
      }
    },
  );
  const requests: FakeUpload[] = [];
  class FakeUpload {
    method = "";
    url = "";
    timeout = 0;
    status = 0;
    aborted = false;
    headers = new Map<string, string>();
    body?: File;
    upload: { onprogress?: (event: ProgressEvent) => void } = {};
    onload?: () => void;
    onerror?: () => void;
    ontimeout?: () => void;
    onabort?: () => void;
    constructor() {
      requests.push(this);
    }
    open(method: string, url: string) {
      this.method = method;
      this.url = url;
    }
    setRequestHeader(name: string, value: string) {
      this.headers.set(name, value);
    }
    send(body: File) {
      this.body = body;
    }
    abort() {
      this.aborted = true;
      this.onabort?.();
    }
    respond(status = 200) {
      this.status = status;
      this.onload?.();
    }
    progress(loaded: number, total: number) {
      this.upload.onprogress?.(
        new ProgressEvent("progress", {
          loaded,
          total,
          lengthComputable: true,
        }),
      );
    }
  }
  vi.stubGlobal("XMLHttpRequest", FakeUpload);
  return { requests, createObjectURL, revokeObjectURL };
}

export function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

export const soupPhoto = () =>
  new File(["soup photo"], "soup.jpg", { type: "image/jpeg" });
