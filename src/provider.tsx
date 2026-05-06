import { createContext, useCallback, useContext, useState } from 'react';
import { GoogleReCaptchaProvider } from '@google-recaptcha/react';
import { removeRecaptchaScript } from './internal/cleanup';
import type { RecaptchaHybridContextValue, RecaptchaHybridProviderProps } from './types';

const RecaptchaHybridContext = createContext<RecaptchaHybridContextValue | null>(null);

export function RecaptchaHybridProvider({ v3, v2, children }: RecaptchaHybridProviderProps) {
  const [mode, setMode] = useState<'v3' | 'v2'>('v3');

  const requestChallenge = useCallback(() => {
    removeRecaptchaScript();

    setMode('v2');
  }, []);

  const resetToV3 = useCallback(() => {
    removeRecaptchaScript();

    setMode('v3');
  }, []);

  return (
    <RecaptchaHybridContext.Provider
      value={{ mode, requestChallenge, resetToV3, v3Config: v3, v2Config: v2 }}
    >
      {mode === 'v3' ? (
        <GoogleReCaptchaProvider key="v3" type="v3" siteKey={v3.key}>
          {children}
        </GoogleReCaptchaProvider>
      ) : (
        <GoogleReCaptchaProvider
          key="v2"
          type="v2-checkbox"
          siteKey={v2.key}
          language={v2.language}
        >
          {children}
        </GoogleReCaptchaProvider>
      )}
    </RecaptchaHybridContext.Provider>
  );
}

export function useRecaptchaHybridContext(): RecaptchaHybridContextValue {
  const ctx = useContext(RecaptchaHybridContext);

  if (!ctx) {
    throw new Error('useRecaptchaHybridContext must be used inside RecaptchaHybridProvider');
  }

  return ctx;
}
