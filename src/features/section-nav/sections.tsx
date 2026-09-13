import {
  LibraryIcon,
  PlanCalendarIcon,
  ShoppingCartIcon,
} from "@/components/icons";
import { ReactNode } from "react";

/** One of the app's top-level sections, as the section nav offers it. */
export type Section = {
  readonly id: string;
  readonly label: string;
  readonly href: string;
  /** Left out, the section is drawn with the viewer's own avatar. */
  readonly icon?: ReactNode;
  /** Whether a path belongs to me. */
  readonly matches: (pathname: string) => boolean;
};

function under(...prefixes: string[]) {
  return (pathname: string) =>
    prefixes.some((it) => pathname === it || pathname.startsWith(`${it}/`));
}

export const SECTIONS: readonly Section[] = [
  {
    id: "library",
    label: "Library",
    href: "/recipes",
    icon: <LibraryIcon />,
    matches: under("/recipes"),
  },
  {
    id: "planner",
    label: "Planner",
    href: "/planner",
    icon: <PlanCalendarIcon />,
    matches: under("/planner", "/plan"),
  },
  {
    id: "shopping",
    label: "Shopping",
    href: "/shopping",
    icon: <ShoppingCartIcon />,
    matches: under("/shopping"),
  },
  {
    id: "profile",
    label: "Profile",
    href: "/profile",
    matches: under("/profile"),
  },
];
