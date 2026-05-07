# Claude Code conventions — react-recaptcha-fallback

## Naming

- Components: PascalCase (`RecaptchaHybrid`, `RecaptchaHybridProvider`)
- Hooks: camelCase prefixed with `use` (`useRecaptchaHybrid`)
- Internal utilities: camelCase in `src/internal/`
- Types/interfaces: PascalCase (`V3Config`, `RecaptchaHybridContextValue`)
- Error codes: SCREAMING_SNAKE_CASE strings (`SCRIPT_LOAD_FAILED`, `EXECUTE_FAILED`, `EXPIRED`, `MISSING_KEY`)

## Exports

- `src/index.ts` is the single barrel. Only public API goes there.
- Never export internal utilities (`src/internal/`). They are implementation details.
- All public types must be exported from `src/index.ts`.

## Testing (manual — no automated test suite yet)

Checklist before marking a PR done:

1. `yarn build` passes with no TS errors
2. `yarn typecheck` passes
3. Example app (`examples/vite-demo`): `yarn dev` starts, v3 badge appears, executeV3 returns token in console
4. Toggle `showChallenge=true` in demo → v2 checkbox appears, no console error
5. Check checkbox → onV2Token fires (token logged)
6. Toggle `showChallenge=false` → returns to v3, no error

## File structure

```
src/
  index.ts                        # single barrel — public API only
  types.ts                        # all shared types/interfaces
  provider.tsx                    # RecaptchaHybridProvider + useRecaptchaHybridContext (internal)
  hooks/useRecaptchaHybrid.ts     # public hook
  components/RecaptchaHybrid.tsx  # public component (memo-wrapped) + internal V2Checkbox
examples/vite-demo/               # demo app (yarn example to run)
dist/                             # built output (index.mjs, index.cjs, index.d.ts)
```

## Public API surface

| Export | Kind | Description |
|--------|------|-------------|
| `RecaptchaHybridProvider` | Component | Root provider. Accepts `v3: V3Config`, `v2: V2Config`, `children`. Wraps `GoogleReCaptchaProvider` (v3 always mounted). |
| `RecaptchaHybrid` | Component | Renders v2 checkbox when `showChallenge=true` and `mode==='v2'`. Props: `showChallenge`, `onV2Token?`, `onError?`, `className?`. |
| `useRecaptchaHybrid` | Hook | Returns `{ executeV3, requestV2Challenge, resetToV3, resetChallenge, isReady, isLoading, mode }`. |
| `V3Config` | Type | `{ key: string }` |
| `V2Config` | Type | `{ key, theme?, size?, language? }` |
| `RecaptchaHybridProviderProps` | Type | Provider props shape |
| `RecaptchaHybridContextValue` | Type | Context shape (mode, requestChallenge, resetToV3, v3Config, v2Config) |
| `RecaptchaHybridProps` | Type | Component props shape |
| `UseRecaptchaHybridReturn` | Type | Hook return shape |
| `RecaptchaError` | Type | `'SCRIPT_LOAD_FAILED' \| 'EXECUTE_FAILED' \| 'EXPIRED' \| 'MISSING_KEY'` |

## Implementation quirks

- **v2 rendered imperatively**: `V2Checkbox` calls `useGoogleReCaptcha().render(wrapper, opts)` into a div ref. Not a React component from the lib — raw DOM injection.
- **`onV3Token` prop exists in `RecaptchaHybridProps` but is NOT used** in the component body (destructured away). It's a known gap — if needed, add `executeV3` call inside `RecaptchaHybrid`.
- **`language` flow**: `V2Config.language` → passed as `hl` to v2 `render()` opts AND as `language` prop to `GoogleReCaptchaProvider` (v3 lang).
- **`executeV3` guards**: throws `EXECUTE_FAILED` if `mode !== 'v3'` or if `baseExecuteV3` is null.
- **`isReady`**: `!isLoading && !!baseExecuteV3` — both must be true.
- **`useRecaptchaHybridContext`** is internal (not exported). Only `useRecaptchaHybrid` is public.
- **Context null guard**: `useRecaptchaHybridContext` throws if used outside `RecaptchaHybridProvider`.

## Build details

- Dual format: ESM (`index.mjs`) + CJS (`index.cjs`), types at `index.d.ts`.
- `'use client'` banner injected via `rollupOptions.output.banner` → Next.js RSC compat out of the box.
- `rollupTypes: true` in `vite-plugin-dts` → single bundled `.d.ts`.
- Externals: `react`, `react-dom`, `react/jsx-runtime`, `@google-recaptcha/react`.
- `sideEffects: false` in `package.json` → tree-shakeable.
- `@google-recaptcha/react` is a **runtime dependency** (`dependencies`), NOT a peer dep despite the architecture note.

## Demo app (`examples/vite-demo`)

- Run: `yarn example` (from root) or `yarn dev` (from `examples/vite-demo`).
- Env vars: `VITE_RECAPTCHA_V3_KEY`, `VITE_RECAPTCHA_V2_KEY` (see `.env.example`). Demo has hardcoded fallback keys in `App.tsx`.
- `v2` prop in demo uses `hl: "pt-BR"` (note: type is `language`, but demo passes `hl` directly — verify if `RecaptchaHybridProvider` v2 prop accepts `language` not `hl`).

## Architecture rules

- Score logic NEVER inside the lib. Lib receives `showChallenge` signal; who sends it is the app.
- SSR-safe: no `window` access at module load time. Guard with `typeof window !== 'undefined'`.
- The swap is sequential: v3 token is consumed before v2 provider mounts. Lib enforces this via context state.
- `@google-recaptcha/react` APIs used: `GoogleReCaptchaProvider`, `useGoogleReCaptcha` (for `executeV3`, `isLoading`, `reset`, `render`). Do not use other internals.

## AI-assisted dev notes

- Keep commits small and reviewable. Each phase = its own commit(s).
- If in doubt about `@google-recaptcha/react` API, check `node_modules/@google-recaptcha/react/dist/index.d.ts`.
- Current version: `0.1.4`.
