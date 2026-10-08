import { PlanItemTree } from "@/features/plan-item/tree";
import { ZoneLayer, ZoneSpec } from "@/lib/dnd/zone-layer";
import clsx from "clsx";
import { ReactNode } from "react";
import { PlanContext } from "./context";
import { PlanItemNode } from "./model";
import { TimelineDnd, TimelineRow } from "./timeline-row";

type SectionShellProps = {
  label: string;
  /** Set after my label in my heading. */
  marker?: ReactNode;
  /** Set right after my heading, outside the heading itself. */
  action?: ReactNode;
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
  /** Opens a section by its key. Left out, no section opens. */
  onOpenSection?: (key: string) => void;
  footer?: ReactNode;
  /** Left out, nothing can be dragged. */
  dnd?: TimelineDnd;
};

/** I am the heading, item list, and drop target shared by every section. */
export function SectionShell({
  label,
  marker,
  action,
  emphasized = false,
  ariaCurrent,
  roots,
  zones,
  sectionKey,
  context,
  openId,
  onSelect,
  onOpenSection,
  footer,
  dnd,
}: SectionShellProps) {
  const title = (
    <>
      {label}
      {marker ? <span className="ms-xs">{marker}</span> : null}
    </>
  );

  return (
    <li aria-current={ariaCurrent} className="relative py-xxs">
      <div
        className={clsx(
          "flex items-center gap-xs border-b",
          emphasized ? "border-accent" : "border-separator",
        )}
      >
        <h3
          className={clsx(
            "min-w-0 py-xxs text-sm",
            emphasized ? "font-semibold text-accent" : "font-normal text-muted",
          )}
        >
          {onOpenSection && roots.length > 0 ? (
            <button
              type="button"
              className="cursor-pointer text-left"
              onClick={() => onOpenSection(sectionKey)}
            >
              {title}
            </button>
          ) : (
            title
          )}
        </h3>
        {action}
      </div>
      {roots.length === 0 ? (
        // Room to read the section as somewhere an item could go.
        footer ? null : (
          <div className="h-xl" />
        )
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
              />
            )}
          />
        </div>
      )}
      {footer}
      <ZoneLayer zones={zones} />
    </li>
  );
}
