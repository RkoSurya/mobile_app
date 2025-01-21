export const formatDistance = (distanceInMeters: number, forceUnit?: 'km' | 'm'): string => {
  if (forceUnit === 'km' || (!forceUnit && distanceInMeters >= 1000)) {
    return `${(distanceInMeters / 1000).toFixed(2)} km`;
  }
  return `${Math.round(distanceInMeters)} m`;
};
