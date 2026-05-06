import { useState } from "react";
import {
  RecaptchaHybridProvider,
  RecaptchaHybrid,
  useRecaptchaHybrid,
} from "react-recaptcha-hybrid";

const V3_KEY = "6LeVgV0qAAAAAPyUb79VDXWDpF0Q4XOebSpcnl5_";
const V2_KEY = "6LefCNosAAAAAPq-1ybYbPZKqO935mV1ioqarDEB";

function LoginForm() {
  const { executeV3, isReady, mode } = useRecaptchaHybrid();

  const [showChallenge, setShowChallenge] = useState(false);

  const [v3Token, setV3Token] = useState<string | null>(null);

  const [v2Token, setV2Token] = useState<string | null>(null);

  const [log, setLog] = useState<string[]>([]);

  function addLog(msg: string) {
    setLog((prev) => [
      `[${new Date().toLocaleTimeString()}] ${msg}`,
      ...prev.slice(0, 9),
    ]);
  }

  async function handleSubmit() {
    try {
      addLog("Executing v3...");
      const token = await executeV3("login");
      setV3Token(token);
      addLog(`v3 token: ${token.slice(0, 40)}...`);
    } catch (e) {
      addLog(`Error: ${String(e)}`);
    }
  }

  function handleToggleChallenge() {
    setShowChallenge((prev) => {
      const next = !prev;
      addLog(
        next ? "showChallenge → true (swap to v2)" : "showChallenge → false"
      );
      if (!next) {
        setV2Token(null);
      }
      return next;
    });
  }

  function handleV2Token(token: string) {
    setV2Token(token);
    addLog(`v2 token: ${token.slice(0, 40)}...`);
  }

  return (
    <div className="card">
      <h2>Login demo</h2>
      <p className="status">
        Mode: <strong>{mode}</strong> | ready:{" "}
        <strong>{String(isReady)}</strong>
      </p>

      <div style={{ marginTop: 16, display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button
          className="primary"
          onClick={handleSubmit}
          disabled={!isReady || mode !== "v3"}
        >
          Execute v3
        </button>
        <button onClick={handleToggleChallenge}>
          {showChallenge ? "Hide v2 challenge" : "Show v2 challenge"}
        </button>
      </div>

      <RecaptchaHybrid
        showChallenge={showChallenge}
        onV2Token={handleV2Token}
        onError={(e) => addLog(`RecaptchaHybrid error: ${e}`)}
        className="recaptcha-widget"
      />

      {v3Token && (
        <div style={{ marginTop: 16 }}>
          <strong>v3 token</strong>
          <pre>{v3Token}</pre>
        </div>
      )}
      {v2Token && (
        <div style={{ marginTop: 16 }}>
          <strong>v2 token</strong>
          <pre>{v2Token}</pre>
        </div>
      )}
      {log.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <strong>Log</strong>
          <pre>{log.join("\n")}</pre>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <div>
      <h1>react-recaptcha-hybrid</h1>
      <p>
        Set <code>VITE_RECAPTCHA_V3_KEY</code> and{" "}
        <code>VITE_RECAPTCHA_V2_KEY</code> in <code>.env</code> to use real
        keys.
      </p>
      <RecaptchaHybridProvider
        v3={{ key: V3_KEY }}
        v2={{ key: V2_KEY, theme: "light", size: "normal", hl: "pt-BR" }}
      >
        <LoginForm />
      </RecaptchaHybridProvider>
    </div>
  );
}
