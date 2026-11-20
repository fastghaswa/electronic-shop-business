// Procedural canvas textures, created lazily in the browser and cached.
import * as THREE from "three";

const cache = new Map<string, THREE.Texture>();

function canvasTex(key: string, w: number, h: number, draw: (c: CanvasRenderingContext2D) => void, repeat?: [number, number]) {
  const hit = cache.get(key);
  if (hit) return hit;
  const cv = document.createElement("canvas");
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext("2d")!;
  draw(ctx);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat[0], repeat[1]);
  }
  cache.set(key, t);
  return t;
}

function noise(ctx: CanvasRenderingContext2D, w: number, h: number, amount: number, n = 4000) {
  for (let i = 0; i < n; i++) {
    const v = Math.random() < 0.5 ? 0 : 255;
    ctx.fillStyle = `rgba(${v},${v},${v},${Math.random() * amount})`;
    ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2);
  }
}

export function floorTiles(repeat: [number, number]) {
  const t = canvasTex(`tiles`, 512, 512, (c) => {
    c.fillStyle = "#e9e4dc";
    c.fillRect(0, 0, 512, 512);
    for (let y = 0; y < 2; y++)
      for (let x = 0; x < 2; x++) {
        const g = c.createLinearGradient(x * 256, y * 256, x * 256 + 256, y * 256 + 256);
        const base = 228 + ((x + y) % 2) * 6;
        g.addColorStop(0, `rgb(${base},${base - 4},${base - 10})`);
        g.addColorStop(1, `rgb(${base - 10},${base - 14},${base - 20})`);
        c.fillStyle = g;
        c.fillRect(x * 256 + 2, y * 256 + 2, 252, 252);
        // marble veins
        c.strokeStyle = "rgba(150,140,130,0.18)";
        c.lineWidth = 1.5;
        c.beginPath();
        let px = x * 256 + Math.random() * 256;
        let py = y * 256;
        c.moveTo(px, py);
        for (let k = 0; k < 8; k++) {
          px += (Math.random() - 0.5) * 60;
          py += 32;
          c.lineTo(px, py);
        }
        c.stroke();
      }
    c.fillStyle = "#b9b0a3";
    c.fillRect(0, 254, 512, 4);
    c.fillRect(254, 0, 4, 512);
    c.fillRect(0, 0, 512, 2);
    c.fillRect(0, 0, 2, 512);
    noise(c, 512, 512, 0.05);
  });
  const c = t.clone();
  c.wrapS = c.wrapT = THREE.RepeatWrapping;
  c.repeat.set(repeat[0], repeat[1]);
  c.needsUpdate = true;
  return c;
}

export function concrete(repeat: [number, number], tint = "#a9a59e") {
  const t = canvasTex(`concrete-${tint}`, 256, 256, (c) => {
    c.fillStyle = tint;
    c.fillRect(0, 0, 256, 256);
    noise(c, 256, 256, 0.12, 9000);
    c.strokeStyle = "rgba(0,0,0,0.12)";
    c.lineWidth = 2;
    c.strokeRect(0, 0, 256, 256);
  });
  const c = t.clone();
  c.wrapS = c.wrapT = THREE.RepeatWrapping;
  c.repeat.set(repeat[0], repeat[1]);
  c.needsUpdate = true;
  return c;
}

export function grass(repeat: [number, number]) {
  const t = canvasTex(`grass`, 256, 256, (c) => {
    c.fillStyle = "#6f9a4c";
    c.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 6000; i++) {
      const g = 110 + Math.random() * 60;
      c.fillStyle = `rgba(${60 + Math.random() * 40},${g},${40 + Math.random() * 30},0.6)`;
      c.fillRect(Math.random() * 256, Math.random() * 256, 1.5, 3);
    }
  });
  const c = t.clone();
  c.wrapS = c.wrapT = THREE.RepeatWrapping;
  c.repeat.set(repeat[0], repeat[1]);
  c.needsUpdate = true;
  return c;
}

export function asphalt(repeat: [number, number]) {
  const t = canvasTex(`asphalt`, 512, 256, (c) => {
    c.fillStyle = "#3b3d40";
    c.fillRect(0, 0, 512, 256);
    noise(c, 512, 256, 0.18, 14000);
    c.fillStyle = "#e8d36a";
    for (let x = 0; x < 512; x += 128) c.fillRect(x + 16, 124, 70, 8);
    c.fillStyle = "#e9e9e9";
    c.fillRect(0, 6, 512, 6);
    c.fillRect(0, 244, 512, 6);
  });
  const c = t.clone();
  c.wrapS = c.wrapT = THREE.RepeatWrapping;
  c.repeat.set(repeat[0], repeat[1]);
  c.needsUpdate = true;
  return c;
}

export function plaster(tint: string) {
  return canvasTex(`plaster-${tint}`, 256, 256, (c) => {
    c.fillStyle = tint;
    c.fillRect(0, 0, 256, 256);
    noise(c, 256, 256, 0.04, 5000);
  }, [4, 2]);
}

