"use client";

import { SectionHeader } from "@/components/section-header";
import { BuildTime } from "@/features/build-time";
import { CookThis } from "@/features/cook-this";
import { DevModeOnly, DevModeSwitch } from "@/features/dev-mode";
import { DeviceTable } from "@/features/devices";
import { DisplaySize } from "@/features/display-size";
import { InstallApp } from "@/features/install-app";
import { LogOutButton } from "@/features/log-out";
import { CurrentUserAvatar } from "@/features/user-avatar";
import { ROLE_DEVELOPER } from "@/lib/roles";
import { ProfileDocument } from "@/screens/__generated__/profile.generated";
import { useSuspenseQuery } from "@apollo/client/react";
import { Skeleton } from "@heroui/react";

type ProfileProps = {
  apiRoot: string;
};

function ProfileHeader() {
  return (
    <SectionHeader title="Profile" leading={<CurrentUserAvatar />}>
      <LogOutButton />
    </SectionHeader>
  );
}

export function ProfileLoading() {
  return (
    <>
      <ProfileHeader />
      <div className="bg-surface p-md">
        <div role="status" aria-label="Loading profile" className="space-y-sm">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
      </div>
    </>
  );
}

export function Profile({ apiRoot }: ProfileProps) {
  const { data } = useSuspenseQuery(ProfileDocument);
  const me = data.profile.me;
  const developer = me.roles.includes(ROLE_DEVELOPER);
  return (
    <>
      <ProfileHeader />
      {/* a section rendering nothing (e.g. InstallApp) leaves no gap or line */}
      <div className="divide-y divide-separator bg-surface *:p-md *:empty:hidden">
        <div>
          <InstallApp />
        </div>
        <div>
          <CookThis apiRoot={apiRoot} />
        </div>
        <div>
          <DeviceTable user={me} currentKey={data.deviceKey} />
        </div>
        {developer && (
          <div className="flex flex-col items-start gap-sm">
            <DevModeSwitch />
            <DevModeOnly>
              <BuildTime />
              <DisplaySize />
            </DevModeOnly>
          </div>
        )}
      </div>
    </>
  );
}
