import { SectionHeader } from "@/components/section-header";
import { BuildTime } from "@/features/build-time";
import { CookThis } from "@/features/cook-this";
import { DisplaySize } from "@/features/display-size";
import { InstallApp } from "@/features/install-app";
import { LogOutButton } from "@/features/log-out";

export function Profile() {
  return (
    <>
      <SectionHeader title="Profile" />
      <div className="p-md flex flex-col items-start gap-sm">
        <InstallApp />
        <CookThis />
        <LogOutButton />
        <BuildTime />
        <DisplaySize />
      </div>
    </>
  );
}
