
export default function StatCard({
  title,
  value,
  description,
  icon: Icon,
  color,
  bg,
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md">

      <div className="flex items-start justify-between">

        <div>
          <p className="text-sm font-medium text-slate-500">
            {title}
          </p>

          <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
            {value}
          </h2>
        </div>

        <div className={`rounded-xl p-3 ${bg}`}>
          <Icon size={22} className={color} />
        </div>

      </div>

      <p className="mt-4 text-xs text-slate-500">
        {description}
      </p>

    </div>
  );
}
