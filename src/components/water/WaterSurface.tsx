import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

import { createQuad, disposeQuad } from './quad';
import { displayFragment, fullscreenVertex } from './shaders';
import { createSimulation } from './simulation';
import { usePointerTrail } from './usePointerTrail';
import { useSceneTexture } from './useSceneTexture';

const STEP_SECONDS = 1 / 60;
const MAX_STEPS_PER_FRAME = 4;
// By then the waves are too small to see, so the simulation can rest until the next move.
const CALM_SECONDS = 6;
const REFRACTION_PX = 70;
const MAX_OFFSET_PX = 20;
// How much slopes facing toward/away from the light lighten/darken; reads well on light and dark.
const SHADING = 0.32;
// While set, CSS hides the real text; the water shows a drawn copy of it instead.
const ACTIVE_ATTRIBUTE = 'data-water';

// Runs on R3F's on-demand frame loop: a frame happens only when the pointer moves, the scene
// is redrawn, or waves are still settling, so a calm page costs nothing.
export function WaterSurface({ onUnavailable }: { onUnavailable: () => void }) {
  const size = useThree((state) => state.size);
  const gl = useThree((state) => state.gl);
  const invalidate = useThree((state) => state.invalidate);
  const scene = useSceneTexture(onUnavailable);
  const trail = usePointerTrail(invalidate);
  const hasRendered = useRef(false);
  const hasFailed = useRef(false);
  const pendingTime = useRef(0);
  // Starts at rest: there is nothing to simulate until the first pointer move.
  const idleTime = useRef(Infinity);

  const sim = useMemo(() => createSimulation(size.width, size.height), [size.width, size.height]);
  const display = useMemo(
    () =>
      createQuad(
        new THREE.ShaderMaterial({
          vertexShader: fullscreenVertex,
          fragmentShader: displayFragment,
          uniforms: {
            uScene: { value: null },
            uHeight: { value: null },
            uSimTexel: { value: new THREE.Vector2() },
            uViewSize: { value: new THREE.Vector2() },
            uRefractionPx: { value: REFRACTION_PX },
            uMaxOffsetPx: { value: MAX_OFFSET_PX },
            uShading: { value: SHADING },
          },
        }),
      ),
    [],
  );

  useEffect(() => () => sim.dispose(), [sim]);
  useEffect(() => () => disposeQuad(display), [display]);
  useEffect(() => () => document.documentElement.removeAttribute(ACTIVE_ATTRIBUTE), []);

  // Anything that would leave the water blank hands the page back to the plain HTML.
  // A layout effect is in place before the first frame compiles the shaders. Removed on
  // unmount, before R3F force-loses the context itself while tearing down.
  useLayoutEffect(() => {
    const fail = () => {
      hasFailed.current = true;
      onUnavailable();
    };
    gl.debug.onShaderError = fail;
    gl.domElement.addEventListener('webglcontextlost', fail);
    return () => {
      gl.debug.onShaderError = null;
      gl.domElement.removeEventListener('webglcontextlost', fail);
    };
  }, [gl, onUnavailable]);

  // Priority 1 takes over rendering from R3F, so each pass is drawn explicitly.
  useFrame(({ gl, camera }, delta) => {
    idleTime.current = trail.current.length > 0 ? 0 : idleTime.current + delta;
    if (idleTime.current > CALM_SECONDS) {
      sim.clear(gl);
      pendingTime.current = 0;
    } else {
      pendingTime.current = Math.min(pendingTime.current + delta, STEP_SECONDS * MAX_STEPS_PER_FRAME);
      // On high refresh rate screens some frames have no step; keep their input for the next one.
      if (pendingTime.current >= STEP_SECONDS) sim.setDrops(trail.current.splice(0));
      while (pendingTime.current >= STEP_SECONDS) {
        pendingTime.current -= STEP_SECONDS;
        sim.step(gl, camera);
      }
      invalidate();
    }

    const uniforms = display.material.uniforms;
    uniforms.uScene.value = scene;
    uniforms.uHeight.value = sim.texture();
    uniforms.uSimTexel.value.copy(sim.texel);
    uniforms.uViewSize.value.set(size.width, size.height);

    gl.setRenderTarget(null);
    gl.render(display, camera);

    // Only hide the real text once the water really shows it.
    if (!hasRendered.current && scene.image && !hasFailed.current) {
      hasRendered.current = true;
      document.documentElement.setAttribute(ACTIVE_ATTRIBUTE, 'on');
    }
  }, 1);

  return null;
}
