import { useEffect, useRef } from 'react';

/**
 * Intercepta a acao de "voltar" (botao do navegador e gesto de swipe-back)
 * enquanto houver uma busca ativa: o primeiro "voltar" limpa a busca e
 * permanece na tela; o segundo sai normalmente.
 */
export function useSearchBackGuard(active: boolean, onClear: () => void) {
  const pushedRef = useRef(false);
  const skipNextRef = useRef(false);
  const onClearRef = useRef(onClear);
  onClearRef.current = onClear;

  useEffect(() => {
    const handler = () => {
      if (skipNextRef.current) {
        skipNextRef.current = false;
        pushedRef.current = false;
        return;
      }
      if (pushedRef.current) {
        pushedRef.current = false;
        onClearRef.current();
      }
    };
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }, []);

  useEffect(() => {
    if (active && !pushedRef.current) {
      window.history.pushState({ __searchGuard: true }, '');
      pushedRef.current = true;
    } else if (!active && pushedRef.current) {
      // busca limpa manualmente: remove a entrada extra do historico
      skipNextRef.current = true;
      window.history.back();
    }
  }, [active]);
}
