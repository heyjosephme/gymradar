import type { Crowd, Exclusion, Messages, Timing } from '../i18n/index.ts';
import { formatClock, jstClock } from './time.ts';
import type { GymAvailability, GymEvaluation, GymOccupancy, Suitability, WorkoutPlan } from './types.ts';

export type Recommendation = {
	/** The highest-priority gym that isn't confirmed closed or unsuitable for the plan. */
	primary: GymEvaluation | null;
	/** When the primary gym is unconfirmed: the highest-priority gym that is confirmed suitable. */
	confirmedAlternative: GymEvaluation | null;
	/** Higher-priority gyms passed over because they are closed or unsuitable. */
	skipped: GymEvaluation[];
	explanation: string;
};

/**
 * Personal preference decides. Gyms that are confirmed closed or unsuitable are excluded, and the
 * highest-ranked remaining gym is recommended. Occupancy, travel time and weather never reorder
 * the ranking; they only inform the explanation.
 */
export function recommend(evaluations: readonly GymEvaluation[], plan: WorkoutPlan, m: Messages): Recommendation {
	const byRank = [...evaluations].sort((a, b) => a.rank - b.rank);
	const index = byRank.findIndex((evaluation) => evaluation.suitability.kind !== 'unsuitable');
	if (index === -1) {
		return { primary: null, confirmedAlternative: null, skipped: byRank, explanation: noneSuitable(byRank, plan, m) };
	}
	const primary = byRank[index];
	const skipped = byRank.slice(0, index);
	const confirmedAlternative =
		primary.suitability.kind === 'unknown'
			? (byRank.slice(index + 1).find((evaluation) => evaluation.suitability.kind === 'suitable') ?? null)
			: null;
	return { primary, confirmedAlternative, skipped, explanation: explain(primary, skipped, confirmedAlternative, plan, m) };
}

function explain(
	primary: GymEvaluation,
	skipped: GymEvaluation[],
	alternative: GymEvaluation | null,
	plan: WorkoutPlan,
	m: Messages,
): string {
	const sentences = exclusions(skipped, plan, m);
	const gym = m.gymName(primary.gym);
	const { suitability, occupancy } = primary;
	const crowd = crowdReading(occupancy);

	// The primary gym is never confirmed unsuitable, so this branch is the unconfirmed case.
	if (suitability.kind !== 'suitable') {
		sentences.push(
			m.explain.unconfirmed(gym, skipped.length === 0 ? null : primary.rank, suitability.detail),
			alternative ? m.explain.confirmedAlternative(m.gymName(alternative.gym), alternative.rank) : m.explain.noConfirmedAlternative,
			// The detail above already says why the status is unconfirmed; don't repeat it here.
			crowd ? m.explain.latestReading(crowd.level, crowd.asOf) : m.explain.withoutOccupancy,
		);
		return m.joinSentences(sentences);
	}

	sentences.push(skipped.length === 0 ? m.explain.remainsTop(gym) : m.explain.promoted(gym, primary.rank));
	const timing: Timing = suitability.waitsForOpening
		? { kind: 'opens_at', time: primary.availability.openingTime ?? suitability.startAt }
		: primary.availability.status === 'open'
			? { kind: 'open' }
			: { kind: 'open_on_arrival' };
	const fit = { duration: plan.durationMinutes, area: plan.area, closesAt: suitability.facilityClosingTime };
	if (crowd?.status === 'busy') {
		sentences.push(m.explain.busy(timing, crowd), m.explain.fits(fit));
	} else if (crowd) {
		sentences.push(m.explain.calm(timing, crowd), m.explain.fits(fit));
	} else {
		sentences.push(m.explain.openAndFits(timing, fit), m.explain.withoutOccupancy, whyNoOccupancy(occupancy, m));
	}
	return m.joinSentences(sentences);
}

function noneSuitable(evaluations: GymEvaluation[], plan: WorkoutPlan, m: Messages): string {
	if (evaluations.length === 0) return m.explain.noGyms;
	return m.joinSentences([
		m.explain.noneFits(plan.durationMinutes, plan.area, formatClock(plan.departMinutes)),
		...exclusions(evaluations, plan, m),
	]);
}

function exclusions(evaluations: GymEvaluation[], plan: WorkoutPlan, m: Messages): string[] {
	return evaluations.flatMap(({ gym, suitability, availability }) =>
		suitability.kind === 'unsuitable' ? [m.explain.excluded(m.gymName(gym), exclusion(suitability, availability, plan))] : [],
	);
}

function exclusion(suitability: Extract<Suitability, { kind: 'unsuitable' }>, availability: GymAvailability, plan: WorkoutPlan): Exclusion {
	switch (suitability.reason) {
		case 'regular_closing_day':
		case 'special_closure':
		case 'temporary_closure':
			return { kind: suitability.reason };
		case 'outside_operating_hours':
			return availability.reason === 'after_closing'
				? { kind: 'closed_for_today', closedAt: availability.closingTime }
				: { kind: 'closed_by_arrival', closesAt: availability.closingTime };
		case 'facility_unavailable':
			return { kind: 'no_area', area: plan.area };
		case 'insufficient_time':
			return { kind: 'not_enough_time', area: plan.area, closesAt: availability.facilityClosingTime, duration: plan.durationMinutes };
	}
}

/** A fresh official reading, or null when there is no usable one. */
function crowdReading(occupancy: GymOccupancy): Crowd | null {
	const { status, officialLevel, observedAt, stale } = occupancy;
	if (officialLevel === null || observedAt === null || stale) return null;
	if (status !== 'quiet' && status !== 'moderate' && status !== 'busy') return null;
	return { status, level: officialLevel, asOf: jstClock(observedAt) };
}

function whyNoOccupancy(occupancy: GymOccupancy, m: Messages): string {
	if (occupancy.note) return occupancy.note;
	return occupancy.stale && occupancy.observedAt && occupancy.officialLevel !== null
		? m.explain.staleReading(occupancy.officialLevel, jstClock(occupancy.observedAt))
		: m.explain.noOccupancyData;
}
