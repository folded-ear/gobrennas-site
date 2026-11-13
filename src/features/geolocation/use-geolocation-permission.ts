import { useEffect, useState } from "react";
import { useGrantedThisLoad } from "./granted-this-load";

/**
 * I give the page's geolocation permission, following its changes. I give
 * null until it's known, and where the browser can't say. One that would
 * still ask, after the browser gave a position this page load, I give as
 * granted.
 */
export function useGeolocationPermission(): PermissionState | null {
  const grantedThisLoad = useGrantedThisLoad();
  const [state, setState] = useState<PermissionState | null>(null);
  useEffect(() => {
    const { permissions } = navigator;
    if (permissions === undefined) return;
    let status: PermissionStatus | null = null;
    let live = true;
    const follow = () => setState(status!.state);
    permissions.query({ name: "geolocation" }).then(
      (it) => {
        if (!live) return;
        status = it;
        follow();
        it.addEventListener("change", follow);
      },
      // A browser that can't query geolocation can't say.
      () => {},
    );
    return () => {
      live = false;
      status?.removeEventListener("change", follow);
    };
  }, []);
  return state === "prompt" && grantedThisLoad ? "granted" : state;
}
