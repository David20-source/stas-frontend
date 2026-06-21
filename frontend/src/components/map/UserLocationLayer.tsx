import { useEffect, useRef, useState } from 'react'
import { CircleMarker, Tooltip, useMap } from 'react-leaflet'

type Props = {
  onLocation?: (lat: number, lng: number) => void
  /** Fly to the user's position the first time it's acquired */
  centerOnMount?: boolean
}

export default function UserLocationLayer({ onLocation, centerOnMount }: Props) {
  const map = useMap()
  const [position, setPosition] = useState<[number, number] | null>(null)
  const centeredRef = useRef(false)

  useEffect(() => {
    if (!navigator.geolocation) return

    const watchId = navigator.geolocation.watchPosition(
      (geo) => {
        const p: [number, number] = [geo.coords.latitude, geo.coords.longitude]
        setPosition(p)
        onLocation?.(p[0], p[1])

        if (centerOnMount && !centeredRef.current) {
          map.flyTo(p, 15, { duration: 1.5 })
          centeredRef.current = true
        }
      },
      (err) => {
        // eslint-disable-next-line no-console
        console.warn('[geolocation]', err.message)
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 5_000 }
    )

    return () => navigator.geolocation.clearWatch(watchId)
  }, [map, onLocation, centerOnMount])

  if (!position) return null

  return (
    <>
      {/* Accuracy halo */}
      <CircleMarker
        center={position}
        radius={20}
        pathOptions={{ color: '#3b82f6', weight: 1, fillColor: '#3b82f6', fillOpacity: 0.12 }}
      />
      {/* Position dot */}
      <CircleMarker
        center={position}
        radius={7}
        pathOptions={{ color: '#ffffff', weight: 2.5, fillColor: '#3b82f6', fillOpacity: 1 }}
      >
        <Tooltip permanent direction="top" offset={[0, -10]}>
          <strong style={{ fontSize: 11 }}>You</strong>
        </Tooltip>
      </CircleMarker>
    </>
  )
}
