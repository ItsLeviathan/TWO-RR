import * as THREE from "three";

/**
 * Rising steam: soft noise wisps on camera-facing planes. Cheap (two quads, one small shader)
 * and it keeps the cup feeling freshly poured.
 */
const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform float uTime;
  uniform float uSeed;
  uniform float uOpacity;
  varying vec2 vUv;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }
  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; }
    return v;
  }

  void main() {
    float t = uTime * 0.35 + uSeed * 10.0;
    float sway = sin(vUv.y * 5.0 - t * 2.0 + uSeed * 6.0) * 0.09 * vUv.y;
    float x = vUv.x - 0.5 + sway;
    float column = smoothstep(0.42, 0.06, abs(x) / (0.35 + vUv.y * 0.6));
    float fade = smoothstep(0.0, 0.18, vUv.y) * smoothstep(1.0, 0.45, vUv.y);
    float n = fbm(vec2(x * 4.0 + uSeed, vUv.y * 3.2 - t * 1.4));
    float wisps = smoothstep(0.42, 0.78, n);
    float alpha = column * fade * wisps * 0.5 * uOpacity;
    gl_FragColor = vec4(vec3(1.0, 0.97, 0.92), alpha);
  }
`;

export function createSteam(count = 2) {
  const group = new THREE.Group();
  const materials: THREE.ShaderMaterial[] = [];
  for (let i = 0; i < count; i++) {
    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: { uTime: { value: 0 }, uSeed: { value: i * 1.37 + 0.2 }, uOpacity: { value: 1 } },
      transparent: true,
      depthWrite: false,
    });
    materials.push(material);
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.36), material);
    plane.position.set((i - (count - 1) / 2) * 0.025, 0.27, (i % 2) * 0.01);
    plane.renderOrder = 10;
    group.add(plane);
  }
  return {
    group,
    update(time: number, camera: THREE.Camera) {
      for (const m of materials) m.uniforms.uTime!.value = time;
      // Billboard around the vertical axis only, so the steam always rises "up".
      const target = new THREE.Vector3();
      camera.getWorldPosition(target);
      group.children.forEach((child) => {
        const world = new THREE.Vector3();
        child.getWorldPosition(world);
        child.rotation.y = Math.atan2(target.x - world.x, target.z - world.z);
      });
    },
  };
}
