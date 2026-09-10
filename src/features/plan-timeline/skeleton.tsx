const PLACEHOLDER_DAYS = 5;

/**
 * I hold the timeline's place while it loads. The screen renders me on the
 * server, where the viewer's own date isn't knowable (§8.2 of the notes).
 */
export function TimelineSkeleton() {
  return (
    <div aria-hidden className="flex animate-pulse flex-col">
      {Array.from({ length: PLACEHOLDER_DAYS }, (_, i) => (
        <div key={i} className="py-xxs">
          <div className="h-4 w-32 rounded-xs bg-surface-secondary" />
          <div className="h-xl" />
        </div>
      ))}
    </div>
  );
}
