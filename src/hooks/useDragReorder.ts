import { useCallback, useState, type PointerEvent } from "react";

/**
 * Drag-to-reorder from a grip handle, using pointer events so it works with mouse and touch.
 * Rows are found by their `[data-row]` elements; the dragged row moves as soon as the pointer
 * passes the top of another row.
 */
export function useDragReorder(move: (from: number, to: number) => void) {
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);

  const onGripPointerDown = useCallback(
    (index: number) => (e: PointerEvent<HTMLElement>) => {
      e.preventDefault();
      const grip = e.currentTarget;
      grip.setPointerCapture(e.pointerId);
      let current = index;
      setDraggingIndex(current);

      const onMove = (ev: globalThis.PointerEvent) => {
        const tops = [...document.querySelectorAll<HTMLElement>("[data-row]")].map(
          (el) => el.getBoundingClientRect().top,
        );
        let target = 0;
        tops.forEach((top, i) => {
          if (ev.clientY >= top) target = i;
        });
        if (target !== current) {
          move(current, target);
          current = target;
          setDraggingIndex(target);
        }
      };

      const onEnd = () => {
        grip.removeEventListener("pointermove", onMove);
        grip.removeEventListener("pointerup", onEnd);
        grip.removeEventListener("pointercancel", onEnd);
        setDraggingIndex(null);
      };

      grip.addEventListener("pointermove", onMove);
      grip.addEventListener("pointerup", onEnd);
      grip.addEventListener("pointercancel", onEnd);
    },
    [move],
  );

  return { draggingIndex, onGripPointerDown };
}
