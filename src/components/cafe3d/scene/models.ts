import * as THREE from "three";

/** Procedural café models. Dimensions are in metres. */

export type Materials = ReturnType<typeof createMaterials>;

export function createMaterials() {
  return {
    gold: new THREE.MeshStandardMaterial({ color: 0xc99a52, metalness: 1, roughness: 0.28 }),
    brushedGold: new THREE.MeshStandardMaterial({ color: 0xb98a46, metalness: 1, roughness: 0.45 }),
    ceramicBlack: new THREE.MeshPhysicalMaterial({ color: 0x15110d, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: 0.55 }),
    ceramicCream: new THREE.MeshPhysicalMaterial({ color: 0xf1e6d2, roughness: 0.35, clearcoat: 0.8, clearcoatRoughness: 0.15 }),
    espresso: new THREE.MeshStandardMaterial({ color: 0x17120e, roughness: 0.55, metalness: 0.2 }),
    chrome: new THREE.MeshStandardMaterial({ color: 0xd9d4cc, metalness: 1, roughness: 0.18 }),
    bean: new THREE.MeshPhysicalMaterial({ color: 0x5b3315, roughness: 0.42, clearcoat: 0.6, clearcoatRoughness: 0.35 }),
    glass: new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      roughness: 0.05,
      transmission: 0.9,
      thickness: 0.02,
      transparent: true,
      opacity: 0.35,
    }),
  };
}

/** The TWO RR wall clock: the real logo on a dark puck with a gold bezel. */
export function createClock(logo: THREE.Texture, m: Materials) {
  const group = new THREE.Group();
  const radius = 1.12;
  const puck = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 0.1, 96), m.espresso);
  puck.rotation.x = Math.PI / 2;
  group.add(puck);
  const bezel = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.045, 24, 128), m.gold);
  bezel.position.z = 0.04;
  group.add(bezel);
  // Logo artwork is 758×785 (a slightly tall circle) with a transparent surround.
  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(2.2, 2.2 * (785 / 758)),
    new THREE.MeshStandardMaterial({ map: logo, transparent: true, alphaTest: 0.5, roughness: 0.55, metalness: 0.05 }),
  );
  face.position.z = 0.056;
  group.add(face);
  return group;
}

/** Cup + saucer + coffee surface, built with lathes (like a potter's wheel). */
export function createCup(crema: THREE.Texture, m: Materials) {
  const group = new THREE.Group();

  const saucerProfile = [
    [0.0, 0.0],
    [0.07, 0.0],
    [0.105, 0.006],
    [0.118, 0.016],
    [0.12, 0.02],
    [0.112, 0.017],
    [0.08, 0.01],
    [0.045, 0.012],
    [0.0, 0.012],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const saucer = new THREE.Mesh(new THREE.LatheGeometry(saucerProfile, 96), m.ceramicBlack);
  saucer.castShadow = saucer.receiveShadow = true;
  group.add(saucer);

  // Outer wall then inner wall (a thin-walled cup, open at the top).
  const cupProfile = [
    [0.0, 0.013],
    [0.03, 0.013],
    [0.034, 0.02],
    [0.048, 0.045],
    [0.058, 0.072],
    [0.062, 0.088],
    [0.0605, 0.09],
    [0.056, 0.087],
    [0.052, 0.07],
    [0.04, 0.04],
    [0.028, 0.022],
    [0.0, 0.021],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const cup = new THREE.Mesh(new THREE.LatheGeometry(cupProfile, 96), m.ceramicBlack);
  cup.castShadow = cup.receiveShadow = true;
  group.add(cup);

  // Gold line under the rim, echoing the logo's gold accents.
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.0598, 0.0011, 8, 96), m.gold);
  band.rotation.x = Math.PI / 2;
  band.position.y = 0.083;
  group.add(band);

  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.019, 0.0055, 16, 48, Math.PI * 1.25), m.ceramicBlack);
  handle.position.set(0.064, 0.058, 0);
  handle.rotation.z = -Math.PI * 0.62;
  handle.castShadow = true;
  group.add(handle);

  const coffee = new THREE.Mesh(
    new THREE.CircleGeometry(0.0535, 64),
    new THREE.MeshPhysicalMaterial({ map: crema, roughness: 0.38, clearcoat: 0.15, envMapIntensity: 0.35 }),
  );
  coffee.rotation.x = -Math.PI / 2;
  coffee.rotation.z = Math.PI * 0.35;
  coffee.position.y = 0.079;
  group.add(coffee);

  return group;
}

/** A coffee bean: an ellipsoid with the characteristic centre crease. */
export function createBeanGeometry() {
  const geo = new THREE.SphereGeometry(1, 28, 18);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    // flatten the bottom, crease the top along the long (z) axis
    if (v.y < 0) v.y *= 0.55;
    if (v.y > 0) v.y -= Math.exp(-(v.x * v.x) / 0.012) * 0.38 * v.y;
    v.multiply(new THREE.Vector3(0.55, 0.42, 0.78));
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  return geo;
}

