import { useState, useEffect } from 'react';

const TOKEN_KEY_PREFIX = 'teambrain_tokens_';

export function getTeamTokens(teamId?: string): number {
  if (!teamId) return 1000;
  const key = `${TOKEN_KEY_PREFIX}${teamId}`;
  const stored = localStorage.getItem(key);
  if (stored === null) {
    localStorage.setItem(key, '1000');
    return 1000;
  }
  const val = parseInt(stored, 10);
  return isNaN(val) ? 1000 : val;
}

export function deductTeamTokens(teamId?: string, amount = 5): number {
  if (!teamId) return 1000;
  const current = getTeamTokens(teamId);
  const updated = Math.max(0, current - amount);
  localStorage.setItem(`${TOKEN_KEY_PREFIX}${teamId}`, updated.toString());
  window.dispatchEvent(new CustomEvent('teambrain_tokens_updated', { detail: { teamId, tokens: updated } }));
  return updated;
}

export function setTeamTokens(teamId: string | undefined, amount: number): number {
  if (!teamId) return 1000;
  const updated = Math.max(0, amount);
  localStorage.setItem(`${TOKEN_KEY_PREFIX}${teamId}`, updated.toString());
  window.dispatchEvent(new CustomEvent('teambrain_tokens_updated', { detail: { teamId, tokens: updated } }));
  return updated;
}

export function useTeamTokens(teamId?: string) {
  const [tokens, setTokens] = useState<number>(() => getTeamTokens(teamId));

  useEffect(() => {
    setTokens(getTeamTokens(teamId));

    const handler = (e: any) => {
      if (e.detail?.teamId === teamId) {
        setTokens(e.detail.tokens);
      }
    };
    window.addEventListener('teambrain_tokens_updated', handler);
    return () => window.removeEventListener('teambrain_tokens_updated', handler);
  }, [teamId]);

  return {
    tokens,
    deduct: (amount = 5) => deductTeamTokens(teamId, amount),
    reset: (amount = 1000) => setTeamTokens(teamId, amount),
    setZero: () => setTeamTokens(teamId, 0),
  };
}
