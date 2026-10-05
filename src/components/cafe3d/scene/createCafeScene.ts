import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { GTAOPass } from "three/examples/jsm/postprocessing/GTAOPass.js";
import { BokehPass } from "three/examples/jsm/postprocessing/BokehPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { VignetteShader } from "three/examples/jsm/shaders/VignetteShader.js";
import { fitModel, loadCafeAssets, pbrMaterial } from "./assets";
import { swirlAmount, type CameraKey } from "../story";
import { createBeanGeometry, createClock, createCup, createEspressoMachine, createGrinder, createMaterials, createPendant, createShelf } from "./models";
import { createSteam } from "./steam";
import { cremaTexture, menuBoardTexture, wallTexture, woodTexture, type BoardItem } from "./textures";

export type CafeSceneOptions = {
  logoUrl: string;
  fallbackLogoUrl: string;
  boardTitle: string;
  boardItems: BoardItem[];
  fonts: { display: string; caps: string; sans: string };
  path: CameraKey[];
  quality: "high" | "low";
};

export type CafeScene = {
  /** Resolves once textures are loaded and shaders compiled — safe to reveal the canvas. */
  ready: Promise<void>;
  render: (progress: number, timeSeconds: number, pointer: { x: number; y: number }) => void;
  resize: (width: number, height: number) => void;
  /** Lowers render cost one step (resolution, then shadows). Returns false when already minimal. */
  degrade: () => boolean;
  dispose: () => void;
};

const COUNTER_TOP = 1.07;
const CUP_POS = new THREE.Vector3(0.1, COUNTER_TOP, -1.86);

