import type { Messages } from '../i18n/index.ts';
import { japaneseHolidayName } from './holidays.ts';
import type { KonamiFacilityPage, KonamiLiveStatus } from './konami.ts';
import { formatClock, parseClock, weekdayOf, type IsoDate } from './time.ts';
import type { ClosureReason, DaySchedule, GymAvailability, Suitability, WorkoutPlan } from './types.ts';

/**
 * The official schedule for `date`. A day counts as open only when an official source gives
 * hours for it. Not being marked closed is never enough.
 */
export function scheduleFor(page: KonamiFacilityPage, date: IsoDate, m: Messages): DaySchedule {
	const special = page.specialDays[date];
	const day = page.calendar[date];
	const holidayName = japaneseHolidayName(date);

	if (special) {
		if (special.status === 'closed') {
			return {
				kind: 'closed',
				reason: closureReason(day?.closure ?? null, special.note),
				detail: m.schedule.specialClosed(special.note),
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
		if (special.status !== 'normal') return { kind: 'unknown', detail: m.schedule.specialWithoutHours(special.note) };
	}

	if (!day) return { kind: 'unknown', detail: m.schedule.outsideCalendar(date) };
	if (day.closure === 'regular') {
		return { kind: 'closed', reason: 'regular_closing_day', detail: m.schedule.regularClosingDay(page.closingDaysText) };
	}
	if (day.closure === 'extra') {
		return { kind: 'closed', reason: closureReason('extra', day.notice ?? ''), detail: m.schedule.extraClosure(day.notice) };
	}
	if (day.notice !== null) {
		// Closure notices aren't always marked as closed days, e.g. 「休館日となります。」.
		if (/休館日?となります/.test(day.notice)) {
			return { kind: 'closed', reason: closureReason(null, day.notice), detail: m.schedule.noticeClosure(day.notice) };
		}
		return { kind: 'unknown', detail: m.schedule.noticeUnknown(day.notice) };
	}

	if (holidayName === undefined) return { kind: 'unknown', detail: m.schedule.holidayDataMissing(date) };
	if (!page.regularHours) return { kind: 'unknown', detail: m.schedule.hoursUnreadable };
	// On public holidays the 「祝休日」 range applies, whatever the weekday.
	const weekday = weekdayOf(date);
	const rules = page.regularHours.filter((rule) => (holidayName ? rule.holidays : rule.weekdays.includes(weekday)));
	if (rules.length !== 1) {
		return {
			kind: 'unknown',
			detail: rules.length === 0 ? m.schedule.noHours(Boolean(holidayName)) : m.schedule.severalHours(Boolean(holidayName)),
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
	messages: Messages;
}): GymAvailability {
	const { schedule, live, nowMinutes, messages: m } = input;
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
				detail: m.joinSentences([schedule.detail, m.availability.readingOnClosedDay(live.asOf)]),
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
	const hoursKind =
		schedule.basis === 'special_hours'
			? [m.availability.specialHours]
			: schedule.holidayName
				? [m.availability.holidayHours(schedule.holidayName)]
				: [];
	if (nowMinutes < parseClock(schedule.opensAt)) {
		return {
			...hours,
			status: 'closed',
			reason: 'before_opening',
			detail: m.joinSentences([m.availability.opensAt(schedule.opensAt), ...hoursKind]),
		};
	}
	if (nowMinutes >= closes) {
		return {
			...hours,
			status: 'closed',
			reason: 'after_closing',
			detail: m.joinSentences([m.availability.closedAt(schedule.closesAt), ...hoursKind]),
		};
	}
	if (live?.kind === 'outside_hours') {
		return {
			...hours,
			status: 'unknown',
			reason: 'conflicting_signals',
			detail: m.availability.outsideHoursWhileOpen(schedule.closesAt),
		};
	}
	return {
		...hours,
		status: 'open',
		reason: 'within_hours',
		detail: m.joinSentences([m.availability.openUntil(schedule.closesAt), ...hoursKind]),
	};
}

/** Whether the planned workout fits in today's hours, from departure through the area's last-use time. */
export function assessSuitability(input: {
	schedule: DaySchedule;
	availability: GymAvailability;
	plan: WorkoutPlan;
	travelMinutes: number;
	/** Null when the gym doesn't have the planned area. */
	lastUseMinutesBeforeClose: number | null;
	messages: Messages;
}): Suitability {
	const { schedule, availability, plan, messages: m } = input;
	if (availability.reason === 'conflicting_signals') return { kind: 'unknown', detail: availability.detail };
	if (schedule.kind === 'unknown') return { kind: 'unknown', detail: schedule.detail };
	if (schedule.kind === 'closed') return { kind: 'unsuitable', reason: schedule.reason, detail: schedule.detail };
	if (input.lastUseMinutesBeforeClose === null) {
		return { kind: 'unsuitable', reason: 'facility_unavailable', detail: m.suitability.noArea(plan.area) };
	}

	const arrival = plan.departMinutes + input.travelMinutes;
	const closes = parseClock(schedule.closesAt);
	if (arrival >= closes) {
		return {
			kind: 'unsuitable',
			reason: 'outside_operating_hours',
			detail: m.suitability.closedBeforeArrival(schedule.closesAt, formatClock(arrival)),
		};
	}
	const start = Math.max(arrival, parseClock(schedule.opensAt));
	const areaCloses = closes - input.lastUseMinutesBeforeClose;
	const minutesAvailable = areaCloses - start;
	if (minutesAvailable < plan.durationMinutes) {
		return {
			kind: 'unsuitable',
			reason: 'insufficient_time',
			detail: m.suitability.notEnoughTime(
				plan.area,
				formatClock(areaCloses),
				formatClock(start),
				Math.max(0, minutesAvailable),
				plan.durationMinutes,
			),
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
