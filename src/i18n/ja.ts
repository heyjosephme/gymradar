import type { WorkoutArea } from '../lib/types.ts';
import type { Messages } from './en.ts';
import type { Crowd, Fit, Timing } from './types.ts';

// WMO weather interpretation codes.
const WEATHER: Record<number, string> = {
	0: '快晴',
	1: '晴れ',
	2: '晴れ時々くもり',
	3: 'くもり',
	45: '霧',
	48: '霧',
	51: '弱い霧雨',
	53: '霧雨',
	55: '強い霧雨',
	56: '着氷性の霧雨',
	57: '着氷性の霧雨',
	61: '小雨',
	63: '雨',
	65: '大雨',
	66: '着氷性の雨',
	67: '着氷性の雨',
	71: '小雪',
	73: '雪',
	75: '大雪',
	77: '霧雪',
	80: '弱いにわか雨',
	81: 'にわか雨',
	82: '激しいにわか雨',
	85: 'にわか雪',
	86: '激しいにわか雪',
	95: '雷雨',
	96: 'ひょうを伴う雷雨',
	99: 'ひょうを伴う雷雨',
};

const AREA: Record<WorkoutArea, string> = { gym: 'マシンジム', pool: 'プール' };

const timing = (t: Timing) => (t.kind === 'open' ? '営業中' : t.kind === 'opens_at' ? `${t.time}に開館` : '到着時には営業中');
const fit = (f: Fit) => `${AREA[f.area]}の利用終了${f.closesAt}までに、${f.duration}分のトレーニングが収まります`;
const reading = (crowd: Pick<Crowd, 'level' | 'asOf'>) => `公式レベル${crowd.level}/3・${crowd.asOf}時点`;
const ranked = (gym: string, rank: number) => `${gym}（第${rank}候補）`;

