/*
 * ============================================================================
 *  ICON STUDIOS — brand asset rasterizer (no third-party dependencies)
 * ---------------------------------------------------------------------------
 *  Generates PNG favicons / touch icon / OG cover from original brand
 *  geometry (Deep Navy -> Rich Purple gradient, Golden Yellow "I" glyph and
 *  a white spark). Nothing here depicts participant work or stock imagery.
 *
 *  Run:  node scripts/make_assets.js
 * ============================================================================
 */
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "assets", "img");

const NAVY = [0x1a, 0x27, 0x44];
const PURPLE = [0x6b, 0x21, 0xa8];
const YELLOW = [0xf5, 0xc5, 0x18];
const WHITE = [0xff, 0xff, 0xff];

const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function blend(c1, c2, t) {
  return [
    Math.round(lerp(c1[0], c2[0], t)),
    Math.round(lerp(c1[1], c2[1], t)),
    Math.round(lerp(c1[2], c2[2], t)),
  ];
}

// Rounded-rect signed distance: negative inside.
function sdRoundRect(px, py, x, y, w, h, r) {
  const dx = Math.max(x - px, px - (x + w));
  const dy = Math.max(y - py, py - (y + h));
  const qx = Math.max(dx, 0);
  const qy = Math.max(dy, 0);
  return Math.hypot(qx, qy) + Math.min(Math.max(dx, dy), 0) - r;
}

// 5-point star polygon centred at (cx, cy), radius R.
function star(cx, cy, R, points = 5) {
  const verts = [];
  for (let i = 0; i < points * 2; i++) {
    const ang = -Math.PI / 2 + (i * Math.PI) / points;
    const rad = i % 2 === 0 ? R : R * 0.42;
    verts.push([cx + Math.cos(ang) * rad, cy + Math.sin(ang) * rad]);
  }
  return verts;
}

// Even-odd scanline point-in-polygon test.
function inPoly(px, py, verts) {
  let inside = false;
  for (let i = 0, j = verts.length - 1; i < verts.length; j = i++) {
    const xi = verts[i][0], yi = verts[i][1];
    const xj = verts[j][0], yj = verts[j][1];
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

function render(size) {
  const buf = Buffer.alloc(size * size * 4);
  const S = 512; // design space
  const scale = size / S;
  const gBar = { x: 112, y: 120, w: 104, h: 272, r: 20 };
  const spark = star(336, 252, 132);
  const dot = { cx: 336, cy: 240, r: 20 };

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const sx = x / scale;
      const sy = y / scale;
      let col = blend(NAVY, PURPLE, clamp((sx + sy) / (2 * S), 0, 1));

      const dBar = sdRoundRect(sx, sy, gBar.x, gBar.y, gBar.w, gBar.h, gBar.r);
      if (dBar <= 0) col = YELLOW;

      if (inPoly(sx, sy, spark)) col = blend(col, WHITE, 0.96);

      const dd = Math.hypot(sx - dot.cx, sy - dot.cy);
      if (dd <= dot.r) col = YELLOW;

      const idx = (y * size + x) * 4;
      buf[idx] = col[0];
      buf[idx + 1] = col[1];
      buf[idx + 2] = col[2];
      buf[idx + 3] = 255;
    }
  }
  return buf;
}

function boxDownsample(src, srcSize, dstSize) {
  if (dstSize >= srcSize) return src;
  const k = srcSize / dstSize;
  const out = Buffer.alloc(dstSize * dstSize * 4);
  for (let y = 0; y < dstSize; y++) {
    for (let x = 0; x < dstSize; x++) {
      let r = 0, g = 0, b = 0, n = 0;
      const y0 = Math.floor(y * k), y1 = Math.floor((y + 1) * k);
      const x0 = Math.floor(x * k), x1 = Math.floor((x + 1) * k);
      for (let yy = y0; yy < y1; yy++) {
        for (let xx = x0; xx < x1; xx++) {
          const i = (yy * srcSize + xx) * 4;
          r += src[i]; g += src[i + 1]; b += src[i + 2]; n++;
        }
      }
      const o = (y * dstSize + x) * 4;
      out[o] = Math.round(r / n);
      out[o + 1] = Math.round(g / n);
      out[o + 2] = Math.round(b / n);
      out[o + 3] = 255;
    }
  }
  return out;
}

// ---- minimal PNG encoder ---------------------------------------------------
const crcTable = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "latin1");
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function encodePng(rgba, w, h) {
  const stride = w * 4;
  const raw = Buffer.alloc((stride + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (stride + 1)] = 0; // filter type 0
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---- generate --------------------------------------------------------------
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

const base = render(512);
fs.writeFileSync(path.join(OUT, "mark-512.png"), encodePng(base, 512, 512));

for (const size of [180, 32, 16]) {
  const px = boxDownsample(base, 512, size);
  fs.writeFileSync(path.join(OUT, `favicon-${size}.png`), encodePng(px, size, size));
}

// OG cover: 1200x630, same brand geometry recomposed with breathing room.
function renderCover(w, h) {
  const buf = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let col = blend(NAVY, PURPLE, clamp((x / w) * 0.85 + (y / h) * 0.35, 0, 1));
      const idx = (y * w + x) * 4;
      buf[idx] = col[0];
      buf[idx + 1] = col[1];
      buf[idx + 2] = col[2];
      buf[idx + 3] = 255;
    }
  }
  const S = 512;
  const tile = render(S);
  const box = 300;
  const ox = Math.round(w * 0.5 - box / 2);
  const oy = Math.round(h * 0.5 - box / 2);
  for (let y = 0; y < box; y++) {
    for (let x = 0; x < box; x++) {
      const sx = Math.floor((x / box) * S);
      const sy = Math.floor((y / box) * S);
      const si = (sy * S + sx) * 4;
      const di = ((oy + y) * w + (ox + x)) * 4;
      const a = tile[si + 3] / 255;
      for (let c = 0; c < 3; c++) {
        buf[di + c] = Math.round(buf[di + c] * (1 - a) + tile[si + c] * a);
      }
    }
  }
  return buf;
}

