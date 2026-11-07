import { japaneseHolidayName } from './holidays.ts';
import type { KonamiFacilityPage, KonamiLiveStatus } from './konami.ts';
import { formatClock, parseClock, weekdayOf, type IsoDate } from './time.ts';
import type { ClosureReason, DaySchedule, GymAvailability, Suitability, WorkoutArea, WorkoutPlan } from './types.ts';

export const AREA_LABEL: Record<WorkoutArea, string> = { gym: 'machine gym', pool: 'pool' };

/**
 * The official schedule for `date`. A day counts as open only when an official source gives
 * hours for it. Not being marked closed is never enough.
 */
export function scheduleFor(page: KonamiFacilityPage, date: IsoDate): DaySchedule {
	const special = page.specialDays[date];
	const day = page.calendar[date];
	const holidayName = japaneseHolidayName(date);

	if (special) {
		if (special.status === 'closed') {
			return {
				kind: 'closed',
				reason: closureReason(day?.closure ?? null, special.note),
				detail: `Official special-hours table: 「${special.note}」.`,
			};
		}
		if (special.status !== 'unrecognized' && special.opensAt && special.closesAt) {
			return {
				kind: 'open',
				opensAt: special.opensAt,
				closesAt: special.closesAt,
				basis: special.status === 'special' ? 'special_hours' : 'regular_hours',
				holidayName: holidayName ?? null,
			};
		}
		// A normal-business row without hours falls through to the regular hours.
		if (special.status !== 'normal') {
			return { kind: 'unknown', detail: `The official special-hours table lists 「${special.note}」 without usable hours.` };
		}
	}

	if (!day) return { kind: 'unknown', detail: `${date} is outside the official calendar's range.` };
	if (day.closure === 'regular') {
		const rule = page.closingDaysText ? ` (${page.closingDaysText})` : '';
		return { kind: 'closed', reason: 'regular_closing_day', detail: `Regular closing day on the official calendar${rule}.` };
	}
	if (day.closure === 'extra') {
		return {
			kind: 'closed',
			reason: closureReason('extra', day.notice ?? ''),
			detail: `Marked 臨時休館日 (non-regular closure) on the official calendar${day.notice ? `: 「${day.notice}」` : ''}.`,
		};
	}
	if (day.notice !== null) {
		// Closure notices aren't always marked as closed days, e.g. 「休館日となります。」.
		if (/休館日?となります/.test(day.notice)) {
			return { kind: 'closed', reason: closureReason(null, day.notice), detail: `Official calendar notice: 「${day.notice}」.` };
		}
		return { kind: 'unknown', detail: `The official calendar has a notice for this day that GymRadar can't interpret: 「${day.notice}」.` };
	}

	if (holidayName === undefined) {
		return { kind: 'unknown', detail: `GymRadar's public-holiday data doesn't cover ${date}, so it can't tell which hours apply.` };
	}
	if (!page.regularHours) return { kind: 'unknown', detail: 'The official opening hours could not be read.' };
	// On public holidays the 「祝休日」 range applies, whatever the weekday.
	const weekday = weekdayOf(date);
	const rules = page.regularHours.filter((rule) => (holidayName ? rule.holidays : rule.weekdays.includes(weekday)));
	if (rules.length !== 1) {
		const dayType = holidayName ? 'public holidays' : 'this weekday';
		return {
			kind: 'unknown',
			detail: rules.length === 0 ? `The official hours list no hours for ${dayType}.` : `The official hours list several ranges for ${dayType}.`,
		};
	}
	return { kind: 'open', opensAt: rules[0].opensAt, closesAt: rules[0].closesAt, basis: 'regular_hours', holidayName };
}

function closureReason(calendarClosure: 'regular' | 'extra' | null, text: string): ClosureReason {
	if (calendarClosure === 'regular') return 'regular_closing_day';
	if (/年末年始|お盆|夏季|特別/.test(text)) return 'special_closure';
	if (calendarClosure === 'extra' || /臨時/.test(text)) return 'temporary_closure';
	return 'regular_closing_day';
}

/**
 * Whether the gym is open now. The official schedule decides. Konami's live widget is only a
 * cross-check: if it contradicts the schedule, the status is unknown rather than either one.
 */
