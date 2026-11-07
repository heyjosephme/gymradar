import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, test } from 'vitest';
import { at, closedOn, evaluateAll, favoriteGym, konamiPage, plan, WEDNESDAY } from '../lib/fixtures/builders.ts';
import type { KonamiFacilityPage } from '../lib/konami.ts';
import GymCard from './GymCard.astro';

const container = await AstroContainer.create();

async function renderCard(page: KonamiFacilityPage, time: string) {
	const now = at(WEDNESDAY, time);
	const workout = plan(time);
	const [evaluation] = evaluateAll([{ gym: favoriteGym('Gym A'), page }], now, workout);
	return container.renderToString(GymCard, { props: { evaluation, plan: workout, now } });
}

describe('GymCard', () => {
	test('shows a fresh official reading with its level, source and age', async () => {
		const html = await renderCard(konamiPage({ live: { kind: 'reading', asOf: '18:00', level: 3 } }), '18:12');

		expect(html).toContain('Busy');
		expect(html).toContain('official level 3 of 3');
		expect(html).toContain('Official, from check-ins, updated about every 30 minutes');
		expect(html).toContain('as of 18:00 (12 min ago)');
		expect(html).not.toContain('Stale');
	});

	test('labels a stale reading as stale', async () => {
		const html = await renderCard(konamiPage({ live: { kind: 'reading', asOf: '16:30', level: 2 } }), '18:00');

		expect(html).toContain('⚠ Stale');
		expect(html).toContain('as of 16:30 (1 h 30 min ago)');
		expect(html).toContain('Stale: this reading may not reflect current crowding.');
	});

	test('shows occupancy at a closed gym as not applicable, never as a crowd level', async () => {
		// After closing, the widget may still show the last reading of the evening.
		const afterClosing = await renderCard(konamiPage({ live: { kind: 'reading', asOf: '22:30', level: 1 } }), '23:10');
		const closedDay = await renderCard(closedOn(WEDNESDAY, konamiPage({ live: { kind: 'outside_hours' } })), '18:00');

		for (const html of [afterClosing, closedDay]) {
			expect(html).toContain('Not applicable');
			expect(html).not.toMatch(/Quiet|official level/);
		}
		expect(closedDay).toContain('Closed today');
	});

	test('shows missing occupancy as unknown without inventing a level', async () => {
		const html = await renderCard(konamiPage({ live: { kind: 'absent' } }), '18:00');

		expect(html).toContain('Unknown');
		expect(html).toContain("This facility&#39;s page has no occupancy display.");
		expect(html).not.toMatch(/Quiet|Moderate|Busy|official level/);
	});

	test('keeps personal priority apart from current conditions', async () => {
		const html = await renderCard(closedOn(WEDNESDAY), '18:00');

		expect(html).toMatch(/<header class="preference"[^>]*>[\s\S]*Personal priority #1[\s\S]*<\/header>/);
		expect(html).toMatch(/<section class="conditions"[^>]*>[\s\S]*Current conditions/);
	});
});
