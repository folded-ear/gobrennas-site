"use client";

import { Check, ChevronRight, Circle } from "lucide-react";
import * as React from "react";
import {
  Header as AriaHeader,
  Keyboard as AriaKeyboard,
  Menu as AriaMenu,
  MenuItem as AriaMenuItem,
  MenuItemProps as AriaMenuItemProps,
  MenuProps as AriaMenuProps,
  MenuTrigger as AriaMenuTrigger,
  Separator as AriaSeparator,
  SeparatorProps as AriaSeparatorProps,
  SubmenuTrigger as AriaSubmenuTrigger,
  composeRenderProps,
  PopoverProps,
} from "react-aria-components";

import { MenuStyles } from "@/components/ui/menu/styles";
import { ListBoxCollection, ListBoxSection } from "../list-box";
import { SelectPopover } from "../select";

const { popover, menu, item, header, separator, keyboard } = MenuStyles();

const MenuTrigger = AriaMenuTrigger;

const MenuSubTrigger = AriaSubmenuTrigger;

const MenuSection = ListBoxSection;

const MenuCollection = ListBoxCollection;

function MenuPopover({ className, ...props }: PopoverProps) {
  return (
    <SelectPopover
      className={composeRenderProps(className, (className) =>
        popover({ className }),
      )}
      {...props}
    />
  );
}

const Menu = <T extends object>({ className, ...props }: AriaMenuProps<T>) => (
  <AriaMenu
    className={composeRenderProps(className, (className) =>
      menu({ className }),
    )}
    {...props}
  />
);

const MenuItem = ({ children, className, ...props }: AriaMenuItemProps) => (
  <AriaMenuItem
    textValue={
      props.textValue || (typeof children === "string" ? children : undefined)
    }
    className={composeRenderProps(className, (className) =>
      item({ className }),
    )}
    {...props}
  >
    {composeRenderProps(children, (children, renderProps) => (
      <>
        <span className="absolute left-2 flex size-4 items-center justify-center">
          {renderProps.isSelected && (
            <>
              {renderProps.selectionMode == "single" && (
                <Circle className="size-2 fill-current" />
              )}
              {renderProps.selectionMode == "multiple" && (
                <Check className="size-4" />
              )}
            </>
          )}
        </span>

        {children}

        {renderProps.hasSubmenu && <ChevronRight className="ml-auto size-4" />}
      </>
    ))}
  </AriaMenuItem>
);

interface MenuHeaderProps extends React.ComponentProps<typeof AriaHeader> {
  inset?: boolean;
  separator?: boolean;
}

const MenuHeader = ({
  className,
  separator = true,
  ...props
}: MenuHeaderProps) => (
  <AriaHeader
    className={header({ hasSeparator: separator, className })}
    {...props}
  />
);

const MenuSeparator = ({ className, ...props }: AriaSeparatorProps) => (
  <AriaSeparator className={separator({ className })} {...props} />
);

const MenuKeyboard = ({
  className,
  ...props
}: React.ComponentProps<typeof AriaKeyboard>) => {
  return <AriaKeyboard className={keyboard({ className })} {...props} />;
};

export {
  Menu,
  MenuCollection,
  MenuHeader,
  MenuItem,
  MenuKeyboard,
  MenuPopover,
  MenuSection,
  MenuSeparator,
  MenuSubTrigger,
  MenuTrigger,
};
export type { MenuHeaderProps };
