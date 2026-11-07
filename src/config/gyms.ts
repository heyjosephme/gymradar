import type { FavoriteGym, WorkoutArea } from '../lib/types.ts';

/**
 * Your favorite gyms in personal priority order: the first entry is your first choice.
 * GymRadar only reads this list. Daily conditions never reorder it.
 *
 * EXAMPLE DATA: replace the gyms, order, and travel times with your own.
 * - nameJa: optional name for the Japanese UI (/ja/); `name` is used otherwise.
 * - konamiFacilityCode: from the official page URL, e.g. https://information.konamisportsclub.jp/ksc/004446/
 * - coordinates: used for weather only.
 * - areas: copy each area's last-use rule from the official page's 営業時間 notes (quoted below).
 *   Leave out areas the gym doesn't have.
 */
export const favoriteGyms: readonly FavoriteGym[] = Object.freeze([
	{
		id: 'meguro-aobadai',
		name: 'Meguro Aobadai',
		nameJa: '目黒青葉台',
		konamiFacilityCode: '004446',
		coordinates: { latitude: 35.648915, longitude: 139.692906 },
		travel: { minutes: 10, mode: 'walking' },
		// 「マシンジム及びプールのご利用時間/月・水・木・金=22:50/土日祝=20:50」 with closing at 23:00 / 21:00.
		areas: { gym: { lastUseMinutesBeforeClose: 10 }, pool: { lastUseMinutesBeforeClose: 10 } },
	},
	{
		id: 'shibuya',
		name: 'Shibuya',
		nameJa: '渋谷',
		konamiFacilityCode: '007871',
		coordinates: { latitude: 35.657692, longitude: 139.691345 },
		travel: { minutes: 20, mode: 'walking' },
		// [マシンジム・プール]「ご利用最終時間は、営業終了時間(最終チェックアウト時間)の15分前となります。」
		areas: { gym: { lastUseMinutesBeforeClose: 15 }, pool: { lastUseMinutesBeforeClose: 15 } },
	},
	{
		id: 'ebisu',
		name: 'Ebisu',
		nameJa: '恵比寿',
		konamiFacilityCode: '006023',
		coordinates: { latitude: 35.650189, longitude: 139.712659 },
		travel: { minutes: 15, mode: 'bicycling' },
		// [運動エリア]「ご利用最終時間は、営業終了時間(最終チェックアウト時間)の30分前となります。」
		areas: { gym: { lastUseMinutesBeforeClose: 30 } },
	},
]);

/** Your usual workout. The dashboard form can change it for a single visit. */
export const defaultWorkout: { area: WorkoutArea; durationMinutes: number } = { area: 'gym', durationMinutes: 60 };
