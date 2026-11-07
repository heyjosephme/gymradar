import type { Messages } from '../i18n/index.ts';
import { jstClock } from './time.ts';
import type { GymAvailability, GymOccupancy, Suitability, TravelMode } from './types.ts';

// How evaluations are badged on the dashboard. Every badge pairs an icon with a label, so meaning
// never depends on color alone.

export type Badge = {
	tone: 'good' | 'warning' | 'critical' | 'neutral';
	icon: 'check' | 'x' | 'alert' | 'help' | 'clock';
	label: string;
};

export function availabilityBadge(availability: GymAvailability, m: Messages): Badge {
	switch (availability.reason) {
		case 'within_hours':
			return { tone: 'good', icon: 'check', label: m.badge.openNow };
		case 'before_opening':
			return { tone: 'neutral', icon: 'clock', label: m.badge.opensAt(availability.openingTime) };
		case 'after_closing':
			return { tone: 'critical', icon: 'x', label: m.badge.closedForToday };
		case 'regular_closing_day':
		case 'special_closure':
		case 'temporary_closure':
			return { tone: 'critical', icon: 'x', label: m.badge.closedToday };
		case 'conflicting_signals':
			return { tone: 'warning', icon: 'alert', label: m.badge.conflicting };
		case 'schedule_unknown':
			return { tone: 'warning', icon: 'help', label: m.badge.unconfirmed };
	}
}

export function suitabilityBadge(suitability: Suitability, m: Messages): Badge {
	switch (suitability.kind) {
		case 'suitable':
			return { tone: 'good', icon: 'check', label: m.badge.fits };
		case 'unsuitable':
			return { tone: 'critical', icon: 'x', label: m.badge.unsuitable[suitability.reason] };
		case 'unknown':
			return { tone: 'warning', icon: 'help', label: m.badge.unconfirmed };
	}
}

/** "18:00 · 12 min ago", or null when the reading has no trustworthy timestamp. */
export function observedText(occupancy: GymOccupancy, now: Date, m: Messages): string | null {
	return occupancy.observedAt ? `${jstClock(occupancy.observedAt)} · ${minutesAgo(occupancy.observedAt, now, m)}` : null;
}

export function minutesAgo(instant: string, now: Date, m: Messages): string {
	return m.minutesAgo(Math.round((now.getTime() - new Date(instant).getTime()) / 60_000));
}

export function directionsUrl(coordinates: { latitude: number; longitude: number }, mode: TravelMode): string {
	const destination = `${coordinates.latitude},${coordinates.longitude}`;
	return `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=${mode}`;
}
