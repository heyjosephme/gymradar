import { describe, expect, test } from 'vitest';
// Official pages saved on 2026-11-03 around 22:45 JST (after closing on a public holiday).
import aobadai from './fixtures/konami-004446-2026-11-03.html?raw';
import juniorSchool from './fixtures/konami-007701-2026-11-03.html?raw';
import shibuya from './fixtures/konami-007871-2026-11-03.html?raw';
import { parseKonamiFacilityPage } from './konami.ts';

// The page is served with CRLF line endings.
const OUTSIDE_HOURS_WIDGET = /<li>【営業時間外】&nbsp;<\/li>\s*<li class="congestion-img congestion-thresshold0"><\/li>/;

/**
 * The Aobadai page with the widget as it appears during business hours. No live reading was
 * captured during the investigation; the text format comes from search-indexed copies of
 * facility pages, and the level classes from the site's stylesheet.
 */
const withWidget = (text: string, levelClass: string) =>
	aobadai.replace(OUTSIDE_HOURS_WIDGET, `<li>${text}&nbsp;</li>\r\n    <li class="congestion-img ${levelClass}"></li>`);

describe('parseKonamiFacilityPage', () => {
	test('reads the outside-business-hours widget', () => {
		expect(aobadai).toMatch(OUTSIDE_HOURS_WIDGET);
		expect(parseKonamiFacilityPage(aobadai).live).toEqual({ kind: 'outside_hours' });
	});

	test.each([
		['congestion-thresshold1', 1],
		['congestion-thresshold2', 2],
		['congestion-thresshold3', 3],
	] as const)('reads a business-hours reading with %s', (levelClass, level) => {
		expect(parseKonamiFacilityPage(withWidget('【18:30現在】', levelClass)).live).toEqual({ kind: 'reading', asOf: '18:30', level });
	});

	test.each([
		['a reading with the hidden level', '【18:30現在】', 'congestion-thresshold0'],
		['an unknown level', '【18:30現在】', 'congestion-thresshold4'],
		['outside hours with a visible level', '【営業時間外】', 'congestion-thresshold2'],
		['unexpected text', '【混雑】', 'congestion-thresshold3'],
	])('reports %s as unrecognized instead of guessing', (_, text, levelClass) => {
		expect(parseKonamiFacilityPage(withWidget(text, levelClass)).live.kind).toBe('unrecognized');
	});

	test('reports a page without the widget as absent', () => {
		expect(parseKonamiFacilityPage(juniorSchool).live).toEqual({ kind: 'absent' });
	});

	test('reads the regular hours, including which range applies on public holidays', () => {
		expect(parseKonamiFacilityPage(aobadai).regularHours).toEqual([
			{ weekdays: [1, 3, 4, 5], holidays: false, opensAt: '10:00', closesAt: '23:00' },
			{ weekdays: [6, 0], holidays: true, opensAt: '10:00', closesAt: '21:00' },
		]);
		expect(parseKonamiFacilityPage(shibuya).regularHours).toEqual([
			{ weekdays: [1, 2, 3, 4], holidays: false, opensAt: '10:00', closesAt: '23:00' },
			{ weekdays: [6], holidays: false, opensAt: '10:00', closesAt: '21:00' },
			{ weekdays: [0], holidays: true, opensAt: '10:00', closesAt: '20:00' },
		]);
	});

	test('refuses hours it cannot read rather than guessing', () => {
		const odd = aobadai.replace('[月水木金] 10:00～23:00', '[平日] 10:00～23:00');
		expect(parseKonamiFacilityPage(odd).regularHours).toBeNull();
	});

	test('reads the official notes, including facility-specific closing times', () => {
		const page = parseKonamiFacilityPage(aobadai);
		expect(page.notes).toContainEqual({
			title: 'マシンジム・プール',
			text: 'マシンジム及びプールのご利用時間/月・水・木・金=22:50/土日祝=20:50',
		});
		expect(page.closingDaysText).toBe('毎週火曜日、お盆、年末年始等');
	});

	test('reads the two-month calendar with its closed days', () => {
		const { calendar } = parseKonamiFacilityPage(aobadai);
		expect(Object.keys(calendar)).toHaveLength(61);
		expect(calendar['2026-11-03']).toEqual({ closure: 'regular', notice: null });
		expect(calendar['2026-11-04']).toEqual({ closure: null, notice: null });
		expect(calendar['2026-12-30']).toEqual({ closure: 'extra', notice: null });
		expect(calendar['2027-01-01']).toBeUndefined();
	});

	test('reads notice days, which may announce closures without a closed-day mark', () => {
		const { calendar } = parseKonamiFacilityPage(juniorSchool);
		expect(calendar['2026-12-29']).toEqual({ closure: null, notice: '休館日となります。' });
		expect(calendar['2026-11-30']).toEqual({ closure: null, notice: '体操スクールは,休講となります。' });
	});

	test('reads the special business-hours table', () => {
		const { specialDays } = parseKonamiFacilityPage(aobadai);
		expect(specialDays['2026-12-28']).toEqual({ status: 'normal', opensAt: '10:00', closesAt: '23:00', note: '通常営業' });
		expect(specialDays['2027-01-01']).toEqual({ status: 'closed', opensAt: null, closesAt: null, note: '年末年始特別休館' });
	});

	test('lists news titles that may change opening hours', () => {
		const withNotice = aobadai.replace(
			'運動を始めたい人におすすめ!',
			'【重要】【クラブ会員様】施設利用時間のご案内/10月29日(木)～11月3日(火・祝)',
		);
		expect(parseKonamiFacilityPage(aobadai).scheduleNotices).toEqual([]);
		expect(parseKonamiFacilityPage(withNotice).scheduleNotices).toEqual([
			expect.stringContaining('施設利用時間のご案内/10月29日(木)～11月3日(火・祝)'),
		]);
	});
});
