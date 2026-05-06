# Claude Code conventions — react-recaptcha-hybrid

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

## Architecture rules

- Score logic NEVER inside the lib. Lib receives `showChallenge` signal; who sends it is the app.
- SSR-safe: no `window` access at module load time. Guard with `typeof window !== 'undefined'`.
- The swap is sequential: v3 token is consumed before v2 provider mounts. Lib enforces this via context state.
- `@google-recaptcha/react` is a peer dep. Do not call its internal APIs beyond `GoogleReCaptchaProvider`, `useGoogleReCaptcha`, `GoogleReCaptchaCheckbox`.

## AI-assisted dev notes

- Keep commits small and reviewable. Each phase = its own commit(s).
- If in doubt about `@google-recaptcha/react` API, check `node_modules/@google-recaptcha/react/dist/index.d.ts`.
