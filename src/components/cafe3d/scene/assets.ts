import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { HDRLoader } from "three/examples/jsm/loaders/HDRLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";

/**
 * Photoreal assets from Poly Haven (CC0, see public/3d/CREDITS.md), optimized by
 * `npm run assets:3d` into public/3d/: an HDRI of a real café for lighting/reflections,
 * scanned PBR surface textures, and photoscanned props.
 */

const BASE = "/3d";

export type Pbr = { map: THREE.Texture; normalMap: THREE.Texture; arm: THREE.Texture };

export type CafeAssets = {
  envMap: THREE.Texture;
  brick: Pbr;
  parquet: Pbr;
  wood: Pbr;
  croissant: THREE.Group;
  stool: THREE.Group;
  carrotCake: THREE.Group | null;
  strawberryCake: THREE.Group | null;
  plant: THREE.Group | null;
};

export async function loadCafeAssets(renderer: THREE.WebGLRenderer, quality: "high" | "low"): Promise<CafeAssets> {
  const high = quality === "high";
  const tex = new THREE.TextureLoader();
  const gltf = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  const maxAniso = renderer.capabilities.getMaxAnisotropy();

  const loadTex = async (url: string, srgb: boolean, repeat: [number, number]) => {
    const t = await tex.loadAsync(url);
    t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(...repeat);
    t.anisotropy = Math.min(8, maxAniso);
    return t;
  };
  const loadPbr = async (id: string, size: "1k" | "2k", repeat: [number, number]): Promise<Pbr> => {
    const [map, normalMap, arm] = await Promise.all([
      loadTex(`${BASE}/tex/${size}/${id}_diff.webp`, true, repeat),
      loadTex(`${BASE}/tex/${size}/${id}_nor.webp`, false, repeat),
      loadTex(`${BASE}/tex/${size}/${id}_arm.webp`, false, repeat),
    ]);
    return { map, normalMap, arm };
  };
  const loadModel = async (id: string) => {
    const g = await gltf.loadAsync(`${BASE}/models/${id}.glb`);
    g.scene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = high;
        mesh.receiveShadow = true;
      }
    });
    return g.scene;
  };

  const [hdr, brick, parquet, wood, croissant, stool, carrotCake, strawberryCake, plant] = await Promise.all([
    new HDRLoader().loadAsync(`${BASE}/env/comfy_cafe_1k.hdr`),
    loadPbr("brown_brick_02", "1k", [11, 4.8]),
    loadPbr("herringbone_parquet", "1k", [7, 6]),
    loadPbr("dark_wood", high ? "2k" : "1k", [2.6, 0.7]),
    loadModel("croissant"),
    loadModel("bar_chair_round_01"),
    // Phones skip the larger decorative props to keep the download small.
    high ? loadModel("carrot_cake") : Promise.resolve(null),
    high ? loadModel("strawberry_chocolate_cake") : Promise.resolve(null),
    high ? loadModel("potted_plant_02") : Promise.resolve(null),
  ]);

  const pmrem = new THREE.PMREMGenerator(renderer);
  hdr.mapping = THREE.EquirectangularReflectionMapping;
  const envMap = pmrem.fromEquirectangular(hdr).texture;
  hdr.dispose();
  pmrem.dispose();

  return { envMap, brick, parquet, wood, croissant, stool, carrotCake, strawberryCake, plant };
}

/** Standard PBR material from Poly Haven maps (ARM = AO / roughness / metalness). */
export function pbrMaterial(p: Pbr, opts: { color?: THREE.ColorRepresentation; normalScale?: number; roughness?: number } = {}) {
  return new THREE.MeshStandardMaterial({
    map: p.map,
    normalMap: p.normalMap,
    normalScale: new THREE.Vector2(opts.normalScale ?? 1, opts.normalScale ?? 1),
    aoMap: p.arm,
    aoMapIntensity: 1,
    roughnessMap: p.arm,
    roughness: opts.roughness ?? 1,
    metalnessMap: p.arm,
    metalness: 1,
    color: opts.color ?? 0xffffff,
  });
}

/** Scales a model so its largest dimension equals `size` metres, and rests it on y = 0, centred. */
export function fitModel(model: THREE.Object3D, size: number, axis: "max" | "height" = "max") {
  const box = new THREE.Box3().setFromObject(model);
  const dims = box.getSize(new THREE.Vector3());
  const current = axis === "height" ? dims.y : Math.max(dims.x, dims.y, dims.z);
  const s = size / Math.max(current, 1e-6);
  model.scale.multiplyScalar(s);
  const scaled = new THREE.Box3().setFromObject(model);
  const center = scaled.getCenter(new THREE.Vector3());
  model.position.x -= center.x;
  model.position.z -= center.z;
  model.position.y -= scaled.min.y;
  const wrapper = new THREE.Group();
  wrapper.add(model);
  return wrapper;
}
