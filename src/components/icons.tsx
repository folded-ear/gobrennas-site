import {
  BookOpen,
  Calendar,
  ChevronDown,
  ChevronLeftSquare,
  ChevronRightSquare,
  ChevronUp,
  EyeIcon,
  LogOut,
  LucideIcon,
  LucideProps,
  NotebookTabs,
  Pencil,
  Plus,
  Search,
  ShelvingUnit,
  ShoppingCart,
  SquareArrowRightEnter,
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

const createIcon = (Icon: LucideIcon, defaults?: Partial<LucideProps>) =>
  function AppIcon(props: IconProps) {
    return (
      <Icon {...defaults} {...props} size={sizes[props.size ?? "medium"]} />
    );
  };

export const AddIcon = createIcon(Plus);
export const BuyingIcon = createIcon(ShoppingCart);
export const DrawerOpenIcon = createIcon(ChevronLeftSquare);
export const DrawerCloseIcon = createIcon(ChevronRightSquare);
export const ExpandDownIcon = createIcon(ChevronDown);
export const ExpandUpIcon = createIcon(ChevronUp);
export const LibraryIcon = createIcon(BookOpen);
export const LogoutIcon = createIcon(LogOut);
export const MenuOpenIcon = createIcon(ChevronDown);
export const PantryIcon = createIcon(ShelvingUnit);
export const PlanScheduleIcon = createIcon(NotebookTabs);
export const PlanCalendarIcon = createIcon(Calendar);
export const RecipeEditIcon = createIcon(Pencil);
export const RecipeViewIcon = createIcon(EyeIcon);
export const SearchIcon = createIcon(Search);
export const SendToPlanIcon = createIcon(SquareArrowRightEnter);
export const ShoppingCartIcon = createIcon(ShoppingCart);
export const SidebarOpenIcon = createIcon(ChevronRightSquare);
export const SidebarCloseIcon = createIcon(ChevronLeftSquare);
