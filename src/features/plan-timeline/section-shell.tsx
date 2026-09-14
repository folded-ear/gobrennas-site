import { ZoneLayer, ZoneSpec } from "@/features/plan-dnd/zone-layer";
import { PlanItemTree } from "@/features/plan-item/tree";
import clsx from "clsx";
import { PlanContext } from "./context";
import { PlanItemNode } from "./model";
import { TimelineDnd, TimelineRow } from "./timeline-row";

type SectionShellProps = {
  label: string;
  /** The accent styling a day gets for being today. */
  emphasized?: boolean;
  ariaCurrent?: "date";
  roots: readonly PlanItemNode[];
  zones: readonly ZoneSpec[];
  sectionKey: string;
  context: PlanContext;
  /** The item open in its screen, marked wherever it shows. */
  openId?: string;
  onSelect?: (id: string) => void;
  /** Left out, nothing can be dragged. */
  dnd?: TimelineDnd;
  /** Left out, no item offers to be cooked. */
  planId?: string;
};

/** I am the heading, item list, and drop target shared by every section. */
export function SectionShell({
  label,
  emphasized = false,
  ariaCurrent,
  roots,
  zones,
  sectionKey,
  context,
  openId,
  onSelect,
  dnd,
  planId,
}: SectionShellProps) {
  return (
    <li aria-current={ariaCurrent} className="relative py-xxs">
      <h3
        className={clsx(
          "border-b py-xxs text-sm",
          emphasized
            ? "border-accent font-semibold text-accent"
            : "border-separator font-normal text-muted",
        )}
      >
        {label}
      </h3>
      {roots.length === 0 ? (
        // Room to read the section as somewhere an item could go.
        <div className="h-xl" />
      ) : (
        <div className="py-xs">
          <PlanItemTree
            nodes={roots}
            renderItem={(node) => (
              <TimelineRow
                node={node}
                sectionKey={sectionKey}
                sectionRoot={roots.includes(node)}
                context={context}
                openId={openId}
                dnd={dnd}
                onSelect={onSelect}
                planId={planId}
              />
            )}
          />
        </div>
      )}
      <ZoneLayer zones={zones} />
    </li>
  );
}
