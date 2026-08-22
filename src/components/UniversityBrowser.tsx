"use client";

import { useEffect, useState } from "react";
import { UniversityCard } from "@/components/UniversityCard";
import type { UniversitySummary } from "@/lib/universities";

export function UniversityBrowser({
  initialUniversities,
  countries,
  majors,
}: {
  initialUniversities: UniversitySummary[];
  countries: string[];
  majors: string[];
}) {
  const [country, setCountry] = useState("");
  const [major, setMajor] = useState("");
  const [search, setSearch] = useState("");
  const [universities, setUniversities] = useState(initialUniversities);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    const params = new URLSearchParams();
    if (country) params.set("country", country);
    if (major) params.set("major", major);
    if (search) params.set("search", search);

    const timeout = setTimeout(() => {
      setLoading(true);
      fetch(`/api/universities?${params.toString()}`, { signal: controller.signal })
        .then((res) => res.json())
        .then((data) => setUniversities(data.universities))
        .catch((err) => {
          if (err.name !== "AbortError") console.error(err);
        })
        .finally(() => setLoading(false));
    }, 200);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [country, major, search]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <select
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
        >
          <option value="">All countries</option>
          {countries.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <select
          value={major}
          onChange={(e) => setMajor(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
        >
          <option value="">All majors</option>
          {majors.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or city…"
          className="min-w-[200px] flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
        />

        {loading && <span className="text-xs text-slate-400">Searching…</span>}
      </div>

      {universities.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
          No universities match these filters.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {universities.map((u) => (
            <UniversityCard key={u.id} university={u} />
          ))}
        </div>
      )}
    </div>
  );
}
