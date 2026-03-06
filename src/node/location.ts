/**
 * Location node capability — handle location.get from gateway.
 */

import * as Location from 'expo-location';
import { LocationGetParams, LocationGetResult } from '../gateway/protocol';

export async function handleLocationGet(params: unknown): Promise<LocationGetResult> {
  const p = (params ?? {}) as LocationGetParams;

  // Request permission
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('Location permission denied');
  }

  const accuracy = accuracyForParam(p.accuracy);
  const location = await Location.getCurrentPositionAsync({ accuracy });

  return {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
    altitude: location.coords.altitude ?? undefined,
    accuracy: location.coords.accuracy ?? undefined,
    heading: location.coords.heading ?? undefined,
    speed: location.coords.speed ?? undefined,
    timestamp: location.timestamp,
  };
}

function accuracyForParam(
  param: LocationGetParams['accuracy'],
): Location.Accuracy {
  switch (param) {
    case 'high':
      return Location.Accuracy.High;
    case 'medium':
      return Location.Accuracy.Balanced;
    case 'low':
    default:
      return Location.Accuracy.Low;
  }
}
