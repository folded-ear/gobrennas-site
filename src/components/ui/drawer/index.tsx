import { DrawerStyles } from "@/components/ui/drawer/styles";
import {
  DrawerProps,
  DrawerTabProps,
  DrawerViewProps,
} from "@/components/ui/drawer/types";
import { DrawerClose, DrawerOpen } from "@/components/ui/icons";
import { ToggleButton, ToggleButtonGroup } from "@/components/ui/toggle-button";
import { createContext, PropsWithChildren, useContext, useState } from "react";

const { drawer, tabs, tab, expand, view } = DrawerStyles();

type DrawerContextValue = {
  selectedId?: string;
  isExpanded?: boolean;
  onSelectionChange?: (id: string) => void;
  onExpandedChange?: (expanded: boolean) => void;
  classNames?: DrawerProps["classNames"];
} | null;

export const DrawerContext = createContext<DrawerContextValue>(null);

const Drawer = ({
  children,
  defaultSelectedId,
  selectedId,
  classNames,
}: DrawerProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selected, setSelected] = useState(defaultSelectedId ?? selectedId);

  if (!selected) {
    setIsExpanded(false);
    setSelected(defaultSelectedId ?? selectedId);
  }

  return (
    <DrawerContext.Provider
      value={{
        isExpanded,
        onExpandedChange: (expanded: boolean) => {
          setIsExpanded(expanded);
        },
        selectedId: selected,
        onSelectionChange: (id: string) => setSelected(id),
        classNames,
      }}
    >
      <div className={drawer({ className: classNames?.drawer })}>
        {children}
      </div>
    </DrawerContext.Provider>
  );
};

const DrawerView = ({ id, children }: DrawerViewProps) => {
  const ctx = useContext<DrawerContextValue>(DrawerContext);
  const { isExpanded } = ctx ?? { isExpanded: false };

  return (
    ctx?.selectedId === id && (
      <div className={view({ isExpanded, className: ctx?.classNames?.view })}>
        {children}
      </div>
    )
  );
};

const DrawerTabs = ({ children }: PropsWithChildren) => {
  const ctx = useContext<DrawerContextValue>(DrawerContext);
  const { isExpanded } = ctx ?? { isExpanded: false };

  const handleExpandedChange = () => {
    ctx?.onExpandedChange?.(!isExpanded);
  };
  return (
    <div className={tabs()}>
      <ToggleButtonGroup orientation="vertical">
        <ToggleButton
          id="toggle"
          variant="icon"
          size="sm"
          onPress={handleExpandedChange}
          className={expand({ className: `my-lg ${ctx?.classNames?.tabs}` })}
        >
          {ctx?.isExpanded ? <DrawerClose /> : <DrawerOpen />}
        </ToggleButton>
        {children}
      </ToggleButtonGroup>
    </div>
  );
};

const DrawerTab = ({ id, children }: DrawerTabProps) => {
  const ctx = useContext<DrawerContextValue>(DrawerContext);

  const handleTabPress = () => {
    if (!ctx?.isExpanded) {
      ctx?.onExpandedChange?.(true);
    }
    if (!ctx?.selectedId) {
      ctx?.onExpandedChange?.(false);
    }
    ctx?.onSelectionChange?.(id);
  };

  return (
    <ToggleButton
      id={id}
      variant="icon"
      size="sm"
      className={tab({ className: ctx?.classNames?.tab })}
      onPress={handleTabPress}
    >
      {children}
    </ToggleButton>
  );
};
Drawer.View = DrawerView;
Drawer.Tabs = DrawerTabs;
Drawer.Tab = DrawerTab;

export { Drawer };
