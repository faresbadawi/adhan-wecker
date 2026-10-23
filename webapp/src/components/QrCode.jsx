// QR-Code als SVG (dunkle Module auf weißem Grund, damit Kameras ihn sicher lesen)
import { useMemo } from 'react';
import qrcode from 'qrcode-generator';

export default function QrCode({ text, size = 190, label }) {
  const svg = useMemo(() => {
    try {
      const q = qrcode(0, 'M');
      q.addData(text);
      q.make();
      return q.createSvgTag({ cellSize: 4, margin: 3, scalable: true });
    } catch (e) { return ''; }
  }, [text]);
  if (!svg) return null;
  return <div className="qr" style={{ width: size }} role="img" aria-label={label || text} dangerouslySetInnerHTML={{ __html: svg }} />;
}