export function createCafeScene(canvas: HTMLCanvasElement, options: CafeSceneOptions): CafeScene {
  const high = options.quality === "high";
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: high, powerPreference: "high-performance", alpha: false });
  let pixelRatio = Math.min(window.devicePixelRatio || 1, high ? 2 : 1.5);
  renderer.setPixelRatio(pixelRatio);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  // AgX gives a photographic, film-like response (less orange clipping than ACES on wood tones).
  renderer.toneMapping = THREE.AgXToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.shadowMap.enabled = high;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const scene = new THREE.Scene();
  const bg = new THREE.Color(0x0f0c09);
  scene.background = bg;
  scene.fog = new THREE.Fog(bg, 7, 17);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTexture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envTexture;
  scene.environmentIntensity = 0.28;

  const camera = new THREE.PerspectiveCamera(40, 1, 0.02, 40);

  /* ---------------- Post-processing (desktop) ----------------
   * Ambient occlusion grounds objects, depth of field gives close-ups a real-lens feel, bloom makes
   * bulbs glow, and a vignette frames the shot. Phones render directly for speed. */
  let composer: EffectComposer | null = null;
  let gtao: GTAOPass | null = null;
  let bokeh: BokehPass | null = null;
  if (high) {
    const target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 });
    composer = new EffectComposer(renderer, target);
    composer.addPass(new RenderPass(scene, camera));
    gtao = new GTAOPass(scene, camera, 1, 1);
    gtao.blendIntensity = 0.85;
    gtao.updateGtaoMaterial({ radius: 0.35, distanceExponent: 1.5, thickness: 1, scale: 1 });
    composer.addPass(gtao);
    bokeh = new BokehPass(scene, camera, { focus: 4, aperture: 0.0008, maxblur: 0.008 });
    composer.addPass(bokeh);
    composer.addPass(new UnrealBloomPass(new THREE.Vector2(1, 1), 0.22, 0.4, 1.4));
    composer.addPass(new OutputPass());
    const vignette = new ShaderPass(VignetteShader);
    vignette.uniforms.offset!.value = 1.0;
    vignette.uniforms.darkness!.value = 1.15;
    composer.addPass(vignette);
  }
  const m = createMaterials();
  const disposables: { dispose: () => void }[] = [renderer, pmrem, envTexture];

  /* ---------------- Room ---------------- */
  const floorTex = woodTexture(11, 6, [3, 3]);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(16, 14), new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.72 }) as THREE.Material);
  floor.rotation.x = -Math.PI / 2;
  floor.position.z = 1;
  floor.receiveShadow = true;
  scene.add(floor);

  const wall = new THREE.Mesh(new THREE.PlaneGeometry(16, 7), new THREE.MeshStandardMaterial({ map: wallTexture(), roughness: 0.95 }) as THREE.Material);
  wall.position.set(0, 3.5, -4);
  wall.receiveShadow = true;
  scene.add(wall);

  const panelTex = woodTexture(5, 0, [6, 1]);
  const wainscot = new THREE.Mesh(new THREE.BoxGeometry(16, 1.15, 0.04), new THREE.MeshStandardMaterial({ map: panelTex, roughness: 0.6 }) as THREE.Material);
  wainscot.position.set(0, 0.575, -3.98);
  scene.add(wainscot);
  const rail = new THREE.Mesh(new THREE.BoxGeometry(16, 0.03, 0.05), m.brushedGold);
  rail.position.set(0, 1.16, -3.96);
  scene.add(rail);

  /* ---------------- Counter ---------------- */
  const counterWood = new THREE.MeshStandardMaterial({ map: woodTexture(3, 0, [7, 2], 0.45), roughness: 0.38, metalness: 0.05 });
  const top = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.06, 1.3), counterWood as THREE.Material);
  top.position.set(0, COUNTER_TOP - 0.03, -2.0);
  top.receiveShadow = top.castShadow = true;
  scene.add(top);
  const body = new THREE.Mesh(new THREE.BoxGeometry(5.4, COUNTER_TOP - 0.06, 1.15), m.espresso);
  body.position.set(0, (COUNTER_TOP - 0.06) / 2, -2.05);
  body.receiveShadow = true;
  scene.add(body);
  for (const y of [0.92, 0.12]) {
    const trim = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.014, 0.012), m.gold);
    trim.position.set(0, y, -1.47);
    scene.add(trim);
  }
  // Fluted front panel: vertical walnut slats.
  const slatGeo = new THREE.BoxGeometry(0.07, 0.72, 0.03);
  const slats = new THREE.InstancedMesh(slatGeo, counterWood as THREE.Material, 64);
  const tmp = new THREE.Object3D();
  for (let i = 0; i < 64; i++) {
    tmp.position.set(-2.65 + i * 0.084, 0.52, -1.465);
    tmp.updateMatrix();
    slats.setMatrixAt(i, tmp.matrix);
  }
  scene.add(slats);

  /* ---------------- Wall: clock, menu board, shelves ---------------- */
  const clockAnchor = new THREE.Group();
  clockAnchor.position.set(0, 3.55, -3.94);
  scene.add(clockAnchor);

  const boardMat = new THREE.MeshStandardMaterial({ color: 0x15110d, roughness: 0.9 });
  // Menu board right of the clock; the left wall stays quiet so the hero text reads cleanly.
  const board = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 1.26), boardMat);
  board.position.set(2.55, 2.72, -3.955);
  scene.add(board);
  const frame = new THREE.Mesh(new THREE.BoxGeometry(1.82, 1.38, 0.04), m.brushedGold);
  frame.position.set(2.55, 2.72, -3.98);
  scene.add(frame);

  const shelfWood: THREE.MeshStandardMaterial = new THREE.MeshStandardMaterial({ map: woodTexture(9, 0, [1, 1]), roughness: 0.5 });
  for (const y of [1.5, 2.12]) {
    const shelf = createShelf(m, shelfWood);
    shelf.position.set(-2.55, y, -3.84);
    scene.add(shelf);
  }

  /* ---------------- Counter props ---------------- */
  const cup = createCup(cremaTexture(), m);
  cup.position.copy(CUP_POS);
  cup.rotation.y = -0.5;
  scene.add(cup);
  const steam = createSteam(high ? 3 : 2);
  steam.group.position.copy(CUP_POS);
  scene.add(steam.group);

  const machine = createEspressoMachine(m);
  machine.position.set(1.5, COUNTER_TOP, -2.3);
  machine.rotation.y = -0.18;
  scene.add(machine);
  const grinder = createGrinder(m);
  grinder.position.set(2.32, COUNTER_TOP, -2.2);
  scene.add(grinder);

  // Side plate for the photoscanned croissant (added when assets load).
  const plateProfile = [
    [0.0, 0.0],
    [0.06, 0.0],
    [0.095, 0.006],
    [0.105, 0.014],
    [0.1, 0.012],
    [0.06, 0.006],
    [0.0, 0.006],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const plate = new THREE.Mesh(new THREE.LatheGeometry(plateProfile, 72), m.ceramicBlack);
  plate.position.set(CUP_POS.x - 0.27, COUNTER_TOP, CUP_POS.z + 0.07);
  plate.castShadow = plate.receiveShadow = true;
  scene.add(plate);

  /* ---------------- Beans ---------------- */
  const beanCount = high ? 54 : 30;
  const beanGeo = createBeanGeometry();
  const beans = new THREE.InstancedMesh(beanGeo, m.bean, beanCount);
  beans.castShadow = high;
  beans.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  scene.add(beans);
  const rand = mulberry(42);
  const beanData = Array.from({ length: beanCount }, (_, i) => {
    const a = rand() * Math.PI * 2;
    const r = 0.15 + Math.pow(rand(), 0.7) * 0.32;
    return {
      rest: new THREE.Vector3(CUP_POS.x + Math.cos(a) * r, COUNTER_TOP + 0.007, CUP_POS.z + Math.sin(a) * r * 0.75 + 0.05),
      restYaw: rand() * Math.PI * 2,
      orbitAngle: (i / beanCount) * Math.PI * 2 * 3.0,
      orbitRadius: 0.14 + (i % 4) * 0.028,
      orbitHeight: 0.04 + (i / beanCount) * 0.3,
      spin: new THREE.Vector3(rand() * 2 - 1, rand() * 2 - 1, rand() * 2 - 1).normalize(),
      delay: rand(),
    };
  });
  const beanScale = 0.017;
  const q = new THREE.Quaternion();
  const qSpin = new THREE.Quaternion();
  const euler = new THREE.Euler();
  const pos = new THREE.Vector3();
  const scl = new THREE.Vector3(beanScale, beanScale, beanScale);
  const mat4 = new THREE.Matrix4();

  function updateBeans(progress: number, time: number) {
    const s = swirlAmount(progress);
    for (let i = 0; i < beanCount; i++) {
      const b = beanData[i]!;
      // stagger: beans lift one after another
      const local = Math.min(1, Math.max(0, s * 1.4 - b.delay * 0.4));
      const k = local * local * (3 - 2 * local);
      const angle = b.orbitAngle + time * 0.55 + progress * 6;
      const orbit = new THREE.Vector3(
        CUP_POS.x + Math.cos(angle) * b.orbitRadius,
        COUNTER_TOP + b.orbitHeight + Math.sin(time * 1.3 + i) * 0.008,
        CUP_POS.z + Math.sin(angle) * b.orbitRadius,
      );
      pos.copy(b.rest).lerp(orbit, k);
      euler.set(0, b.restYaw, 0);
      q.setFromEuler(euler);
      qSpin.setFromAxisAngle(b.spin, k * (time * 1.6 + i));
      q.multiply(qSpin);
      mat4.compose(pos, q, scl);
      beans.setMatrixAt(i, mat4);
    }
    beans.instanceMatrix.needsUpdate = true;
  }

  /* ---------------- Lights ---------------- */
  const hemi = new THREE.HemisphereLight(0xffe7c4, 0x22170e, 0.55);
  scene.add(hemi);

  const clockLight = new THREE.SpotLight(0xffe0b0, 17, 6, 0.5, 0.75, 1.4);
  clockLight.position.set(0, 5.8, -2.4);
  clockLight.target = clockAnchor;
  scene.add(clockLight);

  const cupLight = new THREE.SpotLight(0xffe2b8, 9, 3.2, 0.42, 0.6, 1.5);
  cupLight.position.set(0.5, 2.5, -1.3);
  cupLight.target.position.copy(CUP_POS);
  cupLight.castShadow = high;
  cupLight.shadow.mapSize.set(2048, 2048);
  cupLight.shadow.bias = -0.0004;
  cupLight.shadow.radius = 4;
  scene.add(cupLight, cupLight.target);

  const boardLight = new THREE.SpotLight(0xffe0b0, 10, 4, 0.55, 0.8, 1.4);
  boardLight.position.set(2.55, 4.6, -3.0);
  boardLight.target = board;
  scene.add(boardLight);

  // Placed so they frame the counter without crossing the hero text or the menu board.
  for (const x of [0.2, 3.2]) {
    const { group } = createPendant(m);
    group.position.set(x, 2.5, -1.75);
    scene.add(group);
  }

  const fill = new THREE.PointLight(0xffb36b, 2.2, 9, 1.5);
  fill.position.set(0, 2.2, 1.5);
  scene.add(fill);

  /* ---------------- Async assets ---------------- */
  const loader = new THREE.TextureLoader();
  loader.setCrossOrigin("anonymous");
  const loadLogo = (url: string) =>
    loader.loadAsync(url).then((t) => {
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = renderer.capabilities.getMaxAnisotropy();
      return t;
    });

  const ready = (async () => {
    const logo = await loadLogo(options.logoUrl).catch(() => loadLogo(options.fallbackLogoUrl));
    clockAnchor.add(createClock(logo, m));
    const assets = await loadCafeAssets(renderer, options.quality).catch((error) => {
      // Network trouble: keep the procedural café rather than failing.
      console.warn("[TWO RR] photoreal assets unavailable:", error);
      return null;
    });
    if (assets) {
      scene.environment = assets.envMap;
      scene.environmentIntensity = 0.62;
      disposables.push(assets.envMap);
      hemi.intensity = 0.22;

      wall.material = pbrMaterial(assets.brick, { color: 0x8f7462, normalScale: 1.3 });
      floor.material = pbrMaterial(assets.parquet, { color: 0x9a7556 });
      const varnished = pbrMaterial(assets.wood, { roughness: 0.62 });
      top.material = varnished;
      const panel = pbrMaterial(assets.wood, { color: 0xb08b70, roughness: 0.85 });
      slats.material = panel;
      wainscot.material = panel;
      shelfWood.map = assets.wood.map;
      shelfWood.normalMap = assets.wood.normalMap;
      shelfWood.needsUpdate = true;

      const croissant = fitModel(assets.croissant, 0.15);
      croissant.position.set(plate.position.x, COUNTER_TOP + 0.009, plate.position.z);
      croissant.rotation.y = 0.6;
      scene.add(croissant);

      for (const [x, rot] of [
        [-1.6, 0.4],
        [-0.55, -0.2],
        [0.95, 0.9],
      ] as const) {
        const stool = fitModel(assets.stool.clone(), 0.76, "height");
        stool.position.set(x, 0, -0.95);
        stool.rotation.y = rot;
        scene.add(stool);
      }

      const cakeStand = (x: number, z: number) => {
        const standProfile = [
          [0.0, 0.0],
          [0.06, 0.0],
          [0.05, 0.01],
          [0.018, 0.02],
          [0.016, 0.07],
          [0.14, 0.075],
          [0.14, 0.085],
          [0.0, 0.085],
        ].map(([px, py]) => new THREE.Vector2(px, py));
        const stand = new THREE.Mesh(new THREE.LatheGeometry(standProfile, 64), m.gold);
        stand.position.set(x, COUNTER_TOP, z);
        stand.castShadow = stand.receiveShadow = true;
        scene.add(stand);
        return COUNTER_TOP + 0.085;
      };
      if (assets.carrotCake) {
        const cake = fitModel(assets.carrotCake, 0.22);
        cake.position.set(-1.5, cakeStand(-1.5, -2.05), -2.05);
        scene.add(cake);
      }
      if (assets.strawberryCake) {
        const cake = fitModel(assets.strawberryCake, 0.23);
        cake.position.set(-0.9, cakeStand(-0.9, -2.15), -2.15);
        scene.add(cake);
      }
      if (assets.plant) {
        const plant = fitModel(assets.plant, 1.0, "height");
        plant.position.set(-3.35, 0, -1.55);
        scene.add(plant);
      }
    }

    const boardTex = await menuBoardTexture(options.boardTitle, options.boardItems, options.fonts);
    boardMat.map = boardTex;
    boardMat.color.set(0xffffff);
    boardMat.needsUpdate = true;
    updateBeans(0, 0);
    await renderer.compileAsync(scene, camera);
  })();

  /* ---------------- Camera path ---------------- */
  const keys = options.path;
  const posCurve = new THREE.CatmullRomCurve3(keys.map((k) => new THREE.Vector3(...k.pos)), false, "centripetal");
  const lookCurve = new THREE.CatmullRomCurve3(keys.map((k) => new THREE.Vector3(...k.look)), false, "centripetal");
  const camPos = new THREE.Vector3();
  const camLook = new THREE.Vector3();
  const forward = new THREE.Vector3();
  const right = new THREE.Vector3();
  const up = new THREE.Vector3();
  const WORLD_UP = new THREE.Vector3(0, 1, 0);
  let aspect = 1;

  function placeCamera(progress: number, pointer: { x: number; y: number }) {
    const p = Math.min(1, Math.max(0, progress));
    let i = 0;
    while (i < keys.length - 2 && p > keys[i + 1]!.at) i++;
    const a = keys[i]!;
    const b = keys[Math.min(i + 1, keys.length - 1)]!;
    const span = Math.max(1e-6, b.at - a.at);
    const t = Math.min(1, Math.max(0, (p - a.at) / span));
    const e = t * t * (3 - 2 * t); // ease in/out → the camera settles at each chapter
    const u = keys.length > 1 ? (i + e) / (keys.length - 1) : 0;
    posCurve.getPoint(u, camPos);
    lookCurve.getPoint(u, camLook);

    forward.subVectors(camLook, camPos).normalize();
    right.crossVectors(forward, WORLD_UP).normalize();
    up.crossVectors(right, forward).normalize();

    const wide = THREE.MathUtils.smoothstep(aspect, 0.95, 1.45);
    const tall = 1 - THREE.MathUtils.smoothstep(aspect, 0.7, 1.05);
    const shiftWide = THREE.MathUtils.lerp(a.shiftWide ?? 0, b.shiftWide ?? 0, e) * wide;
    const shiftTall = THREE.MathUtils.lerp(a.shiftTall ?? 0, b.shiftTall ?? 0, e) * tall;
    const offset = right.clone().multiplyScalar(shiftWide).addScaledVector(up, shiftTall);
    camPos.add(offset);
    camLook.add(offset);
    camPos.addScaledVector(forward, -THREE.MathUtils.lerp(a.dollyTall ?? 0, b.dollyTall ?? 0, e) * tall);
    // Gentle pointer parallax (scaled by distance so close-ups don't swing wildly).
    const dist = camPos.distanceTo(camLook);
    const par = Math.min(0.12, dist * 0.02);
    camPos.addScaledVector(right, pointer.x * par).addScaledVector(up, -pointer.y * par * 0.6);

    camera.position.copy(camPos);
    camera.lookAt(camLook);
  }

  let size = { width: 1, height: 1 };

  return {
    ready,
    degrade() {
      // Most expensive effects go first; the scene stays readable at every step.
      if (gtao && gtao.enabled) {
        gtao.enabled = false;
        return true;
      }
      if (bokeh && bokeh.enabled && pixelRatio <= 1) {
        bokeh.enabled = false;
        return true;
      }
      if (pixelRatio > 1) {
        pixelRatio = Math.max(1, pixelRatio - 0.5);
      } else if (renderer.shadowMap.enabled) {
        renderer.shadowMap.enabled = false;
        scene.traverse((o) => {
          const mesh = o as THREE.Mesh;
          if (mesh.material) (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach((mm) => (mm.needsUpdate = true));
        });
        return true;
      } else if (pixelRatio > 0.6) {
        pixelRatio = Math.max(0.6, pixelRatio - 0.2);
      } else {
        return false;
      }
      renderer.setPixelRatio(pixelRatio);
      renderer.setSize(size.width, size.height, false);
      composer?.setPixelRatio(pixelRatio);
      composer?.setSize(size.width, size.height);
      return true;
    },
    resize(width, height) {
      size = { width, height };
      aspect = width / Math.max(1, height);
      camera.aspect = aspect;
      camera.fov = aspect < 0.8 ? 54 : aspect < 1.2 ? 46 : 40;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
      if (composer) {
        composer.setPixelRatio(pixelRatio);
        composer.setSize(width, height);
      }
    },
    render(progress, time, pointer) {
      placeCamera(progress, pointer);
      updateBeans(progress, time);
      steam.update(time, camera);
      if (composer) {
        if (bokeh?.enabled) {
          // Focus on what the camera looks at; open the aperture for close-ups (shallow depth).
          const dist = camera.position.distanceTo(camLook);
          const u = bokeh.uniforms as Record<string, { value: number }>;
          u.focus!.value = dist;
          u.aperture!.value = dist < 1.3 ? 0.0032 : dist < 3 ? 0.0012 : 0.0004;
        }
        composer.render();
      } else {
        renderer.render(scene, camera);
      }
    },
    dispose() {
      scene.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        const mats = mesh.material ? (Array.isArray(mesh.material) ? mesh.material : [mesh.material]) : [];
        for (const mat of mats) {
          for (const value of Object.values(mat)) if (value instanceof THREE.Texture) value.dispose();
          mat.dispose();
        }
      });
      composer?.dispose();
      for (const d of disposables) d.dispose();
    },
  };
}

function mulberry(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
