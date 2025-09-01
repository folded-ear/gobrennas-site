import { ModeToggle } from "@/components/mode-toggle";
import { MenuOpen } from "@/components/ui/icons";
import {
  Avatar,
  Button,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
  Input,
  Navbar,
  NavbarBrand,
  NavbarContent,
  NavbarItem,
} from "@heroui/react";
import { SearchIcon } from "lucide-react";
import Link from "next/link";

export const BFSLogo = () => {
  return (
    <svg
      width="26"
      height="25"
      viewBox="0 0 26 25"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M7.14667 13.6089L10.92 9.83554L1.56 0.488875C-0.52 2.56888 -0.52 5.94221 1.56 8.03554L7.14667 13.6089ZM16.1867 11.1955C18.2267 12.1422 21.0933 11.4755 23.2133 9.35554C25.76 6.80887 26.2533 3.15554 24.2933 1.19554C22.3467 -0.751125 18.6933 -0.271124 16.1333 2.27554C14.0133 4.39554 13.3467 7.26221 14.2933 9.30221L1.28 22.3155L3.16 24.1955L12.3467 15.0355L21.52 24.2089L23.4 22.3289L14.2267 13.1555L16.1867 11.1955Z"
        fill="#CC2400"
      />
    </svg>
  );
};

export const Header = () => {
  return (
    <Navbar isBordered>
      <NavbarContent justify="start">
        <NavbarBrand className="mr-4">
          <BFSLogo />
          <p className="hidden sm:block font-bold text-inherit">BFS</p>
        </NavbarBrand>
        <NavbarContent className="hidden sm:flex gap-3">
          <NavbarItem>
            <Link color="foreground" href="/recipes">
              Library
            </Link>
          </NavbarItem>
          <Dropdown>
            <NavbarItem>
              <DropdownTrigger>
                <Button
                  disableRipple
                  className="p-0 bg-transparent data-[hover=true]:bg-transparent"
                  radius="sm"
                  variant="light"
                  endContent={<MenuOpen size="small" />}
                >
                  Planner
                </Button>
              </DropdownTrigger>
            </NavbarItem>
            <DropdownMenu>
              <DropdownItem key="list" href="/planner/list">
                List View
              </DropdownItem>
              <DropdownItem key="calendar" href="/planner/calendar">
                Calendar View
              </DropdownItem>
              <DropdownItem key="schedule" href="/planner/schedule">
                Schedule View
              </DropdownItem>
            </DropdownMenu>
          </Dropdown>
          <NavbarItem>
            <Link color="foreground" href="/shopping">
              Shopping
            </Link>
          </NavbarItem>
          <NavbarItem>
            <Link color="foreground" href="#">
              Pantry Management
            </Link>
          </NavbarItem>
        </NavbarContent>
      </NavbarContent>

      <NavbarContent as="div" className="items-center" justify="end">
        <Input
          classNames={{
            base: "max-w-full sm:max-w-[10rem] h-10",
            mainWrapper: "h-full",
            input: "text-small",
            inputWrapper:
              "h-full font-normal text-default-500 bg-default-400/20 dark:bg-default-500/20",
          }}
          placeholder="Type to search..."
          size="sm"
          startContent={<SearchIcon size={18} />}
          type="search"
        />
        <ModeToggle />
        <Dropdown placement="bottom-end">
          <DropdownTrigger>
            <Avatar
              isBordered
              as="button"
              className="transition-transform"
              color="secondary"
              name="Jason Hughes"
              size="sm"
              src="https://i.pravatar.cc/150?u=a042581f4e29026704d"
            />
          </DropdownTrigger>
          <DropdownMenu aria-label="Profile Actions" variant="flat">
            <DropdownItem key="profile" className="h-14 gap-2">
              <p className="font-semibold">Signed in as</p>
              <p className="font-semibold">zoey@example.com</p>
            </DropdownItem>
            <DropdownItem key="settings">My Settings</DropdownItem>
            <DropdownItem key="team_settings">Team Settings</DropdownItem>
            <DropdownItem key="analytics">Analytics</DropdownItem>
            <DropdownItem key="system">System</DropdownItem>
            <DropdownItem key="configurations">Configurations</DropdownItem>
            <DropdownItem key="help_and_feedback">Help & Feedback</DropdownItem>
            <DropdownItem key="logout" color="danger">
              Log Out
            </DropdownItem>
          </DropdownMenu>
        </Dropdown>
      </NavbarContent>
    </Navbar>
  );
};
