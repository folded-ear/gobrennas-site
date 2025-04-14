"use client";

import { Button } from "@adobe/react-spectrum";

interface PlanNode {
  key: string;
  name: string;
  nodes?: PlanNode[];
}

type Key = keyof typeof planItems;

const planItems = {
  plan: { key: "plan", name: "Our Week", nodes: ["fruits", "vegetables"] },
  fruits: { key: "fruits", name: "fruits", nodes: ["apple", "banana", "pear"] },
  apple: { key: "apple", name: "apple", nodes: [] },
  banana: { key: "banana", name: "banana", nodes: [] },
  pear: { key: "pear", name: "pear", nodes: [] },
  vegetables: {
    key: "vegetables",
    name: "vegetables",
    nodes: ["tomato", "carrot"],
  },
  tomato: { key: "tomato", name: "tomato", nodes: [] },
  carrot: { key: "carrot", name: "carrot", nodes: [] },
};

export function PlanList() {
  return <Button variant="primary">Click Me!</Button>;
}
