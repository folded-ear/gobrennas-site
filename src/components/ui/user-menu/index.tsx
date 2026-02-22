import { UserAvatarWithFallback } from "@/components/ui/user-avatar";
import { GET_PROFILE_QUERY } from "@/components/ui/user-menu/query";
import { useSuspenseQuery } from "@apollo/client/react";
import { Dropdown } from "@heroui/react";
import { useRouter } from "next/navigation";

type UserMenuProps = {
  onLogout: () => void;
};

export const UserMenu = ({ onLogout }: UserMenuProps) => {
  const me = useSuspenseQuery(GET_PROFILE_QUERY).data.profile.me;
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
