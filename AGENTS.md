# AGENTS.md

Guidance for AI coding agents working in this repository.

## Formatting

Prettier is the source of truth for formatting. Before finishing any code
change, run:

```bash
pnpm format
```

Use the repository `.prettierrc` settings:

- `printWidth`: 80
- `tabWidth`: 2
- `semi`: false
- `singleQuote`: false
- `trailingComma`: `es5`
- `endOfLine`: `lf`
- `prettier-plugin-tailwindcss` enabled
- Tailwind classes are sorted using `src/index.css`
- Tailwind-aware functions: `cn`, `cva`

Do not hand-format files against a different style. If a formatting-only diff
appears, prefer applying Prettier to the touched files or running `pnpm format`
once for the repo.

## Commands

```bash
pnpm install
pnpm dev
pnpm build
pnpm lint
pnpm format
pnpm typecheck
```
