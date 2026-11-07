import { describe, expect, test } from 'vitest';
import { planFromQuery } from './dashboard.ts';
import { parseClock } from './time.ts';

const defaults = { area: 'gym', durationMinutes: 60 } as const;
const now = parseClock('18:00');
const query = (search: string) => planFromQuery(new URLSearchParams(search), defaults, now);

describe('planFromQuery', () => {
	test('defaults to the usual workout, leaving now', () => {
		expect(query('')).toEqual({ area: 'gym', durationMinutes: 60, departMinutes: now });
	});

	test('reads the form fields', () => {
		expect(query('area=pool&duration=45&depart=19:30')).toEqual({
			area: 'pool',
			durationMinutes: 45,
			departMinutes: parseClock('19:30'),
		});
	});

	test('ignores invalid values', () => {
		expect(query('area=sauna&duration=5000&depart=25:00')).toEqual({ area: 'gym', durationMinutes: 60, departMinutes: now });
	});

	test('treats a departure time that has passed as now', () => {
		expect(query('depart=07:00').departMinutes).toBe(now);
	});
});
