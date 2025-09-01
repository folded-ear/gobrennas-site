import {
  Book,
  Calendar,
  ChevronDown,
  ChevronLeftSquare,
  ChevronRightSquare,
  LogOut,
  LucideProps,
  NotebookTabs,
  ShoppingCart,
} from "lucide-react";
import { JSX, RefAttributes } from "react";

export type IconProps = JSX.IntrinsicAttributes &
  Omit<LucideProps, "ref"> &
  RefAttributes<SVGSVGElement> & {
    size?: "tiny" | "small" | "medium" | "large" | "huge";
  };

const sizes = {
  tiny: 12,
  small: 16,
  medium: 24,
  large: 32,
  huge: 48,
};

export const MenuOpen = (props: IconProps) => (
  <ChevronDown {...props} size={sizes[props.size ?? "medium"]} />
);

export const DrawerOpen = (props: IconProps) => {
  return <ChevronLeftSquare {...props} size={sizes[props.size ?? "medium"]} />;
};

export const DrawerClose = (props: IconProps) => {
  return <ChevronRightSquare {...props} size={sizes[props.size ?? "medium"]} />;
};

export const PlanCalendar = (props: IconProps) => {
  return <Calendar {...props} size={sizes[props.size ?? "medium"]} />;
};

export const PlanSchedule = (props: IconProps) => {
  return <NotebookTabs {...props} size={sizes[props.size ?? "medium"]} />;
};

export const Buying = (props: IconProps) => {
  return <ShoppingCart {...props} size={sizes[props.size ?? "medium"]} />;
};

export const Library = (props: IconProps) => {
  return <Book {...props} size={sizes[props.size ?? "medium"]} />;
};

export const Logout = (props: IconProps) => {
  return <LogOut {...props} size={sizes[props.size ?? "medium"]} />;
};
