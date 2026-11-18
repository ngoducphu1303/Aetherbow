import * as THREE from 'three';

export function createStoneTileTexture(
  primaryHex: string,
  accentHex: string,
  maxAnisotropy: number
): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = primaryHex;
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 3600; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = 1 + Math.random() * 2.5;
    ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.06)';
    ctx.fillRect(x, y, r, r);
  }

  const step = size / 4;
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.36)';
  ctx.lineWidth = 4;
  for (let i = 0; i <= 4; i++) {
    const p = i * step;
    ctx.beginPath();
    ctx.moveTo(p, 0);
    ctx.lineTo(p, size);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, p);
    ctx.lineTo(size, p);
    ctx.stroke();
  }

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.055)';
  ctx.lineWidth = 2;
  for (let gx = 0; gx < 4; gx++) {
    for (let gy = 0; gy < 4; gy++) {
      ctx.strokeRect(gx * step + 5, gy * step + 5, step - 10, step - 10);
      if ((gx + gy) % 2 === 0) {
        ctx.fillStyle = accentHex;
        ctx.globalAlpha = 0.09;
        ctx.fillRect(gx * step + 10, gy * step + 10, step - 20, step - 20);
        ctx.globalAlpha = 1;
      }
    }
  }

  ctx.fillStyle = accentHex;
  ctx.globalAlpha = 0.22;
  for (let gx = 1; gx < 4; gx += 2) {
    for (let gy = 1; gy < 4; gy += 2) {
      const cx = gx * step;
      const cy = gy * step;
      ctx.beginPath();
      ctx.moveTo(cx, cy - 8);
      ctx.lineTo(cx + 8, cy);
      ctx.lineTo(cx, cy + 8);
      ctx.lineTo(cx - 8, cy);
      ctx.closePath();
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 4.5);
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createStoneBumpTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 2000; i++) {
    const v = 110 + Math.floor(Math.random() * 36);
    ctx.fillStyle = `rgb(${v},${v},${v})`;
    ctx.fillRect(Math.random() * size, Math.random() * size, 3, 3);
  }

  const step = size / 4;
  ctx.strokeStyle = '#262626';
  ctx.lineWidth = 4;
  for (let i = 0; i <= 4; i++) {
    const p = i * step;
    ctx.beginPath();
    ctx.moveTo(p, 0);
    ctx.lineTo(p, size);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, p);
    ctx.lineTo(size, p);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 4.5);
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createHeroFaceTexture(
  eyeColor = '#c026d3',
  cheekColor = '#9333ea'
): THREE.CanvasTexture {
  const w = 512;
  const h = 512;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  // Soft warm peach skin base
  const skinGrad = ctx.createRadialGradient(w * 0.5, h * 0.52, 40, w * 0.5, h * 0.52, 260);
  skinGrad.addColorStop(0, '#ffe3cf');
  skinGrad.addColorStop(0.75, '#f6caa9');
  skinGrad.addColorStop(1, '#e8b38f');
  ctx.fillStyle = skinGrad;
  ctx.fillRect(0, 0, w, h);

  const cx = w * 0.5;
  const cy = h * 0.54;

  // Soft rosy cheek blush
  for (const side of [-1, 1]) {
    const bx = cx + side * 68;
    const by = cy + 28;
    const blush = ctx.createRadialGradient(bx, by, 2, bx, by, 28);
    blush.addColorStop(0, 'rgba(244, 114, 182, 0.32)');
    blush.addColorStop(1, 'rgba(244, 114, 182, 0)');
    ctx.fillStyle = blush;
    ctx.beginPath();
    ctx.arc(bx, by, 28, 0, Math.PI * 2);
    ctx.fill();
  }

  // Stylized triangle cheek markings
  ctx.fillStyle = cheekColor;
  for (const side of [-1, 1]) {
    const mx = cx + side * 56;
    const my = cy + 24;
    ctx.beginPath();
    ctx.moveTo(mx - 8, my);
    ctx.lineTo(mx + 8, my);
    ctx.lineTo(mx, my + 24);
    ctx.closePath();
    ctx.fill();
  }

  // Large luminous stylized anime/chibi eyes
  for (const side of [-1, 1]) {
    const ex = cx + side * 48;
    const ey = cy - 4;

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(ex, ey, 26, 22, side * -0.1, 0, Math.PI * 2);
    ctx.fill();

    const irisGrad = ctx.createRadialGradient(ex, ey + 2, 3, ex, ey, 22);
    irisGrad.addColorStop(0, '#ffffff');
    irisGrad.addColorStop(0.32, eyeColor);
    irisGrad.addColorStop(0.85, eyeColor);
    irisGrad.addColorStop(1, '#1e1b4b');
    ctx.fillStyle = irisGrad;
    ctx.beginPath();
    ctx.ellipse(ex, ey + 1, 20, 18, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = 0.72;
    ctx.beginPath();
    ctx.ellipse(ex, ey + 2, 7, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.strokeStyle = '#1e1b4b';
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(ex, ey + 5, 25, Math.PI * 1.12, Math.PI * 1.88);
    ctx.stroke();

    ctx.lineWidth = 4.5;
    ctx.beginPath();
    ctx.moveTo(ex + side * 22, ey - 10);
    ctx.lineTo(ex + side * 31, ey - 17);
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(ex - 7, ey - 7, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(ex + 8, ey + 7, 2.6, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = 'rgba(180, 100, 75, 0.35)';
  ctx.beginPath();
  ctx.arc(cx, cy + 19, 2.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#8b4a39';
  ctx.lineWidth = 3.2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(cx, cy + 28, 12, 0.22 * Math.PI, 0.78 * Math.PI);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createGoblinFaceTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createRadialGradient(128, 128, 20, 128, 128, 128);
  grad.addColorStop(0, '#84cc16');
  grad.addColorStop(0.75, '#4d7c0f');
  grad.addColorStop(1, '#365314');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const cx = 128;
  const cy = 134;

  // Expressive fiery amber chibi eyes
  for (const side of [-1, 1]) {
    const ex = cx + side * 28;
    const ey = cy - 4;
    ctx.fillStyle = '#1c1917';
    ctx.beginPath();
    ctx.ellipse(ex, ey, 16, 13, side * 0.2, 0, Math.PI * 2);
    ctx.fill();

    const eyeG = ctx.createRadialGradient(ex, ey, 2, ex, ey, 12);
    eyeG.addColorStop(0, '#fef08a');
    eyeG.addColorStop(0.7, '#f59e0b');
    eyeG.addColorStop(1, '#b45309');
    ctx.fillStyle = eyeG;
    ctx.beginPath();
    ctx.ellipse(ex, ey + 1, 12, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(ex - 4, ey - 3, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // Wide cheeky grin
  ctx.strokeStyle = '#1a2e05';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(cx, cy + 14, 18, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createFabricWeaveTexture(
  baseHex: string,
  trimHex = '#eab308'
): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, 0, size);
  grad.addColorStop(0, baseHex);
  grad.addColorStop(1, baseHex);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.055)';
  ctx.lineWidth = 2;
  for (let i = -size; i < size * 2; i += 10) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + size, size);
    ctx.stroke();
  }

  // Crisp gold border trim + inner filigree stripe
  ctx.fillStyle = trimHex;
  ctx.fillRect(0, size - 20, size, 12);
  ctx.globalAlpha = 0.65;
  ctx.fillRect(0, size - 28, size, 3);
  ctx.globalAlpha = 1;

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

export function createEngravedArmorTexture(
  baseHex: string,
  veinHex: string
): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 400; i++) {
    ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)';
    ctx.beginPath();
    ctx.arc(Math.random() * size, Math.random() * size, 2 + Math.random() * 4, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.strokeStyle = veinHex;
  ctx.globalAlpha = 0.35;
  ctx.lineWidth = 3;
  ctx.strokeRect(18, 18, size - 36, size - 36);
  ctx.beginPath();
  ctx.moveTo(size / 2, 18);
  ctx.lineTo(size - 18, size / 2);
  ctx.lineTo(size / 2, size - 18);
  ctx.lineTo(18, size / 2);
  ctx.closePath();
  ctx.stroke();
  ctx.globalAlpha = 1;

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createContactShadowTexture(): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createRadialGradient(
    size / 2,
    size / 2,
    size * 0.08,
    size / 2,
    size / 2,
    size * 0.48
  );
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.72)');
  grad.addColorStop(0.55, 'rgba(0, 0, 0, 0.32)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createTargetReticleTexture(colorHex = '#fbbf24'): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const c = size / 2;

  ctx.strokeStyle = colorHex;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(c, c, 48, 0, Math.PI * 2);
  ctx.stroke();

  ctx.lineWidth = 4;
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2;
    ctx.beginPath();
    ctx.moveTo(c + Math.cos(a) * 34, c + Math.sin(a) * 34);
    ctx.lineTo(c + Math.cos(a) * 58, c + Math.sin(a) * 58);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
