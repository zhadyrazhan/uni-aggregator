import Link from "next/link";
import { Badge } from "@/components/Badge";
import type { UniversitySummary } from "@/lib/universities";

export function UniversityCard({ university }: { university: UniversitySummary }) {
  return (
    <Link
      href={`/universities/${university.id}`}
      className="group flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 group-hover:text-indigo-700">
            {university.name}
          </h3>
          <p className="text-sm text-slate-500">
            {university.city}, {university.country}
          </p>
        </div>
        {typeof university.rankingScore === "number" && (
          <Badge variant="brand">score {university.rankingScore}</Badge>
        )}
      </div>

      <p className="line-clamp-2 text-sm text-slate-600">{university.description}</p>

      <div className="flex flex-wrap gap-1.5">
        {university.majors.slice(0, 4).map((m) => (
          <Badge key={m}>{m}</Badge>
        ))}
      </div>

      <div className="mt-auto text-sm font-medium text-slate-700">
        {university.tuitionUsd ? `$${university.tuitionUsd.toLocaleString()} / year` : "Tuition n/a"}
      </div>
    </Link>
  );
}