export const ja: Messages = {
	dateLocale: 'ja-JP',
	joinSentences: (sentences) => sentences.join(''),
	gymName: (gym) => gym.nameJa ?? gym.name,
	area: AREA,
	areaShort: { gym: 'ジム', pool: 'プール' },
	travelMode: { walking: '徒歩', bicycling: '自転車', transit: '電車・バス', driving: '車' },
	weather: (code) => WEATHER[code] ?? '不明',
	minutesAgo: (minutes) => {
		if (minutes < 1) return 'たった今';
		if (minutes < 60) return `${minutes}分前`;
		const hours = Math.floor(minutes / 60);
		return minutes % 60 === 0 ? `${hours}時間前` : `${hours}時間${minutes % 60}分前`;
	},

	schedule: {
		specialClosed: (note) => `公式の特別営業情報：「${note}」。`,
		specialWithoutHours: (note) => `公式の特別営業情報に「${note}」とありますが、営業時間の記載がありません。`,
		outsideCalendar: (date) => `${date}は公式の営業カレンダーの範囲外です。`,
		regularClosingDay: (rule) => `公式カレンダーで定休日です${rule ? `（${rule}）` : ''}。`,
		extraClosure: (notice) => `公式カレンダーで臨時休館日です${notice ? `：「${notice}」` : ''}。`,
		noticeClosure: (notice) => `公式カレンダーのお知らせ：「${notice}」。`,
		noticeUnknown: (notice) => `公式カレンダーにこの日のお知らせがありますが、GymRadarでは解釈できません：「${notice}」。`,
		holidayDataMissing: (date) => `GymRadarの祝日データが${date}に対応していないため、適用される営業時間を判断できません。`,
		hoursUnreadable: '公式の営業時間を読み取れませんでした。',
		noHours: (holiday) => `公式の営業時間に${holiday ? '祝休日' : 'この曜日'}の記載がありません。`,
		severalHours: (holiday) => `公式の営業時間に${holiday ? '祝休日' : 'この曜日'}の時間帯が複数あります。`,
		pageUnavailable: (error) => `公式ページを読み込めませんでした（${error}）。`,
	},

	availability: {
		opensAt: (time) => `${time}に開館します。`,
		closedAt: (time) => `本日は${time}に閉館しました。`,
		openUntil: (time) => `${time}まで営業しています。`,
		specialHours: '特別営業時間です。',
		holidayHours: (holiday) => `祝日の営業時間です（${holiday}）。`,
		readingOnClosedDay: (asOf) => `ただし、館内利用状況に${asOf}時点の表示があり、営業している可能性があります。`,
		outsideHoursWhileOpen: (closesAt) =>
			`公式の営業時間では${closesAt}まで営業中ですが、館内利用状況は「営業時間外」と表示されています。臨時休館の可能性があります。`,
	},

	suitability: {
		noArea: (area) => `このジムには${AREA[area]}がありません。`,
		closedBeforeArrival: (closesAt, arrival) => `${closesAt}に閉館しますが、到着は${arrival}になります。`,
		notEnoughTime: (area, closesAt, start, available, duration) =>
			`${AREA[area]}の利用終了は${closesAt}です。${start}に始めると、予定の${duration}分のうち${available}分しか使えません。`,
	},

	occupancy: {
		closed: '現在は閉館中のため、混雑状況は対象外です。',
		pageUnavailable: '公式ページを読み込めませんでした。',
		noWidget: 'この施設のページには館内利用状況の表示がありません。',
		outsideHours: '館内利用状況は「営業時間外」です。',
		unrecognized: (text) => `館内利用状況の表示を認識できません：${text}`,
		futureTimestamp: (asOf) => `公式の時刻（${asOf}）が現在時刻より先のため、情報の鮮度が分かりません。`,
	},

	occupancyLabel: {
		quiet: '空いている',
		moderate: 'やや混雑',
		busy: '混雑',
		not_applicable: '対象外',
		unknown: '不明',
	},

	source: {
		official_realtime: { short: '公式', long: '公式（リアルタイム）' },
		official_periodic: { short: '公式', long: '公式（チェックイン状況から算出、約30分ごとに更新）' },
		official_prediction: { short: '予測', long: '公式の予測' },
		personal_observation: { short: '自分', long: 'あなたの記録' },
		unknown: { short: 'なし', long: '混雑情報の提供元なし' },
	},

	badge: {
		openNow: '営業中',
		opensAt: (time) => `${time}開館`,
		closedForToday: '本日の営業終了',
		closedToday: '本日休館',
		conflicting: '情報が食い違い',
		unconfirmed: '未確認',
		fits: '条件に合う',
		checkBeforeGoing: '行く前に確認',
		unsuitable: {
			regular_closing_day: '定休日',
			special_closure: '特別休館',
			temporary_closure: '臨時休館',
			outside_operating_hours: '到着前に閉館',
			facility_unavailable: '設備なし',
			insufficient_time: '時間が足りない',
		},
	},

	explain: {
		remainsTop: (gym) => `${gym}が引き続き第一候補です。`,
		promoted: (gym, rank) => `${ranked(gym, rank)}が自動的に最優先のおすすめになりました。`,
		busy: (t, crowd) => `現在は混雑していますが（${reading(crowd)}）、${timing(t)}で、あなたの優先順位にも合っています。`,
		calm: (t, crowd) => `${timing(t)}で、現在は${crowd.status === 'quiet' ? '空いています' : 'やや混んでいます'}（${reading(crowd)}）。`,
		fits: (f) => `${fit(f)}。`,
		openAndFits: (t, f) => `${timing(t)}で、${fit(f)}。`,
		withoutOccupancy: 'このおすすめは、現在の混雑情報を使わずに判断しています。',
		staleReading: (level, asOf) => `最新の公式情報（${reading({ level, asOf })}）は古くなっています。`,
		noOccupancyData: '混雑情報がありません。',
		unconfirmed: (gym, rank, detail) =>
			`${rank === null ? gym : ranked(gym, rank)}は休館が確認されていない中で最も優先順位が高いジムですが、営業状況を確認できませんでした。${detail}行く前に確認してください。`,
		confirmedAlternative: (gym, rank) => `営業が確認できている中では、${ranked(gym, rank)}が最優先です。`,
		noConfirmedAlternative: 'ほかに条件に合うことが確認できたジムもありません。',
		latestReading: (level, asOf) => `最新の公式混雑情報は${reading({ level, asOf })}です。`,
		excluded: (gym, why) => {
			switch (why.kind) {
				case 'regular_closing_day':
					return `${gym}は本日、定休日です。`;
				case 'special_closure':
					return `${gym}は本日、特別休館です。`;
				case 'temporary_closure':
					return `${gym}は本日、臨時休館です。`;
				case 'closed_for_today':
					return `${gym}は本日の営業を終了しました（${why.closedAt}閉館）。`;
				case 'closed_by_arrival':
					return `${gym}は到着までに閉館します（${why.closesAt}閉館）。`;
				case 'no_area':
					return `${gym}には${AREA[why.area]}がありません。`;
				case 'not_enough_time':
					return `${gym}は${AREA[why.area]}の利用終了が${why.closesAt}のため、${why.duration}分のトレーニングには時間が足りません。`;
			}
		},
		noneFits: (duration, area, departAt) => `${departAt}に出発して${duration}分の${AREA[area]}トレーニングができるジムはありません。`,
		noGyms: 'お気に入りのジムが設定されていません。',
	},

	ui: {
		themeToggle: 'ダークモードの切り替え',
		languages: '言語',
		holiday: (name) => `${name}（祝日）`,
		workout: 'トレーニング',
		minutes: '時間（分）',
		leaveAt: '出発',
		blankIsNow: '空欄＝今すぐ',
		update: '更新',
		nextUp: 'おすすめ',
		planSummary: (duration, area, leaving) => `${AREA[area]}で${duration}分・${leaving}`,
		leaveNow: '今すぐ出発',
		leaveAtTime: (time) => `${time}に出発`,
		noGymFits: 'この条件に合うジムはありません',
		areaCloses: (area) => `${area}の利用終了`,
		occupancy: '混雑状況',
		travelBy: (mode) => `移動（${mode}）`,
		weather: '天気',
		unavailable: '取得できません',
		yourGyms: 'お気に入りのジム',
		yourGymsNote: '優先順位の順に表示しています。状況によって順番は変わりません。',
		notAvailable: 'このトレーニングには利用できません',
		notAvailableNote: '休館中、またはトレーニングが収まりません。',
		noFavorites: 'お気に入りのジムがまだありません。src/config/gyms.ts に優先順位の順で追加してください。',
		columns: { gym: 'ジム', today: '本日', occupancy: '混雑', travel: '移動', weather: '天気' },
		personalPriority: '優先順位',
		officialPageFor: (gym) => `${gym}の公式ページ`,
		detailsFor: (gym) => `${gym}の詳細`,
		noArea: (area) => `${AREA[area]}なし`,
		areaUntil: (area, time) => `${area} ${time}まで`,
		travelMinutes: (minutes) => `${minutes}分`,
		rainChance: '3時間以内の降水確率',
		stale: '古い情報',
		noReading: '情報なし',
		timeUnknown: '時刻不明',
		details: {
			availability: '営業状況',
			workout: 'トレーニング',
			occupancy: '混雑状況',
			weather: '天気',
			notices: '営業時間に関わる可能性のある公式のお知らせ',
			notes: '公式の注記',
			directions: '経路',
			officialPage: '公式ページ',
			fetchedAt: (time) => `${time}に取得`,
			notFetched: '公式ページを取得できませんでした',
			startAt: (start, waits, minutes, area) =>
				`${start}${waits ? '（開館時）' : ''}に開始でき、${AREA[area]}の利用終了まで${minutes}分あります。`,
			source: (source) => `${source}。`,
			readingAt: (time, ago) => `${time}時点の情報です（${ago}）。`,
			staleNote: '古い情報のため、現在の混雑を反映していない可能性があります。',
			weatherLine: (description, temperature, chance, time) =>
				`${description}、${temperature}℃、3時間以内の降水確率${chance}%（Open-Meteo、${time}）。`,
		},
		about: 'データについて',
		aboutItems: [
			'混雑状況はコナミ公式の「館内利用状況」で、チェックイン状況から算出されています（実際の人数ではありません）。3段階で約30分ごとに更新され、実際の状況と異なる場合があります。60分以上前の情報は「古い情報」と表示します。',
			'営業時間と休館日は各施設の公式ページと内閣府の祝日一覧によります。公式の営業時間がない日は「未確認」とし、営業中とはみなしません。',
			'移動時間はあなたが設定した目安です。天気はOpen-Meteoによります。',
			'詳細と制限事項：docs/konami-data-sources.md',
		],
	},
};
