// Eigenes Linien-Symbol (SVG-Text aus lib/icons.js)
export default function Svg({ html, className = '' }) {
  return <span className={'svg ' + className} aria-hidden="true" dangerouslySetInnerHTML={{ __html: html }} />;
}
