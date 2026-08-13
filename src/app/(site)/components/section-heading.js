export default function SectionHeading({
  eyebrow,
  title,
  text,
  align = "center",
}) {
  const centered = align !== "left";

  return (
    <div className={`${centered ? "mx-auto text-center" : ""} max-w-2xl`}>
      <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-blue-600">
        {eyebrow}
      </p>
      <h2 className="site-display mt-4 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
        {title}
      </h2>
      {text && (
        <p className="mt-4 text-base leading-7 text-slate-600 sm:text-lg">
          {text}
        </p>
      )}
    </div>
  );
}