/** Brass pendant lamp with a glowing bulb; returns the group and the light it carries. */
export function createPendant(m: Materials, bulbColor = 0xffc98a) {
  const group = new THREE.Group();
  const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.0022, 0.0022, 3, 6), m.brushedGold);
  cord.position.y = 1.55;
  group.add(cord);
  const shadeProfile = [
    [0.02, 0.22],
    [0.05, 0.21],
    [0.08, 0.16],
    [0.15, 0.04],
    [0.2, 0.0],
    [0.195, -0.005],
    [0.145, 0.035],
    [0.075, 0.15],
    [0.045, 0.2],
    [0.018, 0.21],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const shade = new THREE.Mesh(new THREE.LatheGeometry(shadeProfile, 64), m.brushedGold);
  shade.material.side = THREE.DoubleSide;
  group.add(shade);
  const bulb = new THREE.Mesh(
    new THREE.SphereGeometry(0.045, 24, 16),
    new THREE.MeshStandardMaterial({ color: 0xfff1d6, emissive: bulbColor, emissiveIntensity: 3 }),
  );
  bulb.position.y = 0.06;
  group.add(bulb);
  const light = new THREE.PointLight(bulbColor, 3.2, 7, 1.6);
  light.position.y = 0.02;
  group.add(light);
  return { group, light };
}

/** A stylised two-group espresso machine. */
export function createEspressoMachine(m: Materials) {
  const group = new THREE.Group();
  const body = new THREE.Mesh(new RoundedBox(1.0, 0.52, 0.55), m.espresso);
  body.position.y = 0.36;
  body.castShadow = body.receiveShadow = true;
  group.add(body);
  const top = new THREE.Mesh(new THREE.BoxGeometry(1.02, 0.025, 0.57), m.chrome);
  top.position.y = 0.635;
  group.add(top);
  const trim = new THREE.Mesh(new THREE.BoxGeometry(1.01, 0.02, 0.01), m.gold);
  trim.position.set(0, 0.5, 0.28);
  group.add(trim);
  const drip = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.03, 0.3), m.chrome);
  drip.position.set(0, 0.1, 0.2);
  group.add(drip);
  const base = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.1, 0.55), m.espresso);
  base.position.y = 0.05;
  group.add(base);
  for (const x of [-0.25, 0.25]) {
    const head = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.09, 32), m.chrome);
    head.position.set(x, 0.2, 0.3);
    group.add(head);
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.18, 12), m.espresso);
    handle.rotation.x = Math.PI / 2;
    handle.position.set(x, 0.18, 0.43);
    group.add(handle);
    const gauge = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.02, 32), m.gold);
    gauge.rotation.x = Math.PI / 2;
    gauge.position.set(x, 0.43, 0.285);
    group.add(gauge);
  }
  // cups warming on top
  for (let i = 0; i < 4; i++) {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.025, 0.06, 24), i % 2 ? m.ceramicCream : m.ceramicBlack);
    c.position.set(-0.3 + i * 0.2, 0.68, 0);
    group.add(c);
  }
  return group;
}

export function createGrinder(m: Materials) {
  const group = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.32, 32), m.espresso);
  base.position.y = 0.16;
  group.add(base);
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.105, 0.105, 0.03, 32), m.gold);
  collar.position.y = 0.33;
  group.add(collar);
  const hopper = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.05, 0.2, 32, 1, true), m.glass);
  hopper.position.y = 0.45;
  group.add(hopper);
  const beans = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.05, 0.12, 32), m.bean);
  beans.position.y = 0.41;
  group.add(beans);
  return group;
}

/** Wall shelf with jars of beans and stacked cups. */
export function createShelf(m: Materials, wood: THREE.Material) {
  const group = new THREE.Group();
  const plank = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.05, 0.28), wood);
  plank.castShadow = plank.receiveShadow = true;
  group.add(plank);
  for (const x of [-0.7, 0.7]) {
    const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.18, 0.22), m.brushedGold);
    bracket.position.set(x, -0.11, 0);
    group.add(bracket);
  }
  const jarGeo = new THREE.CylinderGeometry(0.075, 0.075, 0.24, 32);
  const fillGeo = new THREE.CylinderGeometry(0.068, 0.068, 0.17, 32);
  for (let i = 0; i < 3; i++) {
    const jar = new THREE.Mesh(jarGeo, m.glass);
    jar.position.set(-0.55 + i * 0.22, 0.145, 0);
    group.add(jar);
    const fill = new THREE.Mesh(fillGeo, m.bean);
    fill.position.set(-0.55 + i * 0.22, 0.11, 0);
    group.add(fill);
    const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.078, 0.078, 0.02, 32), m.gold);
    lid.position.set(-0.55 + i * 0.22, 0.27, 0);
    group.add(lid);
  }
  for (let i = 0; i < 4; i++) {
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.042, 0.075, 24), m.ceramicCream);
    cup.position.set(0.25 + (i % 2) * 0.15, 0.065 + Math.floor(i / 2) * 0.078, 0);
    group.add(cup);
  }
  return group;
}

/** BoxGeometry with softened edges (cheap bevel via a rounded ExtrudeGeometry). */
class RoundedBox extends THREE.ExtrudeGeometry {
  constructor(w: number, h: number, d: number, r = 0.04) {
    const shape = new THREE.Shape();
    const x = -w / 2;
    const y = -h / 2;
    shape.moveTo(x + r, y);
    shape.lineTo(x + w - r, y);
    shape.quadraticCurveTo(x + w, y, x + w, y + r);
    shape.lineTo(x + w, y + h - r);
    shape.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    shape.lineTo(x + r, y + h);
    shape.quadraticCurveTo(x, y + h, x, y + h - r);
    shape.lineTo(x, y + r);
    shape.quadraticCurveTo(x, y, x + r, y);
    super(shape, { depth: d - 2 * r, bevelEnabled: true, bevelSize: r, bevelThickness: r, bevelSegments: 3, curveSegments: 6 });
    this.translate(0, 0, -(d - 2 * r) / 2);
  }
}
