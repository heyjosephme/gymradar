import type { ClockTime } from './time.ts';

export type WorkoutArea = 'gym' | 'pool';
export type TravelMode = 'walking' | 'bicycling' | 'transit' | 'driving';

export type FavoriteGym = {
	id: string;
	name: string;
	/** Name shown in the Japanese UI. Defaults to `name`. */
	nameJa?: string;
	/** The code in the official page URL: https://information.konamisportsclub.jp/ksc/{code}/ */
	konamiFacilityCode: string;
	coordinates: { latitude: number; longitude: number };
	/** Your usual door-to-door time. GymRadar does not compute routes. */
	travel: { minutes: number; mode: TravelMode };
	/**
	 * Workout areas this gym has, each with its last-use time relative to the club's closing time,
	 * taken from the official page's notes. Areas not listed are treated as unavailable at this gym.
	 */
	areas: Partial<Record<WorkoutArea, { lastUseMinutesBeforeClose: number }>>;
};

export type WorkoutPlan = {
	area: WorkoutArea;
	durationMinutes: number;
	/** Departure time today, in minutes since midnight (Japan time). */
	departMinutes: number;
};

export type ClosureReason = 'regular_closing_day' | 'special_closure' | 'temporary_closure';

/** A gym's official schedule for one day. */
export type DaySchedule =
	| {
			kind: 'open';
			opensAt: ClockTime;
			closesAt: ClockTime;
			basis: 'regular_hours' | 'special_hours';
			holidayName: string | null;
	  }
	| { kind: 'closed'; reason: ClosureReason; detail: string }
	| { kind: 'unknown'; detail: string };

/** Whether the gym is open right now, and today's hours. */
export type GymAvailability = {
	status: 'open' | 'closed' | 'unknown';
	reason:
		| ClosureReason
		| 'within_hours'
		| 'before_opening'
		| 'after_closing'
		| 'schedule_unknown'
		| 'conflicting_signals';
	detail: string;
	openingTime: ClockTime | null;
	closingTime: ClockTime | null;
	/** When the planned workout area stops being usable (e.g. last machine-gym use), if known. */
	facilityClosingTime: ClockTime | null;
	sourceUrl: string;
	/** When GymRadar fetched the official page (ISO 8601), or null if it could not be fetched. */
	retrievedAt: string | null;
};

/** Whether the planned workout fits at this gym today. */
export type Suitability =
	| {
			kind: 'suitable';
			startAt: ClockTime;
			facilityClosingTime: ClockTime;
			minutesAvailable: number;
			waitsForOpening: boolean;
	  }
	| {
			kind: 'unsuitable';
			reason: ClosureReason | 'outside_operating_hours' | 'facility_unavailable' | 'insufficient_time';
			detail: string;
	  }
	| { kind: 'unknown'; detail: string };

export type GymOccupancy = {
	gymId: string;
	/**
	 * GymRadar's label for the official reading. Konami publishes a 3-level scale, mapped to
	 * quiet/moderate/busy (see docs/konami-data-sources.md); there is no finer resolution.
	 */
	status: 'quiet' | 'moderate' | 'busy' | 'not_applicable' | 'unknown';
	/** The official representation: level N of 3 (pictogram with N of 3 figures lit). */
	officialLevel: 1 | 2 | 3 | null;
	source: 'official_realtime' | 'official_periodic' | 'official_prediction' | 'personal_observation' | 'unknown';
	/** When the reading describes the gym (the page's 「HH:MM現在」), if known. ISO 8601. */
	observedAt: string | null;
	/** When GymRadar fetched the page. ISO 8601. */
	retrievedAt: string | null;
	confidence: 'high' | 'medium' | 'low' | 'unknown';
	stale: boolean;
	sourceUrl: string;
	note: string | null;
};

export type Weather = {
	/** WMO weather interpretation code; the UI words it per language. */
	code: number;
	temperatureC: number;
	/** Highest hourly chance of precipitation over the next 3 hours, in percent. */
	precipitationChanceNext3h: number | null;
	/** The time the current conditions describe (forecast model time, ISO 8601). */
	observedAt: string;
	retrievedAt: string;
	sourceUrl: string;
};

export type GymEvaluation = {
	gym: FavoriteGym;
	/** Personal priority: 1 is your first choice. Comes from the config order, never from conditions. */
	rank: number;
	availability: GymAvailability;
	suitability: Suitability;
	occupancy: GymOccupancy;
	weather: Weather | null;
	/** Official free-text notes from the hours section, e.g. last-use times for areas. */
	officialNotes: { title: string; text: string }[];
	/** Official news titles that may announce hours changes. Shown, not interpreted. */
	scheduleNotices: string[];
	closingDaysText: string | null;
};
