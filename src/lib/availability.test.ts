import { describe, expect, test } from 'vitest';
import { assessAvailability, assessSuitability, scheduleFor } from './availability.ts';
import { closedOn, konamiPage, plan, WEDNESDAY } from './fixtures/builders.ts';
import aobadaiHtml from './fixtures/konami-004446-2026-11-03.html?raw';
import juniorSchoolHtml from './fixtures/konami-007701-2026-11-03.html?raw';
import shibuyaHtml from './fixtures/konami-007871-2026-11-03.html?raw';
import { parseKonamiFacilityPage, type KonamiLiveStatus } from './konami.ts';
import { parseClock } from './time.ts';
import type { DaySchedule } from './types.ts';

const aobadai = parseKonamiFacilityPage(aobadaiHtml);
const shibuya = parseKonamiFacilityPage(shibuyaHtml);
const juniorSchool = parseKonamiFacilityPage(juniorSchoolHtml);

describe('scheduleFor', () => {
	test.each([
		['2026-11-04', 'a Wednesday', '10:00', '23:00'],
		['2026-11-07', 'a Saturday', '10:00', '21:00'],
		['2026-12-28', 'a date in the special-hours table', '10:00', '23:00'],
		['2027-01-04', 'a special-hours date beyond the calendar', '10:00', '23:00'],
	])('Aobadai %s (%s) is open %s–%s', (date, _, opensAt, closesAt) => {
		expect(scheduleFor(aobadai, date)).toMatchObject({ kind: 'open', opensAt, closesAt });
	});

	test('public holidays use the holiday hours, even on a weekday', () => {
		// 2026-11-23 is a Monday and 勤労感謝の日; Aobadai's Monday hours would run until 23:00.
		expect(scheduleFor(aobadai, '2026-11-23')).toEqual({
			kind: 'open',
			opensAt: '10:00',
			closesAt: '21:00',
			basis: 'regular_hours',
			holidayName: '勤労感謝の日',
		});
		expect(scheduleFor(shibuya, '2026-11-23')).toMatchObject({ kind: 'open', closesAt: '20:00' });
	});

	test('a regular closing day is closed, even when it is a public holiday', () => {
		// 2026-11-03 is a Tuesday (Aobadai's closing day) and 文化の日.
		expect(scheduleFor(aobadai, '2026-11-03')).toEqual({
			kind: 'closed',
			reason: 'regular_closing_day',
			detail: 'Regular closing day on the official calendar (毎週火曜日、お盆、年末年始等).',
		});
		expect(scheduleFor(shibuya, '2026-11-06')).toMatchObject({ kind: 'closed', reason: 'regular_closing_day' });
	});

	test('year-end closures are special closures', () => {
		expect(scheduleFor(aobadai, '2026-12-30')).toEqual({
			kind: 'closed',
			reason: 'special_closure',
			detail: 'Official special-hours table: 「年末年始特別休館」.',
		});
		expect(scheduleFor(aobadai, '2027-01-02')).toMatchObject({ kind: 'closed', reason: 'special_closure' });
	});

	test('a non-regular closure without a stated cause is a temporary closure', () => {
		const temporary = konamiPage({ calendar: { [WEDNESDAY]: { closure: 'extra', notice: null } } });
		expect(scheduleFor(temporary, WEDNESDAY)).toMatchObject({ kind: 'closed', reason: 'temporary_closure' });
	});

	test('special hours replace the regular hours', () => {
		const special = konamiPage({
			specialDays: { [WEDNESDAY]: { status: 'special', opensAt: '10:00', closesAt: '18:00', note: '特別営業' } },
		});
		expect(scheduleFor(special, WEDNESDAY)).toMatchObject({ kind: 'open', closesAt: '18:00', basis: 'special_hours' });
	});

	test('a notice announcing a closure means closed, even without a closed-day mark', () => {
		expect(scheduleFor(juniorSchool, '2026-12-29')).toMatchObject({ kind: 'closed' });
	});

	test.each([
		['outside the official calendar', aobadai, '2027-01-06'],
		['a notice GymRadar cannot interpret', juniorSchool, '2026-11-30'],
		['a holiday without holiday hours', juniorSchool, '2026-11-23'],
		['hours that could not be read', konamiPage({ regularHours: null }), WEDNESDAY],
		['a weekday without listed hours', konamiPage({ regularHours: [] }), WEDNESDAY],
	])('a day is unknown, not open, when it is %s', (_, facility, date) => {
		expect(scheduleFor(facility, date).kind).toBe('unknown');
	});

	test('a day is unknown when the holiday data does not cover it', () => {
		const nextDecade = konamiPage({ calendar: { '2030-01-09': { closure: null, notice: null } } });
		expect(scheduleFor(nextDecade, '2030-01-09')).toMatchObject({
			kind: 'unknown',
			detail: expect.stringContaining('public-holiday data'),
		});
	});
});

