import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/Badge";
import { RequirementsPanel } from "@/components/RequirementsPanel";
import { ChatPanel } from "@/components/ChatPanel";
import { getUniversityById } from "@/lib/universities";

export default async function UniversityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const university = await getUniversityById(id);

  if (!university) notFound();

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-6 py-10">
      <Link href="/" className="text-sm font-medium text-indigo-600 hover:underline">
        ← Back to all universities
      </Link>

      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">{university.name}</h1>
        <p className="text-slate-500">
          {university.city}, {university.country} · founded {university.foundedYear ?? "n/a"}
        </p>
        <div className="flex flex-wrap gap-1.5 pt-1">
          {university.majors.map((m) => (
            <Badge key={m} variant="brand">
              {m}
            </Badge>
          ))}
        </div>
      </header>

      <p className="text-slate-700">{university.description}</p>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Stat label="Tuition" value={university.tuitionUsd ? `$${university.tuitionUsd.toLocaleString()}/yr` : "n/a"} />
        <Stat label="Ranking score" value={university.rankingScore?.toString() ?? "n/a"} />
        {university.website && (
          <Stat
            label="Website"
            value={
              <a href={university.website} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">
                Visit site
              </a>
            }
          />
        )}
      </div>

      <RequirementsPanel requirement={university.requirement} />

      <ChatPanel />
    </main>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-1 text-sm font-semibold text-slate-800">{value}</div>
    </div>
  );
}
