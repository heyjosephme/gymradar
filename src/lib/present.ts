import { jstClock } from './time.ts';
import type { GymAvailability, GymOccupancy, Suitability, TravelMode, WorkoutArea } from './types.ts';

// How evaluations are worded and badged on the dashboard. Every badge pairs an icon with a
// label, so meaning never depends on color alone.

export type Badge = {
	tone: 'good' | 'warning' | 'critical' | 'neutral';
	icon: 'check' | 'x' | 'alert' | 'help' | 'clock';
	label: string;
};

export function availabilityBadge(availability: GymAvailability): Badge {
	switch (availability.reason) {
		case 'within_hours':
			return { tone: 'good', icon: 'check', label: 'Open now' };
		case 'before_opening':
			return { tone: 'neutral', icon: 'clock', label: `Opens ${availability.openingTime}` };
		case 'after_closing':
			return { tone: 'critical', icon: 'x', label: 'Closed for today' };
		case 'regular_closing_day':
		case 'special_closure':
		case 'temporary_closure':
			return { tone: 'critical', icon: 'x', label: 'Closed today' };
		case 'conflicting_signals':
			return { tone: 'warning', icon: 'alert', label: 'Conflicting signals' };
		case 'schedule_unknown':
			return { tone: 'warning', icon: 'help', label: 'Unconfirmed' };
	}
}

const UNSUITABLE_LABEL: Record<Extract<Suitability, { kind: 'unsuitable' }>['reason'], string> = {
	regular_closing_day: 'Regular closing day',
	special_closure: 'Special closure',
	temporary_closure: 'Temporary closure',
	outside_operating_hours: 'Closed before you arrive',
	facility_unavailable: 'Area not available',
	insufficient_time: 'Not enough time',
};

export function suitabilityBadge(suitability: Suitability): Badge {
	switch (suitability.kind) {
		case 'suitable':
			return { tone: 'good', icon: 'check', label: 'Fits your workout' };
		case 'unsuitable':
			return { tone: 'critical', icon: 'x', label: UNSUITABLE_LABEL[suitability.reason] };
		case 'unknown':
			return { tone: 'warning', icon: 'help', label: 'Unconfirmed' };
	}
}

export const OCCUPANCY_LABEL: Record<GymOccupancy['status'], string> = {
	quiet: 'Quiet',
	moderate: 'Moderate',
	busy: 'Busy',
	not_applicable: 'Not applicable',
	unknown: 'Unknown',
};

export const SOURCE_LABEL: Record<GymOccupancy['source'], { short: string; long: string }> = {
	official_realtime: { short: 'Official', long: 'Official, real time' },
	official_periodic: { short: 'Official', long: 'Official, from check-ins, updated about every 30 minutes' },
	official_prediction: { short: 'Forecast', long: 'Official forecast' },
	personal_observation: { short: 'You', long: 'Your observation' },
	unknown: { short: 'No source', long: 'No occupancy source' },
};

/** "18:00 · 12 min ago", or null when the reading has no trustworthy timestamp. */
export function observedText(occupancy: GymOccupancy, now: Date): string | null {
	return occupancy.observedAt ? `${jstClock(occupancy.observedAt)} · ${minutesAgo(occupancy.observedAt, now)}` : null;
}

export function minutesAgo(instant: string, now: Date): string {
	const minutes = Math.round((now.getTime() - new Date(instant).getTime()) / 60_000);
	if (minutes < 1) return 'just now';
	if (minutes < 60) return `${minutes} min ago`;
	const hours = Math.floor(minutes / 60);
	return minutes % 60 === 0 ? `${hours} h ago` : `${hours} h ${minutes % 60} min ago`;
}

/** Area names short enough for the board's columns. */
export const AREA_SHORT_LABEL: Record<WorkoutArea, string> = { gym: 'Gym', pool: 'Pool' };

export const TRAVEL_MODE_LABEL: Record<TravelMode, string> = {
	walking: 'on foot',
	bicycling: 'by bike',
	transit: 'by train or bus',
	driving: 'by car',
};

export function directionsUrl(coordinates: { latitude: number; longitude: number }, mode: TravelMode): string {
	const destination = `${coordinates.latitude},${coordinates.longitude}`;
	return `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=${mode}`;
}
