import { SectionHeader } from "@/components/section-header";
import { BuildTime } from "@/features/build-time";
import { InstallApp } from "@/features/install-app";
import { LogOutButton } from "@/features/log-out";

export function Profile() {
  return (
    <>
      <SectionHeader title="Profile" />
      <div className="p-md flex flex-col items-start gap-sm">
        <InstallApp />
        <LogOutButton />
        <BuildTime />
      </div>
    </>
  );
}
