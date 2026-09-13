import { SectionHeader } from "@/components/section-header";
import { LogOutButton } from "@/features/log-out";

export function Profile() {
  return (
    <>
      <SectionHeader title="Profile" />
      <div className="p-md">
        <LogOutButton />
      </div>
    </>
  );
}