export function metalSiding() {
  return canvasTex(`siding`, 256, 256, (c) => {
    c.fillStyle = "#8c949c";
    c.fillRect(0, 0, 256, 256);
    for (let x = 0; x < 256; x += 16) {
      const g = c.createLinearGradient(x, 0, x + 16, 0);
      g.addColorStop(0, "#7b838b");
      g.addColorStop(0.5, "#a3abb3");
      g.addColorStop(1, "#6f777f");
      c.fillStyle = g;
      c.fillRect(x, 0, 16, 256);
    }
  }, [6, 1]);
}

export function grille() {
  return canvasTex(`grille`, 128, 128, (c) => {
    c.fillStyle = "#dfe5ea";
    c.fillRect(0, 0, 128, 128);
    c.fillStyle = "#7e8a96";
    for (let y = 4; y < 128; y += 8) c.fillRect(6, y, 116, 3);
  });
}

export function screenTex() {
  return canvasTex(`screen`, 512, 288, (c) => {
    const g = c.createLinearGradient(0, 0, 0, 288);
    g.addColorStop(0, "#2a7fd4");
    g.addColorStop(0.55, "#8fd3ff");
    g.addColorStop(0.56, "#3f8f4a");
    g.addColorStop(1, "#1f5a2a");
    c.fillStyle = g;
    c.fillRect(0, 0, 512, 288);
    c.fillStyle = "#ffd36b";
    c.beginPath();
    c.arc(390, 70, 34, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = "#2c4a6b";
    c.beginPath();
    c.moveTo(0, 170);
    c.lineTo(120, 90);
    c.lineTo(230, 165);
    c.lineTo(330, 100);
    c.lineTo(512, 170);
    c.lineTo(512, 175);
    c.lineTo(0, 175);
    c.fill();
    c.fillStyle = "rgba(255,255,255,0.85)";
    c.font = "bold 28px sans-serif";
    c.fillText("GHASWA 4K", 24, 260);
  });
}

export function phoneScreen() {
  return canvasTex(`phone`, 128, 256, (c) => {
    const g = c.createLinearGradient(0, 0, 128, 256);
    g.addColorStop(0, "#ff8a3d");
    g.addColorStop(1, "#3d5afe");
    c.fillStyle = g;
    c.fillRect(0, 0, 128, 256);
    c.fillStyle = "rgba(255,255,255,0.8)";
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) c.fillRect(14 + x * 28, 60 + y * 34, 18, 18);
    c.font = "bold 22px sans-serif";
    c.fillText("10:24", 34, 36);
  });
}

export function signTex(text: string, sub: string) {
  return canvasTex(`sign-${text}-${sub}`, 1024, 192, (c) => {
    const g = c.createLinearGradient(0, 0, 0, 192);
    g.addColorStop(0, "#14212e");
    g.addColorStop(1, "#0b131b");
    c.fillStyle = g;
    c.fillRect(0, 0, 1024, 192);
    c.strokeStyle = "#f2b33d";
    c.lineWidth = 6;
    c.strokeRect(8, 8, 1008, 176);
    c.fillStyle = "#f6c453";
    c.font = "900 92px 'Arial Black', Arial, sans-serif";
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillText(text, 512, 84);
    c.fillStyle = "#e8eef5";
    c.font = "600 30px Arial, sans-serif";
    c.fillText(sub, 512, 152);
  });
}

/** Price tag texture, not cached across content changes. */
export function priceTag(name: string, price: string, stock: string, soldOut: boolean) {
  const key = `tag-${name}-${price}-${stock}-${soldOut}`;
  return canvasTex(key, 256, 128, (c) => {
    c.fillStyle = soldOut ? "#7a1d1d" : "#ffffff";
    c.fillRect(0, 0, 256, 128);
    c.fillStyle = soldOut ? "#ffffff" : "#0f1b26";
    c.fillRect(0, 0, 256, 6);
    c.font = "bold 22px Arial, sans-serif";
    c.textAlign = "center";
    const short = name.length > 22 ? name.slice(0, 21) + "…" : name;
    c.fillText(short, 128, 38);
    c.fillStyle = soldOut ? "#ffd0d0" : "#d0451b";
    c.font = "900 40px Arial, sans-serif";
    c.fillText(price, 128, 84);
    c.fillStyle = soldOut ? "#ffffff" : "#56606b";
    c.font = "bold 18px Arial, sans-serif";
    c.fillText(soldOut ? "SOLD OUT" : stock, 128, 114);
  });
}

export function boxTex() {
  return canvasTex(`box`, 128, 128, (c) => {
    c.fillStyle = "#c49a63";
    c.fillRect(0, 0, 128, 128);
    noise(c, 128, 128, 0.08, 1500);
    c.fillStyle = "#a57b45";
    c.fillRect(56, 0, 16, 128);
    c.fillStyle = "#3a2a18";
    c.font = "bold 14px Arial";
    c.fillText("GHASWA", 8, 120);
  });
}
