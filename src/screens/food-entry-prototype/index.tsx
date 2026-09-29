import { FoodEntryPrototype } from "@/features/food-entry-prototype";

export default function FoodEntryPrototypeScreen() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-xl px-lg py-xxl">
      <header className="flex flex-col gap-xs">
        <h1 className="text-xl">Morsel</h1>
        <p className="text-sm text-muted">
          Prototype · Fictional suggestions · Nothing is saved
        </p>
      </header>
      <FoodEntryPrototype />
    </main>
  );
}
