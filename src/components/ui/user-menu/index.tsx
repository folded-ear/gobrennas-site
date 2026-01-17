import { Avatar, Dropdown } from "@heroui/react";

type UserMenuProps = {
  onLogout: () => void;
};

export const UserMenu = ({ onLogout }: UserMenuProps) => {
  return (
    <Dropdown>
      <Dropdown.Trigger>
        <Avatar size="sm">
          <Avatar.Image
            alt="Barney!"
            src="https://i.pravatar.cc/150?u=a042581f4e29026704d"
          />
          <Avatar.Fallback>JD</Avatar.Fallback>
        </Avatar>
      </Dropdown.Trigger>
      <Dropdown.Popover>
        <Dropdown.Menu>
          <Dropdown.Item key="logout" onPress={onLogout}>
            Log Out
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
};
