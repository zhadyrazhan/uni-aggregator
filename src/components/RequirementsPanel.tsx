import type { UniversityDetail } from "@/lib/universities";

export function RequirementsPanel({ requirement }: { requirement: UniversityDetail["requirement"] }) {
  if (!requirement) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 p-5 text-sm text-slate-500">
        No admission requirements on file for this university yet.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-3 text-lg font-semibold text-slate-900">Admission requirements</h2>
      <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-slate-500">Required exams</dt>
          <dd className="font-medium text-slate-800">{requirement.requiredExams}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Minimum score</dt>
          <dd className="font-medium text-slate-800">{requirement.minExamScore}</dd>
        </div>
        {requirement.minGpa != null && (
          <div>
            <dt className="text-slate-500">Minimum GPA</dt>
            <dd className="font-medium text-slate-800">{requirement.minGpa}</dd>
          </div>
        )}
        {requirement.notes && (
          <div className="sm:col-span-2">
            <dt className="text-slate-500">Notes</dt>
            <dd className="text-slate-700">{requirement.notes}</dd>
          </div>
        )}
      </dl>
    </div>
  );
}
