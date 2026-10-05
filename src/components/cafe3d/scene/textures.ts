import * as THREE from "three";

/**
 * Procedural textures drawn on <canvas> — nothing to download, and every colour comes from the
 * TWO RR palette (walnut panel, espresso plaque, gold rim, parchment face).
 */

const PALETTE = {
  espresso: "#14110d",
  espressoSoft: "#1d1813",
  walnutDark: "#3a1f0b",
  walnut: "#5c3919",
  walnutLight: "#7a4e28",
  gold: "#c99a52",
  goldLight: "#e3c27e",
  cream: "#efe4cf",
};

function canvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return { c, ctx: c.getContext("2d")! };
}

/** Deterministic pseudo-random so textures look the same on every visit. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function finish(c: HTMLCanvasElement, opts: { repeat?: [number, number]; srgb?: boolean } = {}) {
  const tex = new THREE.CanvasTexture(c);
  if (opts.srgb !== false) tex.colorSpace = THREE.SRGBColorSpace;
  if (opts.repeat) {
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(...opts.repeat);
  }
  tex.anisotropy = 4;
  return tex;
}

/** Walnut grain — the logo's wood panel. `planks` draws floorboard seams. */
export function woodTexture(seed = 7, planks = 0, repeat: [number, number] = [1, 1], contrast = 1) {
  const { c, ctx } = canvas(1024, 1024);
  const rand = rng(seed);
  const grad = ctx.createLinearGradient(0, 0, 1024, 0);
  grad.addColorStop(0, PALETTE.walnutDark);
  grad.addColorStop(0.5, PALETTE.walnut);
  grad.addColorStop(1, PALETTE.walnutDark);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 420; i++) {
    const x = rand() * 1024;
    const w = 0.6 + rand() * 2.2;
    const wobble = 6 + rand() * 18;
    const phase = rand() * Math.PI * 2;
    ctx.strokeStyle =
      rand() > 0.5 ? `rgba(20,8,0,${(0.08 + rand() * 0.22) * contrast})` : `rgba(160,100,50,${(0.05 + rand() * 0.12) * contrast})`;
    ctx.lineWidth = w;
    ctx.beginPath();
    for (let y = 0; y <= 1024; y += 16) {
      const xx = x + Math.sin(y / 120 + phase) * wobble;
      if (y === 0) ctx.moveTo(xx, y);
      else ctx.lineTo(xx, y);
    }
    ctx.stroke();
  }
  if (planks > 0) {
    const pw = 1024 / planks;
    for (let i = 0; i <= planks; i++) {
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillRect(i * pw - 1.5, 0, 3, 1024);
      // staggered butt joints
      const y = (rand() * 1024) | 0;
      ctx.fillRect(i * pw, y, pw, 3);
      ctx.fillStyle = `rgba(255,220,170,${0.02 + rand() * 0.05})`;
      ctx.fillRect(i * pw + 2, 0, pw - 4, 1024);
    }
  }
  return finish(c, { repeat });
}

/** Dark plaster wall with a faint lime-wash mottle. */
export function wallTexture() {
  const { c, ctx } = canvas(512, 512);
  const rand = rng(21);
  ctx.fillStyle = "#211a14";
  ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 2200; i++) {
    const r = 2 + rand() * 14;
    ctx.fillStyle = rand() > 0.5 ? `rgba(255,235,200,${rand() * 0.035})` : `rgba(0,0,0,${rand() * 0.06})`;
    ctx.beginPath();
    ctx.arc(rand() * 512, rand() * 512, r, 0, Math.PI * 2);
    ctx.fill();
  }
  return finish(c, { repeat: [5, 3] });
}

/** Coffee surface: espresso with crema and a simple latte-art heart. */
export function cremaTexture() {
  const { c, ctx } = canvas(512, 512);
  const g = ctx.createRadialGradient(256, 256, 20, 256, 256, 256);
  g.addColorStop(0, "#8a5a2e");
  g.addColorStop(0.55, "#6b3f1c");
  g.addColorStop(0.85, "#4a2a12");
  g.addColorStop(1, "#2c180a");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 512, 512);
  // heart
  ctx.save();
  ctx.translate(256, 270);
  ctx.fillStyle = "#f1e2c8";
  ctx.shadowColor = "rgba(241,226,200,0.6)";
  ctx.shadowBlur = 18;
  ctx.beginPath();
  ctx.moveTo(0, 90);
  ctx.bezierCurveTo(-150, -10, -90, -130, 0, -55);
  ctx.bezierCurveTo(90, -130, 150, -10, 0, 90);
  ctx.fill();
  ctx.fillStyle = "#7a4a22";
  ctx.shadowBlur = 6;
  ctx.beginPath();
  ctx.ellipse(0, -10, 6, 70, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  return finish(c);
}

export type BoardItem = { name: string; price: string };

/** The café menu board, listing the owner's real featured products. */
export async function menuBoardTexture(title: string, items: BoardItem[], fonts: { display: string; caps: string; sans: string }) {
  if (typeof document !== "undefined" && "fonts" in document) {
    try {
      await document.fonts.ready;
    } catch {
      // fall back to system fonts
    }
  }
  const W = 1024;
  const H = 760;
  const { c, ctx } = canvas(W, H);
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#1f1a15");
  bg.addColorStop(1, "#120e0a");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  // chalk dust
  const rand = rng(3);
  for (let i = 0; i < 900; i++) {
    ctx.fillStyle = `rgba(255,240,215,${rand() * 0.04})`;
    ctx.fillRect(rand() * W, rand() * H, 2, 2);
  }
  ctx.strokeStyle = PALETTE.gold;
  ctx.lineWidth = 6;
  ctx.strokeRect(22, 22, W - 44, H - 44);
  ctx.lineWidth = 1.5;
  ctx.strokeRect(38, 38, W - 76, H - 76);

  ctx.textAlign = "center";
  ctx.fillStyle = PALETTE.goldLight;
  ctx.font = `600 64px ${fonts.caps}`;
  ctx.fillText(title.toUpperCase(), W / 2, 130);
  ctx.font = `600 26px ${fonts.caps}`;
  ctx.fillStyle = "rgba(227,194,126,0.75)";
  ctx.fillText("· M E N U ·", W / 2, 176);

  const list = items.slice(0, 6);
  if (list.length === 0) {
    ctx.font = `italic 600 46px ${fonts.display}`;
    ctx.fillStyle = PALETTE.cream;
    ctx.fillText("See the full menu inside", W / 2, H / 2 + 40);
  } else {
    const top = 250;
    const rowH = Math.min(78, (H - top - 80) / list.length);
    list.forEach((item, i) => {
      const y = top + i * rowH;
      ctx.textAlign = "left";
      ctx.font = `600 44px ${fonts.display}`;
      ctx.fillStyle = PALETTE.cream;
      let name = item.name;
      while (ctx.measureText(name).width > 600 && name.length > 4) name = name.slice(0, -2) + "…";
      ctx.fillText(name, 110, y);
      const nameEnd = 110 + ctx.measureText(name).width;
      ctx.textAlign = "right";
      ctx.font = `700 40px ${fonts.sans}`;
      ctx.fillStyle = PALETTE.goldLight;
      ctx.fillText(item.price, W - 110, y);
      const priceStart = W - 110 - ctx.measureText(item.price).width;
      // dotted leader between name and price
      ctx.fillStyle = "rgba(227,194,126,0.35)";
      for (let x = nameEnd + 18; x < priceStart - 18; x += 16) ctx.fillRect(x, y - 10, 4, 4);
    });
  }
  return finish(c);
}
