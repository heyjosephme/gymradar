import { assessAvailability, assessSuitability, scheduleFor } from './availability.ts';
import { fetchKonamiFacility, konamiFacilityUrl, type KonamiFetchResult } from './konami.ts';
import { konamiOccupancy } from './occupancy.ts';
import { recommend, type Recommendation } from './recommend.ts';
import { parseClock, toJst } from './time.ts';
import type { DaySchedule, FavoriteGym, GymEvaluation, Weather, WorkoutArea, WorkoutPlan } from './types.ts';
import { fetchWeather } from './weather.ts';

export type Dashboard = {
	now: Date;
	plan: WorkoutPlan;
	/** Every favorite gym, in personal priority order. */
	evaluations: GymEvaluation[];
	recommendation: Recommendation;
};

export async function loadDashboard(gyms: readonly FavoriteGym[], plan: WorkoutPlan, now: Date): Promise<Dashboard> {
	const [pages, weather] = await Promise.all([
		Promise.all(gyms.map((gym) => fetchKonamiFacility(gym.konamiFacilityCode))),
		fetchWeather(gyms.map((gym) => gym.coordinates)),
	]);
	const evaluations = gyms.map((gym, index) =>
		evaluateGym({ gym, rank: index + 1, fetched: pages[index], weather: weather[index], now, plan }),
	);
	return { now, plan, evaluations, recommendation: recommend(evaluations, plan) };
}

/** Evaluates one gym from already-fetched data. */
export function evaluateGym(input: {
	gym: FavoriteGym;
	rank: number;
	fetched: KonamiFetchResult;
	weather: Weather | null;
	now: Date;
	plan: WorkoutPlan;
}): GymEvaluation {
	const { gym, fetched, now, plan } = input;
	const jst = toJst(now);
	const sourceUrl = konamiFacilityUrl(gym.konamiFacilityCode);
	const retrievedAt = fetched.ok ? fetched.retrievedAt : null;
	const live = fetched.ok ? fetched.page.live : null;
	const lastUseMinutesBeforeClose = gym.areas[plan.area]?.lastUseMinutesBeforeClose ?? null;
	const schedule: DaySchedule = fetched.ok
		? scheduleFor(fetched.page, jst.date)
		: { kind: 'unknown', detail: `The official page couldn't be loaded (${fetched.error}).` };

	const availability = assessAvailability({
		schedule,
		live,
		nowMinutes: jst.minutes,
		lastUseMinutesBeforeClose,
		sourceUrl,
		retrievedAt,
	});
	return {
		gym,
		rank: input.rank,
		availability,
		suitability: assessSuitability({ schedule, availability, plan, travelMinutes: gym.travel.minutes, lastUseMinutesBeforeClose }),
		occupancy: konamiOccupancy({ gymId: gym.id, live, availability, today: jst.date, now, retrievedAt, sourceUrl }),
		weather: input.weather,
		officialNotes: fetched.ok ? fetched.page.notes : [],
		scheduleNotices: fetched.ok ? fetched.page.scheduleNotices : [],
		closingDaysText: fetched.ok ? fetched.page.closingDaysText : null,
	};
}

/** Reads the plan from the dashboard form's query string, falling back to the defaults. */
export function planFromQuery(
	params: URLSearchParams,
	defaults: { area: WorkoutArea; durationMinutes: number },
	nowMinutes: number,
): WorkoutPlan {
	const area = params.get('area');
	const duration = Number(params.get('duration'));
	const depart = params.get('depart') ?? '';
	// A departure time earlier than now can't be planned, so it means "now".
	const departMinutes = /^([01]\d|2[0-3]):[0-5]\d$/.test(depart) ? Math.max(parseClock(depart), nowMinutes) : nowMinutes;
	return {
		area: area === 'gym' || area === 'pool' ? area : defaults.area,
		durationMinutes: Number.isInteger(duration) && duration >= 15 && duration <= 240 ? duration : defaults.durationMinutes,
		departMinutes,
	};
}
