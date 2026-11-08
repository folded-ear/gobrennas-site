import { SectionHeader } from "@/components/section-header";
import { graphqlUri } from "@/constants";
import { isDeveloper } from "@/data-rsc/is-authenticated";
import { BuildTime } from "@/features/build-time";
import { CookThis } from "@/features/cook-this";
import { DevModeOnly, DevModeSwitch } from "@/features/dev-mode";
import { DisplaySize } from "@/features/display-size";
import { InstallApp } from "@/features/install-app";
import { LogOutButton } from "@/features/log-out";
import { CurrentUserAvatar } from "@/features/user-avatar";

export async function Profile() {
  // Use the same runtime server configuration as Apollo. Browser environment
  // variables are frozen at build time and may be absent in promoted images.
  const [gqlUri, developer] = await Promise.all([graphqlUri(), isDeveloper()]);
  const apiRoot = gqlUri.replace(/\/graphql$/, "");
  return (
    <>
      <SectionHeader title="Profile" leading={<CurrentUserAvatar />}>
        <LogOutButton />
      </SectionHeader>
      {/* a section rendering nothing (e.g. InstallApp) leaves no gap or line */}
      <div className="divide-y divide-separator bg-surface *:p-md *:empty:hidden">
        <div>
          <InstallApp />
        </div>
        <div>
          <CookThis apiRoot={apiRoot} />
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
