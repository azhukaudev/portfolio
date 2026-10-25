import { useEffect, useRef } from 'react';

export type Segment = { fromX: number; fromY: number; toX: number; toY: number };

// Collects pointer movement as line segments in CSS px. Kept in a ref so moving
// the pointer never re-renders React; the frame loop drains it, and `onInput`
// wakes that loop up.
export function usePointerTrail(onInput: () => void) {
  const segments = useRef<Segment[]>([]);

  useEffect(() => {
    // One entry per mouse, pen, or finger, so multi-touch draws separate trails.
    const last = new Map<string, { x: number; y: number }>();

    const add = (key: string, x: number, y: number) => {
      const from = last.get(key) ?? { x, y };
      segments.current.push({ fromX: from.x, fromY: from.y, toX: x, toY: y });
      last.set(key, { x, y });
      onInput();
    };
    // A lifted finger or a pointer that left the window must not draw a line on its return.
    const end = (key: string) => last.delete(key);

    // Touch uses touch events instead: once the browser starts a pan, pointer events
    // are cancelled, but passive touchmove keeps arriving without blocking scrolling.
    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType !== 'touch') add(`pointer${event.pointerId}`, event.clientX, event.clientY);
    };
    const onPointerOut = (event: PointerEvent) => {
      if (!event.relatedTarget) end(`pointer${event.pointerId}`);
    };
    const onTouchMove = (event: TouchEvent) => {
      for (const touch of event.changedTouches) add(`touch${touch.identifier}`, touch.clientX, touch.clientY);
    };
    const onTouchEnd = (event: TouchEvent) => {
      for (const touch of event.changedTouches) end(`touch${touch.identifier}`);
    };

    const controller = new AbortController();
    const options = { passive: true, signal: controller.signal };
    window.addEventListener('pointermove', onPointerMove, options);
    window.addEventListener('pointerdown', onPointerMove, options);
    window.addEventListener('pointerout', onPointerOut, options);
    window.addEventListener('touchstart', onTouchMove, options);
    window.addEventListener('touchmove', onTouchMove, options);
    window.addEventListener('touchend', onTouchEnd, options);
    window.addEventListener('touchcancel', onTouchEnd, options);

    return () => controller.abort();
  }, [onInput]);

  return segments;
}
