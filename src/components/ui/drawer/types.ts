import type { PropsWithChildren } from "react";

export type DrawerProps = PropsWithChildren & {
  defaultSelectedId: string;
  selectedId?: string;
  onSelectionChange?: (id: string) => void;
  classNames?: {
    drawer?: string;
    tabs?: string;
    tab?: string;
    view?: string;
  };
};

export type DrawerTabProps = PropsWithChildren & {
  id: string;
};

export type DrawerViewProps = PropsWithChildren & {
  id: string;
};