const open: DaySchedule = { kind: 'open', opensAt: '10:00', closesAt: '23:00', basis: 'regular_hours', holidayName: null };
const availabilityAt = (time: string, schedule: DaySchedule, live: KonamiLiveStatus | null = null) =>
	assessAvailability({
		schedule,
		live,
		nowMinutes: parseClock(time),
		lastUseMinutesBeforeClose: 10,
		sourceUrl: 'https://information.konamisportsclub.jp/ksc/004446/',
		retrievedAt: new Date('2026-11-04T09:00:00Z'),
	});

describe('assessAvailability', () => {
	test.each([
		['09:59', 'closed', 'before_opening'],
		['10:00', 'open', 'within_hours'],
		['22:59', 'open', 'within_hours'],
		['23:00', 'closed', 'after_closing'],
	])('at %s the gym is %s (%s)', (time, status, reason) => {
		expect(availabilityAt(time, open)).toMatchObject({ status, reason });
	});

	test("reports today's hours and the planned area's closing time", () => {
		expect(availabilityAt('18:00', open)).toMatchObject({ openingTime: '10:00', closingTime: '23:00', facilityClosingTime: '22:50' });
	});

	test('is unknown when the live status contradicts an open schedule', () => {
		expect(availabilityAt('18:00', open, { kind: 'outside_hours' })).toMatchObject({ status: 'unknown', reason: 'conflicting_signals' });
	});

	test('is unknown when the live status shows a reading on a closed day', () => {
		const closed = scheduleFor(closedOn(WEDNESDAY), WEDNESDAY);
		expect(availabilityAt('18:00', closed, { kind: 'reading', asOf: '18:00', level: 2 })).toMatchObject({
			status: 'unknown',
			reason: 'conflicting_signals',
		});
	});

	test('keeps the closure reason on a closed day', () => {
		const closed = scheduleFor(closedOn(WEDNESDAY), WEDNESDAY);
		expect(availabilityAt('18:00', closed, { kind: 'outside_hours' })).toMatchObject({ status: 'closed', reason: 'regular_closing_day' });
	});
});

describe('assessSuitability', () => {
	const suitabilityFor = (depart: string, durationMinutes = 60, lastUseMinutesBeforeClose: number | null = 10) =>
		assessSuitability({
			schedule: open,
			availability: availabilityAt(depart, open),
			plan: plan(depart, { durationMinutes }),
			travelMinutes: 10,
			lastUseMinutesBeforeClose,
		});

	test('fits when the area stays open for the whole workout', () => {
		expect(suitabilityFor('21:40')).toEqual({
			kind: 'suitable',
			startAt: '21:50',
			facilityClosingTime: '22:50',
			minutesAvailable: 60,
			waitsForOpening: false,
		});
	});

	test('does not fit when the area closes before the workout would finish', () => {
		expect(suitabilityFor('21:41')).toMatchObject({ kind: 'unsuitable', reason: 'insufficient_time' });
	});

	test('waits for opening when arriving early', () => {
		expect(suitabilityFor('09:00')).toMatchObject({ kind: 'suitable', startAt: '10:00', waitsForOpening: true });
	});

	test('does not fit when the club has closed by arrival', () => {
		expect(suitabilityFor('22:55')).toMatchObject({ kind: 'unsuitable', reason: 'outside_operating_hours' });
	});

	test('does not fit when the gym lacks the area', () => {
		expect(suitabilityFor('18:00', 60, null)).toMatchObject({ kind: 'unsuitable', reason: 'facility_unavailable' });
	});
});
