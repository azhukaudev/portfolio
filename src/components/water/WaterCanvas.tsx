import { Canvas } from '@react-three/fiber';

import { WaterSurface } from './WaterSurface';

export function WaterCanvas({ onUnavailable }: { onUnavailable: () => void }) {
  return (
    <Canvas
      aria-hidden="true"
      style={{ position: 'fixed', inset: 0, pointerEvents: 'none' }}
      // Up to 3x, so the calm text is as sharp as the real text on high-density phones.
      dpr={[1, 3]}
      // Frames are requested by the water itself, so a calm page does no work at all.
      frameloop="demand"
      flat
      linear
      gl={{ antialias: false, alpha: false }}
      // Resizing rebuilds the simulation, so wait until the window (or mobile URL bar) settles.
      resize={{ debounce: 150 }}
    >
      <WaterSurface onUnavailable={onUnavailable} />
    </Canvas>
  );
}
