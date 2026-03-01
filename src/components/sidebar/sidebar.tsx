"use client";

import { doLogout } from "@/app/(public)/constants";
import { BFSLogo } from "@/components/bfs-logo";
import {
  LibraryIcon,
  PantryIcon,
  SearchIcon,
  ShoppingCartIcon,
  SidebarCloseIcon,
  SidebarOpenIcon,
} from "@/components/icons";
import { ModeToggle } from "@/components/mode-toggle";
import PlanAvatar from "@/components/plan-avatar";
import { UserMenu } from "@/features/profile/user-menu";
import { useDragResize } from "@/hooks/useDragResize";
import { Button } from "@heroui/react";
import { clsx } from "clsx";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { NavLink } from "./nav-link";
import { Section } from "./section";

const COLLAPSED_WIDTH = 65;
const DEFAULT_WIDTH = 256;
const MAX_WIDTH = 480;

export const Sidebar = () => {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const { width, onDragStart } = useDragResize({
    defaultWidth: DEFAULT_WIDTH,
    minWidth: DEFAULT_WIDTH,
    maxWidth: MAX_WIDTH,
    expandDirection: "right",
  });

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    doLogout();
  };

  return (
    <>
      <aside
        className="sticky top-0 flex h-screen justify-stretch flex-col border-r border-divider transition-all bg-surface p-md shrink-0"
        style={{ width: collapsed ? COLLAPSED_WIDTH : width }}
      >
        <nav className="flex-1 flex flex-col gap-2">
          <BFSLogo size="sm" collapsed={collapsed} />
          <Section title="Recipes" isCollapsed={collapsed}>
            <NavLink
              href="/recipes"
              isActive={pathname?.startsWith("/recipes")}
            >
              <LibraryIcon size="medium" />
              {!collapsed && <span>Library</span>}
            </NavLink>
            <NavLink
              href="/recipes/saved"
              isActive={pathname?.startsWith("/recipes/saved")}
            >
              <SearchIcon size="medium" />
              {!collapsed && <span>Saved Searches</span>}
            </NavLink>
          </Section>

          <Section title="My Plans" isCollapsed={collapsed}>
            <NavLink
              href="/planner"
              isActive={pathname?.startsWith("/planner")}
            >
              <PlanAvatar
                plan={{ name: "Our Week", color: "#f5cd06" }}
                size="sm"
              />
              {!collapsed && <span>Our Week</span>}
            </NavLink>
            <NavLink href="/planner" isActive={pathname === "/planner"}>
              <PlanAvatar
                plan={{ name: "Thanksgiving", color: "#89ac66" }}
                size="sm"
              />
              {!collapsed && <span>Thanksgiving</span>}
            </NavLink>
          </Section>

          <Section title="Shared Plans" isCollapsed={collapsed}>
            <NavLink href="/" isActive={false}>
              <PlanAvatar
                plan={{ name: "Barney's Week", color: "#9cb7da" }}
                size="sm"
              />
              {!collapsed && <span>Barney&apos;s Week</span>}
            </NavLink>
          </Section>

          <div
            className={clsx(
              "flex flex-col gap-md py-md",
              collapsed && "items-center",
            )}
          >
            <NavLink
              href="/shopping"
              isActive={pathname?.startsWith("/shopping") || false}
            >
              <ShoppingCartIcon size="medium" />
              {!collapsed && <span>Shopping List</span>}
            </NavLink>

            <NavLink
              href="/pantry"
              isActive={pathname?.startsWith("/pantry") || false}
            >
              <PantryIcon size="medium" />
              {!collapsed && <span>Pantry</span>}
            </NavLink>
          </div>
        </nav>

        {/* Bottom Actions */}
        {!collapsed && (
          <div className="border-t border-divider p-4">
            <div className="flex items-center gap-2">
              <ModeToggle />
              <UserMenu onLogout={handleLogout} />
            </div>
          </div>
        )}

        {/* Drag handle */}
        {!collapsed && (
          <div
            className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:border-r hover:border-accent active:border-r active:border-accent transition-colors"
            onMouseDown={onDragStart}
          />
        )}

        {/* Collapse Toggle */}
        <Button
          isIconOnly
          variant="secondary"
          size="sm"
          className="absolute -right-3 top-2 z-10 h-6 w-6 min-w-6 rounded-full border border-divider shadow-sm"
          onPress={() => setCollapsed(!collapsed)}
        >
          {collapsed ? <SidebarOpenIcon /> : <SidebarCloseIcon />}
        </Button>
      </aside>
    </>
  );
};
