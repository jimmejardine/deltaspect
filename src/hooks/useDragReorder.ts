import { useCallback, useState, type PointerEvent } from "react";

/**
 * Drag-to-reorder from a grip handle, using pointer events so it works with mouse and touch.
 * Rows are the elements matching `rowSelector`, in list order; the dragged row moves as soon as
 * the pointer passes the top of another row. Move/up listeners live on the window rather than the
 * grip: React re-inserts the dragged row's DOM node when it moves down, which drops pointer capture.
 */
export function useDragReorder(move: (from: number, to: number) => void, rowSelector: string) {
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);

  const onGripPointerDown = useCallback(
    (index: number) => (e: PointerEvent<HTMLElement>) => {
      e.preventDefault();
      const { pointerId } = e;
      let current = index;
      setDraggingIndex(current);

      const onMove = (ev: globalThis.PointerEvent) => {
        if (ev.pointerId !== pointerId) return;
        const tops = [...document.querySelectorAll<HTMLElement>(rowSelector)].map(
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

      const onEnd = (ev: globalThis.PointerEvent) => {
        if (ev.pointerId !== pointerId) return;
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onEnd);
        window.removeEventListener("pointercancel", onEnd);
        setDraggingIndex(null);
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onEnd);
      window.addEventListener("pointercancel", onEnd);
    },
    [move, rowSelector],
  );

  return { draggingIndex, onGripPointerDown };
}
