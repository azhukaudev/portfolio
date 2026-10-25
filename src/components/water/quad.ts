import * as THREE from 'three';

export type Quad = THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;

// A full-screen pass: the vertex shader writes clip space directly, so any camera works.
export function createQuad(material: THREE.ShaderMaterial): Quad {
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
  // The vertex shader ignores the camera, so culling would hide the quad by mistake.
  quad.frustumCulled = false;
  return quad;
}

export function disposeQuad(quad: Quad) {
  quad.geometry.dispose();
  quad.material.dispose();
}
