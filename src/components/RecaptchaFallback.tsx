import { memo, useEffect, useRef } from 'react';
import { useGoogleReCaptcha } from '@google-recaptcha/react';
import { useRecaptchaFallbackContext } from '../provider';
import type { RecaptchaError } from '../types';

export interface RecaptchaFallbackProps {
  showChallenge: boolean;
  onV3Token?: (token: string) => void;
  onV2Token?: (token: string) => void;
  onError?: (error: RecaptchaError) => void;
  className?: string;
}

function V2Checkbox({
  v2Config,
  onV2Token,
  onError,
  className
}: Pick<RecaptchaFallbackProps, 'onV2Token' | 'onError' | 'className'> & {
  v2Config: ReturnType<typeof useRecaptchaFallbackContext>['v2Config'];
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  const { render } = useGoogleReCaptcha();

  useEffect(() => {
    if (!render || !containerRef.current) return;

    const wrapper = document.createElement('div');

    render(wrapper, {
      sitekey: v2Config.key,
      ...(v2Config.theme && { theme: v2Config.theme }),
      ...(v2Config.size && { size: v2Config.size }),
      ...(v2Config.language && { hl: v2Config.language }),
      callback: (token: string) => onV2Token?.(token),
      'expired-callback': () => onError?.('EXPIRED'),
      'error-callback': () => onError?.('EXECUTE_FAILED')
    });

    const container = containerRef.current;

    container.appendChild(wrapper);

    return () => {
      container.innerHTML = '';
    };
  }, [render, v2Config.key, v2Config.theme, v2Config.size, v2Config.language, onV2Token, onError]);

  return <div ref={containerRef} className={className} />;
}

export const RecaptchaFallback = memo(
  ({ showChallenge, onV2Token, onError, className }: RecaptchaFallbackProps) => {
    const { mode, requestChallenge, v2Config } = useRecaptchaFallbackContext();

    useEffect(() => {
      if (showChallenge && mode === 'v3') {
        requestChallenge();
      }
    }, [showChallenge, mode, requestChallenge]);

    if (!showChallenge || mode !== 'v2') return null;

    return (
      <V2Checkbox
        v2Config={v2Config}
        onV2Token={onV2Token}
        onError={onError}
        className={className}
      />
    );
  }
);

RecaptchaFallback.displayName = 'RecaptchaFallback';
