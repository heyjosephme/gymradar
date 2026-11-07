import type { FavoriteGym, GymOccupancy, Suitability, TravelMode, WorkoutArea } from '../lib/types.ts';
import type { Crowd, Exclusion, Fit, Timing } from './types.ts';

type UnsuitableReason = Extract<Suitability, { kind: 'unsuitable' }>['reason'];

// WMO weather interpretation codes, as documented by Open-Meteo.
const WEATHER: Record<number, string> = {
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

const AREA: Record<WorkoutArea, string> = { gym: 'machine gym', pool: 'pool' };

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
const timing = (t: Timing) =>
	t.kind === 'open' ? 'it is open' : t.kind === 'opens_at' ? `it opens at ${t.time}` : 'it will be open when you arrive';
const fit = (f: Fit) => `your ${f.duration}-minute ${AREA[f.area]} workout fits before the ${AREA[f.area]} closes at ${f.closesAt}`;
const ranked = (gym: string, rank: number) => `${gym} (your #${rank})`;

export const en = {
	dateLocale: 'en-GB',
	joinSentences: (sentences: string[]) => sentences.join(' '),
	gymName: (gym: FavoriteGym) => gym.name,
	area: AREA,
	areaShort: { gym: 'Gym', pool: 'Pool' } satisfies Record<WorkoutArea, string>,
	travelMode: {
		walking: 'on foot',
		bicycling: 'by bike',
		transit: 'by train or bus',
		driving: 'by car',
	} satisfies Record<TravelMode, string>,
	weather: (code: number) => WEATHER[code] ?? 'Unknown conditions',
	minutesAgo: (minutes: number) => {
		if (minutes < 1) return 'just now';
		if (minutes < 60) return `${minutes} min ago`;
		const hours = Math.floor(minutes / 60);
		return minutes % 60 === 0 ? `${hours} h ago` : `${hours} h ${minutes % 60} min ago`;
	},

	schedule: {
		specialClosed: (note: string) => `Official special-hours table: 「${note}」.`,
		specialWithoutHours: (note: string) => `The official special-hours table lists 「${note}」 without usable hours.`,
		outsideCalendar: (date: string) => `${date} is outside the official calendar's range.`,
		regularClosingDay: (rule: string | null) => `Regular closing day on the official calendar${rule ? ` (${rule})` : ''}.`,
		extraClosure: (notice: string | null) =>
			`Marked 臨時休館日 (non-regular closure) on the official calendar${notice ? `: 「${notice}」` : ''}.`,
		noticeClosure: (notice: string) => `Official calendar notice: 「${notice}」.`,
		noticeUnknown: (notice: string) => `The official calendar has a notice for this day that GymRadar can't interpret: 「${notice}」.`,
		holidayDataMissing: (date: string) => `GymRadar's public-holiday data doesn't cover ${date}, so it can't tell which hours apply.`,
		hoursUnreadable: 'The official opening hours could not be read.',
		noHours: (holiday: boolean) => `The official hours list no hours for ${holiday ? 'public holidays' : 'this weekday'}.`,
		severalHours: (holiday: boolean) => `The official hours list several ranges for ${holiday ? 'public holidays' : 'this weekday'}.`,
		pageUnavailable: (error: string) => `The official page couldn't be loaded (${error}).`,
	},

	availability: {
		opensAt: (time: string) => `Opens at ${time}.`,
		closedAt: (time: string) => `Closed at ${time} today.`,
		openUntil: (time: string) => `Open until ${time}.`,
		specialHours: 'Special hours.',
		holidayHours: (holiday: string) => `Holiday hours (${holiday}).`,
		readingOnClosedDay: (asOf: string) => `But Konami's live status shows a reading as of ${asOf}, so it may be open.`,
		outsideHoursWhileOpen: (closesAt: string) =>
			`The official schedule says open until ${closesAt}, but Konami's live status shows 営業時間外 (outside business hours). It may be closed unexpectedly.`,
	},

	suitability: {
		noArea: (area: WorkoutArea) => `This gym has no ${AREA[area]}.`,
		closedBeforeArrival: (closesAt: string, arrival: string) => `Closes at ${closesAt}, and you would arrive at ${arrival}.`,
		notEnoughTime: (area: WorkoutArea, closesAt: string, start: string, available: number, duration: number) =>
			`The ${AREA[area]} closes at ${closesAt}. Starting at ${start} leaves ${available} of your planned ${duration} minutes.`,
	},

	occupancy: {
		closed: 'Closed now, so occupancy does not apply.',
		pageUnavailable: 'The official page could not be loaded.',
		noWidget: "This facility's page has no occupancy display.",
		outsideHours: 'Konami reports 営業時間外 (outside business hours).',
		unrecognized: (text: string) => `Unrecognized occupancy display: ${text}`,
		futureTimestamp: (asOf: string) => `The official timestamp (${asOf}) is ahead of the current time, so its freshness is unknown.`,
	},

	occupancyLabel: {
		quiet: 'Quiet',
		moderate: 'Moderate',
		busy: 'Busy',
		not_applicable: 'Not applicable',
		unknown: 'Unknown',
	} satisfies Record<GymOccupancy['status'], string>,

	source: {
		official_realtime: { short: 'Official', long: 'Official, real time' },
		official_periodic: { short: 'Official', long: 'Official, from check-ins, updated about every 30 minutes' },
		official_prediction: { short: 'Forecast', long: 'Official forecast' },
		personal_observation: { short: 'You', long: 'Your observation' },
		unknown: { short: 'No source', long: 'No occupancy source' },
	} satisfies Record<GymOccupancy['source'], { short: string; long: string }>,

	badge: {
		openNow: 'Open now',
		opensAt: (time: string | null) => `Opens ${time}`,
		closedForToday: 'Closed for today',
		closedToday: 'Closed today',
		conflicting: 'Conflicting signals',
		unconfirmed: 'Unconfirmed',
		fits: 'Fits your workout',
		checkBeforeGoing: 'Check before going',
		unsuitable: {
			regular_closing_day: 'Regular closing day',
			special_closure: 'Special closure',
			temporary_closure: 'Temporary closure',
			outside_operating_hours: 'Closed before you arrive',
			facility_unavailable: 'Area not available',
			insufficient_time: 'Not enough time',
		} satisfies Record<UnsuitableReason, string>,
	},

	explain: {
		remainsTop: (gym: string) => `${gym} remains your top choice.`,
		promoted: (gym: string, rank: number) => `${ranked(gym, rank)} has automatically become your top recommendation.`,
		busy: (t: Timing, crowd: Crowd) =>
			`Although it is currently busy (official level ${crowd.level} of 3 as of ${crowd.asOf}), ${timing(t)} and matches your personal preference.`,
		calm: (t: Timing, crowd: Crowd) =>
			`${capitalize(timing(t))} and currently ${crowd.status === 'quiet' ? 'quiet' : 'moderately busy'} (official level ${crowd.level} of 3 as of ${crowd.asOf}).`,
		fits: (f: Fit) => `${capitalize(fit(f))}.`,
		openAndFits: (t: Timing, f: Fit) => `${capitalize(timing(t))}, and ${fit(f)}.`,
		withoutOccupancy: 'This recommendation was made without current occupancy information.',
		staleReading: (level: number, asOf: string) => `The latest official reading (level ${level} of 3 as of ${asOf}) is stale.`,
		noOccupancyData: 'No occupancy data is available.',
		unconfirmed: (gym: string, rank: number | null, detail: string) =>
			`${rank === null ? gym : ranked(gym, rank)} is your highest-priority gym that isn't confirmed closed, but its availability couldn't be confirmed. ${detail} Check before going.`,
		confirmedAlternative: (gym: string, rank: number) => `${ranked(gym, rank)} is your highest-priority confirmed option.`,
		noConfirmedAlternative: 'None of your other gyms is confirmed suitable either.',
		latestReading: (level: number, asOf: string) => `Its latest official occupancy reading is level ${level} of 3 as of ${asOf}.`,
		excluded: (gym: string, why: Exclusion) => {
			switch (why.kind) {
				case 'regular_closing_day':
					return `${gym} is closed today (regular closing day).`;
				case 'special_closure':
					return `${gym} is closed today (special closure).`;
				case 'temporary_closure':
					return `${gym} is closed today (temporary closure).`;
				case 'closed_for_today':
					return `${gym} has closed for today (it closed at ${why.closedAt}).`;
				case 'closed_by_arrival':
					return `${gym} is closed by the time you would arrive (it closes at ${why.closesAt}).`;
				case 'no_area':
					return `${gym} has no ${AREA[why.area]}.`;
				case 'not_enough_time':
					return `${gym} is unavailable for your planned workout because its ${AREA[why.area]} closes at ${why.closesAt}, too early for ${why.duration} minutes.`;
			}
		},
		noneFits: (duration: number, area: WorkoutArea, departAt: string) =>
			`None of your gyms fits a ${duration}-minute ${AREA[area]} workout leaving at ${departAt}.`,
		noGyms: 'No favorite gyms are configured.',
	},

	ui: {
		themeToggle: 'Toggle dark mode',
		languages: 'Language',
		holiday: (name: string) => `${name} · holiday`,
		workout: 'Workout',
		minutes: 'Minutes',
		leaveAt: 'Leave at',
		blankIsNow: 'blank = now',
		update: 'Update',
		nextUp: 'Next up',
		planSummary: (duration: number, area: WorkoutArea, leaving: string) => `${duration} min ${AREA[area]} · ${leaving}`,
		leaveNow: 'leave now',
		leaveAtTime: (time: string) => `leave at ${time}`,
		noGymFits: 'No gym fits this plan',
		areaCloses: (area: string) => `${area} closes`,
		occupancy: 'Occupancy',
		travelBy: (mode: string) => `Travel ${mode}`,
		weather: 'Weather',
		unavailable: 'Unavailable',
		yourGyms: 'Your gyms',
		yourGymsNote: 'In your priority order. Conditions never change it.',
		notAvailable: 'Not available for this workout',
		notAvailableNote: "Closed, or the workout doesn't fit.",
		noFavorites: 'No favorite gyms yet. Add them, in order of preference, in src/config/gyms.ts.',
		columns: { gym: 'Gym', today: 'Today', occupancy: 'Occupancy', travel: 'Travel', weather: 'Weather' },
		personalPriority: 'Personal priority',
		officialPageFor: (gym: string) => `Official page for ${gym}`,
		detailsFor: (gym: string) => `Details for ${gym}`,
		noArea: (area: WorkoutArea) => `No ${AREA[area]}`,
		areaUntil: (area: string, time: string) => `${area} until ${time}`,
		travelMinutes: (minutes: number) => `${minutes} min`,
		rainChance: 'chance of rain in the next 3 hours',
		stale: 'Stale',
		noReading: 'No reading',
		timeUnknown: 'time unknown',
		details: {
			availability: 'Availability',
			workout: 'Your workout',
			occupancy: 'Occupancy',
			weather: 'Weather',
			notices: 'Official notices that may change hours',
			notes: 'Official notes',
			directions: 'Directions',
			officialPage: 'Official page',
			fetchedAt: (time: string) => `Fetched ${time}`,
			notFetched: 'Official page could not be fetched',
			startAt: (start: string, waits: boolean, minutes: number, area: WorkoutArea) =>
				`Start ${start}${waits ? ' when it opens' : ''}, with ${minutes} min until the ${AREA[area]} closes.`,
			source: (source: string) => `${source}.`,
			readingAt: (time: string, ago: string) => `Reading as of ${time} (${ago}).`,
			staleNote: 'Stale: it may not reflect current crowding.',
			weatherLine: (description: string, temperature: string, chance: string, time: string) =>
				`${description}, ${temperature} °C, ${chance}% chance of rain in the next 3 hours (Open-Meteo, ${time}).`,
		},
		about: 'About the data',
		aboutItems: [
			"Occupancy is Konami's official 館内利用状況, calculated from check-ins (not a head count): 3 levels, updated about every 30 minutes, and it can differ from actual conditions. Readings older than 60 minutes are marked stale.",
			"Hours and closures come from each club's official page and the Cabinet Office holiday list. Days without official hours are unconfirmed, never assumed open.",
			'Travel times are your own estimates. Weather is from Open-Meteo.',
			'Details and limitations: docs/konami-data-sources.md.',
		],
	},
};

export type Messages = typeof en;
