# Plano: Lib React unificada reCAPTCHA v3 + v2 fallback

## Contexto

Demanda original: fluxo de login com reCAPTCHA v3 → fallback v2 quando score baixo.

**Pivot:** em vez de implementar só num app, construir lib npm reutilizável. Substitui [`react-recaptcha-x`](https://www.npmjs.com/package/react-recaptcha-x) (pouco mantida) usando [`@google-recaptcha/react`](https://www.npmjs.com/package/@google-recaptcha/react) (oficial Google, TS-first, SSR) como base interna.

**Restrição confirmada pelo usuário:** `@google-recaptcha/react` **não** suporta v3 + v2 carregados simultaneamente. Cada `type` carrega script Google diferente; só um `type` por provider. Solução: **swap sequencial** — token v3 sempre é consumido antes de montar widget v2, então não há janela em que ambos precisem coexistir.

**Escopo:** apenas frontend. Backend fora do plano (consumidor da lib implementa siteverify do jeito que preferir; lib só recebe sinal `showChallenge` do app).

**Desenvolvimento assistido por IA:** todo o trabalho (scaffold, código, refactors, README, exemplo) será conduzido com auxílio de IA (Claude Code). Implicações no plano:

- Commits pequenos e revisáveis — IA gera diff, humano valida cada passo.
- Convenções escritas explícitas no repo (`AGENTS.md` ou `CLAUDE.md` na raiz) com regras de naming, padrão de testes manuais, política de exports.
- Prompts/snippets reutilizáveis ficam em `docs/ai/` (opcional) pra reproduzir geração de código consistente.
- Nada de IA em runtime na lib — captcha não precisa de modelo, apenas o ciclo de tokens. IA é só ferramenta de dev.

## Fases

### Fase 0 — POC do swap sequencial

Validar antes de comprometer arquitetura: o swap funciona limpo na lib base?

**Cenário a testar:**

1. Mount `<GoogleReCaptchaProvider type="v3" siteKey={V3}>`. Executar `executeRecaptcha("login")` → tokenV3 OK.
2. App simula resposta de fallback (flag local).
3. Desmontar provider v3. Montar `<GoogleReCaptchaProvider type="v2-checkbox" siteKey={V2}>` em seguida.
4. Renderizar `<GoogleReCaptchaCheckbox>`. User marca. Callback retorna tokenV2.

**Riscos a observar:**

- Script `recaptcha/api.js` v3 fica injetado no DOM — segundo provider re-injeta? Conflita?
- `window.grecaptcha` foi setado pelo v3; v2 sobrescreve corretamente?
- Tempo de transição: quanto demora entre desmount v3 e v2 pronto pra interação?
- Se user volta atrás (cancela challenge), volta pro v3 funciona?

**Critério de sucesso:** tokens v3 e v2 emitidos em sequência, sem console error, sem reload, transição <1.5s.

Se POC falhar → cair pra implementação manual com `generateGoogleReCaptchaScriptSrc` + `grecaptcha` direto, gerenciando ciclo de script na própria lib.

### Fase 1 — Setup do pacote

Estrutura mínima:

```
packages/react-recaptcha-hybrid/
├─ src/
│  ├─ index.ts
│  ├─ provider.tsx
│  ├─ hooks/useRecaptchaHybrid.ts
│  ├─ components/RecaptchaHybrid.tsx
│  ├─ internal/loadScript.ts
│  └─ types.ts
├─ examples/
│  └─ vite-demo/         # exemplo Vite + React puro consumindo a lib
├─ package.json
├─ tsconfig.json
├─ vite.config.ts        # modo library (build.lib)
└─ README.md
```

Stack:

- **Build:** Vite no modo library (`build.lib`) — gera ESM + CJS via Rollup interno; `vite-plugin-dts` pra emitir `.d.ts`.
- **Lint:** `eslint` + `@typescript-eslint`.
- **Peer deps:** `react >=18`, `@google-recaptcha/react ^X`.
- **Dev:** `vite`, `vite-plugin-dts`, `@vitejs/plugin-react`, `react`, `react-dom`, `typescript`, `@types/react`.
- **License:** MIT.
- **Publish:** `@<scope>/react-recaptcha-hybrid` no npm. CI via GitHub Actions com `yarn changeset`.

Pontos-chave de `vite.config.ts`:

- `build.lib`: `entry: "src/index.ts"`, `formats: ["es", "cjs"]`, `fileName: (fmt) => "index.${fmt === 'es' ? 'mjs' : 'cjs'}"`.
- `rollupOptions.external`: `["react", "react-dom", "react/jsx-runtime", "@google-recaptcha/react"]` (não bundlar peer/runtime React).
- Plugins: `react()` + `dts({ rollupTypes: true, insertTypesEntry: true })`.
- `package.json` exports: `"."`: `{ "import": "./dist/index.mjs", "require": "./dist/index.cjs", "types": "./dist/index.d.ts" }`. `"sideEffects": false` pra tree-shaking.

### Fase 2 — Public API

Espelhar mental model de `react-recaptcha-x` mas TS-first. Props **encapsuladas por versão** (`v2`/`v3` como objetos, não props soltas):

```tsx
<RecaptchaHybridProvider
  v3={{
    key: "...",
    action: "login",
  }}
  v2={{
    key: "...",
    theme: "light",       // "light" | "dark"
    size: "normal",       // "normal" | "compact"
    hl: "pt-BR",          // idioma opcional
    action: "login"       // action opcional
  }}
>
  <LoginForm />
</RecaptchaHybridProvider>

// Hook
const { executeV3, requestV2Challenge, reset } = useRecaptchaHybrid();

// Componente declarativo
<RecaptchaHybrid
  showChallenge={challengeRequired}        // controlled by app
  onV3Token={(t) => sendToServer({ tokenV3: t })}
  onV2Token={(t) => sendToServer({ tokenV2: t })}
  onError={(e) => ...}
/>
```

Tipos exportados:

- `RecaptchaHybridProviderProps` — `{ v3: V3Config; v2: V2Config; children: ReactNode }`
- `V3Config` — `{ key: string; action?: string }`
- `V2Config` — `{ key: string; theme?: "light" | "dark"; size?: "normal" | "compact"; hl?: string }`
- `RecaptchaHybridContextValue`
- `RecaptchaError` (`SCRIPT_LOAD_FAILED` | `EXECUTE_FAILED` | `EXPIRED` | `MISSING_KEY`)

Princípios:

- App controla `showChallenge`. Lib não decide score.
- `executeV3` retorna `Promise<string>`.
- `reset()` limpa widget v2 (após app sinalizar token rejeitado).
- SSR-safe (lazy load script só client-side).

### Fase 3 — Implementação interna

Arquitetura **swap sequencial** sobre `@google-recaptcha/react`:

- `src/provider.tsx` — `RecaptchaHybridProvider` recebe `{ v3, v2 }`, mantém state `mode: "v3" | "v2"` (default `"v3"`). Renderiza condicionalmente:
  ```tsx
  {
    mode === 'v3' ? (
      <GoogleReCaptchaProvider type="v3" siteKey={v3.key}>
        {children}
      </GoogleReCaptchaProvider>
    ) : (
      <GoogleReCaptchaProvider type="v2-checkbox" siteKey={v2.key}>
        {children}
      </GoogleReCaptchaProvider>
    );
  }
  ```
  Expõe context próprio com `requestChallenge()` (seta `mode="v2"`), `resetToV3()` (seta `mode="v3"`), e ref pro último token. Repassa `v2.theme/size/hl` e `v3.action` pros consumidores via context.
- `src/hooks/useRecaptchaHybrid.ts` — wraps tanto context próprio quanto `useGoogleReCaptcha` da lib base. Em modo v3, `executeV3()` delega pro hook base. Em modo v2, `executeV3` lança erro guiado.
- `src/components/RecaptchaHybrid.tsx` — quando `mode==="v2"`, renderiza `<GoogleReCaptchaCheckbox onChange={onV2Token}>` da lib base. Quando `mode==="v3"`, renderiza null (badge é responsabilidade do provider v3).
- `src/internal/cleanup.ts` — utility que tenta remover `<script src=".../recaptcha/api.js...">` injetado pelo provider antigo no momento do swap, evitando conflito de definição em `window.grecaptcha`. Se POC mostrar que lib base já trata, deletar este arquivo.
- `src/types.ts` — re-export `RecaptchaError`, augment `Window`.

Detalhes operacionais:

- Token v3 deve ser **capturado antes** de chamar `requestChallenge()`. App envia v3, recebe sinal de challenge, **só então** chama `requestChallenge()` — garantindo que swap não interrompe execução pendente.
- Provider expõe `key={mode}` no `GoogleReCaptchaProvider` interno pra forçar remount limpo.
- Loading state: durante swap, `isLoading` true até `useGoogleReCaptcha` reportar pronto no novo modo.

**Fallback se POC falhar:** sem usar `GoogleReCaptchaProvider` da lib base. Usar apenas `generateGoogleReCaptchaScriptSrc` + carregamento manual + `grecaptcha.execute`/`grecaptcha.render` próprios. Mais código, mais controle sobre cleanup do script entre v3 e v2.

### Fase 4 — Docs e exemplo

`README.md`:

- Quick start (provider + componente + hook)
- Tabela de props
- Diagrama de fluxo (v3 → app → flag challenge → v2)
- **Aviso destacado:** score deve ser validado no backend (não responsabilidade da lib, mas dever de quem consome)
- Comparação com `react-recaptcha-x` (deprecated) e `react-google-recaptcha-v3` (só v3)

`examples/vite-demo/`:

- Vite + React 18
- Form simples que usa lib
- Toggle manual de `showChallenge` pra demonstrar swap (sem backend real)

### Fase 5 — Publicação

- `yarn changeset` → versão 0.1.0.
- `yarn npm publish --access public`.
- Repo público no GitHub com README badges (npm version, downloads, license).
- Anunciar issue em `react-recaptcha-x` apontando alternativa (educado, sem trash-talk).

## Arquivos críticos

Pacote (todos novos):

- `package.json`, `tsconfig.json`, `vite.config.ts`
- `src/index.ts` — barrel exports
- `src/provider.tsx`
- `src/components/RecaptchaHybrid.tsx`
- `src/hooks/useRecaptchaHybrid.ts`
- `src/internal/loadScript.ts`
- `src/types.ts`
- `README.md`
- `examples/vite-demo/` (referência)

## Verificação

1. **POC (Fase 0):** rodar em sandbox CodeSandbox/Vite. Script load count, console clean, dois tokens emitidos em sequência.
2. **Build:** `yarn build` (= `vite build`) produz `dist/index.mjs`, `dist/index.cjs`, `dist/index.d.ts`.
3. **Tipos:** `tsc --noEmit` passa em `examples/vite-demo` consumindo a lib via workspace link.
4. **Funcional manual:**
   - Subir example. Default mode=v3, badge aparece, `executeV3` retorna token (ver no console).
   - Toggle `showChallenge=true` na UI → widget v2 aparece, transição limpa.
   - Marcar checkbox → callback dispara com tokenV2.
   - Toggle de volta `showChallenge=false` → volta pro v3 sem erro.
5. **SSR:** rodar example em Next.js dev server (separado) ou usar `vite-plugin-ssr` pra confirmar zero `window is not defined`.
6. **Bundle size:** `bundlephobia` ou `size-limit`. Alvo: <5kb gz (sem incluir `@google-recaptcha/react` que é peer).
7. **Compat:** testar React 18 e React 19 manualmente trocando peer no example.

## Riscos e notas

- **Swap pode ter glitch visual.** Trocar provider força remount; possível flash entre badge v3 sumindo e checkbox v2 aparecendo. Mitigar com loading state controlado pela lib.
- **Script v3 fica residual no DOM após swap.** `window.grecaptcha` é re-definido pelo v2; pode haver warning ou comportamento inesperado. POC valida; cleanup manual reserva.
- **Se POC falhar:** ir pra implementação direta com `grecaptcha` API sem usar `GoogleReCaptchaProvider`. Lib base fica apenas como fonte de utilities (`generateGoogleReCaptchaScriptSrc`) e tipagem.
- **API do `@google-recaptcha/react` é jovem.** Quebras de versão possíveis. Prender peer dep em range estreito até estabilizar.
- **Manutenção:** publicar não é o fim. Esperar issues sobre Next.js, SSR, React Native (não suportar inicialmente — explicitar no README).
- **Naming:** `react-recaptcha-x` ainda existe. Escolher nome distinto: `react-recaptcha-hybrid`, `react-recaptcha-fallback`, ou similar. Verificar disponibilidade no npm antes.
- **Score no frontend continua proibido.** Mesmo dentro da lib. Se cliente quiser, recusar via API design.

## Avaliação

Plano viável **se** Fase 0 confirmar viabilidade técnica. Substituir `react-recaptcha-x` é necessidade real do ecossistema (lib pouco mantida, muitos projetos travados). Usar `@google-recaptcha/react` como base é apostar em projeto com ~6 meses no npm — ainda jovem, mas oficial-ish e ativo. Risco maior é manutenção contínua: lib captcha tem alta demanda de suporte por causa de variação de cenários (SSR, Next, RN, edge cases de browser). Considerar se há tempo/energia pra sustentar.

Sources:

- [@google-recaptcha/react](https://www.npmjs.com/package/@google-recaptcha/react)
- [Docs siberiacancode/google-recaptcha](https://siberiacancode.github.io/google-recaptcha/docs/react)
- [react-recaptcha-x (referência API)](https://www.npmjs.com/package/react-recaptcha-x)
- [reCAPTCHA v3 (Google)](https://developers.google.com/recaptcha/docs/v3)
