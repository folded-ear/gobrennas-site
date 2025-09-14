import { doLogout } from "@/app/(public)/constants";
import { MenuOpen } from "@/components/ui/icons";
import { ModeToggle } from "@/components/ui/mode-toggle";
import { PlanSelector } from "@/components/ui/plan-selector";
import { SearchField } from "@/components/ui/search-field";
import { UserMenu } from "@/components/ui/user-menu";
import { styles } from "@/components/views/header.styles";
import { NavbarMenuItem } from "@heroui/navbar";
import {
  Button,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
  Navbar,
  NavbarBrand,
  NavbarContent,
  NavbarItem,
  NavbarMenu,
  NavbarMenuToggle,
} from "@heroui/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

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
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    doLogout();
  };

  return (
    <div className="flex flex-col">
      <Navbar
        isBordered
        maxWidth="full"
        classNames={styles.navbar}
        onMenuOpenChange={setIsMenuOpen}
      >
        <NavbarContent justify="center">
          <NavbarMenuToggle
            aria-label={isMenuOpen ? "Close menu" : "Open menu"}
            className="sm:hidden"
          />
          <NavbarBrand className="mr-4">
            <BFSLogo />
            <p className="hidden sm:block font-bold text-inherit">BFS</p>
          </NavbarBrand>
          <NavbarContent className="hidden sm:flex gap-3">
            <NavbarItem isActive={pathname === "/recipes"}>
              <Link color="foreground" href="/recipes">
                Library
              </Link>
            </NavbarItem>
            <Dropdown>
              <NavbarItem isActive={pathname.startsWith("/planner")}>
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
            <NavbarItem isActive={pathname === "/shopping"}>
              <Link color="foreground" href="/shopping">
                Shopping
              </Link>
            </NavbarItem>
            <NavbarItem isActive={pathname === "/pantry"}>
              <Link color="foreground" href="/pantry">
                Pantry
              </Link>
            </NavbarItem>
          </NavbarContent>
        </NavbarContent>

        <NavbarContent as="div" className="sm: items-center" justify="end">
          <SearchField />
          <ModeToggle />
          <UserMenu onLogout={handleLogout} />
        </NavbarContent>
        <NavbarMenu>
          {["This", "That", "Other Thing"].map((item, index) => (
            <NavbarMenuItem key={`${item}-${index}`}>
              <Link className="w-full" href="#">
                {item}
              </Link>
            </NavbarMenuItem>
          ))}
        </NavbarMenu>
      </Navbar>
      <PlanSelector />
    </div>
  );
};
