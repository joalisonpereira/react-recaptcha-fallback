import { useEffect } from 'react';
import { GoogleReCaptchaCheckbox } from '@google-recaptcha/react';
import { useRecaptchaHybridContext } from '../provider';
import type { RecaptchaError } from '../types';

export interface RecaptchaHybridProps {
  showChallenge: boolean;
  onV3Token?: (token: string) => void;
  onV2Token?: (token: string) => void;
  onError?: (error: RecaptchaError) => void;
  className?: string;
}

export function RecaptchaHybrid({
  showChallenge,
  onV2Token,
  onError,
  className
}: RecaptchaHybridProps) {
  const { mode, requestChallenge, v2Config } = useRecaptchaHybridContext();

  useEffect(() => {
    if (showChallenge && mode === 'v3') {
      requestChallenge();
    }
  }, [showChallenge, mode, requestChallenge]);

  if (!showChallenge || mode !== 'v2') return null;

  return (
    <div className={className}>
      <GoogleReCaptchaCheckbox
        theme={v2Config.theme}
        size={v2Config.size}
        language={v2Config.language}
        onChange={(token) => onV2Token?.(token)}
        onExpired={() => onError?.('EXPIRED')}
        onError={() => onError?.('EXECUTE_FAILED')}
      />
    </div>
  );
}
