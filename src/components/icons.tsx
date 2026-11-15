import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Bookmark,
  BookOpen,
  BrushCleaning,
  Calendar,
  Check,
  ChefHat,
  ChevronDown,
  ChevronUp,
  Circle,
  CircleCheckBig,
  CloudOff,
  CloudUpload,
  Copy,
  Ellipsis,
  EyeIcon,
  GripVertical,
  Images,
  LogOut,
  LucideIcon,
  LucideProps,
  MapPinOff,
  Moon,
  PackagePlus,
  Pencil,
  Plus,
  RotateCcw,
  RotateCw,
  Settings,
  Share2,
  ShelvingUnit,
  ShieldQuestionMark,
  ShoppingCart,
  SquareArrowRightEnter,
  Star,
  Sun,
  Trash,
  X,
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

// Managed icons are ALWAYS named with an 'Icon' suffix, and this list is always
// in lexicographical order.
export const AcceptIcon = createIcon(Check);
export const AcquiredIcon = createIcon(CircleCheckBig);
export const AddIcon = createIcon(Plus);
export const CancelIcon = createIcon(X);
export const ClearIcon = createIcon(X);
export const CloseIcon = createIcon(X);
export const CloudUploadIcon = createIcon(CloudUpload);
export const CookIcon = createIcon(ChefHat);
export const CookedItIcon = createIcon(ChefHat);
export const CopyIcon = createIcon(Copy);
export const CurrentDeviceIcon = createIcon(Star);
export const DarkModeIcon = createIcon(Moon);
export const DeleteIcon = createIcon(Trash);
export const DragHandleIcon = createIcon(GripVertical);
export const EditIcon = createIcon(Pencil);
export const ExpandDownIcon = createIcon(ChevronDown);
export const ExpandUpIcon = createIcon(ChevronUp);
export const FavoriteIcon = createIcon(Bookmark);
export const LibraryIcon = createIcon(BookOpen);
export const LightModeIcon = createIcon(Sun);
export const LogoutIcon = createIcon(LogOut);
export const MenuOpenIcon = createIcon(ChevronDown);
export const MoreIcon = createIcon(Ellipsis);
export const MoveDownIcon = createIcon(ArrowDown);
export const MoveUpIcon = createIcon(ArrowUp);
export const NavBackIcon = createIcon(ArrowLeft);
export const NavForwardIcon = createIcon(ArrowRight);
export const NeededIcon = createIcon(Circle);
export const NoStoreOrderIcon = createIcon(MapPinOff);
export const OfflineIcon = createIcon(CloudOff);
export const PantryIcon = createIcon(ShelvingUnit);
export const PhotosIcon = createIcon(Images);
export const PlannerIcon = createIcon(Calendar);
export const RotateLeftIcon = createIcon(RotateCcw);
export const RotateRightIcon = createIcon(RotateCw);
export const SendToPlanIcon = createIcon(SquareArrowRightEnter);
export const SettingsIcon = createIcon(Settings);
export const ShareIcon = createIcon(Share2);
export const ShoppingCartIcon = createIcon(ShoppingCart);
export const SignedOutIcon = createIcon(ShieldQuestionMark);
export const SweepIcon = createIcon(BrushCleaning);
export const UpdateIcon = createIcon(PackagePlus);
export const ViewIcon = createIcon(EyeIcon);
