type RecipeInformationProps = {
  externalUrl: string | null;
  yield: number | null;
  totalTime: number | null;
  calories: number | null;
  labels: readonly string[] | null;
};

function sourceLink(source: string): string | undefined {
  try {
    const url = new URL(source);
    if (url.protocol === "https:" || url.protocol === "http:") return url.href;
  } catch {
    // Older recipes may have free-form source text; it remains readable.
  }
  return undefined;
}

/** Optional facts about a recipe; time is supplied in minutes. */
export function RecipeInformation({
  externalUrl,
  yield: recipeYield,
  totalTime,
  calories,
  labels,
}: RecipeInformationProps) {
  const source = externalUrl?.trim();
  const href = source ? sourceLink(source) : undefined;
  const hours = totalTime === null ? 0 : Math.floor(totalTime / 60);
  const minutes = totalTime === null ? 0 : totalTime % 60;
  const time = [
    hours > 0 ? `${hours} hr` : "",
    minutes > 0 || hours === 0 ? `${minutes} min` : "",
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <div className="flex flex-col gap-lg">
      <dl className="flex flex-wrap gap-x-xxl gap-y-md">
        {recipeYield !== null ? (
          <div>
            <dt className="text-sm text-muted">Yield</dt>
            <dd>{recipeYield} servings</dd>
          </div>
        ) : null}
        {totalTime !== null ? (
          <div>
            <dt className="text-sm text-muted">Total time</dt>
            <dd>{time}</dd>
          </div>
        ) : null}
        {calories !== null ? (
          <div>
            <dt className="text-sm text-muted">Calories per serving</dt>
            <dd>{calories}</dd>
          </div>
        ) : null}
        {source ? (
          <div className="min-w-0 basis-full">
            <dt className="text-sm text-muted">Source</dt>
            <dd className="break-words">
              {href ? (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent underline"
                >
                  {source}
                </a>
              ) : (
                source
              )}
            </dd>
          </div>
        ) : null}
      </dl>
      {labels && labels.length > 0 ? (
        <ul aria-label="Recipe labels" className="flex flex-wrap gap-sm">
          {labels.map((label, index) => (
            <li
              key={`${label}:${index}`}
              className="rounded-full bg-surface-secondary px-md py-xs text-sm"
            >
              {label}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
