import { GET_PROFILE } from "@/data/get-profile";
import { useSuspenseQuery } from "@apollo/client/react";
import { Avatar, Dropdown } from "@heroui/react";
import { useRouter } from "next/navigation";

type UserMenuProps = {
  onLogout: () => void;
};

export const UserMenu = ({ onLogout }: UserMenuProps) => {
  const me = useSuspenseQuery(GET_PROFILE).data.profile.me;
  const name = me.name || me.email;
  const router = useRouter();
  return (
    <Dropdown>
      <Dropdown.Trigger>
        <Avatar size="sm" title={name}>
          <Avatar.Image src={me.imageUrl || undefined} alt={name} />
          <Avatar.Fallback>
            {name
              .split(/\s+/)
              .filter((s) => s)
              .map((s) => s.charAt(0))
              .join("")}
          </Avatar.Fallback>
        </Avatar>
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
