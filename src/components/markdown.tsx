import clsx from "clsx";
import ReactMarkdown from "react-markdown";

type MarkdownProps = {
  text?: string | null;
  /** Added to my wrapper's classes, such as a `prose-*` size. */
  className?: string;
};

/** I render text as CommonMark, without its raw HTML. */
export function Markdown({ text, className }: MarkdownProps) {
  if (!text?.trim()) return null;
  return (
    <div
      className={clsx(
        "prose prose-tokens markdown-steps max-w-none",
        className,
      )}
    >
      <ReactMarkdown>{text}</ReactMarkdown>
    </div>
  );
}
