# react-recaptcha-hybrid 🔒

React library for reCAPTCHA v3 with automatic v2 checkbox fallback.

Built on top of [`@google-recaptcha/react`](https://www.npmjs.com/package/@google-recaptcha/react) (official Google, TypeScript-first).

## Why this exists

Most reCAPTCHA libraries for React support either v3 or v2, but not both. `react-recaptcha-hybrid` handles the full v3 → v2 fallback flow — including the mode transition and token handoff — so you don't have to wire it up yourself.

## Install

```bash
npm install react-recaptcha-hybrid
# or
yarn add react-recaptcha-hybrid
```

## Quick start

```tsx
import {
  RecaptchaHybridProvider,
  RecaptchaHybrid,
  useRecaptchaHybrid
} from 'react-recaptcha-hybrid';

function App() {
  return (
    <RecaptchaHybridProvider
      v3={{ key: 'YOUR_V3_SITE_KEY', action: 'login' }}
      v2={{ key: 'YOUR_V2_SITE_KEY', theme: 'light', size: 'normal', language: 'en' }}
    >
      <LoginForm />
    </RecaptchaHybridProvider>
  );
}

function LoginForm() {
  const { executeV3, isReady } = useRecaptchaHybrid();
  const [showChallenge, setShowChallenge] = useState(false);

  async function handleSubmit() {
    const tokenV3 = await executeV3('login');
    const { score } = await verifyOnBackend(tokenV3); // your backend
    if (score < 0.5) setShowChallenge(true);
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* form fields */}
      <RecaptchaHybrid
        showChallenge={showChallenge}
        onV2Token={(token) => {
          setShowChallenge(false);
          submitWithV2Token(token); // your backend
        }}
        onError={(e) => console.error(e)}
      />
      <button type="submit" disabled={!isReady}>
        Submit
      </button>
    </form>
  );
}
```

## Flow

```
User submits form
      │
      ▼
executeV3('action') → tokenV3
      │
      ▼
App sends tokenV3 to backend → siteverify
      │
      ├─ score ≥ 0.5 → proceed ✓
      │
      └─ score < 0.5 → setShowChallenge(true)
                              │
                              ▼
                    v2 checkbox renders (same script)
                              │
                              ▼
                    User checks ✓ → tokenV2
                              │
                              ▼
                    App sends tokenV2 to backend → siteverify
```

> **Important:** Score validation must happen on your backend via Google's `siteverify` endpoint. This library never reads or interprets scores — `showChallenge` is always controlled by your app.

## Provider props

### `RecaptchaHybridProvider`

| Prop          | Type                    | Required | Description                                          |
| ------------- | ----------------------- | -------- | ---------------------------------------------------- |
| `v3.key`      | `string`                | ✓        | reCAPTCHA v3 site key                                |
| `v3.action`   | `string`                |          | Default action for `executeV3` (default: `"submit"`) |
| `v2.key`      | `string`                | ✓        | reCAPTCHA v2 site key                                |
| `v2.theme`    | `"light" \| "dark"`     |          | Widget theme                                         |
| `v2.size`     | `"normal" \| "compact"` |          | Widget size                                          |
| `v2.language` | `string`                |          | Locale (e.g. `"pt-BR"`, `"en"`)                      |

## Hook: `useRecaptchaHybrid`

Must be used inside `RecaptchaHybridProvider`.

```tsx
const { executeV3, requestV2Challenge, resetToV3, isReady, isLoading, mode } = useRecaptchaHybrid();
```

| Return               | Type                                   | Description                        |
| -------------------- | -------------------------------------- | ---------------------------------- |
| `executeV3`          | `(action?: string) => Promise<string>` | Execute v3 and return token        |
| `requestV2Challenge` | `() => void`                           | Programmatically switch to v2 mode |
| `resetToV3`          | `() => void`                           | Reset back to v3 mode              |
| `isReady`            | `boolean`                              | reCAPTCHA loaded and ready         |
| `isLoading`          | `boolean`                              | Script loading in progress         |
| `mode`               | `"v3" \| "v2"`                         | Current active mode                |

## Component: `RecaptchaHybrid`

Declarative wrapper. Handles the transition automatically when `showChallenge` changes.

```tsx
<RecaptchaHybrid
  showChallenge={boolean}      // required — controlled by your app
  onV2Token={(token) => void}  // fires when checkbox is checked
  onError={(error) => void}    // RecaptchaError codes
  className={string}           // optional wrapper class
/>
```

## Error codes

| Code                 | When                                            |
| -------------------- | ----------------------------------------------- |
| `EXECUTE_FAILED`     | `executeV3` called when not ready or in v2 mode |
| `EXPIRED`            | v2 checkbox token expired                       |
| `SCRIPT_LOAD_FAILED` | reCAPTCHA script failed to load                 |
| `MISSING_KEY`        | Site key not provided                           |

## How it works

The v3 reCAPTCHA script exposes a unified `window.grecaptcha` object that supports both `execute()` (v3) and `render()` (v2). The library keeps a single v3 provider mounted at all times — when `showChallenge` becomes `true`, the v2 checkbox is rendered using `grecaptcha.render()` with the v2 site key, without reloading or replacing the script.

This avoids the React 19 warning about script tags being injected during renders that affect other hybrid implementations.

## SSR / Next.js

The library is SSR-safe. All script loading is deferred to the client. The built output includes the `"use client"` directive, so it works out of the box with Next.js App Router.
