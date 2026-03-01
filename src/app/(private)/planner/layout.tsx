import { ViewNavigation } from "@/features/planner/view-navigation";
import { PropsWithChildren } from "react";

export default function PlannerLayout({ children }: PropsWithChildren) {
  return (
    <div className="bg-surface rounded-md p-md mx-xs">
      <div className="border-b border-divider py-sm flex justify-between">
        <h2 className="text-xl font-semibold text-foreground">Planner</h2>
        <ViewNavigation />
      </div>
      {children}
    </div>
  );
}
