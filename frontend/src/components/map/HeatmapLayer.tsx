import { useEffect } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import { useTheme } from '../../context/ThemeContext'

import 'leaflet.heat'

export type HeatPoint = [number, number, number]

export default function HeatmapLayer({
  points,
}: {
  points: HeatPoint[]
}) {
  const map = useMap()
  const { theme } = useTheme()

  useEffect(() => {
    const anyL = L as unknown as { heatLayer?: (pts: HeatPoint[], opts?: any) => any }
    if (!anyL.heatLayer) return

    const isDark = theme === 'dark'

    const layer = anyL.heatLayer(points, {
      radius: 35,
      blur: 22,
      maxZoom: 17,
      // Light mode: start at saturated orange so it's visible against white tiles
      // Dark mode: start at pale yellow for a softer heat glow
      minOpacity: isDark ? 0.3 : 0.55,
      gradient: isDark
        ? { 0.2: '#ffffb2', 0.45: '#fd8d3c', 0.7: '#f03b20', 1.0: '#bd0026' }
        : { 0.0: '#ff8c00', 0.4: '#f03b20', 0.75: '#bd0026', 1.0: '#7f0000' },
    })
    layer.addTo(map)

    return () => {
      map.removeLayer(layer)
    }
  }, [map, points, theme])

  return null
}
