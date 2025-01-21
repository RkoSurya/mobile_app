export const calculateHaversineDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // Earth's radius in kilometers

  const toRad = (value: number): number => (value * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c * 1000; // Convert to meters

  // Round to 2 decimal places
  return Math.round(distance * 100) / 100;
};

export const updateDistanceInLocation = (
  currentLocation: {
    latitude: number;
    longitude: number;
  },
  previousLocation?: {
    latitude: number;
    longitude: number;
  }
): number => {
  if (!previousLocation) return 0;

  const distance = calculateHaversineDistance(
    previousLocation.latitude,
    previousLocation.longitude,
    currentLocation.latitude,
    currentLocation.longitude
  );

  // Only count distances greater than 2 meters to filter out GPS noise
  // but less than 100 meters to filter out potential GPS jumps
  if (distance > 2 && distance < 100) {
    return distance;
  }
  return 0;
};
