"use client";

import { DrawerCloseIcon, DrawerOpenIcon } from "@/components/icons";
import { useDragResize } from "@/hooks/useDragResize";
import { Button } from "@heroui/react";
import { useState } from "react";

const MIN_WIDTH = 210;
const MAX_WIDTH = 600;
const DEFAULT_WIDTH = 420;
const COLLAPSED_WIDTH = 40;

export const Drawer = ({
  defaultCollapsed,
}: {
  defaultCollapsed?: boolean;
}) => {
  const [collapsed, setCollapsed] = useState(defaultCollapsed ?? true);
  const { width, onDragStart } = useDragResize({
    defaultWidth: DEFAULT_WIDTH,
    minWidth: MIN_WIDTH,
    maxWidth: MAX_WIDTH,
  });

  return (
    <aside
      className="sticky top-0 flex h-screen shrink-0 flex-col border-l border-divider bg-surface"
      style={{ width: collapsed ? COLLAPSED_WIDTH : width }}
    >
      {!collapsed && (
        <div
          className="absolute left-0 top-0 h-full w-1 cursor-col-resize hover:border-l hover:border-accent active:border-l active:border-accent transition-colors"
          onMouseDown={onDragStart}
        />
      )}

      <Button
        isIconOnly
        variant="secondary"
        size="sm"
        className="absolute -left-3 top-2 z-10 h-6 w-6 min-w-6 rounded-full border border-divider shadow-sm"
        onPress={() => setCollapsed(!collapsed)}
      >
        {collapsed ? (
          <DrawerOpenIcon size="small" />
        ) : (
          <DrawerCloseIcon size="small" />
        )}
      </Button>

      {!collapsed && (
        <div className="flex flex-1 flex-col overflow-y-auto p-md">
          <div id="lipsum">
            <p>
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam
              rhoncus libero eu quam porta sagittis. Nam vehicula facilisis
              dictum. Maecenas sodales sem maximus, blandit elit eu, eleifend
              dolor. Nulla et diam elit. Donec sed est nulla. Quisque convallis
              tristique luctus. Vivamus et nunc vel mauris malesuada faucibus.
              Nam vel mauris et ipsum pulvinar dignissim. Fusce nec euismod
              lectus. Donec aliquet blandit neque. Nunc eget massa sed tellus
              facilisis cursus sed vestibulum libero. Donec non quam pulvinar,
              sollicitudin elit vitae, gravida nisi. Vestibulum quis suscipit
              orci. Duis accumsan, nunc a iaculis dapibus, risus dui ornare mi,
              tempus convallis augue odio nec lectus. Quisque massa est, euismod
              sit amet lacus in, suscipit elementum leo. Morbi lobortis
              ullamcorper porttitor.
            </p>
            <p>
              Pellentesque blandit iaculis nunc, sit amet volutpat turpis
              egestas eget. Maecenas eu orci id eros vestibulum ornare.
              Curabitur finibus ligula eget magna auctor, imperdiet fermentum
              est accumsan. Nunc condimentum, lacus ac sollicitudin mollis,
              augue magna faucibus velit, vel sodales neque diam ac risus.
              Vivamus eget dolor sit amet ante tincidunt ornare ut feugiat
              metus. Aenean dignissim pulvinar egestas. Sed quis velit volutpat,
              pharetra mi vel, lacinia elit. Duis elementum, mi eget ullamcorper
              consequat, elit dolor ullamcorper lacus, vitae accumsan lectus
              mauris non sapien. Suspendisse quis nisl vitae nisl sagittis
              faucibus. Ut bibendum ex quis hendrerit pharetra. Donec consequat
              urna eget aliquam lacinia. Fusce accumsan massa ornare venenatis
              condimentum. Phasellus at fermentum lacus. Suspendisse molestie
              nisl ut lacus placerat tempus. Maecenas mi metus, aliquet quis
              faucibus porta, tempor eu ligula. Nullam egestas odio vitae nunc
              iaculis ullamcorper.
            </p>
            <p>
              Phasellus auctor consectetur odio in suscipit. Proin urna elit,
              dapibus et consectetur eu, tempor ac nisl. Maecenas blandit, ante
              vitae luctus elementum, ligula dolor lacinia nulla, sed tristique
              est augue eu elit. Sed urna nisl, faucibus in tincidunt in,
              malesuada et augue. Aliquam mi massa, tincidunt non dui a,
              scelerisque dictum elit. Duis vitae urna vel lacus eleifend
              egestas in id massa. In eros nisl, fermentum ut tincidunt sit
              amet, cursus sit amet massa. Aliquam vitae eros congue, commodo
              enim ac, congue mauris. Quisque tempor, elit eu vulputate
              imperdiet, felis augue pulvinar urna, ac sollicitudin odio arcu
              vitae mauris. Sed efficitur augue id nulla maximus, sit amet
              varius sem mollis.
            </p>
            <p>
              Etiam ac ultricies diam. Duis laoreet luctus dolor, sit amet
              tincidunt nibh condimentum a. Cras vel augue porttitor, ornare
              diam eu, vestibulum sapien. Praesent rutrum purus eget purus
              mollis lacinia. Orci varius natoque penatibus et magnis dis
              parturient montes, nascetur ridiculus mus. Cras arcu eros,
              efficitur pulvinar dapibus in, luctus ut turpis. Curabitur orci
              sapien, fermentum at tempus at, dictum in enim. Ut nisl purus,
              accumsan quis rhoncus ut, lobortis id nisi. In tincidunt nulla id
              facilisis vulputate. Interdum et malesuada fames ac ante ipsum
              primis in faucibus. Vestibulum non volutpat eros. Etiam eu ex sit
              amet diam porttitor condimentum sed in ipsum. Phasellus et
              fringilla dolor. Aliquam commodo elit arcu. Suspendisse vitae
              tempor arcu, suscipit rhoncus augue.
            </p>
            <p>
              Vestibulum gravida mattis turpis rhoncus mattis. Nulla elementum
              vel lacus eget eleifend. Nulla volutpat, neque pharetra dignissim
              elementum, risus massa vulputate lacus, in vestibulum magna nisl
              ut magna. Phasellus finibus maximus enim a vehicula. Curabitur sed
              tortor dolor. Praesent id dictum orci. Pellentesque ultricies
              velit nisi, nec sagittis eros eleifend ut.
            </p>
          </div>
        </div>
      )}
    </aside>
  );
};
