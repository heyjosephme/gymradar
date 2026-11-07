import { describe, expect, test } from 'vitest';
import { favoriteGyms } from '../config/gyms.ts';
import { at, closedOn, evaluateAll, favoriteGym, konamiPage, plan, WEDNESDAY } from './fixtures/builders.ts';
import { en } from '../i18n/index.ts';
import { recommend } from './recommend.ts';

const A = favoriteGym('Gym A');
const B = favoriteGym('Gym B');
const C = favoriteGym('Gym C');

describe('recommend', () => {
	test('the first choice stays the recommendation when it is open and suitable, even when busy', () => {
		const workout = plan('18:00');
		const evaluations = evaluateAll(
			[
				{ gym: A, page: konamiPage({ live: { kind: 'reading', asOf: '18:00', level: 3 } }) },
				{ gym: B, page: konamiPage({ live: { kind: 'reading', asOf: '18:00', level: 2 } }) },
			],
			at(WEDNESDAY, '18:05'),
			workout,
		);

		const result = recommend(evaluations, workout, en);

		expect(result.primary?.gym.name).toBe('Gym A');
		expect(result.skipped).toEqual([]);
		expect(result.explanation).toBe(
			'Gym A remains your top choice. Although it is currently busy (official level 3 of 3 as of 18:00), it is open and matches your personal preference. Your 60-minute machine gym workout fits before the machine gym closes at 22:50.',
		);
	});

	test('when the first choice is closed, the second choice is promoted', () => {
		const workout = plan('18:00');
		const evaluations = evaluateAll(
			[
				{ gym: A, page: closedOn(WEDNESDAY) },
				{ gym: B, page: konamiPage({ live: { kind: 'reading', asOf: '18:00', level: 2 } }) },
			],
			at(WEDNESDAY, '18:05'),
			workout,
		);

		const result = recommend(evaluations, workout, en);

		expect(result.primary?.gym.name).toBe('Gym B');
		expect(result.skipped.map((evaluation) => evaluation.gym.name)).toEqual(['Gym A']);
		expect(result.explanation).toBe(
			'Gym A is closed today (regular closing day). Gym B (your #2) has automatically become your top recommendation. It is open and currently moderately busy (official level 2 of 3 as of 18:00). Your 60-minute machine gym workout fits before the machine gym closes at 22:50.',
		);
	});

	test('when the first two choices are closed, the third choice is promoted', () => {
		const workout = plan('18:00');
		const yearEnd = konamiPage({
			specialDays: { [WEDNESDAY]: { status: 'closed', opensAt: null, closesAt: null, note: '年末年始特別休館' } },
		});
		const evaluations = evaluateAll(
			[
				{ gym: A, page: closedOn(WEDNESDAY) },
				{ gym: B, page: yearEnd },
				{ gym: C, page: konamiPage({ live: { kind: 'reading', asOf: '18:00', level: 1 } }) },
			],
			at(WEDNESDAY, '18:05'),
			workout,
		);

		const result = recommend(evaluations, workout, en);

		expect(result.primary?.gym.name).toBe('Gym C');
		expect(result.primary?.rank).toBe(3);
		expect(result.explanation).toMatch(
			/^Gym A is closed today \(regular closing day\)\. Gym B is closed today \(special closure\)\. Gym C \(your #3\) has automatically become your top recommendation\./,
		);
	});

	test('a gym whose required facility closes too early is excluded for the planned workout', () => {
		const workout = plan('21:30');
		const evaluations = evaluateAll(
			[
				// Machine gym last use is 30 minutes before the 23:00 close: 22:30. Arriving 21:40 leaves 50 minutes.
				{ gym: favoriteGym('Gym A', { areas: { gym: { lastUseMinutesBeforeClose: 30 } } }), page: konamiPage() },
				{ gym: B, page: konamiPage() },
			],
			at(WEDNESDAY, '21:30'),
			workout,
		);

		const result = recommend(evaluations, workout, en);

		expect(evaluations[0].availability.status).toBe('open');
		expect(evaluations[0].availability.facilityClosingTime).toBe('22:30');
		expect(evaluations[0].suitability).toMatchObject({ kind: 'unsuitable', reason: 'insufficient_time' });
		expect(result.primary?.gym.name).toBe('Gym B');
		expect(result.explanation).toMatch(
			/^Gym A is unavailable for your planned workout because its machine gym closes at 22:30, too early for 60 minutes\. Gym B \(your #2\) has automatically become your top recommendation\./,
		);
	});

	test('a gym without the required facility is excluded for the planned workout', () => {
		const swim = plan('18:00', { area: 'pool' });
		const evaluations = evaluateAll(
			[
				{ gym: favoriteGym('Gym A', { areas: { gym: { lastUseMinutesBeforeClose: 10 } } }), page: konamiPage() },
				{ gym: B, page: konamiPage() },
			],
			at(WEDNESDAY, '18:00'),
			swim,
		);

		const result = recommend(evaluations, swim, en);

		expect(evaluations[0].suitability).toMatchObject({ kind: 'unsuitable', reason: 'facility_unavailable' });
		expect(result.primary?.gym.name).toBe('Gym B');
		expect(result.explanation).toMatch(/^Gym A has no pool\. Gym B \(your #2\)/);
	});

	test('a gym with unknown availability is not treated as confirmed open', () => {
		const workout = plan('18:00');
		const evaluations = evaluateAll(
			[
				{ gym: A, page: null }, // The official page failed to load.
				{ gym: B, page: konamiPage({ live: { kind: 'reading', asOf: '18:00', level: 1 } }) },
			],
			at(WEDNESDAY, '18:05'),
			workout,
		);

		const result = recommend(evaluations, workout, en);

		expect(evaluations[0].availability.status).toBe('unknown');
		expect(evaluations[0].suitability.kind).toBe('unknown');
		// Not confirmed closed, so personal preference keeps it first, flagged as unconfirmed.
		expect(result.primary?.gym.name).toBe('Gym A');
		expect(result.confirmedAlternative?.gym.name).toBe('Gym B');
		expect(result.explanation).toBe(
			"Gym A is your highest-priority gym that isn't confirmed closed, but its availability couldn't be confirmed. The official page couldn't be loaded (HTTP 503). Check before going. Gym B (your #2) is your highest-priority confirmed option. This recommendation was made without current occupancy information.",
		);
	});

	test('a live status that contradicts the schedule leaves the gym unconfirmed, not excluded', () => {
		const workout = plan('18:00');
		const evaluations = evaluateAll(
			[
				{ gym: A, page: konamiPage({ live: { kind: 'outside_hours' } }) },
				{ gym: B, page: konamiPage({ live: { kind: 'reading', asOf: '18:00', level: 1 } }) },
			],
			at(WEDNESDAY, '18:05'),
			workout,
		);

		const result = recommend(evaluations, workout, en);

		expect(evaluations[0].availability).toMatchObject({ status: 'unknown', reason: 'conflicting_signals' });
		expect(result.primary?.gym.name).toBe('Gym A');
		expect(result.confirmedAlternative?.gym.name).toBe('Gym B');
		expect(result.explanation).toContain("Konami's live status shows 営業時間外");
		expect(result.explanation.match(/Check before going/g)).toHaveLength(1);
	});

	test('a much quieter lower-priority gym does not replace a higher-priority one', () => {
		const workout = plan('18:00');
		const evaluations = evaluateAll(
			[
				{ gym: favoriteGym('Gym A', { travel: { minutes: 25, mode: 'transit' } }), page: konamiPage({ live: { kind: 'reading', asOf: '18:00', level: 3 } }) },
				{ gym: favoriteGym('Gym B', { travel: { minutes: 5, mode: 'walking' } }), page: konamiPage({ live: { kind: 'reading', asOf: '18:00', level: 1 } }) },
			],
			at(WEDNESDAY, '18:05'),
			workout,
		);

		const result = recommend(evaluations, workout, en);

		expect(evaluations[1].occupancy.status).toBe('quiet');
		expect(result.primary?.gym.name).toBe('Gym A');
		expect(result.explanation).not.toContain('Gym B');
	});

	test('missing occupancy data does not stop a recommendation or invent crowd information', () => {
		const workout = plan('18:00');
		const evaluations = evaluateAll(
			[{ gym: A, page: konamiPage({ live: { kind: 'absent' } }) }, { gym: B, page: konamiPage() }],
			at(WEDNESDAY, '18:05'),
			workout,
		);

		const result = recommend(evaluations, workout, en);

		expect(result.primary?.gym.name).toBe('Gym A');
		expect(result.primary?.occupancy).toMatchObject({ status: 'unknown', officialLevel: null, observedAt: null });
		expect(result.explanation).toBe(
			"Gym A remains your top choice. It is open, and your 60-minute machine gym workout fits before the machine gym closes at 22:50. This recommendation was made without current occupancy information. This facility's page has no occupancy display.",
		);
		expect(result.explanation).not.toMatch(/quiet|busy/);
	});

	test('a stale occupancy reading is reported as stale, not as current crowding', () => {
		const workout = plan('18:00');
		const evaluations = evaluateAll(
			[{ gym: A, page: konamiPage({ live: { kind: 'reading', asOf: '16:30', level: 1 } }) }],
			at(WEDNESDAY, '18:00'),
			workout,
		);

		const result = recommend(evaluations, workout, en);

		expect(result.primary?.occupancy).toMatchObject({ status: 'quiet', stale: true, confidence: 'low' });
		expect(result.explanation).toContain('The latest official reading (level 1 of 3 as of 16:30) is stale.');
		expect(result.explanation).not.toContain('currently quiet');
	});

	test('the explanation says when the recommended gym has not opened yet', () => {
		const workout = plan('08:30');
		const evaluations = evaluateAll([{ gym: A, page: konamiPage() }], at(WEDNESDAY, '08:30'), workout);

		const result = recommend(evaluations, workout, en);

		expect(result.primary?.availability).toMatchObject({ status: 'closed', reason: 'before_opening' });
		expect(result.primary?.suitability).toMatchObject({ kind: 'suitable', startAt: '10:00', waitsForOpening: true });
		expect(result.explanation).toBe(
			'Gym A remains your top choice. It opens at 10:00, and your 60-minute machine gym workout fits before the machine gym closes at 22:50. This recommendation was made without current occupancy information. Closed now, so occupancy does not apply.',
		);
	});

	test('when no gym fits, nothing is recommended and every reason is given', () => {
		const workout = plan('22:30');
		const evaluations = evaluateAll(
			[{ gym: A, page: closedOn(WEDNESDAY) }, { gym: B, page: konamiPage() }],
			at(WEDNESDAY, '22:30'),
			workout,
		);

		const result = recommend(evaluations, workout, en);

		expect(result.primary).toBeNull();
		expect(result.explanation).toBe(
			'None of your gyms fits a 60-minute machine gym workout leaving at 22:30. Gym A is closed today (regular closing day). Gym B is unavailable for your planned workout because its machine gym closes at 22:50, too early for 60 minutes.',
		);
	});

	test('a gym that has already closed is described as closed for today', () => {
		const workout = plan('23:10');
		const evaluations = evaluateAll([{ gym: A, page: konamiPage() }], at(WEDNESDAY, '23:10'), workout);

		expect(recommend(evaluations, workout, en).explanation).toBe(
			'None of your gyms fits a 60-minute machine gym workout leaving at 23:10. Gym A has closed for today (it closed at 23:00).',
		);
	});

	test('recommending never reorders the saved ranking', () => {
		const workout = plan('18:00');
		const evaluations = evaluateAll(
			[{ gym: A, page: closedOn(WEDNESDAY) }, { gym: B, page: konamiPage() }, { gym: C, page: konamiPage() }],
			at(WEDNESDAY, '18:00'),
			workout,
		);

		recommend(evaluations, workout, en);

		expect(evaluations.map((evaluation) => [evaluation.rank, evaluation.gym.name])).toEqual([
			[1, 'Gym A'],
			[2, 'Gym B'],
			[3, 'Gym C'],
		]);
		expect(Object.isFrozen(favoriteGyms)).toBe(true);
	});
});
