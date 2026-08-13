export default function StatsStrip() {
  const stats = [
    ["77", "Districts targeted"],
    ["24/7", "Shipment visibility"],
    ["COD", "Collection support"],
    ["API", "Business ready"],
  ];

  return (
    <section className="border-b border-slate-200/70 bg-white">
      <div className="mx-auto grid max-w-7xl grid-cols-2 divide-x divide-y divide-slate-200/70 sm:grid-cols-4 sm:divide-y-0">
        {stats.map(([value, label]) => (
          <div key={label} className="px-6 py-8 text-center sm:py-10">
            <p className="site-display text-2xl font-extrabold text-slate-950 sm:text-3xl">
              {value}
            </p>
            <p className="mt-1 text-xs font-semibold text-slate-500 sm:text-sm">{label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
