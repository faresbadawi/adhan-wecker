// Abschnitt: kleine Überschrift, Inhalt (meist eine eingerückte Liste), optional Hinweis darunter
export default function Section({ title, hint, children, className = '' }) {
  return (
    <section className={'section ' + className}>
      {title && <h2 className="section-title">{title}</h2>}
      {children}
      {hint && <p className="section-hint">{hint}</p>}
    </section>
  );
}
