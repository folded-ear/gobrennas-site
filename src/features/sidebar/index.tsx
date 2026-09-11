"use client";

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
import { ResizeHandle } from "@/components/resize-handle";
import { NavLink } from "@/components/sidebar/nav-link";
import { Section } from "@/components/sidebar/section";
import { doLogout } from "@/constants";
import { UserMenu } from "@/features/user-menu";
import { usePreference } from "@/hooks/use-preference";
import { useSetPreference } from "@/hooks/use-set-preference";
import {
  formatBoolean,
  parseBoolean,
  PREF_ACTIVE_PLAN,
  PREF_NAV_COLLAPSED,
} from "@/lib/preferences";
import { useSuspenseQuery } from "@apollo/client/react";
import { Button, ScrollShadow } from "@heroui/react";
import { clsx } from "clsx";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import { GetSidebarDocument } from "./__generated__/getSidebar.generated";
import { PlanNavLink } from "./plan-nav-link";

const COLLAPSED_WIDTH = 65;
const DEFAULT_WIDTH = 256;
const MAX_WIDTH = 480;

export const Sidebar = () => {
  const pathname = usePathname();
  const { data } = useSuspenseQuery(GetSidebarDocument);
  const collapsed = parseBoolean(usePreference(PREF_NAV_COLLAPSED));
  const [setCollapsed] = useSetPreference(PREF_NAV_COLLAPSED);
  const activePlanId = usePreference(PREF_ACTIVE_PLAN);
  const [setActivePlan] = useSetPreference(PREF_ACTIVE_PLAN);
  const [width, setWidth] = useState(DEFAULT_WIDTH);

  const { myPlans, sharedPlans } = useMemo(() => {
    const plans = data.planner.plans;
    return {
      myPlans: plans.filter((it) => it.mine),
      sharedPlans: plans.filter((it) => !it.mine),
    };
  }, [data.planner.plans]);

  const renderPlans = (plans: typeof myPlans) =>
    plans.map((plan) => (
      <PlanNavLink
        key={plan.id}
        plan={plan}
        isActive={plan.id === activePlanId}
        isCollapsed={collapsed}
        onSelect={() => setActivePlan(plan.id)}
      />
    ));

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
        <nav className="flex-1 flex flex-col gap-2 min-h-0">
          <div className="shrink-0">
            <BFSLogo size="sm" collapsed={collapsed} />
          </div>
          <div className="shrink-0">
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
          </div>

          <ScrollShadow className="min-h-0 space-y-2">
            {myPlans.length > 0 && (
              <Section title="My Plans" isCollapsed={collapsed}>
                {renderPlans(myPlans)}
              </Section>
            )}

            {sharedPlans.length > 0 && (
              <Section title="Shared Plans" isCollapsed={collapsed}>
                {renderPlans(sharedPlans)}
              </Section>
            )}
          </ScrollShadow>

          <div
            className={clsx(
              "shrink-0 flex flex-col gap-md py-md",
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

        {!collapsed && (
          <ResizeHandle
            side="right"
            width={width}
            minWidth={DEFAULT_WIDTH}
            maxWidth={MAX_WIDTH}
            onWidthChange={setWidth}
            label="Resize sidebar"
          />
        )}

        {/* Collapse Toggle */}
        <Button
          isIconOnly
          variant="secondary"
          size="sm"
          className="absolute -right-3 top-2 z-10 h-6 w-6 min-w-6 rounded-full border border-divider shadow-sm"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          onPress={() => setCollapsed(formatBoolean(!collapsed))}
        >
          {collapsed ? <SidebarOpenIcon /> : <SidebarCloseIcon />}
        </Button>
      </aside>
    </>
  );
};
