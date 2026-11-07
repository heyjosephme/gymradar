import type { KonamiLiveStatus } from './konami.ts';
import { jstInstant, type IsoDate } from './time.ts';
import type { GymAvailability, GymOccupancy } from './types.ts';

/**
 * Konami's timestamps fall on :00 and :30, which suggests a 30-minute update cycle. A reading
 * older than two cycles means updates have stopped arriving, so it is flagged as stale.
 */
export const STALE_AFTER_MINUTES = 60;
// How far ahead of GymRadar's clock an official timestamp may be before it counts as unreliable.
const CLOCK_SKEW_MINUTES = 5;
// Konami's levels are wordless pictograms with 1, 2 or 3 of 3 figures lit; these labels are GymRadar's.
const LEVEL_STATUS = { 1: 'quiet', 2: 'moderate', 3: 'busy' } as const;

export function konamiOccupancy(input: {
	gymId: string;
	/** Null when the official page couldn't be fetched. */
	live: KonamiLiveStatus | null;
	availability: GymAvailability;
	today: IsoDate;
	now: Date;
	retrievedAt: Date | null;
	sourceUrl: string;
}): GymOccupancy {
	const { live, availability } = input;
	const base = {
		gymId: input.gymId,
		officialLevel: null,
		observedAt: null,
		retrievedAt: input.retrievedAt?.toISOString() ?? null,
		stale: false,
		sourceUrl: input.sourceUrl,
	};
	const unknown = (note: string, source: GymOccupancy['source'] = 'unknown'): GymOccupancy => ({
		...base,
		status: 'unknown',
		source,
		confidence: 'unknown',
		note,
	});
	const notApplicable = (note: string): GymOccupancy => ({
		...base,
		status: 'not_applicable',
		source: live && live.kind !== 'absent' ? 'official_periodic' : 'unknown',
		confidence: 'unknown',
		note,
	});

	// Checked first so a closed gym never shows a crowd level, even if the widget lags behind.
	if (availability.status === 'closed') return notApplicable('Closed now, so occupancy does not apply.');
	if (live === null) return unknown('The official page could not be loaded.');
	if (live.kind === 'absent') return unknown("This facility's page has no occupancy display.");
	if (live.kind === 'outside_hours') return notApplicable('Konami reports 営業時間外 (outside business hours).');
	if (live.kind === 'unrecognized') return unknown(`Unrecognized occupancy display: ${live.text}`, 'official_periodic');

	const reading = {
		...base,
		status: LEVEL_STATUS[live.level],
		officialLevel: live.level,
		source: 'official_periodic' as const,
	};
	const observedAt = jstInstant(input.today, live.asOf);
	const ageMinutes = (input.now.getTime() - observedAt.getTime()) / 60_000;
	if (ageMinutes < -CLOCK_SKEW_MINUTES) {
		return {
			...reading,
			stale: true,
			confidence: 'low',
			note: `The official timestamp (${live.asOf}) is ahead of the current time, so its freshness is unknown.`,
		};
	}
	const stale = ageMinutes > STALE_AFTER_MINUTES;
	// Medium at best: official, but coarse (3 levels), check-in based, and Konami warns it may lag.
	return { ...reading, observedAt: observedAt.toISOString(), stale, confidence: stale ? 'low' : 'medium', note: null };
}
