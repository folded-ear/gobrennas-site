"use client";

import { PlanList } from "@/components/views/planner";
import { Item, TabList, TabPanels, Tabs, Text } from "@adobe/react-spectrum";

export default function Planner() {
  return (
    <div>
      <Tabs>
        <TabList>
          <Item key="list-view">List</Item>
          <Item key="calendar-view">Calendar</Item>
        </TabList>
        <TabPanels key="list-view">
          <Item key="list-view">
            <h1>List</h1>
            <PlanList />
          </Item>
          <Item key="calendar-view">
            <Text>calendar view</Text>
          </Item>
        </TabPanels>
      </Tabs>
    </div>
  );
}
