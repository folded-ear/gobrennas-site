const PLACEHOLDER_DAYS = 5;

/**
 * I hold the timeline's place while it loads. The screen renders me on the
 * server, where the viewer's own date isn't knowable.
 */
export function TimelineSkeleton() {
  return (
    <div role="status" aria-label="Loading the plan" className="flex flex-col">
      {Array.from({ length: PLACEHOLDER_DAYS }, (_, i) => (
        <div key={i} aria-hidden className="animate-pulse py-xxs">
          <div className="h-4 w-32 rounded-xs bg-surface-secondary" />
          <div className="h-xl" />
        </div>
      ))}
    </div>
  );
}