export function assessAvailability(input: {
	schedule: DaySchedule;
	live: KonamiLiveStatus | null;
	nowMinutes: number;
	/** Null when the gym doesn't have the planned area. */
	lastUseMinutesBeforeClose: number | null;
	sourceUrl: string;
	retrievedAt: Date | null;
}): GymAvailability {
	const { schedule, live, nowMinutes } = input;
	const base = {
		openingTime: null,
		closingTime: null,
		facilityClosingTime: null,
		sourceUrl: input.sourceUrl,
		retrievedAt: input.retrievedAt?.toISOString() ?? null,
	};
	if (schedule.kind === 'unknown') return { ...base, status: 'unknown', reason: 'schedule_unknown', detail: schedule.detail };
	if (schedule.kind === 'closed') {
		if (live?.kind === 'reading') {
			return {
				...base,
				status: 'unknown',
				reason: 'conflicting_signals',
				detail: `${schedule.detail} But Konami's live status shows a reading as of ${live.asOf}, so it may be open.`,
			};
		}
		return { ...base, status: 'closed', reason: schedule.reason, detail: schedule.detail };
	}

	const closes = parseClock(schedule.closesAt);
	const hours = {
		...base,
		openingTime: schedule.opensAt,
		closingTime: schedule.closesAt,
		facilityClosingTime:
			input.lastUseMinutesBeforeClose === null ? null : formatClock(closes - input.lastUseMinutesBeforeClose),
	};
	const hoursKind = schedule.basis === 'special_hours' ? ' Special hours.' : schedule.holidayName ? ` Holiday hours (${schedule.holidayName}).` : '';
	if (nowMinutes < parseClock(schedule.opensAt)) {
		return { ...hours, status: 'closed', reason: 'before_opening', detail: `Opens at ${schedule.opensAt}.${hoursKind}` };
	}
	if (nowMinutes >= closes) {
		return { ...hours, status: 'closed', reason: 'after_closing', detail: `Closed at ${schedule.closesAt} today.${hoursKind}` };
	}
	if (live?.kind === 'outside_hours') {
		return {
			...hours,
			status: 'unknown',
			reason: 'conflicting_signals',
			detail: `The official schedule says open until ${schedule.closesAt}, but Konami's live status shows 営業時間外 (outside business hours). It may be closed unexpectedly.`,
		};
	}
	return { ...hours, status: 'open', reason: 'within_hours', detail: `Open until ${schedule.closesAt}.${hoursKind}` };
}

/** Whether the planned workout fits in today's hours, from departure through the area's last-use time. */
export function assessSuitability(input: {
	schedule: DaySchedule;
	availability: GymAvailability;
	plan: WorkoutPlan;
	travelMinutes: number;
	/** Null when the gym doesn't have the planned area. */
	lastUseMinutesBeforeClose: number | null;
}): Suitability {
	const { schedule, availability, plan } = input;
	if (availability.reason === 'conflicting_signals') return { kind: 'unknown', detail: availability.detail };
	if (schedule.kind === 'unknown') return { kind: 'unknown', detail: schedule.detail };
	if (schedule.kind === 'closed') return { kind: 'unsuitable', reason: schedule.reason, detail: schedule.detail };
	const area = AREA_LABEL[plan.area];
	if (input.lastUseMinutesBeforeClose === null) {
		return { kind: 'unsuitable', reason: 'facility_unavailable', detail: `This gym has no ${area}.` };
	}

	const arrival = plan.departMinutes + input.travelMinutes;
	const closes = parseClock(schedule.closesAt);
	if (arrival >= closes) {
		return {
			kind: 'unsuitable',
			reason: 'outside_operating_hours',
			detail: `Closes at ${schedule.closesAt}, and you would arrive at ${formatClock(arrival)}.`,
		};
	}
	const start = Math.max(arrival, parseClock(schedule.opensAt));
	const areaCloses = closes - input.lastUseMinutesBeforeClose;
	const minutesAvailable = areaCloses - start;
	if (minutesAvailable < plan.durationMinutes) {
		return {
			kind: 'unsuitable',
			reason: 'insufficient_time',
			detail: `The ${area} closes at ${formatClock(areaCloses)}. Starting at ${formatClock(start)} leaves ${Math.max(0, minutesAvailable)} of your planned ${plan.durationMinutes} minutes.`,
		};
	}
	return {
		kind: 'suitable',
		startAt: formatClock(start),
		facilityClosingTime: formatClock(areaCloses),
		minutesAvailable,
		waitsForOpening: start > arrival,
	};
}
