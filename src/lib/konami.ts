import { HTMLElement, parse } from 'node-html-parser';
import type { ClockTime, IsoDate } from './time.ts';

// Parses Konami Sports Club facility pages. The structures used here are documented, with
// evidence, in docs/konami-data-sources.md. Anything unexpected is reported as unrecognized
// rather than guessed.

export const konamiFacilityUrl = (code: string) => `https://information.konamisportsclub.jp/ksc/${code}/`;

/** The page's 館内利用状況 widget. */
export type KonamiLiveStatus =
	| { kind: 'reading'; asOf: ClockTime; level: 1 | 2 | 3 }
	| { kind: 'outside_hours' }
	| { kind: 'unrecognized'; text: string }
	| { kind: 'absent' };

export type KonamiCalendarDay = {
	/** `regular`: 休館日. `extra`: 臨時休館日, which Konami also uses for year-end closures. */
	closure: 'regular' | 'extra' | null;
	/** The day's お知らせ text, if the day has a notice. */
	notice: string | null;
};

/** A row of the 特別営業情報 table (e.g. 年末年始の営業情報). */
export type KonamiSpecialDay = {
	status: 'normal' | 'closed' | 'special' | 'unrecognized';
	opensAt: ClockTime | null;
	closesAt: ClockTime | null;
	note: string;
};

export type KonamiHoursRule = {
	/** 0 = Sunday … 6 = Saturday. */
	weekdays: number[];
	/** Whether the range applies on public holidays (「祝休日」). */
	holidays: boolean;
	opensAt: ClockTime;
	closesAt: ClockTime;
};

export type KonamiFacilityPage = {
	live: KonamiLiveStatus;
	/** Only the days the official calendar covers (the current and next month). */
	calendar: Record<IsoDate, KonamiCalendarDay>;
	specialDays: Record<IsoDate, KonamiSpecialDay>;
	/** Null when any line of the official hours can't be read. */
	regularHours: KonamiHoursRule[] | null;
	/** Free-text notes under the hours, e.g. 「[マシンジム・プール] …22:50…」. */
	notes: { title: string; text: string }[];
	closingDaysText: string | null;
	/** News titles that may announce hours changes. */
	scheduleNotices: string[];
};

const WEEKDAYS = '日月火水木金土';
const SPECIAL_DAY_STATUS: Record<string, KonamiSpecialDay['status']> = {
	まる: 'normal',
	ばつ: 'closed',
	ほし: 'special',
};
const SCHEDULE_NOTICE = /営業時間|利用時間|休館|臨時休/;

export function parseKonamiFacilityPage(html: string): KonamiFacilityPage {
	// The pages write some line breaks as `<br/ >`, which the parser would otherwise keep as text.
	const root = parse(html.replace(/<br\s*\/?\s*>/gi, '<br>'));
	const [hoursParagraph, ...noteParagraphs] = boxWithHeading(root, '営業時間')?.querySelectorAll('p') ?? [];
	return {
		live: parseLiveStatus(root),
		calendar: parseCalendar(root),
		specialDays: parseSpecialDays(root),
		regularHours: hoursParagraph ? parseRegularHours(lines(hoursParagraph)) : null,
		notes: noteParagraphs.map(lines).flatMap(([title = '', ...text]) =>
			/^\[.+\]$/.test(title) ? [{ title: title.slice(1, -1), text: text.join(' ') }] : [],
		),
		closingDaysText: clean(boxWithHeading(root, '休館日')?.querySelector('p')?.text ?? '') || null,
		scheduleNotices: root
			.querySelectorAll('#tab__contents--01 .news__text')
			.map((item) => clean(item.text))
			.filter((title) => SCHEDULE_NOTICE.test(title)),
	};
}

function parseLiveStatus(root: HTMLElement): KonamiLiveStatus {
	const widget = root.querySelector('.congestion');
	if (!widget) return { kind: 'absent' };
	const text = widget.querySelectorAll('li').map((item) => clean(item.text)).find((t) => t.startsWith('【')) ?? '';
	const levelClass = widget.querySelector('.congestion-img')?.classList.value.find((c) => c.startsWith('congestion-thresshold')) ?? '';
	const level = Number(levelClass.match(/^congestion-thresshold(\d)$/)?.[1] ?? NaN);
	const asOf = text.match(/^【(\d{1,2}):(\d{2})現在】$/);
	if (asOf && (level === 1 || level === 2 || level === 3)) {
		return { kind: 'reading', asOf: `${asOf[1].padStart(2, '0')}:${asOf[2]}`, level };
	}
	if (text === '【営業時間外】' && level === 0) return { kind: 'outside_hours' };
	return { kind: 'unrecognized', text: `${text || '(no status text)'} / ${levelClass || '(no level class)'}` };
}

