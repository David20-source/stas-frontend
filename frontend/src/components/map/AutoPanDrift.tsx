import { useEffect } from 'react'
import { useMap } from 'react-leaflet'

export default function AutoPanDrift({
  enabled,
  intervalMs = 5000,
  driftDeg = 0.001,
}: {
  enabled: boolean
  intervalMs?: number
  driftDeg?: number
}) {
  const map = useMap()

  useEffect(() => {
    if (!enabled) return

    const id = setInterval(() => {
      const center = map.getCenter()
      // Subtle drift to convey a "live surveillance" feel.
      map.panTo([center.lat + driftDeg, center.lng + driftDeg], { animate: true, duration: 2.5 })
    }, intervalMs)

    return () => clearInterval(id)
  }, [enabled, intervalMs, driftDeg, map])

  return null
}

