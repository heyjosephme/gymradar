import { renderToString } from 'react-dom/server';
import { describe, expect, test } from 'vitest';
import { Accordion } from '@/components/ui/accordion';
import { at, closedOn, evaluateAll, favoriteGym, konamiPage, plan, WEDNESDAY } from '@/lib/fixtures/builders';
import type { KonamiFacilityPage } from '@/lib/konami';
import { recommend } from '@/lib/recommend';
import { Dashboard } from './Dashboard';
import { GymRow } from './GymRow';

const ENTITIES: Record<string, string> = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#x27;': "'" };

/** The page's text as a reader sees it, without markup. */
const visibleText = (html: string) =>
	html
		.replace(/<!--.*?-->/g, '')
		.replace(/<[^>]+>/g, ' ')
		.replace(/&(amp|lt|gt|quot|#x27);/g, (entity) => ENTITIES[entity])
		.replace(/\s+/g, ' ');

function renderRow(page: KonamiFacilityPage, time: string) {
	const now = at(WEDNESDAY, time);
	const workout = plan(time);
	const [evaluation] = evaluateAll([{ gym: favoriteGym('Gym A'), page }], now, workout);
	return renderToString(
		<Accordion type="multiple">
			<GymRow evaluation={evaluation} plan={workout} now={now} recommended={false} index={0} />
		</Accordion>,
	);
}

describe('GymRow', () => {
	test('shows every required field at a glance', () => {
		const html = renderRow(konamiPage({ live: { kind: 'reading', asOf: '18:00', level: 1 } }), '18:12');
		const text = visibleText(html);

		expect(text).toContain('Personal priority # 1');
		expect(text).toContain('Gym A');
		expect(text).toContain('Open now');
		expect(text).toContain('10:00–23:00');
		expect(text).toContain('Gym until 22:50');
		expect(text).toContain('Quiet 1/3');
		expect(text).toContain('Official · 18:00 · 12 min ago');
		expect(text).toContain('10 min on foot');
		expect(html).toContain('href="https://information.konamisportsclub.jp/ksc/004446/"');
	});

	test('labels a stale reading as stale', () => {
		const text = visibleText(renderRow(konamiPage({ live: { kind: 'reading', asOf: '16:30', level: 2 } }), '18:00'));

		expect(text).toContain('Moderate 2/3 Stale');
		expect(text).toContain('Official · 16:30 · 1 h 30 min ago');
	});

	test('shows occupancy at a closed gym as not applicable, never as a crowd level', () => {
		// After closing, the widget may still show the last reading of the evening.
		const afterClosing = visibleText(renderRow(konamiPage({ live: { kind: 'reading', asOf: '22:30', level: 1 } }), '23:10'));
		const closedDay = visibleText(renderRow(closedOn(WEDNESDAY, konamiPage({ live: { kind: 'outside_hours' } })), '18:00'));

		for (const text of [afterClosing, closedDay]) {
			expect(text).toContain('Not applicable No reading');
			expect(text).not.toMatch(/Quiet|\d\/3/);
		}
		expect(closedDay).toContain('Regular closing day');
	});

	test('shows missing occupancy as unknown without inventing a level', () => {
		const text = visibleText(renderRow(konamiPage({ live: { kind: 'absent' } }), '18:00'));

		expect(text).toContain('Unknown No reading');
		expect(text).not.toMatch(/Quiet|Moderate|Busy|\d\/3/);
	});
});

describe('Dashboard', () => {
	test('leads with the recommendation and keeps ranks when gyms move to the unavailable section', () => {
		const now = at(WEDNESDAY, '18:00');
		const workout = plan('18:00');
		const evaluations = evaluateAll(
			[
				{ gym: favoriteGym('Gym A'), page: closedOn(WEDNESDAY) },
				{ gym: favoriteGym('Gym B'), page: konamiPage() },
			],
			now,
			workout,
		);
		const recommendation = recommend(evaluations, workout);

		const text = visibleText(
			renderToString(
				<Dashboard
					nowIso={now.toISOString()}
					clock="18:00"
					dateLabel="Wed 4 Nov"
					holiday={null}
					plan={workout}
					departValue=""
					leaving="leave now"
					evaluations={evaluations}
					primaryId={recommendation.primary?.gym.id ?? null}
					explanation={recommendation.explanation}
				/>,
			),
		);

		const hero = text.slice(text.indexOf('Next up'), text.indexOf('Your gyms'));
		const unavailable = text.slice(text.indexOf('Not available for this workout'));
		expect(hero).toContain('Personal priority # 2 Gym B');
		expect(hero).toContain(recommendation.explanation);
		expect(unavailable).toContain('Personal priority # 1 Gym A');
		expect(unavailable).toContain('Regular closing day');
	});
});