function parseCalendar(root: HTMLElement): Record<IsoDate, KonamiCalendarDay> {
	const days: Record<IsoDate, KonamiCalendarDay> = {};
	for (const month of root.querySelectorAll('#modal__root-calendar .calendar')) {
		const title = month.querySelector('.modal__box__title__text')?.text.match(/(\d{4})年(\d{1,2})月/);
		if (!title) continue;
		for (const cell of month.querySelectorAll('.calendar__body__cell')) {
			const day = clean(cell.text);
			if (!/^\d{1,2}$/.test(day)) continue;
			// Days with a notice are links that pass the notice text to a modal.
			const notice =
				cell.tagName === 'A'
					? (cell.getAttribute('onclick')?.match(/setModalNewsText\(this,\s*'(.*)'\)/)?.[1] ?? '(notice text unavailable)')
					: null;
			days[`${title[1]}-${title[2].padStart(2, '0')}-${day.padStart(2, '0')}`] = {
				closure: cell.classList.contains('is-close--extra') ? 'extra' : cell.classList.contains('is-close') ? 'regular' : null,
				notice,
			};
		}
	}
	return days;
}

function parseSpecialDays(root: HTMLElement): Record<IsoDate, KonamiSpecialDay> {
	const days: Record<IsoDate, KonamiSpecialDay> = {};
	for (const row of root.querySelectorAll('#modal__root-day tbody tr')) {
		const [dateCell, statusCell, hoursCell, noteCell] = row.querySelectorAll('td');
		const date = dateCell?.text.trim().match(/^(\d{4})\.(\d{2})\.(\d{2})/);
		if (!date || !noteCell) continue;
		const hours = parseTimeRange(clean(hoursCell.text));
		days[`${date[1]}-${date[2]}-${date[3]}`] = {
			status: SPECIAL_DAY_STATUS[statusCell.querySelector('img')?.getAttribute('alt') ?? ''] ?? 'unrecognized',
			opensAt: hours?.opensAt ?? null,
			closesAt: hours?.closesAt ?? null,
			note: clean(noteCell.text),
		};
	}
	return days;
}

/** Lines like 「[月水木金] 10:00～23:00」 and 「[土日・祝休日] 10:00～21:00」. */
function parseRegularHours(hoursLines: string[]): KonamiHoursRule[] | null {
	const rules = hoursLines.map((line): KonamiHoursRule | null => {
		const match = line.match(/^\[([日月火水木金土]*)(・?祝休日)?\]\s*(.+)$/);
		const range = match && parseTimeRange(match[3]);
		if (!match || !range) return null;
		return { weekdays: [...match[1]].map((day) => WEEKDAYS.indexOf(day)), holidays: Boolean(match[2]), ...range };
	});
	return rules.length > 0 && rules.every((rule) => rule !== null) ? rules : null;
}

function parseTimeRange(text: string): { opensAt: ClockTime; closesAt: ClockTime } | null {
	const match = text.match(/^(\d{1,2}):(\d{2})\s*[～〜~-]\s*(\d{1,2}):(\d{2})$/);
	if (!match) return null;
	const opensAt = `${match[1].padStart(2, '0')}:${match[2]}`;
	const closesAt = `${match[3].padStart(2, '0')}:${match[4]}`;
	// Overnight hours don't occur on these pages; refuse them rather than misread them.
	return closesAt > opensAt ? { opensAt, closesAt } : null;
}

function boxWithHeading(root: HTMLElement, heading: string): HTMLElement | undefined {
	return root.querySelectorAll('h3').find((h) => clean(h.text) === heading)?.parentNode ?? undefined;
}

/** The element's text split at `<br>`s, blank lines removed. */
function lines(element: HTMLElement): string[] {
	const result = [''];
	for (const node of element.childNodes) {
		if (node instanceof HTMLElement && node.tagName === 'BR') result.push('');
		else result[result.length - 1] += node.text;
	}
	return result.map(clean).filter(Boolean);
}

const clean = (text: string) => text.replace(/\s+/g, ' ').trim();

export type KonamiFetchResult =
	| { ok: true; page: KonamiFacilityPage; retrievedAt: Date }
	| { ok: false; error: string };

// Official readings change at most every ~30 minutes, so a short cache keeps requests to Konami rare.
const CACHE_MS = 5 * 60_000;
const FAILURE_CACHE_MS = 60_000;
const USER_AGENT = 'GymRadar/0.1 (personal gym dashboard; low request rate)';
const cache = new Map<string, { result: KonamiFetchResult; expiresAt: number }>();

export async function fetchKonamiFacility(code: string): Promise<KonamiFetchResult> {
	const url = konamiFacilityUrl(code);
	const cached = cache.get(url);
	if (cached && cached.expiresAt > Date.now()) return cached.result;
	let result: KonamiFetchResult;
	try {
		const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(10_000) });
		if (!response.ok) throw new Error(`HTTP ${response.status}`);
		result = { ok: true, page: parseKonamiFacilityPage(await response.text()), retrievedAt: new Date() };
	} catch (error) {
		result = { ok: false, error: error instanceof Error ? error.message : String(error) };
	}
	cache.set(url, { result, expiresAt: Date.now() + (result.ok ? CACHE_MS : FAILURE_CACHE_MS) });
	return result;
}
