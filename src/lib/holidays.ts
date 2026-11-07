import type { IsoDate } from './time.ts';

// Japanese public holidays, including substitute holidays and citizens' holidays (listed as 「休日」).
// Source: Cabinet Office, https://www8.cao.go.jp/chosei/shukujitsu/syukujitsu.csv (retrieved 2026-11-03).
// The Cabinet Office publishes the following year's dates each February; add them here when they appear.
const HOLIDAYS: Record<IsoDate, string> = {
	'2026-01-01': '元日',
	'2026-01-12': '成人の日',
	'2026-02-11': '建国記念の日',
	'2026-02-23': '天皇誕生日',
	'2026-03-20': '春分の日',
	'2026-04-29': '昭和の日',
	'2026-05-03': '憲法記念日',
	'2026-05-04': 'みどりの日',
	'2026-05-05': 'こどもの日',
	'2026-05-06': '休日',
	'2026-07-20': '海の日',
	'2026-08-11': '山の日',
	'2026-09-21': '敬老の日',
	'2026-09-22': '休日',
	'2026-09-23': '秋分の日',
	'2026-10-12': 'スポーツの日',
	'2026-11-03': '文化の日',
	'2026-11-23': '勤労感謝の日',
	'2027-01-01': '元日',
	'2027-01-11': '成人の日',
	'2027-02-11': '建国記念の日',
	'2027-02-23': '天皇誕生日',
	'2027-03-21': '春分の日',
	'2027-03-22': '休日',
	'2027-04-29': '昭和の日',
	'2027-05-03': '憲法記念日',
	'2027-05-04': 'みどりの日',
	'2027-05-05': 'こどもの日',
	'2027-07-19': '海の日',
	'2027-08-11': '山の日',
	'2027-09-20': '敬老の日',
	'2027-09-23': '秋分の日',
	'2027-10-11': 'スポーツの日',
	'2027-11-03': '文化の日',
	'2027-11-23': '勤労感謝の日',
};

const COVERAGE = { from: '2026-01-01', to: '2027-12-31' };

/**
 * The holiday's name, `null` if `date` is not a public holiday, or `undefined` if `date` is outside
 * the data's coverage (so whether it is a holiday is unknown).
 */
export function japaneseHolidayName(date: IsoDate): string | null | undefined {
	if (date < COVERAGE.from || date > COVERAGE.to) return undefined;
	return HOLIDAYS[date] ?? null;
}
