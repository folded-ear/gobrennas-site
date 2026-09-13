type CookProps = {
  planId: string;
  itemId: string;
};

export function Cook({ planId, itemId }: CookProps) {
  return (
    <div className="flex flex-col gap-sm p-md">
      <h1>Cook view</h1>
      <p className="text-muted">
        Plan {planId}, item {itemId}. Nothing to cook here yet.
      </p>
    </div>
  );
}
