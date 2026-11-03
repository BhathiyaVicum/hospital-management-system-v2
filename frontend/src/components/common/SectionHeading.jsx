export default function SectionHeading({ eyebrow, title, description, className = '' }) {
  return (
    <div className={className}>
      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">{eyebrow}</span>
      <h2 className="mt-1 text-2xl font-semibold tracking-tight text-on-surface sm:text-3xl">{title}</h2>
      {description && <p className="mt-2 max-w-2xl text-sm leading-relaxed text-on-surface-variant sm:text-base">{description}</p>}
    </div>
  );
}
