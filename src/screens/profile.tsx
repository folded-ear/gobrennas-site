import { SectionHeader } from "@/components/section-header";
import { graphqlUri } from "@/constants";
import { BuildTime } from "@/features/build-time";
import { CookThis } from "@/features/cook-this";
import { DisplaySize } from "@/features/display-size";
import { InstallApp } from "@/features/install-app";
import { LogOutButton } from "@/features/log-out";

export async function Profile() {
  // Use the same runtime server configuration as Apollo. Browser environment
  // variables are frozen at build time and may be absent in promoted images.
  const apiRoot = (await graphqlUri()).replace(/\/graphql$/, "");
  return (
    <>
      <SectionHeader title="Profile" />
      <div className="p-md flex flex-col items-start gap-sm">
        <InstallApp />
        <CookThis apiRoot={apiRoot} />
        <LogOutButton />
        <BuildTime />
        <DisplaySize />
      </div>
    </>
  );
}
