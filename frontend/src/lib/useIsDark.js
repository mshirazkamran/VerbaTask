import { useUiStore } from './store';

export function useIsDark() {
  const theme = useUiStore((s) => s.theme);
  return (
    theme === 'dark' ||
    (theme === 'system' &&
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-color-scheme: dark)').matches)
  );
}
