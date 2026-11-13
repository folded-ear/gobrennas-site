import { vi } from "vitest";

/** A stand-in for the browser's geolocation permission, driven by the test. */
export type FakePermission = {
  /** I change the permission, as the browser would. */
  set(state: PermissionState): void;
};

/** I install a fake permissions API on navigator, for the current test. */
export function installFakePermission(state: PermissionState): FakePermission {
  const status = Object.assign(new EventTarget(), { state });
  vi.stubGlobal("navigator", {
    ...navigator,
    permissions: {
      query: ({ name }: { name: string }) =>
        name === "geolocation"
          ? Promise.resolve(status)
          : Promise.reject(new TypeError(`No ${name} permission`)),
    },
  });
  return {
    set(next) {
      status.state = next;
      status.dispatchEvent(new Event("change"));
    },
  };
}
