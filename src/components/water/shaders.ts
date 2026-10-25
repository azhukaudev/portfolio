export const MAX_DROPS = 32;

export const fullscreenVertex = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

// Height field wave equation. R holds the current height, G the previous one.
export const simulateFragment = /* glsl */ `
  #define MAX_DROPS ${MAX_DROPS}

  uniform sampler2D uState;
  uniform vec2 uTexel;
  uniform float uDamping;
  uniform float uAspect;
  uniform vec4 uDrops[MAX_DROPS]; // xy: uv center, z: radius (uv height units), w: strength
  uniform int uDropCount;

  varying vec2 vUv;

  void main() {
    vec2 state = texture2D(uState, vUv).rg;
    float neighbors =
      texture2D(uState, vUv - vec2(uTexel.x, 0.0)).r +
      texture2D(uState, vUv + vec2(uTexel.x, 0.0)).r +
      texture2D(uState, vUv - vec2(0.0, uTexel.y)).r +
      texture2D(uState, vUv + vec2(0.0, uTexel.y)).r;

    float height = (neighbors * 0.5 - state.g) * uDamping;

    for (int i = 0; i < MAX_DROPS; i++) {
      if (i >= uDropCount) break;
      vec4 drop = uDrops[i];
      vec2 delta = (vUv - drop.xy) * vec2(uAspect, 1.0) / drop.z;
      // Zero-volume "Mexican hat": a dip with a raised rim. A plain dip would leave the
      // whole surface sunk, which reads as a slow lens, not ripples.
      float r2 = dot(delta, delta) * 4.0;
      height -= drop.w * (1.0 - r2) * exp(-r2);
    }

    gl_FragColor = vec4(height, state.r, 0.0, 1.0);
  }
`;

export const displayFragment = /* glsl */ `
  uniform sampler2D uScene;
  uniform sampler2D uHeight;
  uniform vec2 uSimTexel;
  uniform vec2 uViewSize; // CSS px
  uniform float uRefractionPx; // offset per unit of height slope
  uniform float uMaxOffsetPx; // soft limit, so stacked waves bend the text without shredding it
  uniform float uShading; // how much slopes facing toward/away from the light lighten/darken

  varying vec2 vUv;

  void main() {
    vec2 slope = vec2(
      texture2D(uHeight, vUv + vec2(uSimTexel.x, 0.0)).r - texture2D(uHeight, vUv - vec2(uSimTexel.x, 0.0)).r,
      texture2D(uHeight, vUv + vec2(0.0, uSimTexel.y)).r - texture2D(uHeight, vUv - vec2(0.0, uSimTexel.y)).r
    );

    // Leftover sub-pixel shifts would keep the text slightly blurred long after the
    // water looks still, so tiny offsets snap to zero.
    vec2 offsetPx = slope * uRefractionPx;
    float limit = 1.0 + length(offsetPx) / uMaxOffsetPx;
    offsetPx /= limit;
    slope /= limit;
    if (dot(offsetPx, offsetPx) < 0.01) {
      slope = vec2(0.0);
      offsetPx = vec2(0.0);
    }

    vec4 color = texture2D(uScene, vUv + offsetPx / uViewSize);
    // Light from the top left, so ripples are visible on the flat background too.
    float light = dot(slope, vec2(-0.7071, 0.7071));
    gl_FragColor = vec4(clamp(color.rgb + light * uShading, 0.0, 1.0), 1.0);
  }
`;
