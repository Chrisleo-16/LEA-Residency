'use client'

import { useEffect } from 'react'
import LogRocket from 'logrocket'

export default function LogRocketInit() {
  useEffect(() => {
    // Only initialize in production or if explicitly enabled
    if (process.env.NODE_ENV === 'production' || process.env.NEXT_PUBLIC_ENABLE_LOGROCKET === 'true') {
      LogRocket.init('dptyw4/lea-residency')
    }
  }, [])

  return null
}
