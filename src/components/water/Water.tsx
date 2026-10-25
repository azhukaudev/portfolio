import { lazy, Suspense, useState, type ComponentProps, type ComponentType } from 'react';

import { useMediaQuery } from './useMediaQuery';
import type { WaterCanvas as WaterCanvasComponent } from './WaterCanvas';

// three.js and React Three Fiber are most of the bundle, so they load only once the water can run.
// If the chunk can't load (e.g. an old tab after a new deploy), the page quietly stays plain.
const WaterCanvas = lazy<ComponentType<ComponentProps<typeof WaterCanvasComponent>>>(() =>
  import('./WaterCanvas').then(
    (module) => ({ default: module.WaterCanvas }),
    () => ({ default: () => null }),
  ),
);

// Without any of these the page stays as plain HTML, which is the intended fallback.
export function Water() {
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const [isSupported] = useState(supportsWater);
  const [isUnavailable, setIsUnavailable] = useState(false);
  const handleUnavailable = () => setIsUnavailable(true);

  if (reducedMotion || !isSupported || isUnavailable) return null;

  return (
    <Suspense fallback={null}>
      <WaterCanvas onUnavailable={handleUnavailable} />
    </Suspense>
  );
}

// The simulation renders into half-float targets, which WebGL2 only allows with this extension.
function supportsWater() {
  const gl = document.createElement('canvas').getContext('webgl2');
  if (!gl) return false;

  const isSupported = Boolean(
    gl.getExtension('EXT_color_buffer_float') ?? gl.getExtension('EXT_color_buffer_half_float'),
  );
  gl.getExtension('WEBGL_lose_context')?.loseContext();
  return isSupported;
}
