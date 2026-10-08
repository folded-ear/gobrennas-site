import { usePageEngine } from "@/features/page-engine";
import { ShoppingList } from "./model";
import { storeOrdersFor } from "./store-order";

/** What can be done to the store order of a shopping list's ingredients. */
export type StoreMoves = {
  /** I put an ingredient before or after another. */
  move(id: string, targetId: string, after: boolean, name: string): void;
};

/**
 * I make store moves among a list's ingredients through the page engine,
 * each showing at once the store orders the server will give.
 */
export function useStoreMoves(list: ShoppingList): StoreMoves {
  const engine = usePageEngine();
  return {
    move(id, targetId, after, name) {
      const ingredients = [...list.needed.items, ...list.acquired.items].map(
        (it) => it.ingredient,
      );
      engine.orderForStore({
        kind: "storeOrder",
        id,
        targetId,
        after,
        name,
        storeOrders: storeOrdersFor(ingredients, id, targetId, after),
      });
    },
  };
}
