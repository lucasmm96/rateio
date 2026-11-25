import { useEffect, useRef, useState } from 'react'

const EXIT_DURATION_MS = 180

/**
 * Atrasa o unmount real (`onClosed`) até a animação de saída terminar, em vez
 * de remover o modal/sheet da árvore no mesmo frame do clique (apple-design §7/§12).
 */
export function useDismiss(onClosed: () => void) {
  const [closing, setClosing] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => () => clearTimeout(timeoutRef.current), [])

  function requestClose() {
    if (timeoutRef.current) return
    setClosing(true)
    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = undefined
      setClosing(false)
      onClosed()
    }, EXIT_DURATION_MS)
  }

  return { closing, requestClose }
}
