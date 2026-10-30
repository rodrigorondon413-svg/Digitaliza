/* Digitaliza — processamento de imagem (detecção de bordas, perspectiva e filtros de digitalização) */
'use strict';
const IP = (() => {

  // ---------------------------------------------------------------- utilidades
  function loadImage(url) {
    return new Promise((res, rej) => {
      const im = new Image();
      im.decoding = 'async';
      im.onload = () => res(im);
      im.onerror = () => rej(new Error('Falha ao carregar a imagem'));
      im.src = url;
    });
  }
  function canvas(w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    return c;
  }
  function ctx2d(c) { return c.getContext('2d', { willReadFrequently: true }); }

  function imageData(img, scale = 1) {
    const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
    const w = Math.max(1, Math.round(iw * scale)), h = Math.max(1, Math.round(ih * scale));
    const c = canvas(w, h), x = ctx2d(c);
    x.imageSmoothingEnabled = true;
    x.imageSmoothingQuality = 'high';
    x.drawImage(img, 0, 0, w, h);
    return x.getImageData(0, 0, w, h);
  }
  function dataToCanvas(d) {
    const c = canvas(d.width, d.height);
    c.getContext('2d').putImageData(d, 0, 0);
    return c;
  }
  function scaleCanvas(src, maxSide) {
    const s = Math.min(1, maxSide / Math.max(src.width, src.height));
    const w = Math.max(1, Math.round(src.width * s)), h = Math.max(1, Math.round(src.height * s));
    const c = canvas(w, h), x = c.getContext('2d');
    x.imageSmoothingEnabled = true;
    x.imageSmoothingQuality = 'high';
    x.drawImage(src, 0, 0, w, h);
    return c;
  }
  function resizeData(d, maxSide) {
    const c = scaleCanvas(dataToCanvas(d), maxSide);
    return ctx2d(c).getImageData(0, 0, c.width, c.height);
  }
  function toBlob(c, type = 'image/jpeg', q = 0.92) {
    return new Promise((res, rej) => c.toBlob(b => (b ? res(b) : rej(new Error('Falha ao codificar'))), type, q));
  }
  function rotateImage(img, cw = true) {
    const w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
    const c = canvas(h, w), x = c.getContext('2d');
    x.translate(cw ? h : 0, cw ? 0 : w);
    x.rotate(cw ? Math.PI / 2 : -Math.PI / 2);
    x.drawImage(img, 0, 0);
    return c;
  }

  const fullQuad = (w, h) => [[0, 0], [w, 0], [w, h], [0, h]];
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  function isFull(q, w, h) {
    const f = fullQuad(w, h);
    return q.every((p, i) => Math.abs(p[0] - f[i][0]) < 0.5 && Math.abs(p[1] - f[i][1]) < 0.5);
  }
  function polyArea(p) {
    let a = 0;
    for (let i = 0; i < p.length; i++) {
      const j = (i + 1) % p.length;
      a += p[i][0] * p[j][1] - p[j][0] * p[i][1];
    }
    return Math.abs(a) / 2;
  }
  /** Ordena 4 pontos como: superior-esquerdo, superior-direito, inferior-direito, inferior-esquerdo */
  function orderQuad(pts) {
    const cx = pts.reduce((s, p) => s + p[0], 0) / 4, cy = pts.reduce((s, p) => s + p[1], 0) / 4;
    const sorted = pts.slice().sort((a, b) => Math.atan2(a[1] - cy, a[0] - cx) - Math.atan2(b[1] - cy, b[0] - cx));
    let start = 0, best = Infinity;
    sorted.forEach((p, i) => { if (p[0] + p[1] < best) { best = p[0] + p[1]; start = i; } });
    return [0, 1, 2, 3].map(k => sorted[(start + k) % 4].slice());
  }
  function isConvex(q) {
    let sign = 0;
    for (let i = 0; i < 4; i++) {
      const a = q[i], b = q[(i + 1) % 4], c = q[(i + 2) % 4];
      const cr = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]);
      if (Math.abs(cr) < 1e-6) continue;
      const s = Math.sign(cr);
      if (sign && s !== sign) return false;
      sign = s;
    }
    return true;
  }

  // ---------------------------------------------------------------- detecção de bordas
  function boxBlur(src, w, h, r) {
    const tmp = new Float32Array(w * h), out = new Float32Array(w * h), d = 2 * r + 1;
    for (let y = 0; y < h; y++) {
      const row = y * w;
      let acc = 0;
      for (let k = -r; k <= r; k++) acc += src[row + Math.min(w - 1, Math.max(0, k))];
      for (let x = 0; x < w; x++) {
        tmp[row + x] = acc / d;
        acc += src[row + Math.min(w - 1, x + r + 1)] - src[row + Math.max(0, x - r)];
      }
    }
    for (let x = 0; x < w; x++) {
      let acc = 0;
      for (let k = -r; k <= r; k++) acc += tmp[Math.min(h - 1, Math.max(0, k)) * w + x];
      for (let y = 0; y < h; y++) {
        out[y * w + x] = acc / d;
        acc += tmp[Math.min(h - 1, y + r + 1) * w + x] - tmp[Math.max(0, y - r) * w + x];
      }
    }
    return out;
  }

  function otsu(gray) {
    const hist = new Float64Array(256);
    for (let i = 0; i < gray.length; i++) hist[Math.min(255, Math.max(0, gray[i] | 0))]++;
    const total = gray.length;
    let sum = 0;
    for (let i = 0; i < 256; i++) sum += i * hist[i];
    let sumB = 0, wB = 0, best = 0, thr = 127;
    for (let t = 0; t < 256; t++) {
      wB += hist[t];
      if (!wB) continue;
      const wF = total - wB;
      if (!wF) break;
      sumB += t * hist[t];
      const mB = sumB / wB, mF = (sum - sumB) / wF;
      const between = wB * wF * (mB - mF) * (mB - mF);
      if (between > best) { best = between; thr = t; }
    }
    return thr;
  }

  function components(mask, w, h) {
    const lab = new Int32Array(w * h), stack = new Int32Array(w * h), comps = [];
    let cur = 0;
    for (let i = 0; i < w * h; i++) {
      if (!mask[i] || lab[i]) continue;
      cur++;
      let sp = 0, count = 0;
      stack[sp++] = i; lab[i] = cur;
      while (sp) {
        const p = stack[--sp];
        count++;
        const x = p % w, y = (p / w) | 0;
        if (x > 0 && mask[p - 1] && !lab[p - 1]) { lab[p - 1] = cur; stack[sp++] = p - 1; }
        if (x < w - 1 && mask[p + 1] && !lab[p + 1]) { lab[p + 1] = cur; stack[sp++] = p + 1; }
        if (y > 0 && mask[p - w] && !lab[p - w]) { lab[p - w] = cur; stack[sp++] = p - w; }
        if (y < h - 1 && mask[p + w] && !lab[p + w]) { lab[p + w] = cur; stack[sp++] = p + w; }
      }
      comps.push({ label: cur, count });
    }
    return { lab, comps };
  }

  function convexHull(points) {
    const p = points.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    if (p.length < 3) return p;
    const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const lower = [], upper = [];
    for (const pt of p) {
      while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], pt) <= 0) lower.pop();
      lower.push(pt);
    }
    for (let i = p.length - 1; i >= 0; i--) {
      const pt = p[i];
      while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], pt) <= 0) upper.pop();
      upper.push(pt);
    }
    upper.pop(); lower.pop();
    return lower.concat(upper);
  }

  // Simplificação de Visvalingam: remove vértices de menor área, preservando cantos
  function simplify(poly, maxN) {
    const p = poly.slice();
    const tri = (a, b, c) => Math.abs((b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1])) / 2;
    while (p.length > maxN) {
      let mi = 0, ma = Infinity;
      for (let i = 0; i < p.length; i++) {
        const a = tri(p[(i - 1 + p.length) % p.length], p[i], p[(i + 1) % p.length]);
        if (a < ma) { ma = a; mi = i; }
      }
      p.splice(mi, 1);
    }
    return p;
  }

  function maxAreaQuad(hull) {
    const n = hull.length;
    if (n < 4) return null;
    const tri = (a, b, c) => Math.abs((b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1])) / 2;
    let best = -1, q = null;
    for (let a = 0; a < n - 3; a++)
      for (let b = a + 1; b < n - 2; b++)
        for (let c = b + 1; c < n - 1; c++) {
          const abc = tri(hull[a], hull[b], hull[c]);
          for (let d = c + 1; d < n; d++) {
            const ar = abc + tri(hull[a], hull[c], hull[d]);
            if (ar > best) { best = ar; q = [hull[a], hull[b], hull[c], hull[d]]; }
          }
        }
    return q;
  }

  /** Detecta automaticamente as bordas do documento. Retorna quadrilátero em coordenadas da imagem ou null. */
  function detectQuad(img) {
    const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
    const S = 380, scale = Math.min(1, S / Math.max(iw, ih));
    const d = imageData(img, scale), w = d.width, h = d.height, px = d.data, N = w * h;
    let gray = new Float32Array(N);
    for (let i = 0, j = 0; i < N; i++, j += 4) gray[i] = px[j] * 0.299 + px[j + 1] * 0.587 + px[j + 2] * 0.114;
    gray = boxBlur(boxBlur(gray, w, h, 2), w, h, 2);
    const t = otsu(gray);

    let bestQuad = null, bestScore = 0;
    for (const bright of [true, false]) {
      const mask = new Uint8Array(N);
      for (let i = 0; i < N; i++) mask[i] = bright ? (gray[i] > t ? 1 : 0) : (gray[i] <= t ? 1 : 0);
      const { lab, comps } = components(mask, w, h);
      comps.sort((a, b) => b.count - a.count);
      for (const comp of comps.slice(0, 3)) {
        if (comp.count < N * 0.08) break;
        const L = comp.label;
        // bordas tocadas
        let top = 0, bot = 0, left = 0, right = 0;
        for (let x = 0; x < w; x++) { if (lab[x] === L) top++; if (lab[(h - 1) * w + x] === L) bot++; }
        for (let y = 0; y < h; y++) { if (lab[y * w] === L) left++; if (lab[y * w + w - 1] === L) right++; }
        const sides = (top > w * 0.3) + (bot > w * 0.3) + (left > h * 0.3) + (right > h * 0.3);
        if (sides >= 3) continue;
        const pts = [];
        for (let y = 0; y < h; y++) {
          let mn = -1, mx = -1;
          for (let x = 0; x < w; x++) if (lab[y * w + x] === L) { if (mn < 0) mn = x; mx = x; }
          if (mn >= 0) { pts.push([mn, y]); pts.push([mx + 1, y]); pts.push([mn, y + 1]); pts.push([mx + 1, y + 1]); }
        }
        let hull = convexHull(pts);
        if (hull.length > 40) hull = simplify(hull, 40);
        const q = maxAreaQuad(hull);
        if (!q) continue;
        const area = polyArea(q);
        const fill = comp.count / area;
        if (area < N * 0.1 || area > N * 0.985 || fill < 0.72) continue;
        const score = area * fill;
        if (score > bestScore) { bestScore = score; bestQuad = q; }
      }
    }
    if (!bestQuad) return null;
    const q = orderQuad(bestQuad.map(([x, y]) => [
      Math.min(iw, Math.max(0, x / scale)),
      Math.min(ih, Math.max(0, y / scale)),
    ]));
    return isConvex(q) ? q : null;
  }

  // ---------------------------------------------------------------- perspectiva
  function solve(A, b) {
    const n = b.length;
    for (let i = 0; i < n; i++) {
      let p = i;
      for (let r = i + 1; r < n; r++) if (Math.abs(A[r][i]) > Math.abs(A[p][i])) p = r;
      [A[i], A[p]] = [A[p], A[i]]; [b[i], b[p]] = [b[p], b[i]];
      const piv = A[i][i] || 1e-12;
      for (let r = i + 1; r < n; r++) {
        const f = A[r][i] / piv;
        for (let c = i; c < n; c++) A[r][c] -= f * A[i][c];
        b[r] -= f * b[i];
      }
    }
    const x = new Array(n).fill(0);
    for (let i = n - 1; i >= 0; i--) {
      let s = b[i];
      for (let c = i + 1; c < n; c++) s -= A[i][c] * x[c];
      x[i] = s / (A[i][i] || 1e-12);
    }
    return x;
  }
  function homography(from, to) {
    const A = [], b = [];
    for (let i = 0; i < 4; i++) {
      const [x, y] = from[i], [u, v] = to[i];
      A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); b.push(u);
      A.push([0, 0, 0, x, y, 1, -v * x, -v * y]); b.push(v);
    }
    return solve(A, b);
  }
  function outputSize(quad, maxSide) {
    const [tl, tr, br, bl] = quad;
    let W = Math.max(dist(tl, tr), dist(bl, br)), H = Math.max(dist(tl, bl), dist(tr, br));
    const s = Math.min(1, maxSide / Math.max(W, H));
    return [Math.max(1, Math.round(W * s)), Math.max(1, Math.round(H * s))];
  }

  /** Corrige a perspectiva: recorta o quadrilátero e o transforma em retângulo */
  function warp(src, quad, maxSide = 3000) {
    const sw = src.width, sh = src.height, sd = src.data;
    const [W, H] = outputSize(quad, maxSide);
    if (isFull(quad, sw, sh) && W === sw && H === sh) {
      return new ImageData(new Uint8ClampedArray(sd), sw, sh);
    }
    const m = homography(fullQuad(W, H), quad);
    const out = new ImageData(W, H), od = out.data;
    const maxX = sw - 1, maxY = sh - 1;
    let o = 0;
    for (let y = 0; y < H; y++) {
      const yc = y + 0.5;
      for (let x = 0; x < W; x++) {
        const xc = x + 0.5;
        const den = m[6] * xc + m[7] * yc + 1;
        let u = (m[0] * xc + m[1] * yc + m[2]) / den - 0.5;
        let v = (m[3] * xc + m[4] * yc + m[5]) / den - 0.5;
        if (u < 0) u = 0; else if (u > maxX) u = maxX;
        if (v < 0) v = 0; else if (v > maxY) v = maxY;
        const x0 = u | 0, y0 = v | 0;
        const x1 = x0 < maxX ? x0 + 1 : x0, y1 = y0 < maxY ? y0 + 1 : y0;
        const fx = u - x0, fy = v - y0;
        const i00 = (y0 * sw + x0) << 2, i10 = (y0 * sw + x1) << 2, i01 = (y1 * sw + x0) << 2, i11 = (y1 * sw + x1) << 2;
        for (let c = 0; c < 3; c++) {
          const t = sd[i00 + c] + (sd[i10 + c] - sd[i00 + c]) * fx;
          const b = sd[i01 + c] + (sd[i11 + c] - sd[i01 + c]) * fx;
          od[o + c] = t + (b - t) * fy;
        }
        od[o + 3] = 255;
        o += 4;
      }
    }
    return out;
  }

  // ---------------------------------------------------------------- filtros
  /** Remove sombras e uniformiza a iluminação (o "papel" fica branco) */
  function normalizeIllumination(img) {
    const { width: w, height: h, data: d } = img;
    const bs = Math.max(6, Math.round(Math.max(w, h) / 48));
    const mw = Math.ceil(w / bs), mh = Math.ceil(h / bs), M = mw * mh;
    let R = new Float32Array(M), G = new Float32Array(M), B = new Float32Array(M), Lm = new Float32Array(M);
    for (let by = 0; by < mh; by++) {
      for (let bx = 0; bx < mw; bx++) {
        let best = -1, r = 255, g = 255, b = 255;
        const y1 = Math.min(h, (by + 1) * bs), x1 = Math.min(w, (bx + 1) * bs);
        for (let y = by * bs; y < y1; y += 2) {
          for (let x = bx * bs; x < x1; x += 2) {
            const i = (y * w + x) << 2;
            const L = d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114;
            if (L > best) { best = L; r = d[i]; g = d[i + 1]; b = d[i + 2]; }
          }
        }
        const k = by * mw + bx;
        R[k] = r; G[k] = g; B[k] = b; Lm[k] = best;
      }
    }
    // dilatação (cobre textos e traços maiores que o bloco)
    for (let pass = 0; pass < 2; pass++) {
      const R2 = new Float32Array(M), G2 = new Float32Array(M), B2 = new Float32Array(M), L2 = new Float32Array(M);
      for (let y = 0; y < mh; y++) for (let x = 0; x < mw; x++) {
        let bi = y * mw + x, bl = -1;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const yy = y + dy, xx = x + dx;
          if (yy < 0 || xx < 0 || yy >= mh || xx >= mw) continue;
          const k = yy * mw + xx;
          if (Lm[k] > bl) { bl = Lm[k]; bi = k; }
        }
        const k = y * mw + x;
        R2[k] = R[bi]; G2[k] = G[bi]; B2[k] = B[bi]; L2[k] = Lm[bi];
      }
      R = R2; G = G2; B = B2; Lm = L2;
    }
    // suavização
    const smooth = a => boxBlur(boxBlur(a, mw, mh, 1), mw, mh, 1);
    R = smooth(R); G = smooth(G); B = smooth(B);
    // limite inferior: evita "estourar" fotos/áreas escuras grandes
    const sortedL = Float32Array.from(Lm).sort();
    const paper = Math.max(60, sortedL[Math.floor(sortedL.length * 0.9)]);
    const floor = paper * 0.5;
    for (let k = 0; k < M; k++) {
      if (R[k] < floor) R[k] = floor;
      if (G[k] < floor) G[k] = floor;
      if (B[k] < floor) B[k] = floor;
    }
    // aplica com interpolação bilinear
    const rowR = new Float32Array(mw), rowG = new Float32Array(mw), rowB = new Float32Array(mw);
    const xi0 = new Int32Array(w), xi1 = new Int32Array(w), xf = new Float32Array(w);
    for (let x = 0; x < w; x++) {
      let gx = (x + 0.5) / bs - 0.5;
      if (gx < 0) gx = 0; if (gx > mw - 1) gx = mw - 1;
      xi0[x] = gx | 0; xi1[x] = Math.min(mw - 1, xi0[x] + 1); xf[x] = gx - xi0[x];
    }
    for (let y = 0; y < h; y++) {
      let gy = (y + 0.5) / bs - 0.5;
      if (gy < 0) gy = 0; if (gy > mh - 1) gy = mh - 1;
      const y0 = gy | 0, y1 = Math.min(mh - 1, y0 + 1), fy = gy - y0;
      for (let x = 0; x < mw; x++) {
        const a = y0 * mw + x, b = y1 * mw + x;
        rowR[x] = R[a] + (R[b] - R[a]) * fy;
        rowG[x] = G[a] + (G[b] - G[a]) * fy;
        rowB[x] = B[a] + (B[b] - B[a]) * fy;
      }
      let i = y * w * 4;
      for (let x = 0; x < w; x++, i += 4) {
        const a = xi0[x], b = xi1[x], f = xf[x];
        const br = rowR[a] + (rowR[b] - rowR[a]) * f;
        const bg = rowG[a] + (rowG[b] - rowG[a]) * f;
        const bb = rowB[a] + (rowB[b] - rowB[a]) * f;
        d[i] = d[i] * 255 / br;
        d[i + 1] = d[i + 1] * 255 / bg;
        d[i + 2] = d[i + 2] * 255 / bb;
      }
    }
  }

  function lumHistogram(d, step = 4) {
    const hist = new Uint32Array(256);
    let n = 0;
    for (let i = 0; i < d.length; i += 4 * step) {
      hist[(d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114) | 0]++;
      n++;
    }
    return { hist, n };
  }
  function percentile({ hist, n }, p) {
    const target = n * p;
    let acc = 0;
    for (let i = 0; i < 256; i++) { acc += hist[i]; if (acc >= target) return i; }
    return 255;
  }
  function applyLUT(d, lut, channels = 3) {
    for (let i = 0; i < d.length; i += 4) {
      d[i] = lut[d[i]];
      if (channels > 1) { d[i + 1] = lut[d[i + 1]]; d[i + 2] = lut[d[i + 2]]; }
    }
  }
  /** Níveis de documento: fundo totalmente branco, tinta mais escura e nítida */
  function documentLevels(d) {
    const hs = lumHistogram(d);
    const lo = Math.min(90, percentile(hs, 0.012));
    const p60 = percentile(hs, 0.6);
    const hi = Math.min(242, Math.max(185, p60 - 8));
    const lut = new Uint8ClampedArray(256);
    for (let v = 0; v < 256; v++) {
      let t = (v - lo) / Math.max(1, hi - lo);
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      lut[v] = 255 * Math.pow(t, 1.18);
    }
    applyLUT(d, lut);
  }
  function autoLevels(d) {
    const hist = [new Uint32Array(256), new Uint32Array(256), new Uint32Array(256)];
    let n = 0;
    for (let i = 0; i < d.length; i += 16) { hist[0][d[i]]++; hist[1][d[i + 1]]++; hist[2][d[i + 2]]++; n++; }
    const luts = hist.map(hh => {
      const lo = percentile({ hist: hh, n }, 0.005), hi = Math.max(lo + 20, percentile({ hist: hh, n }, 0.995));
      const lut = new Uint8ClampedArray(256);
      for (let v = 0; v < 256; v++) lut[v] = (v - lo) * 255 / (hi - lo);
      return lut;
    });
    for (let i = 0; i < d.length; i += 4) {
      d[i] = luts[0][d[i]]; d[i + 1] = luts[1][d[i + 1]]; d[i + 2] = luts[2][d[i + 2]];
    }
  }
  function saturate(d, s) {
    for (let i = 0; i < d.length; i += 4) {
      const L = d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114;
      d[i] = L + (d[i] - L) * s;
      d[i + 1] = L + (d[i + 1] - L) * s;
      d[i + 2] = L + (d[i + 2] - L) * s;
    }
  }
  function toGray(d) {
    for (let i = 0; i < d.length; i += 4) {
      const L = d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114;
      d[i] = d[i + 1] = d[i + 2] = L;
    }
  }
  function sharpen(img, amt) {
    const { width: w, height: h, data: d } = img;
    const tmp = new Uint16Array(d.length);
    for (let y = 0; y < h; y++) {
      const row = y * w * 4;
      for (let x = 0; x < w; x++) {
        const l = row + (x > 0 ? x - 1 : x) * 4, c = row + x * 4, r = row + (x < w - 1 ? x + 1 : x) * 4;
        tmp[c] = d[l] + d[c] + d[r];
        tmp[c + 1] = d[l + 1] + d[c + 1] + d[r + 1];
        tmp[c + 2] = d[l + 2] + d[c + 2] + d[r + 2];
      }
    }
    const stride = w * 4;
    for (let y = 0; y < h; y++) {
      const up = y > 0 ? -stride : 0, dn = y < h - 1 ? stride : 0;
      for (let i = y * stride, e = i + stride; i < e; i += 4) {
        for (let c = 0; c < 3; c++) {
          const k = i + c;
          const blur = (tmp[k + up] + tmp[k] + tmp[k + dn]) / 9;
          d[k] = d[k] + amt * (d[k] - blur);
        }
      }
    }
  }
  function brightnessContrast(d, adj, channels = 3) {
    const b = (adj && adj.brightness) || 0, c = (adj && adj.contrast) || 0;
    if (!b && !c) return;
    const k = 1 + c / 100;
    const lut = new Uint8ClampedArray(256);
    for (let v = 0; v < 256; v++) lut[v] = (v - 128) * k + 128 + b * 1.6;
    applyLUT(d, lut, channels);
  }
  /** Binarização adaptativa (Bradley) — preto e branco nítido */
  function adaptiveThreshold(img, strength = 0) {
    const { width: w, height: h, data: d } = img;
    const W1 = w + 1;
    const integ = new Uint32Array(W1 * (h + 1));
    for (let y = 0; y < h; y++) {
      let rs = 0;
      for (let x = 0; x < w; x++) {
        rs += d[(y * w + x) << 2];
        integ[(y + 1) * W1 + x + 1] = integ[y * W1 + x + 1] + rs;
      }
    }
    const s = Math.max(8, Math.round(Math.max(w, h) / 36));
    const T = 0.16 + strength;
    for (let y = 0; y < h; y++) {
      const y1 = Math.max(0, y - s), y2 = Math.min(h - 1, y + s);
      for (let x = 0; x < w; x++) {
        const x1 = Math.max(0, x - s), x2 = Math.min(w - 1, x + s);
        const count = (x2 - x1 + 1) * (y2 - y1 + 1);
        const sum = integ[(y2 + 1) * W1 + x2 + 1] - integ[y1 * W1 + x2 + 1] - integ[(y2 + 1) * W1 + x1] + integ[y1 * W1 + x1];
        const i = (y * w + x) << 2;
        const v = d[i];
        const black = v < 60 || (v < 215 && v * count < sum * (1 - T));
        const o = black ? 0 : 255;
        d[i] = d[i + 1] = d[i + 2] = o;
      }
    }
  }

  /** Limpa uma margem fina (restos da borda da mesa após o recorte) */
  function whiteMargin(img) {
    const { width: w, height: h, data: d } = img;
    const m = Math.max(2, Math.round(Math.max(w, h) * 0.006));
    for (let y = 0; y < h; y++) {
      const edgeRow = y < m || y >= h - m;
      for (let x = 0; x < w; x++) {
        if (edgeRow || x < m || x >= w - m) { const i = (y * w + x) << 2; d[i] = d[i + 1] = d[i + 2] = 255; }
      }
    }
  }

  const FILTERS = ['original', 'enhanced', 'document', 'gray', 'bw'];

  /** Aplica o filtro de digitalização. Não altera a entrada. */
  function applyFilter(input, filter, adj) {
    const out = new ImageData(new Uint8ClampedArray(input.data), input.width, input.height);
    const d = out.data;
    switch (filter) {
      case 'enhanced':
        autoLevels(d); saturate(d, 1.12); sharpen(out, 0.35);
        break;
      case 'document':
        normalizeIllumination(out); documentLevels(d); saturate(d, 1.2); sharpen(out, 0.55);
        break;
      case 'gray':
        normalizeIllumination(out); toGray(d); documentLevels(d); sharpen(out, 0.5);
        break;
      case 'bw':
        normalizeIllumination(out); toGray(d);
        brightnessContrast(d, adj);
        adaptiveThreshold(out, ((adj && adj.contrast) || 0) / 500);
        whiteMargin(out);
        return out;
      default:
        break;
    }
    brightnessContrast(d, adj);
    return out;
  }

  /** Empacota um canvas em 1 bit por pixel (1 = branco) para PDF */
  function packBits(c) {
    const w = c.width, h = c.height, d = ctx2d(c).getImageData(0, 0, w, h).data;
    const rowBytes = (w + 7) >> 3, out = new Uint8Array(rowBytes * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) << 2;
        if (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114 >= 128) out[y * rowBytes + (x >> 3)] |= 0x80 >> (x & 7);
      }
    }
    return out;
  }

  return {
    loadImage, canvas, imageData, dataToCanvas, scaleCanvas, resizeData, toBlob, rotateImage,
    fullQuad, isFull, orderQuad, isConvex, polyArea, detectQuad, warp, outputSize,
    applyFilter, packBits, FILTERS,
  };
})();
