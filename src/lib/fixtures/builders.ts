// Builders for tests: synthetic Konami pages and evaluated gyms.
import { en, type Messages } from '../../i18n/index.ts';
import { evaluateGym } from '../dashboard.ts';
import type { KonamiCalendarDay, KonamiFacilityPage } from '../konami.ts';
import { parseClock } from '../time.ts';
import type { FavoriteGym, GymEvaluation, WorkoutPlan } from '../types.ts';

/** Wednesday 4 November 2026, an ordinary weekday. */
export const WEDNESDAY = '2026-11-04';

export const at = (date: string, time: string) => new Date(`${date}T${time}:00+09:00`);

/**
 * A club open 10:00–23:00 on weekdays and 10:00–21:00 on weekends and holidays, all November.
 * It has no occupancy widget unless `live` is given.
 */
export function konamiPage(overrides: Partial<KonamiFacilityPage> = {}): KonamiFacilityPage {
	const calendar: Record<string, KonamiCalendarDay> = {};
	for (let day = 1; day <= 30; day++) calendar[`2026-11-${String(day).padStart(2, '0')}`] = { closure: null, notice: null };
	return {
		live: { kind: 'absent' },
		calendar,
		specialDays: {},
		regularHours: [
			{ weekdays: [1, 2, 3, 4, 5], holidays: false, opensAt: '10:00', closesAt: '23:00' },
			{ weekdays: [0, 6], holidays: true, opensAt: '10:00', closesAt: '21:00' },
		],
		notes: [],
		closingDaysText: '毎週火曜日、お盆、年末年始等',
		scheduleNotices: [],
		...overrides,
	};
}

/** The same page, closed on `date` as a regular closing day. */
export function closedOn(date: string, page = konamiPage()): KonamiFacilityPage {
	return { ...page, calendar: { ...page.calendar, [date]: { closure: 'regular', notice: null } } };
}

export function favoriteGym(name: string, overrides: Partial<FavoriteGym> = {}): FavoriteGym {
	return {
		id: name.toLowerCase().replace(/\s+/g, '-'),
		name,
		konamiFacilityCode: '004446',
		coordinates: { latitude: 35.65, longitude: 139.69 },
		travel: { minutes: 10, mode: 'walking' },
		areas: { gym: { lastUseMinutesBeforeClose: 10 }, pool: { lastUseMinutesBeforeClose: 10 } },
		...overrides,
	};
}

export function plan(depart: string, overrides: Partial<WorkoutPlan> = {}): WorkoutPlan {
	return { area: 'gym', durationMinutes: 60, departMinutes: parseClock(depart), ...overrides };
}

/** Evaluates gyms in priority order. A `null` page stands for an official page that failed to load. */
export function evaluateAll(
	gyms: { gym: FavoriteGym; page: KonamiFacilityPage | null }[],
	now: Date,
	workout: WorkoutPlan,
	messages: Messages = en,
): GymEvaluation[] {
	return gyms.map(({ gym, page }, index) =>
		evaluateGym({
			gym,
			rank: index + 1,
			fetched: page ? { ok: true, page, retrievedAt: now } : { ok: false, error: 'HTTP 503' },
			weather: null,
			now,
			plan: workout,
			messages,
		}),
	);
}
