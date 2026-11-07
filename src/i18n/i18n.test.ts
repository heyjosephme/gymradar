import { describe, expect, test } from 'vitest';
import { scheduleFor } from '../lib/availability.ts';
import { at, closedOn, evaluateAll, favoriteGym, konamiPage, plan, WEDNESDAY } from '../lib/fixtures/builders.ts';
import { recommend } from '../lib/recommend.ts';
import { ja } from './index.ts';

const JAPANESE = /[぀-ヿ一-鿿]/;

/** Every fixed string in a message catalog, with its path. */
function strings(value: unknown, path = ''): [string, string][] {
	if (typeof value === 'string') return [[path, value]];
	if (Array.isArray(value)) return value.flatMap((item, index) => strings(item, `${path}[${index}]`));
	if (value && typeof value === 'object') {
		return Object.entries(value).flatMap(([key, item]) => strings(item, path ? `${path}.${key}` : key));
	}
	return [];
}

describe('Japanese messages', () => {
	test('every fixed string is translated', () => {
		const untranslated = strings(ja).filter(([path, text]) => path !== 'dateLocale' && !JAPANESE.test(text));
		expect(untranslated).toEqual([]);
	});

	test('explain a busy first choice in Japanese', () => {
		const workout = plan('18:00');
		const evaluations = evaluateAll(
			[{ gym: favoriteGym('Gym A', { nameJa: '目黒青葉台' }), page: konamiPage({ live: { kind: 'reading', asOf: '18:00', level: 3 } }) }],
			at(WEDNESDAY, '18:05'),
			workout,
			ja,
		);

		expect(recommend(evaluations, workout, ja).explanation).toBe(
			'目黒青葉台が引き続き第一候補です。現在は混雑していますが（公式レベル3/3・18:00時点）、営業中で、あなたの優先順位にも合っています。マシンジムの利用終了22:50までに、60分のトレーニングが収まります。',
		);
	});

	test('explain an unconfirmed gym in Japanese', () => {
		const workout = plan('18:00');
		const evaluations = evaluateAll(
			[
				{ gym: favoriteGym('Gym A', { nameJa: '目黒青葉台' }), page: konamiPage({ live: { kind: 'outside_hours' } }) },
				{ gym: favoriteGym('Gym B', { nameJa: '渋谷' }), page: konamiPage({ live: { kind: 'reading', asOf: '18:00', level: 1 } }) },
			],
			at(WEDNESDAY, '18:05'),
			workout,
			ja,
		);

		expect(recommend(evaluations, workout, ja).explanation).toBe(
			'目黒青葉台は休館が確認されていない中で最も優先順位が高いジムですが、営業状況を確認できませんでした。公式の営業時間では23:00まで営業中ですが、館内利用状況は「営業時間外」と表示されています。臨時休館の可能性があります。行く前に確認してください。営業が確認できている中では、渋谷（第2候補）が最優先です。このおすすめは、現在の混雑情報を使わずに判断しています。',
		);
	});

	test('describe official schedules in Japanese', () => {
		expect(scheduleFor(closedOn(WEDNESDAY), WEDNESDAY, ja)).toMatchObject({
			kind: 'closed',
			detail: '公式カレンダーで定休日です（毎週火曜日、お盆、年末年始等）。',
		});
		expect(scheduleFor(konamiPage(), '2026-12-01', ja)).toMatchObject({
			kind: 'unknown',
			detail: '2026-12-01は公式の営業カレンダーの範囲外です。',
		});
	});
});
