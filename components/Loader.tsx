// components/Loader.tsx
// Built from the Uiverse.io (by mahdisad19) SVG loader you pasted.
// Your CSS animations are kept 100% as-is — only wrapped in a
// reusable component with two modes: 'overlay' and 'inline'.

'use client'

export type LoaderShape = 'circle' | 'triangle' | 'rect'

interface LoaderProps {
  shape?: LoaderShape
  /** 'overlay' = full-screen with backdrop, 'inline' = small, sits next to text/in a button */
  mode?: 'overlay' | 'inline'
}

export default function Loader({ shape = 'circle', mode = 'inline' }: LoaderProps) {
  const loaderEl = (
    <div className={`loader ${shape === 'triangle' ? 'triangle' : ''}`}>
      {shape === 'circle' && (
        <svg viewBox="0 0 80 80">
          <circle r="32" cy="40" cx="40" />
        </svg>
      )}
      {shape === 'triangle' && (
        <svg viewBox="0 0 86 80">
          <polygon points="43 8 79 72 7 72" />
        </svg>
      )}
      {shape === 'rect' && (
        <svg viewBox="0 0 80 80">
          <rect height="64" width="64" y="8" x="8" />
        </svg>
      )}
    </div>
  )

  if (mode === 'inline') {
    return loaderEl
  }

  // overlay mode — full screen, fully opaque, just the loader, nothing else
  return (
    <div className="loader-overlay">
      {loaderEl}
    </div>
  )
}