'use client'

import { useEffect, useRef } from 'react'
import { Viewer } from '@photo-sphere-viewer/core'
import '@photo-sphere-viewer/core/index.css'

interface TourViewerProps {
  imageUrl: string
  className?: string
}

export default function TourViewer({ imageUrl, className }: TourViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const viewer = new Viewer({
      container: containerRef.current,
      panorama: imageUrl,
      navbar: ['zoom', 'fullscreen'],
      defaultZoomLvl: 0,
    })

    return () => viewer.destroy()
  }, [imageUrl])

  return <div ref={containerRef} className={className} />
}
