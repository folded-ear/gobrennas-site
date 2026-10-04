import {
  BookOpen,
  BrushCleaning,
  Calendar,
  ChefHat,
  ChevronDown,
  ChevronUp,
  Circle,
  CircleCheckBig,
  CloudOff,
  EyeIcon,
  GripVertical,
  LogOut,
  LucideIcon,
  LucideProps,
  NotebookTabs,
  PackagePlus,
  Pencil,
  Plus,
  Search,
  ShelvingUnit,
  ShieldQuestionMark,
  ShoppingCart,
  SquareArrowRightEnter,
  Trash,
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

export const AcquiredIcon = createIcon(CircleCheckBig);
export const AddIcon = createIcon(Plus);
export const BuyingIcon = createIcon(ShoppingCart);
export const CookIcon = createIcon(ChefHat);
export const CookedItIcon = createIcon(ChefHat);
export const DeleteIcon = createIcon(Trash);
export const DragHandleIcon = createIcon(GripVertical);
export const ExpandDownIcon = createIcon(ChevronDown);
export const ExpandUpIcon = createIcon(ChevronUp);
export const LibraryIcon = createIcon(BookOpen);
export const LogoutIcon = createIcon(LogOut);
export const MenuOpenIcon = createIcon(ChevronDown);
export const NeededIcon = createIcon(Circle);
export const OfflineIcon = createIcon(CloudOff);
export const PantryIcon = createIcon(ShelvingUnit);
export const PlanScheduleIcon = createIcon(NotebookTabs);
export const PlanCalendarIcon = createIcon(Calendar);
export const RecipeEditIcon = createIcon(Pencil);
export const RecipeViewIcon = createIcon(EyeIcon);
export const SearchIcon = createIcon(Search);
export const SendToPlanIcon = createIcon(SquareArrowRightEnter);
export const SignedOutIcon = createIcon(ShieldQuestionMark);
export const SweepIcon = createIcon(BrushCleaning);
export const UpdateIcon = createIcon(PackagePlus);
export const ShoppingCartIcon = createIcon(ShoppingCart);
