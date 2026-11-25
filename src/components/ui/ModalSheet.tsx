import {
  useEffect,
  useRef,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'

interface ModalSheetProps {
  closing: boolean
  onRequestClose: () => void
  labelledBy?: string
  maxWidthClassName?: string
  children: ReactNode
}

/** Rigidez do spring criticamente amortecido (response ≈ 0.4s). */
const SPRING_OMEGA = (2 * Math.PI) / 0.4
const DISMISS_RATIO = 0.4
const DISMISS_VELOCITY = 900 // px/s

/** Resistência progressiva ao arrastar acima do repouso (apple-design §9). */
function rubberband(overshoot: number, dimension: number): number {
  const constant = 0.55
  return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot))
}

/** Projeção de momento de Apple (d ≈ 0.998), px/s → px. */
function project(velocity: number, decelerationRate = 0.998): number {
  return (velocity / 1000) * decelerationRate / (1 - decelerationRate)
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

/**
 * Backdrop + sheet (bottom sheet no mobile, modal centralizado em sm+) com
 * entrada/saída animadas nos dois sentidos (apple-design §7), arrasto para
 * fechar com transferência de velocidade e spring crítico (§3–§6), foco preso
 * dentro do diálogo e restaurado ao fechar.
 */
function ModalSheet({
  closing,
  onRequestClose,
  labelledBy,
  maxWidthClassName = 'sm:max-w-lg',
  children,
}: ModalSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number | undefined>(undefined)
  const dismissedByDrag = useRef(false)
  const requestCloseRef = useRef(onRequestClose)
  requestCloseRef.current = onRequestClose

  const dragRef = useRef({
    active: false,
    pointerId: -1,
    startY: 0,
    dy: 0,
    samples: [] as { t: number; y: number }[],
  })

  function cancelSpring() {
    if (rafRef.current !== undefined) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = undefined
    }
  }

  /** Spring criticamente amortecido com velocidade inicial (handoff §5). */
  function springTo(
    from: number,
    velocity: number,
    target: number,
    done: () => void,
  ) {
    const el = sheetRef.current
    if (!el) return
    const sheet: HTMLDivElement = el
    cancelSpring()

    const start = performance.now()
    const c1 = from - target
    const c2 = velocity + SPRING_OMEGA * c1

    function frame(now: number) {
      const t = (now - start) / 1000
      const decay = Math.exp(-SPRING_OMEGA * t)
      const x = target + (c1 + c2 * t) * decay
      const v = (c2 - SPRING_OMEGA * (c1 + c2 * t)) * decay
      sheet.style.transform = `translateY(${x}px)`

      if (Math.abs(x - target) < 0.5 && Math.abs(v) < 10) {
        sheet.style.transform = target === 0 ? '' : `translateY(${target}px)`
        rafRef.current = undefined
        done()
        return
      }
      rafRef.current = requestAnimationFrame(frame)
    }
    rafRef.current = requestAnimationFrame(frame)
  }

  function onHandlePointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (window.matchMedia('(min-width: 640px)').matches) return
    if (prefersReducedMotion()) return
    const el = sheetRef.current
    if (!el) return

    cancelSpring()
    el.style.transform = ''
    dragRef.current = {
      active: true,
      pointerId: e.pointerId,
      startY: e.clientY,
      dy: 0,
      samples: [{ t: performance.now(), y: 0 }],
    }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function onHandlePointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current
    const el = sheetRef.current
    if (!drag.active || !el || e.pointerId !== drag.pointerId) return

    let dy = e.clientY - drag.startY
    const height = el.offsetHeight || window.innerHeight
    if (dy < 0) dy = rubberband(dy, height)

    drag.dy = dy
    el.style.transform = `translateY(${dy}px)`

    const now = performance.now()
    drag.samples.push({ t: now, y: dy })
    while (drag.samples.length > 2 && now - drag.samples[0].t > 100) {
      drag.samples.shift()
    }
  }

  function releaseDrag(dismissible: boolean) {
    const drag = dragRef.current
    const el = sheetRef.current
    if (!drag.active || !el) return
    drag.active = false

    const samples = drag.samples
    const first = samples[0]
    const last = samples[samples.length - 1]
    const dt = (last.t - first.t) / 1000
    const velocity = dismissible && dt > 0 ? (last.y - first.y) / dt : 0
    const height = el.offsetHeight || window.innerHeight
    const shouldDismiss =
      dismissible &&
      (drag.dy + project(velocity) > height * DISMISS_RATIO ||
        velocity > DISMISS_VELOCITY)

    if (shouldDismiss) {
      springTo(drag.dy, velocity, height, () => {
        dismissedByDrag.current = true
        requestCloseRef.current()
      })
    } else {
      springTo(drag.dy, velocity, 0, () => {
        if (el) el.style.transform = ''
      })
    }
  }

  // Foco preso no diálogo, Escape fecha, foco restaurado ao desmontar.
  useEffect(() => {
    const node = sheetRef.current
    if (!node) return
    const previous = document.activeElement as HTMLElement | null
    const selector =
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'

    const first = node.querySelector<HTMLElement>(selector)
    first?.focus({ preventScroll: true })

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        requestCloseRef.current()
        return
      }
      if (e.key !== 'Tab') return
      const items = Array.from(node!.querySelectorAll<HTMLElement>(selector)).filter(
        el => el.offsetParent !== null,
      )
      if (items.length === 0) return
      const firstEl = items[0]
      const lastEl = items[items.length - 1]
      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault()
        lastEl.focus()
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault()
        firstEl.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      previous?.focus?.({ preventScroll: true })
    }
  }, [])

  useEffect(() => cancelSpring, [])

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        className={[
          'absolute inset-0 modal-scrim backdrop-blur-sm transition-opacity duration-200',
          closing ? 'opacity-0' : 'opacity-100',
        ].join(' ')}
        onClick={onRequestClose}
        aria-hidden="true"
      />
      <div
        ref={sheetRef}
        className={[
          'relative w-full bg-surface rounded-t-2xl sm:rounded-2xl shadow-tier3 overflow-hidden max-h-[85dvh] flex flex-col',
          maxWidthClassName,
          closing
            ? dismissedByDrag.current
              ? ''
              : 'animate-fade-out-down'
            : 'animate-fade-in-up',
        ].join(' ')}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
      >
        {/* Alça de arrasto — só no bottom sheet mobile */}
        <div
          className="sm:hidden flex justify-center pt-2 pb-1 cursor-grab touch-none active:cursor-grabbing shrink-0"
          onPointerDown={onHandlePointerDown}
          onPointerMove={onHandlePointerMove}
          onPointerUp={() => releaseDrag(true)}
          onPointerCancel={() => releaseDrag(false)}
          aria-hidden="true"
        >
          <span className="h-1 w-9 rounded-full bg-outline" />
        </div>
        {children}
      </div>
    </div>
  )
}

export { ModalSheet }
