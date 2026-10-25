import * as THREE from 'three';

import { createQuad, disposeQuad } from './quad';
import { fullscreenVertex, MAX_DROPS, simulateFragment } from './shaders';
import type { Segment } from './usePointerTrail';

const SIM_SCALE = 0.5;
const MAX_SIM_SIZE = 1024;
const DAMPING = 0.965;
const DROP_RADIUS_PX = 60;
const DROP_SPACING_PX = 6;
const DROP_STRENGTH = 0.06;

export type Simulation = ReturnType<typeof createSimulation>;

// GPU height-field water for a view of the given CSS size. Rebuilt when the view resizes.
export function createSimulation(viewWidth: number, viewHeight: number) {
  const scale = Math.min(SIM_SCALE, MAX_SIM_SIZE / Math.max(viewWidth, viewHeight));
  const width = Math.max(1, Math.round(viewWidth * scale));
  const height = Math.max(1, Math.round(viewHeight * scale));

  const createTarget = () =>
    new THREE.WebGLRenderTarget(width, height, {
      type: THREE.HalfFloatType,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      depthBuffer: false,
    });
  let read = createTarget();
  let write = createTarget();
  let isClear = true;
  // Distance travelled since the last drop, carried across frames so drops follow the path,
  // not the pointer's event rate.
  let travelled = 0;

  const drops = Array.from({ length: MAX_DROPS }, () => new THREE.Vector4());
  const quad = createQuad(
    new THREE.ShaderMaterial({
      vertexShader: fullscreenVertex,
      fragmentShader: simulateFragment,
      uniforms: {
        uState: { value: null },
        uTexel: { value: new THREE.Vector2(1 / width, 1 / height) },
        uDamping: { value: DAMPING },
        uAspect: { value: viewWidth / viewHeight },
        uDrops: { value: drops },
        uDropCount: { value: 0 },
      },
    }),
  );
  const uniforms = quad.material.uniforms;

  return {
    texel: new THREE.Vector2(1 / width, 1 / height),
    texture: () => read.texture,

    // Places a drop every `spacing` px along the pointer path, so the trail is smooth and its
    // strength depends on distance moved. Fast moves widen the spacing to stay within MAX_DROPS.
    setDrops(segments: Segment[]) {
      const totalLength = segments.reduce((sum, segment) => sum + lengthOf(segment), 0);
      const spacing = Math.max(DROP_SPACING_PX, totalLength / MAX_DROPS);
      let count = 0;
      const addDrop = (x: number, y: number) => {
        if (count < MAX_DROPS) {
          drops[count++].set(x / viewWidth, 1 - y / viewHeight, DROP_RADIUS_PX / viewHeight, DROP_STRENGTH);
        }
      };

      for (const segment of segments) {
        const length = lengthOf(segment);
        // A pointer that just landed (click, new touch) makes one drop where it lands.
        if (length === 0) {
          addDrop(segment.toX, segment.toY);
          travelled = 0;
          continue;
        }

        // Spacing can shrink between frames, so a long carried distance drops right at the start.
        let next = Math.max(0, spacing - travelled);
        for (; next <= length; next += spacing) {
          const t = next / length;
          addDrop(segment.fromX + (segment.toX - segment.fromX) * t, segment.fromY + (segment.toY - segment.fromY) * t);
        }
        travelled = length - (next - spacing);
      }

      uniforms.uDropCount.value = count;
    },

    step(gl: THREE.WebGLRenderer, camera: THREE.Camera) {
      uniforms.uState.value = read.texture;
      gl.setRenderTarget(write);
      gl.render(quad, camera);
      [read, write] = [write, read];
      isClear = false;
      // Drops land once, on the first step of the frame.
      uniforms.uDropCount.value = 0;
    },

    // Wipes the leftover, invisible ripples so a resting surface is exactly flat.
    clear(gl: THREE.WebGLRenderer) {
      if (isClear) return;
      const clearColor = gl.getClearColor(new THREE.Color());
      const clearAlpha = gl.getClearAlpha();
      gl.setClearColor(0x000000, 0);
      for (const target of [read, write]) {
        gl.setRenderTarget(target);
        gl.clear(true, false, false);
      }
      gl.setClearColor(clearColor, clearAlpha);
      isClear = true;
    },

    dispose() {
      read.dispose();
      write.dispose();
      disposeQuad(quad);
    },
  };
}

function lengthOf(segment: Segment) {
  return Math.hypot(segment.toX - segment.fromX, segment.toY - segment.fromY);
}
