import { formatDistanceToNow, format } from 'date-fns'

export function timeAgo(date: Date | string): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true })
}

export function formatTime(date: Date | string): string {
  return format(new Date(date), 'HH:mm')
}

export function formatDateTime(date: Date | string): string {
  return format(new Date(date), 'MMM d, HH:mm')
}

export function formatCoords(lat: number, lng: number): string {
  return `${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E`
}

export function formatKm(km: number): string {
  return `${km.toFixed(1)} km`
}

export function formatSpeed(kmh: number): string {
  return `${Math.round(kmh)} km/h`
}
