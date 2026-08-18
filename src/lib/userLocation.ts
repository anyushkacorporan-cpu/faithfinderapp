import * as Location from 'expo-location';

export async function getCurrentCityState(): Promise<{ city: string; state: string } | null> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return null;
    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    const { latitude, longitude } = loc.coords;
    const geo = await Location.reverseGeocodeAsync({ latitude, longitude });
    if (geo[0]) {
      const city = geo[0].city || geo[0].subregion || '';
      const state = geo[0].region || '';
      if (city) return { city, state };
    }
    return null;
  } catch {
    return null;
  }
}
