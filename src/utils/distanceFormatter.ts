export const formatDistance = (distanceInMeters: number, forceUnit?: 'km' | 'm'): string => {
  if (forceUnit === 'km' || (!forceUnit && distanceInMeters >= 1000)) {
    return `${(distanceInMeters / 1000)} km`;
  }
  return `${distanceInMeters} m`;
};
