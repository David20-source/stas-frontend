import { useEffect, useState } from 'react'
import { Cloud, CloudRain, Droplets, Sun, Thermometer, Wind } from 'lucide-react'
import GlassCard from '../layout/GlassCard'

type WeatherData = {
  tempC: number
  humidity: number
  windKmh: number
  rainMm: number
  condition: string
  affectsTraffic: boolean
}

function wmoToCondition(code: number): string {
  if (code === 0)                      return 'Clear Sky'
  if (code <= 3)                       return 'Partly Cloudy'
  if (code <= 48)                      return 'Foggy'
  if (code <= 55)                      return 'Drizzle'
  if (code <= 65)                      return 'Rain'
  if (code <= 77)                      return 'Snow'
  if (code <= 82)                      return 'Rain Showers'
  return 'Thunderstorm'
}

export default function WeatherWidget() {
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(false)

  useEffect(() => {
    const url =
      'https://api.open-meteo.com/v1/forecast' +
      '?latitude=0.3476&longitude=32.5825' +
      '&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,weather_code' +
      '&timezone=Africa%2FNairobi'

    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error('fetch failed')
        return r.json()
      })
      .then((data) => {
        const c = data.current
        const rainMm: number = c.precipitation ?? 0
        setWeather({
          tempC:          Math.round(c.temperature_2m),
          humidity:       c.relative_humidity_2m,
          windKmh:        Math.round(c.wind_speed_10m),
          rainMm:         Math.round(rainMm * 10) / 10,
          condition:      wmoToCondition(c.weather_code),
          affectsTraffic: rainMm > 0.2 || c.weather_code >= 51,
        })
        setLoading(false)
      })
      .catch(() => {
        setError(true)
        setLoading(false)
      })
  }, [])

  const isRaining = weather ? weather.rainMm > 0.2 : false
  const WeatherIcon = isRaining ? CloudRain : weather?.condition === 'Clear Sky' ? Sun : Cloud

  return (
    <GlassCard className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <WeatherIcon className="h-4 w-4 text-(--accent-primary)" />
        <span
          className="font-semibold text-sm text-(--text-primary)"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Weather — Kampala
        </span>
        {!loading && !error && (
          <span className="ml-auto text-[10px] text-(--text-tertiary)">Live</span>
        )}
      </div>

      {loading && (
        <div className="py-4 text-center text-xs text-(--text-tertiary)">
          Fetching weather…
        </div>
      )}

      {error && (
        <div className="py-4 text-center text-xs text-(--text-tertiary)">
          Weather unavailable
        </div>
      )}

      {weather && !loading && (
        <>
          <div className="flex items-center justify-between mb-3">
            <div
              className="text-3xl font-bold text-(--text-primary)"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {weather.tempC}°C
            </div>
            <div className="text-sm text-(--text-secondary)">{weather.condition}</div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[
              { icon: <Droplets className="h-3.5 w-3.5" />, label: 'Humidity', value: `${weather.humidity}%` },
              { icon: <Wind      className="h-3.5 w-3.5" />, label: 'Wind',     value: `${weather.windKmh} km/h` },
              { icon: <Thermometer className="h-3.5 w-3.5" />, label: 'Rain',   value: `${weather.rainMm} mm` },
            ].map((stat) => (
              <div key={stat.label} className="rounded-md p-2 border border-(--border-subtle) text-center">
                <div className="flex justify-center text-(--text-tertiary) mb-1">{stat.icon}</div>
                <div
                  className="text-xs font-medium text-(--text-primary)"
                  style={{ fontFamily: 'var(--font-mono)' }}
                >
                  {stat.value}
                </div>
                <div className="text-[10px] text-(--text-tertiary)">{stat.label}</div>
              </div>
            ))}
          </div>

          {weather.affectsTraffic && (
            <div
              className="mt-3 rounded-md px-3 py-1.5 text-xs border"
              style={{
                background: 'rgba(255,184,0,0.08)',
                borderColor: 'rgba(255,184,0,0.25)',
                color: 'var(--status-moderate)',
              }}
            >
              ⚠ Rain may increase congestion on low-lying routes
            </div>
          )}
        </>
      )}
    </GlassCard>
  )
}
