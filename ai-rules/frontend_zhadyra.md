# Role

Frontend Developer (UI/UX) for UniGuide, the university aggregator. Owns pages, components,
layout, and client-side state under `src/app/**` and `src/components/**`.

# System Rules

- The AI assistant may generate/edit React (TSX) components and Tailwind classes, but every
  page must remain fully usable with the AI chat widget closed — the catalog, filters, and
  detail pages are never allowed to depend on `src/lib/ai/*`.
- No plain unstyled HTML: every UI surface is built from the shared component set
  (`Badge`, `UniversityCard`, `FilterBar`/`UniversityBrowser`, `RequirementsPanel`, `ChatPanel`)
  styled with Tailwind, not hand-rolled inline styles or a raw `<button>`/`<div>` with no design
  system — this is a hard requirement from the project spec.
- Do not fetch data client-side on first paint where a Server Component can fetch it directly
  (see `src/app/page.tsx`, `src/app/universities/[id]/page.tsx`) — this keeps the no-JS/no-AI
  baseline working and fast.
- Do not introduce a second styling system (CSS modules, styled-components, etc.) alongside
  Tailwind.

# MCP & Tools

- **Context7 MCP** — used while building to pull current Next.js 16 / React 19 / Tailwind v4
  API docs, since both Next.js 16 and the Tailwind v4 CSS-based theme config are newer than
  the assistant's training data (confirmed via `resolve-library-id` + `query-docs` against
  `/vercel/next.js` for App Router route handler and dynamic-param conventions).
- No sub-agents used for this role — component work was done directly against the shared
  query layer in `src/lib/universities.ts`.

# Output Contracts

- Components: functional TSX, typed props, no `any`.
- Server Components by default; `"use client"` only where interactivity is required
  (`UniversityBrowser`, `ChatPanel`).
- Styling: Tailwind utility classes only, following the existing scale (slate/indigo palette,
  `rounded-2xl` cards, `shadow-sm`).
- Every new page/component must pass `npm run lint` and `npm run build` with zero errors before
  being considered done.
