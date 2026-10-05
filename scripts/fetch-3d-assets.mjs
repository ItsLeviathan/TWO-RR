/**
 * Downloads and optimizes the photoreal assets used by the 3D café (public/3d/).
 *
 * Source: Poly Haven (https://polyhaven.com) — every asset is CC0 (public domain): free for
 * commercial use, no attribution required, redistribution allowed. See public/3d/CREDITS.md.
 *
 *   npm run assets:3d          (only needed when changing the asset list; outputs are committed)
 *
 * Textures → WebP (1k for phones, 2k for desktop). Models → meshopt-compressed .glb with WebP
 * textures, optionally simplified, so the whole café stays a few megabytes.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import sharp from "sharp";

const OUT = "public/3d";
const API = "https://api.polyhaven.com";

const HDRI = { id: "comfy_cafe", size: "1k" };

/**
 * PBR surface textures for the room. Every texture gets a 1k version; only surfaces the camera
 * sees up close (the counter top in the cup close-ups) also get 2k for desktop.
 */
const TEXTURES = [
  { id: "brown_brick_02", use: "back wall", sizes: ["1k"] },
  { id: "herringbone_parquet", use: "floor", sizes: ["1k"] },
  { id: "dark_wood", use: "counter top and front", sizes: ["1k", "2k"] },
];

/** Props. `size` = max texture size in the optimized glb. */
const MODELS = [
  { id: "croissant", size: 1024, use: "pastry beside the cup" },
  { id: "carrot_cake", size: 1024, use: "cake on the counter" },
  { id: "strawberry_chocolate_cake", size: 1024, use: "cake on the counter" },
  { id: "bar_chair_round_01", size: 1024, use: "bar stools", simplify: 0.5 },
  { id: "potted_plant_02", size: 1024, use: "plant by the counter", simplify: 0.35 },
];

async function json(url) {
  const res = await fetch(url, { headers: { "User-Agent": "tworr-asset-pipeline" } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

async function download(url, path) {
  if (existsSync(path)) return;
  mkdirSync(dirname(path), { recursive: true });
  const res = await fetch(url, { headers: { "User-Agent": "tworr-asset-pipeline" } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  writeFileSync(path, Buffer.from(await res.arrayBuffer()));
}

async function main() {
  const tmp = join(tmpdir(), "tworr-3d-assets");
  mkdirSync(tmp, { recursive: true });
  const credits = [];

  // HDRI (environment lighting + reflections)
  {
    const files = await json(`${API}/files/${HDRI.id}`);
    const info = await json(`${API}/info/${HDRI.id}`);
    const out = join(OUT, "env", `${HDRI.id}_${HDRI.size}.hdr`);
    await download(files.hdri[HDRI.size].hdr.url, out);
    credits.push(`- **${info.name}** (HDRI, lighting & reflections) — by ${Object.keys(info.authors).join(", ")} — https://polyhaven.com/a/${HDRI.id}`);
    console.log("✓ HDRI", out);
  }

  // Textures: diffuse / normal (OpenGL) / ARM (ambient occlusion, roughness, metalness)
  for (const t of TEXTURES) {
    const files = await json(`${API}/files/${t.id}`);
    const info = await json(`${API}/info/${t.id}`);
    for (const size of t.sizes) {
      for (const [key, map, quality] of [
        ["Diffuse", "diff", 80],
        ["nor_gl", "nor", 90],
        ["arm", "arm", 82],
      ]) {
        const src = join(tmp, "tex", `${t.id}_${map}_${size}.jpg`);
        await download(files[key][size].jpg.url, src);
        const dest = join(OUT, "tex", size, `${t.id}_${map}.webp`);
        mkdirSync(dirname(dest), { recursive: true });
        await sharp(src).webp({ quality }).toFile(dest);
      }
    }
    credits.push(`- **${info.name}** (texture, ${t.use}) — by ${Object.keys(info.authors).join(", ")} — https://polyhaven.com/a/${t.id}`);
    console.log("✓ texture", t.id);
  }

  // Models
  for (const m of MODELS) {
    const files = await json(`${API}/files/${m.id}`);
    const info = await json(`${API}/info/${m.id}`);
    const gltf = files.gltf["1k"].gltf;
    const dir = join(tmp, "models", m.id);
    const gltfPath = join(dir, `${m.id}_1k.gltf`);
    await download(gltf.url, gltfPath);
    for (const [rel, f] of Object.entries(gltf.include)) await download(f.url, join(dir, rel));
    const dest = join(OUT, "models", `${m.id}.glb`);
    mkdirSync(dirname(dest), { recursive: true });
    if (existsSync(dest)) rmSync(dest);
    const args = [
      "gltf-transform", "optimize", gltfPath, dest,
      "--compress", "meshopt",
      "--texture-compress", "webp",
      "--texture-size", String(m.size),
    ];
    if (m.simplify) args.push("--simplify", "true", "--simplify-ratio", String(m.simplify), "--simplify-error", "0.002");
    else args.push("--simplify", "false");
    execFileSync("npx", args, { stdio: "inherit", shell: process.platform === "win32" });
    credits.push(`- **${info.name}** (model, ${m.use}) — by ${Object.keys(info.authors).join(", ")} — https://polyhaven.com/a/${m.id}`);
    console.log("✓ model", dest);
  }

  writeFileSync(
    join(OUT, "CREDITS.md"),
    `# 3D asset credits\n\nAll assets below are from [Poly Haven](https://polyhaven.com) and released under\n[CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) (public domain): free for commercial use,\nno attribution required. Credited here anyway, with thanks.\n\nRegenerate with \`npm run assets:3d\`.\n\n${credits.join("\n")}\n\nThe TWO RR logo (wall clock) is the business's own artwork. Everything else in the scene (cup, saucer,\nlatte art, beans, steam, espresso machine, grinder, pendant lamps, menu board) is generated in code.\n`,
  );
  console.log("✓ credits written");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
