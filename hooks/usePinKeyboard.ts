'use client'

import { useEffect, useRef } from 'react'

/**
 * Laptop-friendly PIN entry: number keys, numpad, Backspace, Enter.
 */
export function usePinKeyboard(opts: {
  enabled?: boolean
  busy?: boolean
  onDigit: (d: string) => void
  onBackspace: () => void
  onEnter?: () => void
}) {
  const onDigit = useRef(opts.onDigit)
  const onBackspace = useRef(opts.onBackspace)
  const onEnter = useRef(opts.onEnter)
  onDigit.current = opts.onDigit
  onBackspace.current = opts.onBackspace
  onEnter.current = opts.onEnter

  useEffect(() => {
    if (opts.enabled === false) return

    const onKeyDown = (e: KeyboardEvent) => {
      if (opts.busy) return
      // Ignore when typing in a real text field elsewhere
      const t = e.target as HTMLElement | null
      if (
        t &&
        (t.tagName === 'INPUT' ||
          t.tagName === 'TEXTAREA' ||
          t.isContentEditable)
      ) {
        return
      }

      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault()
        onDigit.current(e.key)
        return
      }
      if (e.code?.startsWith('Numpad') && e.key >= '0' && e.key <= '9') {
        e.preventDefault()
        onDigit.current(e.key)
        return
      }
      if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault()
        onBackspace.current()
        return
      }
      if (e.key === 'Enter') {
        e.preventDefault()
        onEnter.current?.()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [opts.enabled, opts.busy])
}
