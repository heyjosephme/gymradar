import type { Weather } from './types.ts';

// Open-Meteo (https://open-meteo.com): free for non-commercial use, no API key.
const API = 'https://api.open-meteo.com/v1/forecast';
const CACHE_MS = 10 * 60_000;
const FAILURE_CACHE_MS = 60_000;
let cache: { url: string; result: (Weather | null)[]; expiresAt: number } | null = null;

// WMO weather interpretation codes, as documented by Open-Meteo.
const DESCRIPTIONS: Record<number, string> = {
	0: 'Clear',
	1: 'Mainly clear',
	2: 'Partly cloudy',
	3: 'Overcast',
	45: 'Fog',
	48: 'Fog',
	51: 'Light drizzle',
	53: 'Drizzle',
	55: 'Heavy drizzle',
	56: 'Freezing drizzle',
	57: 'Freezing drizzle',
	61: 'Light rain',
	63: 'Rain',
	65: 'Heavy rain',
	66: 'Freezing rain',
	67: 'Freezing rain',
	71: 'Light snow',
	73: 'Snow',
	75: 'Heavy snow',
	77: 'Snow grains',
	80: 'Light showers',
	81: 'Showers',
	82: 'Heavy showers',
	85: 'Snow showers',
	86: 'Heavy snow showers',
	95: 'Thunderstorm',
	96: 'Thunderstorm with hail',
	99: 'Thunderstorm with hail',
};

type OpenMeteoLocation = {
	current?: { time?: string; temperature_2m?: number; weather_code?: number };
	hourly?: { precipitation_probability?: (number | null)[] };
};

/** Current weather at each location, in the same order; null entries where it is unavailable. */
export async function fetchWeather(locations: readonly { latitude: number; longitude: number }[]): Promise<(Weather | null)[]> {
	if (locations.length === 0) return [];
	const params = new URLSearchParams({
		latitude: locations.map((location) => location.latitude).join(','),
		longitude: locations.map((location) => location.longitude).join(','),
		current: 'temperature_2m,weather_code',
		hourly: 'precipitation_probability',
		forecast_hours: '3',
		timezone: 'Asia/Tokyo',
	});
	const url = `${API}?${params}`;
	if (cache && cache.url === url && cache.expiresAt > Date.now()) return cache.result;

	let result: (Weather | null)[];
	try {
		const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
		if (!response.ok) throw new Error(`HTTP ${response.status}`);
		const body: OpenMeteoLocation | OpenMeteoLocation[] = await response.json();
		// A single location returns an object; several return an array in request order.
		const items = Array.isArray(body) ? body : [body];
		const retrievedAt = new Date().toISOString();
		result = locations.map((_, index) => toWeather(items[index], retrievedAt));
	} catch {
		result = locations.map(() => null);
	}
	cache = { url, result, expiresAt: Date.now() + (result.some(Boolean) ? CACHE_MS : FAILURE_CACHE_MS) };
	return result;
}

function toWeather(item: OpenMeteoLocation | undefined, retrievedAt: string): Weather | null {
	const current = item?.current;
	if (!current?.time || typeof current.temperature_2m !== 'number' || typeof current.weather_code !== 'number') return null;
	const chances = (item?.hourly?.precipitation_probability ?? []).filter((value) => typeof value === 'number');
	return {
		description: DESCRIPTIONS[current.weather_code] ?? 'Unknown conditions',
		temperatureC: current.temperature_2m,
		precipitationChanceNext3h: chances.length > 0 ? Math.max(...chances) : null,
		// Times are Asia/Tokyo local time without an offset, as requested above.
		observedAt: new Date(`${current.time}:00+09:00`).toISOString(),
		retrievedAt,
		sourceUrl: 'https://open-meteo.com/',
	};
}
