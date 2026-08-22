const VARIANTS = {
  neutral: "bg-slate-100 text-slate-700",
  brand: "bg-indigo-100 text-indigo-700",
  amber: "bg-amber-100 text-amber-800",
} as const;

export function Badge({
  children,
  variant = "neutral",
}: {
  children: React.ReactNode;
  variant?: keyof typeof VARIANTS;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${VARIANTS[variant]}`}
    >
      {children}
    </span>
  );
}
