import type { Incident, Prediction } from '../store/useAppStore'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapIncident(raw: any): Incident {
  return {
    id:          raw.id,
    routeId:     raw.route_id ?? null,
    type:        raw.type,
    severity:    raw.severity,
    latitude:    raw.latitude,
    longitude:   raw.longitude,
    address:     raw.address ?? '',
    description: raw.description,
    status:      raw.status,
    createdAt:   raw.created_at ?? raw.createdAt ?? new Date().toISOString(),
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapPrediction(raw: any): Prediction {
  return {
    routeId:               raw.route_id,
    routeName:             raw.route_name,
    congestionLevel:       raw.congestion_level,
    congestionIndex:       raw.congestion_index,
    confidence:            raw.confidence,
    predictedAvgSpeedKmh:  raw.predicted_avg_speed_kmh,
    estimatedClearanceMins: raw.estimated_clearance_minutes ?? raw.estimated_clearance_mins ?? 0,
    contributingFactors:   raw.contributing_factors ?? [],
    predictedAt:           raw.prediction_timestamp ?? raw.predicted_at ?? new Date().toISOString(),
  }
}
