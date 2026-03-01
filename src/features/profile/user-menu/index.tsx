import { UserAvatarWithFallback } from "@/features/profile/user-avatar";
import { useFragment } from "@apollo/client/react";
import { Dropdown } from "@heroui/react";
import { useRouter } from "next/navigation";
import { UserMenuFragmentDoc } from "./__generated__/userMenu.generated";

type UserMenuProps = {
  onLogout: () => void;
};

export const UserMenu = ({ onLogout }: UserMenuProps) => {
  const { data, complete } = useFragment({
    fragment: UserMenuFragmentDoc,
    fragmentName: "userMenu",
    from: "ROOT_QUERY",
  });
  const router = useRouter();
  return (
    <Dropdown>
      <Dropdown.Trigger>
        <UserAvatarWithFallback user={complete ? data.profile.me : null} />
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
