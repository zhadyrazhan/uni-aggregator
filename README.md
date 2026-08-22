*[English version — [README.en.md](README.en.md)]*

# UniGuide — Агрегатор университетов

Проект Модуля 2 «AI-Native App Sprint». Агрегатор университетов: просмотр и фильтрация
каталога вузов и их требований к поступлению (работает полностью без ИИ), плюс опциональный
ИИ-ассистент, который помогает выбрать, объяснить и сравнить университеты через реальные вызовы
инструментов по тому же каталогу.

**Проект:** №3 — Агрегатор университетов (см. `Групповой_проект.pdf`).

## Стек

| Слой | Технологии |
|---|---|
| Frontend | Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS |
| Backend | Route Handlers Next.js (`src/app/api/**`) — отдельного сервера нет |
| База данных | Prisma ORM 6 + SQLite (`prisma/dev.db`, с сидом, внешние аккаунты не нужны) |
| ИИ | OpenAI SDK (Node), самописный цикл вызова инструментов (без `AgentExecutor` из LangChain) |
| Тестирование | Vitest (модульные) + Playwright (e2e) |

## Карта «требование → файл»

| Требование | Где |
|---|---|
| Прямые вызовы LLM API | `openai.OpenAI().chat.completions.create(...)` — [`src/lib/ai/agent.ts`](src/lib/ai/agent.ts) |
| Самописный цикл вызова инструментов (без `AgentExecutor`) | `runAgent()` — [`src/lib/ai/agent.ts`](src/lib/ai/agent.ts) |
| ≥3 инструментов на реальных данных | 4 инструмента в [`src/lib/ai/tools.ts`](src/lib/ai/tools.ts), все обращаются к [`src/lib/universities.ts`](src/lib/universities.ts) |
| Вызов нескольких инструментов (сравнения) | Агент вызывает `get_university_details` отдельно для каждого сравниваемого вуза — см. правило 2 в `src/lib/ai/prompt.ts` |
| Собственная память + сжатие | `AgentMemory` — [`src/lib/ai/memory.ts`](src/lib/ai/memory.ts), поверх `ChatSession`/`ChatMessage` в `prisma/schema.prisma` |
| Ретраи / обработка ошибок | `callWithRetry()` — [`src/lib/ai/agent.ts`](src/lib/ai/agent.ts) |
| Сайт работает без ИИ | `src/app/page.tsx` и `src/app/universities/[id]/page.tsx` — Server Components, которые никогда не импортируют `src/lib/ai/*`; `ChatPanel` — закрываемый виджет |
| Не «голый» HTML/CSS-дизайн | Tailwind + переиспользуемые компоненты — `src/components/*` |
| `ai-rules/<роль>_<имя>.md` | [`ai-rules/`](ai-rules/) (4 файла) |
| Автотесты | [`tests/unit/`](tests/unit) (Vitest), [`tests/e2e/`](tests/e2e) (Playwright) |
| Документ workflow + «Рефлексия» | [`WORKFLOW.md`](WORKFLOW.md) |

## Установка

Требуется Node.js (v20+; собрано и протестировано на v26) и npm — на этой машине уже
установлены, больше ничего не нужно.

```bash
npm install
cp .env.example .env   # затем впишите в .env настоящий OPENAI_API_KEY
npx prisma migrate dev # только первый раз — создаёт prisma/dev.db
npm run db:seed        # засеивает 20 университетов + требования к поступлению
npm run dev            # http://localhost:3000
```

> Открывайте `http://localhost:3000`, а не `http://127.0.0.1:3000` — cross-origin-защита
> dev-режима Next.js 16 по умолчанию блокирует JS-бандл на `127.0.0.1`, из-за чего вся
> клиентская интерактивность (фильтры, чат) молча ломается, причём на самой странице никакой
> ошибки не видно.

Без валидного `OPENAI_API_KEY` всё, кроме виджета чата, работает нормально; сам виджет вместо
падения показывает понятное сообщение об ошибке.

## Тестирование

```bash
npm run test         # модульные тесты Vitest (функции-инструменты, логика запросов и фильтров)
npx playwright install chromium   # разовая загрузка браузера
npm run test:e2e     # e2e Playwright (просмотр каталога без ИИ, панель чата)
npm run build        # продакшн-сборка + проверка типов
npm run lint
```

## Деплой (Vercel)

1. `npx vercel` (или подключите GitHub-репозиторий в дашборде Vercel) и войдите в аккаунт по
   запросу.
2. Задайте переменные окружения `OPENAI_API_KEY` и `DATABASE_URL=file:./dev.db` в настройках
   проекта на Vercel.
3. Задеплойте. `npm run build` (именно его запускает Vercel) применяет миграции и пересеивает
   каталог перед сборкой (`prisma migrate deploy && tsx prisma/seed.ts && next build`), так что
   `prisma/dev.db` генерируется заново на этапе сборки — файл в `.gitignore` и не коммитится.
   `next.config.ts` задаёт `outputFileTracingIncludes`, чтобы этот сгенерированный файл попал в
   бандл serverless-функций, которые читают его при обработке запросов.

**Открытая задача перед деплоем:** каталог доступен только на чтение во время обработки запроса
и деплоится как есть, а вот чат требует одной правки. `AgentMemory` (`src/lib/ai/memory.ts`)
пишет строку `ChatSession`/`ChatMessage` на каждый ход диалога, а вложенный `prisma/dev.db` лежит
на файловой системе Vercel, доступной только для чтения, — то есть до этой правки первое же
сообщение в чат упадёт с `SQLITE_READONLY`, тогда как страницы просмотра продолжат работать.
Решается копированием БД в `/tmp` на холодном старте либо переводом `DATABASE_URL` на managed
Postgres (Vercel Postgres, Neon) или Turso/libSQL с повторным `npx prisma migrate deploy`.
В обоих случаях код приложения менять не нужно: все запросы идут через `src/lib/db.ts` и
`src/lib/universities.ts`.

## Замечание по npm audit

`npm audit` показывает уязвимость высокой критичности в `deepmerge-ts` — транзитивной
зависимости парсера конфигов в CLI самой Prisma. Она эксплуатируется через специально
сконструированный объект чрезмерной вложенности, передаваемый в этот парсер; в данном проекте
парсер получает только наши собственные доверенные `schema.prisma` и конфиги, а не
пользовательский ввод, поэтому реального риска здесь нет. Исправление требует отката Prisma на
пре-релизную сборку (`npm audit fix --force` предлагает `6.12.0-dev`), что не стоит потери
стабильности ради уязвимости, актуальной только на этапе разработки.
