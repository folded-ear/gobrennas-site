"use client";

import { ToggleButton } from "@/components/ui/toggle-button";
import { PropsWithChildren, useState } from "react";

export const Panel = ({ children }: PropsWithChildren) => {
  const [open, setOpen] = useState(true);

  const handleToggle = () => setOpen(!open);

  return (
    <div className="p-md">
      {children}
      <ToggleButton variant="outline" onPress={handleToggle}>
        {open ? "Close" : "Open"}
      </ToggleButton>
    </div>
  );
};
