/**
 * Weather & Wet Surface Safety Assessment Service
 */

export const WEATHER_CONDITIONS = {
  clear: {
    id: 'clear',
    label: 'Clear & Dry',
    icon: 'Sun',
    tractionScore: 100,
    stoppingDistanceMultiplier: 1.0,
    bikePenalty: 0,
    carPenalty: 0,
    warning: 'Optimal road conditions. Maximum tire grip available.',
    color: '#34C759'
  },
  rain: {
    id: 'rain',
    label: 'Rain & Wet Road',
    icon: 'CloudRain',
    tractionScore: 68,
    stoppingDistanceMultiplier: 1.8,
    bikePenalty: 25,
    carPenalty: 12,
    warning: 'Wet surface increases braking distance by ~80%. Watch for painted line slip & hydroplaning.',
    color: '#007AFF'
  },
  night: {
    id: 'night',
    label: 'Night / Low Light',
    icon: 'Moon',
    tractionScore: 90,
    stoppingDistanceMultiplier: 1.2,
    bikePenalty: 15,
    carPenalty: 8,
    warning: 'Reduced peripheral vision and reaction time. Use low beams and keep headlights clean.',
    color: '#AF52DE'
  }
};

export function calculateWeatherAdjustedSafety(baseScore, weatherId, vehicleType) {
  const cond = WEATHER_CONDITIONS[weatherId] || WEATHER_CONDITIONS.clear;
  const penalty = vehicleType === 'bike' ? cond.bikePenalty : cond.carPenalty;
  const adjusted = Math.max(20, Math.min(100, baseScore - penalty));
  return {
    adjustedScore: adjusted,
    stoppingDistanceMultiplier: cond.stoppingDistanceMultiplier,
    warning: cond.warning,
    penalty
  };
}
