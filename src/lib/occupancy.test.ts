import { describe, expect, test } from 'vitest';
import { en } from '../i18n/index.ts';
import { assessAvailability } from './availability.ts';
import { at, WEDNESDAY } from './fixtures/builders.ts';
import type { KonamiLiveStatus } from './konami.ts';
import { konamiOccupancy } from './occupancy.ts';
import { parseClock } from './time.ts';
import type { DaySchedule, GymAvailability } from './types.ts';

const SOURCE = 'https://information.konamisportsclub.jp/ksc/004446/';
const open: DaySchedule = { kind: 'open', opensAt: '10:00', closesAt: '23:00', basis: 'regular_hours', holidayName: null };
const closedDay: DaySchedule = { kind: 'closed', reason: 'regular_closing_day', detail: 'Regular closing day.' };

function occupancyAt(time: string, live: KonamiLiveStatus | null, schedule: DaySchedule = open) {
	const now = at(WEDNESDAY, time);
	const retrievedAt = new Date(now.getTime() - 2 * 60_000);
	const availability: GymAvailability = assessAvailability({
		schedule,
		live,
		nowMinutes: parseClock(time),
		lastUseMinutesBeforeClose: 10,
		sourceUrl: SOURCE,
		retrievedAt,
		messages: en,
	});
	return konamiOccupancy({ gymId: 'aobadai', live, availability, today: WEDNESDAY, now, retrievedAt, sourceUrl: SOURCE, messages: en });
}

describe('konamiOccupancy', () => {
	test.each([
		[1, 'quiet'],
		[2, 'moderate'],
		[3, 'busy'],
	] as const)('maps official level %i of 3 to %s', (level, status) => {
		expect(occupancyAt('18:40', { kind: 'reading', asOf: '18:30', level })).toMatchObject({ status, officialLevel: level });
	});

	test('keeps the observation time separate from the retrieval time', () => {
		expect(occupancyAt('18:40', { kind: 'reading', asOf: '18:30', level: 2 })).toEqual({
			gymId: 'aobadai',
			status: 'moderate',
			officialLevel: 2,
			source: 'official_periodic',
			observedAt: '2026-11-04T09:30:00.000Z', // 18:30 JST, from the page's 「18:30現在」
			retrievedAt: '2026-11-04T09:38:00.000Z', // 18:38 JST, when GymRadar fetched the page
			confidence: 'medium',
			stale: false,
			sourceUrl: SOURCE,
			note: null,
		});
	});

	test('flags readings older than 60 minutes as stale', () => {
		expect(occupancyAt('19:30', { kind: 'reading', asOf: '18:30', level: 3 })).toMatchObject({ stale: false });
		expect(occupancyAt('19:31', { kind: 'reading', asOf: '18:30', level: 3 })).toMatchObject({ stale: true, confidence: 'low' });
	});

	test('does not trust a timestamp from the future', () => {
		expect(occupancyAt('18:00', { kind: 'reading', asOf: '18:30', level: 1 })).toMatchObject({
			observedAt: null,
			stale: true,
			confidence: 'low',
		});
	});

	test('a closed gym has no crowd level, even if the widget still shows a reading', () => {
		const afterClosing = occupancyAt('23:10', { kind: 'reading', asOf: '22:30', level: 1 });
		expect(afterClosing).toMatchObject({ status: 'not_applicable', officialLevel: null, observedAt: null });
		expect(occupancyAt('18:00', { kind: 'outside_hours' }, closedDay).status).toBe('not_applicable');
		expect(occupancyAt('18:00', { kind: 'absent' }, closedDay)).toMatchObject({ status: 'not_applicable', source: 'unknown' });
	});

	test.each([
		['the page could not be loaded', null, 'unknown'],
		['the page has no widget', { kind: 'absent' }, 'unknown'],
		['the widget is unrecognized', { kind: 'unrecognized', text: '【混雑】 / congestion-thresshold4' }, 'official_periodic'],
	] as const)('is unknown when %s', (_, live, source) => {
		expect(occupancyAt('18:00', live)).toMatchObject({ status: 'unknown', officialLevel: null, source, confidence: 'unknown' });
	});
});
