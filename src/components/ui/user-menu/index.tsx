import { UserAvatarWithFallback } from "@/components/ui/user-avatar";
import { FragmentType } from "@apollo/client";
import { useFragment } from "@apollo/client/react";
import { Dropdown } from "@heroui/react";
import { useRouter } from "next/navigation";
import { UserAvatarFragment } from "../user-avatar/__generated__/userAvatar.generated";
import { UserMenuFragmentDoc } from "./__generated__/userMenu.generated";

type UserMenuProps = {
  onLogout: () => void;
};

export const UserMenu = ({ onLogout }: UserMenuProps) => {
  const res = useFragment({
    fragment: UserMenuFragmentDoc,
    fragmentName: "userMenu",
    from: "ROOT_QUERY",
  });
  // This cast is safe, because the profile query is always warmed, so the
  // fragment will always be complete (not DeepPartial).
  const me = res.data.profile?.me as FragmentType<UserAvatarFragment>;
  const router = useRouter();
  return (
    <Dropdown>
      <Dropdown.Trigger>
        <UserAvatarWithFallback user={me} />
      </Dropdown.Trigger>
      <Dropdown.Popover>
        <Dropdown.Menu>
          <Dropdown.Item onPress={() => router.push("/profile")}>
            Profile
          </Dropdown.Item>
          <Dropdown.Item key="logout" onPress={onLogout}>
            Log Out
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
};
