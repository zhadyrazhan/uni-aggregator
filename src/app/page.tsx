import { UniversityBrowser } from "@/components/UniversityBrowser";
import { ChatPanel } from "@/components/ChatPanel";
import { listCountriesAndMajors, listUniversities } from "@/lib/universities";

export default async function HomePage() {
  const [universities, meta] = await Promise.all([
    listUniversities({ limit: 50 }),
    listCountriesAndMajors(),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-6 py-10">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          UniGuide — university aggregator
        </h1>
        <p className="max-w-2xl text-slate-600">
          Browse universities, filter by country and major, and check admission requirements.
          The catalog below works with no AI involved — open the assistant in the corner if you
          want help deciding or comparing options.
        </p>
      </header>

      <UniversityBrowser
        initialUniversities={universities}
        countries={meta.countries}
        majors={meta.majors}
      />

      <ChatPanel />
    </main>
  );
}
