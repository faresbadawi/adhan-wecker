// ---------- Eigenes Hintergrundbild zuschneiden (480 x 320 wie das Display)
// Verschieben mit einem Finger/der Maus, Zoomen mit zwei Fingern, Mausrad oder Regler.
const DISPLAY_W = 480, DISPLAY_H = 320;
export function cropImage(file, colors, t, onError) {
  return new Promise(resolve => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onerror = () => { URL.revokeObjectURL(url); onError(); resolve(null); };
    img.onload = () => {
      const m = document.createElement("div");
      m.className = "cropper";
      const sample = colors || { main: "#ffffff", accent: "#e9a27c" };
      m.innerHTML = `<div class="crophead"><button class="btn" data-a="0">${t("cancel")}</button><b>${t("bg_crop")}</b><button class="btn gold" data-a="1">${t("bg_use")}</button></div>
        <div class="cropframe" id="cframe"><img id="cimg" draggable="false" alt="">
          <div class="cropsample ltr"><span style="color:${sample.main}">12:30</span><small style="color:${sample.accent}">${t("next_prayer")}</small></div></div>
        <p class="hint" style="text-align:center">${t("bg_crop_hint")}</p>
        <div class="cropctl"><label class="f">${t("zoom")}</label><input type="range" id="czoom" min="1" max="4" step="0.01" value="1">
          <label class="f">${t("bg_brightness")}</label><input type="range" id="cbri" min="30" max="100" value="70"></div>`;
      document.body.appendChild(m);
      const frame = m.querySelector("#cframe"), el = m.querySelector("#cimg");
      el.src = url;
      let zoom = 1, x = 0, y = 0, bri = 70; // x/y: Verschiebung in Rahmen-Pixeln
      const fw = () => frame.clientWidth, fh = () => frame.clientHeight;
      const base = () => Math.max(fw() / img.naturalWidth, fh() / img.naturalHeight); // füllt den Rahmen
      const clamp = () => {
        const w = img.naturalWidth * base() * zoom, h = img.naturalHeight * base() * zoom;
        x = Math.min(0, Math.max(fw() - w, x)); y = Math.min(0, Math.max(fh() - h, y));
      };
      const draw = () => {
        clamp();
        const sc = base() * zoom;
        el.style.width = img.naturalWidth * sc + "px";
        el.style.height = img.naturalHeight * sc + "px";
        el.style.transform = `translate(${x}px, ${y}px)`;
        el.style.filter = `brightness(${bri}%)`;
      };
      // Start: mittig
      const center = () => { const sc = base() * zoom; x = (fw() - img.naturalWidth * sc) / 2; y = (fh() - img.naturalHeight * sc) / 2; draw(); };
      center();
      const zoomAt = (nz, cx, cy) => {
        nz = Math.min(4, Math.max(1, nz));
        x = cx - (cx - x) * nz / zoom; y = cy - (cy - y) * nz / zoom; zoom = nz;
        m.querySelector("#czoom").value = zoom; draw();
      };
      const pts = new Map();
      let last = null;
      frame.addEventListener("pointerdown", e => { frame.setPointerCapture(e.pointerId); pts.set(e.pointerId, [e.clientX, e.clientY]); last = null; });
      frame.addEventListener("pointermove", e => {
        if (!pts.has(e.pointerId)) return;
        const prev = pts.get(e.pointerId); pts.set(e.pointerId, [e.clientX, e.clientY]);
        if (pts.size === 1) { x += e.clientX - prev[0]; y += e.clientY - prev[1]; draw(); return; }
        const [a, b] = [...pts.values()], r = frame.getBoundingClientRect();
        const dist = Math.hypot(a[0] - b[0], a[1] - b[1]);
        if (last) zoomAt(zoom * dist / last, (a[0] + b[0]) / 2 - r.left, (a[1] + b[1]) / 2 - r.top);
        last = dist;
      });
      const up = e => { pts.delete(e.pointerId); last = null; };
      frame.addEventListener("pointerup", up); frame.addEventListener("pointercancel", up);
      frame.addEventListener("wheel", e => { e.preventDefault(); const r = frame.getBoundingClientRect(); zoomAt(zoom * (e.deltaY < 0 ? 1.1 : 0.9), e.clientX - r.left, e.clientY - r.top); }, { passive: false });
      m.querySelector("#czoom").oninput = e => zoomAt(Number(e.target.value), fw() / 2, fh() / 2);
      m.querySelector("#cbri").oninput = e => { bri = Number(e.target.value); draw(); };
      const close = v => { m.remove(); URL.revokeObjectURL(url); resolve(v); };
      m.querySelector('[data-a="0"]').onclick = () => close(null);
      m.querySelector('[data-a="1"]').onclick = async () => {
        // Ausschnitt in Bild-Pixeln
        const sc = base() * zoom, sx = -x / sc, sy = -y / sc, sw = fw() / sc, sh = fh() / sc;
        const c = document.createElement("canvas"); c.width = DISPLAY_W; c.height = DISPLAY_H;
        const ctx = c.getContext("2d");
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, DISPLAY_W, DISPLAY_H);
        const d = ctx.getImageData(0, 0, DISPLAY_W, DISPLAY_H).data;
        // Helligkeit, leichtes Dithering gegen Streifen, RGB565 big-endian (wie das Display)
        const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
        const out = new Uint8Array(DISPLAY_W * DISPLAY_H * 2), f = bri / 100;
        for (let p = 0, o = 0, i = 0; p < d.length; p += 4, o += 2, i++) {
          const th = BAYER[((i / DISPLAY_W | 0) & 3) * 4 + (i % DISPLAY_W & 3)] / 16;
          const q = (v, st) => Math.min(255, Math.floor(v * f / st + th) * st);
          const r = q(d[p], 8), g = q(d[p + 1], 4), b = q(d[p + 2], 8);
          const v = ((r >> 3) << 11) | ((g >> 2) << 5) | (b >> 3);
          out[o] = v >> 8; out[o + 1] = v & 255;
        }
        // Vorschaubild für die App
        const tc = document.createElement("canvas"); tc.width = 160; tc.height = 107;
        const tctx = tc.getContext("2d");
        tctx.filter = `brightness(${bri}%)`;
        tctx.drawImage(c, 0, 0, 160, 107);
        if (tctx.filter === "none") { tctx.fillStyle = `rgba(0,0,0,${1 - f})`; tctx.fillRect(0, 0, 160, 107); } // ohne Canvas-Filter
        const jpg = await new Promise(r => tc.toBlob(r, "image/jpeg", 0.8));
        close({ bin: new Blob([out], { type: "application/octet-stream" }), jpg });
      };
      window.addEventListener("resize", draw, { once: true });
    };
    img.src = url;
  });
}

