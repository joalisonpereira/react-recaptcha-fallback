# react-recaptcha-hybrid

React library for reCAPTCHA v3 with automatic v2 checkbox fallback.

Replaces the unmaintained [`react-recaptcha-x`](https://www.npmjs.com/package/react-recaptcha-x) using [`@google-recaptcha/react`](https://www.npmjs.com/package/@google-recaptcha/react) (official Google, TypeScript-first) as internal base.

## Why this exists

| Library | v3 | v2 fallback | Maintained | TypeScript-first |
|---|---|---|---|---|
| `react-recaptcha-x` | ✓ | ✓ | ✗ | ✗ |
| `react-google-recaptcha-v3` | ✓ | ✗ | partial | partial |
| **`react-recaptcha-hybrid`** | ✓ | ✓ | ✓ | ✓ |

## Install

```bash
npm install react-recaptcha-hybrid @google-recaptcha/react
# or
yarn add react-recaptcha-hybrid @google-recaptcha/react
```

## Quick start

```tsx
import {
  RecaptchaHybridProvider,
  RecaptchaHybrid,
  useRecaptchaHybrid,
} from 'react-recaptcha-hybrid';

function App() {
  return (
    <RecaptchaHybridProvider
      v3={{ key: 'YOUR_V3_SITE_KEY', action: 'login' }}
      v2={{ key: 'YOUR_V2_SITE_KEY', theme: 'light', size: 'normal', hl: 'en' }}
    >
      <LoginForm />
    </RecaptchaHybridProvider>
  );
}

function LoginForm() {
  const { executeV3, requestV2Challenge, reset, isReady, mode } = useRecaptchaHybrid();
  const [showChallenge, setShowChallenge] = useState(false);

  async function handleSubmit() {
    const tokenV3 = await executeV3('login');
    const { score } = await verifyOnBackend(tokenV3); // YOUR backend
    if (score < 0.5) {
      setShowChallenge(true); // trigger v2 fallback
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* ... form fields ... */}
      <RecaptchaHybrid
        showChallenge={showChallenge}
        onV2Token={(token) => {
          setShowChallenge(false);
          submitWithV2Token(token); // YOUR backend
        }}
        onError={(e) => console.error(e)}
      />
      <button type="submit" disabled={!isReady}>Submit</button>
    </form>
  );
}
```

## Flow diagram

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
                    v3 provider unmounts
                    v2 provider mounts
                    checkbox renders
                              │
                              ▼
                    User checks ✓ → tokenV2
                              │
                              ▼
                    App sends tokenV2 to backend → siteverify
```

> **Important:** Score validation must happen on your backend via Google's `siteverify` endpoint. This library never reads or interprets scores — `showChallenge` is always controlled by the consuming app.

## Provider props

### `RecaptchaHybridProvider`

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `v3.key` | `string` | ✓ | reCAPTCHA v3 site key |
| `v3.action` | `string` | | Default action for `executeV3` (default: `"submit"`) |
| `v2.key` | `string` | ✓ | reCAPTCHA v2 site key |
| `v2.theme` | `"light" \| "dark"` | | Widget theme |
| `v2.size` | `"normal" \| "compact"` | | Widget size |
| `v2.hl` | `string` | | Locale (e.g. `"pt-BR"`, `"en"`) |

## Hook: `useRecaptchaHybrid`

Must be used inside `RecaptchaHybridProvider`.

```tsx
const { executeV3, requestV2Challenge, reset, isReady, isLoading, mode } = useRecaptchaHybrid();
```

| Return | Type | Description |
|--------|------|-------------|
| `executeV3` | `(action?: string) => Promise<string>` | Execute v3 and return token |
| `requestV2Challenge` | `() => void` | Manually swap to v2 mode |
| `reset` | `() => void` | Reset back to v3 mode |
| `isReady` | `boolean` | Current provider loaded and ready |
| `isLoading` | `boolean` | Script loading in progress |
| `mode` | `"v3" \| "v2"` | Current provider mode |

## Component: `RecaptchaHybrid`

Declarative wrapper. Handles swap automatically when `showChallenge` changes.

```tsx
<RecaptchaHybrid
  showChallenge={boolean}      // required — controlled by app
  onV2Token={(token) => void}  // fires when checkbox checked
  onV3Token={(token) => void}  // optional, for future use
  onError={(error) => void}    // RecaptchaError codes
  className={string}           // optional div wrapper class
/>
```

## Error codes

| Code | When |
|------|------|
| `EXECUTE_FAILED` | `executeV3` called when not ready or in v2 mode |
| `EXPIRED` | v2 checkbox token expired |
| `SCRIPT_LOAD_FAILED` | reCAPTCHA script failed to load |
| `MISSING_KEY` | Site key not provided |

## How the swap works

`@google-recaptcha/react` only supports one reCAPTCHA type per provider. This library uses **sequential swap**: the v3 provider unmounts (releasing `window.grecaptcha`) before the v2 provider mounts. The swap happens after the v3 token is already consumed by the app, so there is no window where both are needed simultaneously.

## SSR

The library is SSR-safe. Script loading is deferred to the client. No `window` access at module load time.

## License

MIT
