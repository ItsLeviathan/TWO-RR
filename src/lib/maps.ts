/** Finds the coordinates in a Google Maps link: `@lat,lng`, `!3dlat!4dlng`, or `?q=` / `?query=lat,lng`. */
export function coordinatesFromMapUrl(url: string | null): { lat: number; lng: number } | null {
  if (!url) return null;
  const patterns = [/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/, /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/, /[?&](?:q|query|ll)=(-?\d+(?:\.\d+)?)(?:,|%2C)(-?\d+(?:\.\d+)?)/i];
  for (const re of patterns) {
    const m = url.match(re);
    if (!m) continue;
    const lat = Number(m[1]);
    const lng = Number(m[2]);
    if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) return { lat, lng };
  }
  return null;
}

/**
 * Keyless Google Maps embed for the shop: pinned to the coordinates in the map link when it has them,
 * otherwise a search for the address. Null when neither is set.
 */
export function mapEmbedUrl(mapUrl: string | null, address: string | null): string | null {
  const coords = coordinatesFromMapUrl(mapUrl);
  const query = coords ? `${coords.lat},${coords.lng}` : address?.replace(/\s+/g, " ").trim();
  if (!query) return null;
  return `https://www.google.com/maps?q=${encodeURIComponent(query)}&z=17&output=embed`;
}
