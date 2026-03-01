import {
  type MouseEvent as ReactMouseEvent,
  useCallback,
  useRef,
  useState,
} from "react";

interface UseDragResizeOptions {
  defaultWidth: number;
  minWidth: number;
  maxWidth: number;
  /** Which direction expands the panel. "left" = drag left to grow (right-side panels).
   *  "right" = drag right to grow (left-side panels). Defaults to "left". */
  expandDirection?: "left" | "right";
}

interface UseDragResizeResult {
  width: number;
  onDragStart: (e: ReactMouseEvent) => void;
}

export const useDragResize = ({
  defaultWidth,
  minWidth,
  maxWidth,
  expandDirection = "left",
}: UseDragResizeOptions): UseDragResizeResult => {
  const [width, setWidth] = useState(defaultWidth);
  const widthRef = useRef(defaultWidth);

  const onDragStart = useCallback(
    (e: ReactMouseEvent) => {
      e.preventDefault();
      const startX = e.clientX;
      const startWidth = widthRef.current;

      const onMouseMove = (e: MouseEvent) => {
        const delta =
          expandDirection === "left"
            ? startX - e.clientX
            : e.clientX - startX;
        const newWidth = Math.min(
          maxWidth,
          Math.max(minWidth, startWidth + delta),
        );
        widthRef.current = newWidth;
        setWidth(newWidth);
      };

      const onMouseUp = () => {
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
      };

      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    },
    [minWidth, maxWidth, expandDirection],
  );

  return { width, onDragStart };
};