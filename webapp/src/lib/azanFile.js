// Eigenen Azan für die Uhr umwandeln: beliebige Audiodatei (MP3, M4A, WAV …) -> MP3 mono, so klein,
// dass sie in den Speicher der Uhr passt. Der MP3-Kodierer wird erst beim ersten Hochladen nachgeladen.
// [kbit/s, Abtastrate], beste Stufe zuerst; die oberen passen nur auf eine SD-Karte
const LADDER = [[128, 44100], [96, 44100], [64, 32000], [48, 22050], [40, 22050], [32, 22050], [24, 16000]];
const MAX_SEC = 360; // längere Dateien werden nach 6 Minuten ausgeblendet

// Abtastrate ändern: beim Verkleinern über die Quell-Werte mitteln (einfacher Tiefpass), sonst linear
function resample(src, from, to) {
  if (from === to) return src;
  const r = from / to, n = Math.floor(src.length / r), out = new Float32Array(n);
  for (let j = 0; j < n; j++) {
    const a = j * r, b = Math.min(src.length, (j + 1) * r);
    if (r >= 1) {
      let s = 0, c = 0;
      for (let i = Math.floor(a); i < b; i++) { s += src[i]; c++; }
      out[j] = c ? s / c : 0;
    } else {
      const i = Math.floor(a), f = a - i;
      out[j] = src[i] * (1 - f) + (src[Math.min(src.length - 1, i + 1)] || 0) * f;
    }
  }
  return out;
}

// budget: höchste Größe in Bytes. Fehler: Error('bad') = Datei nicht lesbar, Error('space') = passt nicht.
export async function encodeAzan(file, budget, onProgress) {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) throw new Error('bad');
  const ctx = new AC();
  let buf;
  try {
    const data = await file.arrayBuffer();
    buf = await new Promise((res, rej) => { const p = ctx.decodeAudioData(data, res, rej); if (p && p.catch) p.catch(rej); });
  } catch (e) { throw new Error('bad'); } finally { try { ctx.close(); } catch (e) { /* schon zu */ } }
  if (!buf || buf.duration < 1) throw new Error('bad');

  const sec = Math.min(buf.duration, MAX_SEC);
  const step = LADDER.find(([kbps]) => kbps * 125 * sec <= budget);
  if (!step) throw new Error('space');
  const [kbps, rate] = step;

  // Mono, gekürzt
  const n = Math.floor(sec * buf.sampleRate), mono = new Float32Array(n), ch = buf.numberOfChannels;
  for (let c = 0; c < ch; c++) { const d = buf.getChannelData(c); for (let i = 0; i < n; i++) mono[i] += d[i] / ch; }
  const pcmF = resample(mono, buf.sampleRate, rate);
  // Lautstärke angleichen (Spitze auf 90 %), am Ende kurz ausblenden
  let peak = 0;
  for (let i = 0; i < pcmF.length; i++) peak = Math.max(peak, Math.abs(pcmF[i]));
  const gain = peak > 0.01 ? 0.9 / peak : 1, fade = Math.min(pcmF.length, Math.floor(rate * 0.4));
  const pcm = new Int16Array(pcmF.length);
  for (let i = 0; i < pcm.length; i++) {
    const f = i >= pcm.length - fade ? (pcm.length - i) / fade : 1;
    pcm[i] = Math.max(-32767, Math.min(32767, Math.round(pcmF[i] * gain * f * 32767)));
  }

  const { Mp3Encoder } = await import('@breezystack/lamejs');
  const enc = new Mp3Encoder(1, rate, kbps);
  const parts = [], BLOCK = 1152 * 40;
  for (let i = 0; i < pcm.length; i += BLOCK) {
    const out = enc.encodeBuffer(pcm.subarray(i, i + BLOCK));
    if (out.length) parts.push(new Uint8Array(out));
    if (onProgress) onProgress(Math.round(i / pcm.length * 100));
    await new Promise(r => setTimeout(r, 0)); // Oberfläche nicht einfrieren
  }
  const end = enc.flush();
  if (end.length) parts.push(new Uint8Array(end));
  return new Blob(parts, { type: 'audio/mpeg' });
}
