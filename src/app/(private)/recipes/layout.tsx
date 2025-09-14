"use client";

import { Drawer } from "@/components/ui/drawer";
import { Buying } from "@/components/ui/icons";
import { Container } from "@/components/ui/layout";
import { ListIcon, SearchIcon } from "lucide-react";
import { PropsWithChildren } from "react";

export default function RecipesLayout({ children }: PropsWithChildren) {
  return (
    <div className="flex">
      <Container>{children}</Container>
      <Drawer defaultSelectedId="search">
        <Drawer.Tabs>
          <Drawer.Tab id="search">
            <SearchIcon />
          </Drawer.Tab>
          <Drawer.Tab id="detail">
            <ListIcon />
          </Drawer.Tab>
          <Drawer.Tab id="shopping">
            <Buying />
          </Drawer.Tab>
        </Drawer.Tabs>
        <Drawer.View id="search">
          <h1>Search Recipes</h1>
          <p>search here</p>
        </Drawer.View>
        <Drawer.View id="detail">
          <h1>Recipe Detail</h1>
          <p>detail here</p>
        </Drawer.View>
        <Drawer.View id="shopping">
          <h1>Shopping List</h1>
          <p>list of things</p>
        </Drawer.View>
      </Drawer>
    </div>
  );
}
