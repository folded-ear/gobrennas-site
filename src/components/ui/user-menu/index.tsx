import { GET_PROFILE } from "@/data/get-profile";
import { useSuspenseQuery } from "@apollo/client/react";
import {
  Avatar,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
} from "@heroui/react";

type UserMenuProps = {
  onLogout: () => void;
};

export const UserMenu = ({ onLogout }: UserMenuProps) => {
  const me = useSuspenseQuery(GET_PROFILE).data.profile.me;
  return (
    <Dropdown placement="bottom-end">
      <DropdownTrigger>
        <Avatar
          isBordered
          className="transition-transform hover:cursor-pointer"
          color="secondary"
          showFallback
          isFocusable
          name={me.name || me.email}
          getInitials={(name) =>
            // This is the documented default behavior, but it doesn't work on
            // load error without explicitly re-implementing it for some reason.
            // And even re-implemented, it still doesn't work w/ as=button. But
            // it looks like Adobe does the ARIA stuff on the default span, and
            // easy enough to add the hover cursor. 🤷
            name
              .split(/\s+/)
              .filter((s) => s)
              .map((s) => s.charAt(0))
              .join("")
          }
          size="sm"
          src={me.imageUrl || undefined}
        />
      </DropdownTrigger>
      <DropdownMenu aria-label="Profile Actions" variant="flat">
        <DropdownItem key="profile" className="h-14 gap-2">
          <p className="font-semibold">Signed in as</p>
          <p className="font-semibold">{me.name || me.email}</p>
        </DropdownItem>
        <DropdownItem key="settings">Preferences</DropdownItem>
        <DropdownItem key="help_and_feedback">Help & Feedback</DropdownItem>
        <DropdownItem key="logout" color="danger" onPress={onLogout}>
          Log Out
        </DropdownItem>
      </DropdownMenu>
    </Dropdown>
  );
};
