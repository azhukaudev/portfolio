import { useThree } from '@react-three/fiber';
import { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import * as THREE from 'three';

const SCENE_ROOT = 'main';

// Redraws the page's visible content into a texture so the water can refract it.
// Layout, fonts, and colors are read from the real DOM, so both always line up.
// Calls `onUnavailable` if the page can't be drawn, so the caller can fall back to the plain page.
export function useSceneTexture(onUnavailable: () => void) {
  const size = useThree((state) => state.size);
  const dpr = useThree((state) => state.viewport.dpr);
  const invalidate = useThree((state) => state.invalidate);
  // Bumped by anything that changes what the page looks like without resizing it.
  const [revision, setRevision] = useState(0);

  // One texture for the island's lifetime; its canvas is created and drawn below, outside render.
  const texture = useMemo(() => {
    const texture = new THREE.Texture<HTMLCanvasElement | undefined>();
    // Pass colors through untouched so the calm water matches the page exactly.
    texture.colorSpace = THREE.NoColorSpace;
    texture.generateMipmaps = false;
    texture.minFilter = THREE.LinearFilter;
    return texture;
  }, []);

  useEffect(() => () => texture.dispose(), [texture]);

  // A layout effect runs before R3F's first frame, so the water never shows an empty scene.
  useLayoutEffect(() => {
    const canvas = texture.image ?? document.createElement('canvas');
    // Same rounding as three's drawing buffer, so the scene maps 1:1 onto screen pixels.
    const width = Math.floor(size.width * dpr);
    const height = Math.floor(size.height * dpr);
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      // A resized canvas needs a freshly allocated GPU copy.
      texture.dispose();
    }

    const ctx = canvas.getContext('2d');
    const root = document.querySelector<HTMLElement>(SCENE_ROOT);
    // e.g. the canvas is over the browser's size limit.
    if (!ctx || !root) return onUnavailable();

    drawScene(ctx, root, size.width, size.height, dpr);
    texture.image = canvas;
    texture.needsUpdate = true;
    invalidate();
  }, [texture, size.width, size.height, dpr, revision, invalidate, onUnavailable]);

  useEffect(() => {
    // At most one redraw per frame, however many events fire.
    let frame = 0;
    const redraw = () => {
      frame ||= requestAnimationFrame(() => {
        frame = 0;
        setRevision((value) => value + 1);
      });
    };

    const controller = new AbortController();
    matchMedia('(prefers-color-scheme: dark)').addEventListener('change', redraw, { signal: controller.signal });
    window.addEventListener('scroll', redraw, { passive: true, signal: controller.signal });
    document.fonts.ready.then(() => {
      if (!controller.signal.aborted) redraw();
    });

    return () => {
      controller.abort();
      cancelAnimationFrame(frame);
    };
  }, []);

  return texture;
}

function drawScene(ctx: CanvasRenderingContext2D, root: HTMLElement, width: number, height: number, dpr: number) {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = getComputedStyle(document.body).backgroundColor;
  ctx.fillRect(0, 0, width, height);

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    if (node.parentElement && node.data.trim()) drawText(ctx, node, node.parentElement);
  }
}

function drawText(ctx: CanvasRenderingContext2D, node: Text, element: HTMLElement) {
  const style = getComputedStyle(element);
  ctx.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
  // Safari before 18.4 has no canvas letterSpacing; there, each character goes where the DOM put it.
  const hasLetterSpacing = 'letterSpacing' in CanvasRenderingContext2D.prototype;
  if (hasLetterSpacing) ctx.letterSpacing = style.letterSpacing === 'normal' ? '0px' : style.letterSpacing;
  ctx.fillStyle = style.color;
  ctx.textBaseline = 'alphabetic';

  for (const line of splitLines(node)) {
    const metrics = ctx.measureText(line.text);
    const fontHeight = metrics.fontBoundingBoxAscent + metrics.fontBoundingBoxDescent;
    const baseline = line.rect.top + (line.rect.height - fontHeight) / 2 + metrics.fontBoundingBoxAscent;
    if (hasLetterSpacing) {
      ctx.fillText(line.text, line.rect.left, baseline);
    } else {
      [...line.text].forEach((char, i) => ctx.fillText(char, line.lefts[i], baseline));
    }
  }
}

// Text can wrap on narrow screens, so group characters by the line the browser put them on.
function splitLines(node: Text) {
  const range = document.createRange();
  const lines: { text: string; rect: DOMRect; lefts: number[] }[] = [];

  for (let i = 0; i < node.length; i++) {
    range.setStart(node, i);
    range.setEnd(node, i + 1);
    const rect = range.getBoundingClientRect();
    if (rect.width === 0) continue;

    const line = lines.at(-1);
    if (line && Math.abs(line.rect.top - rect.top) < 1) {
      line.text += node.data[i];
      line.lefts.push(rect.left);
    } else {
      lines.push({ text: node.data[i], rect, lefts: [rect.left] });
    }
  }

  return lines.map((line) => ({ ...line, text: line.text.trimEnd() }));
}