fs.writeFileSync(path.join(OUT, "og-cover.png"), encodePng(renderCover(1200, 630), 1200, 630));

/* ---------------------------------------------------------------------------
 *  Original editorial artwork (no photos, no stock, no fake participant work).
 *  A diagonal navy->purple field with gold conductor lines and overlapping
 *  translucent panels — an abstract "creative workflow" composition.
 * ------------------------------------------------------------------------- */
function renderArt(w, h) {
  const buf = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const t = clamp(x / w * 0.7 + y / h * 0.5, 0, 1);
      let col = blend(NAVY, PURPLE, t);
      const idx = (y * w + x) * 4;
      buf[idx] = col[0];
      buf[idx + 1] = col[1];
      buf[idx + 2] = col[2];
      buf[idx + 3] = 255;
    }
  }
  return buf;
}

function over(dst, dw, x, y, src, sw, sh, alpha) {
  for (let yy = 0; yy < sh; yy++) {
    for (let xx = 0; xx < sw; xx++) {
      const dx = x + xx, dy = y + yy;
      if (dx < 0 || dy < 0 || dx >= dw || dy >= dst.length / 4 / dw) continue;
      const si = (yy * sw + xx) * 4;
      const di = (dy * dw + dx) * 4;
      const a = (src[si + 3] / 255) * alpha;
      for (let c = 0; c < 3; c++) {
        dst[di + c] = Math.round(dst[di + c] * (1 - a) + src[si + c] * a);
      }
    }
  }
}


/* ---------------------------------------------------------------------------
 *  Hero artwork (vector): an abstract editorial composition — a diagonal
 *  navy->purple field with a 3x3 rhythm of translucent panels joined by gold
 *  conductor lines and spark nodes. Communicates a connected creative
 *  workflow. Pure approved palette; ~4KB, crisp at any pixel density.
 * ------------------------------------------------------------------------- */
(function () {
  const W = 1200, H = 900;
  const PW = 250, PH = 165, RAD = 18;
  const pos = [[80,120],[430,80],[790,150],[180,410],[590,400],[890,450],[110,660],[510,650],[850,660]];
  const centre = (i) => [pos[i][0] + PW / 2, pos[i][1] + PH / 2];
  const links = [[0,1],[1,2],[0,3],[1,4],[2,5],[3,4],[4,5],[3,6],[4,7],[5,8],[6,7],[7,8],[1,3]];
  const o = [];
  const px = (n) => Math.round(n);
  o.push('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '" role="img" aria-label="Abstract composition of connected creative panels">');
  o.push('<defs><linearGradient id="hg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1A2744"/><stop offset="1" stop-color="#6B21A8"/></linearGradient>');
  o.push('<radialGradient id="glow" cx="0.55" cy="0.45" r="0.55"><stop offset="0" stop-color="#F5C518" stop-opacity="0.18"/><stop offset="1" stop-color="#F5C518" stop-opacity="0"/></radialGradient></defs>');
  o.push('<rect width="' + W + '" height="' + H + '" fill="url(#hg)"/>');
  o.push('<rect width="' + W + '" height="' + H + '" fill="url(#glow)"/>');
  links.forEach(function (l) {
    const a = centre(l[0]), b = centre(l[1]);
    o.push('<line x1="' + px(a[0]) + '" y1="' + px(a[1]) + '" x2="' + px(b[0]) + '" y2="' + px(b[1]) + '" stroke="#F5C518" stroke-width="3" stroke-opacity="0.55" stroke-linecap="round"/>');
  });
  pos.forEach(function (p, i) {
    const op = [0.30, 0.16, 0.22][i % 3].toFixed(2);
    o.push('<rect x="' + p[0] + '" y="' + p[1] + '" width="' + PW + '" height="' + PH + '" rx="' + RAD + '" fill="#FFFFFF" fill-opacity="' + op + '"/>');
  });
  pos.forEach(function (p, i) {
    const c = centre(i);
    o.push('<circle cx="' + px(c[0]) + '" cy="' + px(c[1]) + '" r="8" fill="#F5C518"/>');
    o.push('<circle cx="' + px(c[0]) + '" cy="' + px(c[1]) + '" r="14" fill="#F5C518" fill-opacity="0.22"/>');
  });
  o.push('</svg>');
  fs.writeFileSync(path.join(OUT, "hero-art.svg"), o.join("\n"));
})();

console.log("Wrote brand assets to assets/img/:");
for (const f of fs.readdirSync(OUT).sort()) {
  const s = fs.statSync(path.join(OUT, f)).size;
  console.log("  " + f + " (" + Math.round(s / 1024) + " KB)");
}
