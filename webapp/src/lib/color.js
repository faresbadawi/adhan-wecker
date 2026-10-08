// ---------- Farben umrechnen
export function hex2hsl(hex) {
  const n = parseInt(hex.slice(1), 16), r = (n >> 16 & 255) / 255, g = (n >> 8 & 255) / 255, b = (n & 255) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  if (!d) return [0, 0, l];
  const sat = d / (1 - Math.abs(2 * l - 1));
  const h = mx === r ? ((g - b) / d + 6) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, sat, l];
}
export function hsl2hex(h, sat, l) {
  const f = k => { const a = sat * Math.min(l, 1 - l), x = (k + h / 30) % 12; return l - a * Math.max(-1, Math.min(x - 3, 9 - x, 1)); };
  return "#" + [0, 8, 4].map(k => Math.round(f(k) * 255).toString(16).padStart(2, "0")).join("").toUpperCase();
}

