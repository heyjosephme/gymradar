import { AREA_LABEL } from './availability.ts';
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
export function recommend(evaluations: readonly GymEvaluation[], plan: WorkoutPlan): Recommendation {
	const byRank = [...evaluations].sort((a, b) => a.rank - b.rank);
	const index = byRank.findIndex((evaluation) => evaluation.suitability.kind !== 'unsuitable');
	if (index === -1) {
		return { primary: null, confirmedAlternative: null, skipped: byRank, explanation: noneSuitable(byRank, plan) };
	}
	const primary = byRank[index];
	const skipped = byRank.slice(0, index);
	const confirmedAlternative =
		primary.suitability.kind === 'unknown'
			? (byRank.slice(index + 1).find((evaluation) => evaluation.suitability.kind === 'suitable') ?? null)
			: null;
	return { primary, confirmedAlternative, skipped, explanation: explain(primary, skipped, confirmedAlternative, plan) };
}

function explain(
	primary: GymEvaluation,
	skipped: GymEvaluation[],
	alternative: GymEvaluation | null,
	plan: WorkoutPlan,
): string {
	const sentences = exclusions(skipped, plan);
	const name = skipped.length === 0 ? primary.gym.name : `${primary.gym.name} (your #${primary.rank})`;
	const { suitability, occupancy } = primary;
	const crowd = crowdReading(occupancy);

	// The primary gym is never confirmed unsuitable, so this branch is the unconfirmed case.
	if (suitability.kind !== 'suitable') {
		sentences.push(
			`${name} is your highest-priority gym that isn't confirmed closed, but its availability couldn't be confirmed. ${suitability.detail} Check before going.`,
			alternative
				? `${alternative.gym.name} (your #${alternative.rank}) is your highest-priority confirmed option.`
				: 'None of your other gyms is confirmed suitable either.',
			crowd ? `Its latest official occupancy reading is ${crowd}.` : withoutOccupancy(occupancy, false),
		);
		return sentences.join(' ');
	}

	sentences.push(skipped.length === 0 ? `${name} remains your top choice.` : `${name} has automatically become your top recommendation.`);
	const timing = suitability.waitsForOpening
		? `it opens at ${primary.availability.openingTime}`
		: primary.availability.status === 'open'
			? 'it is open'
			: 'it will be open when you arrive';
	const area = AREA_LABEL[plan.area];
	const fit = `your ${plan.durationMinutes}-minute ${area} workout fits before the ${area} closes at ${suitability.facilityClosingTime}`;
	if (crowd && occupancy.status === 'busy') {
		sentences.push(`Although it is currently busy (official ${crowd}), ${timing} and matches your personal preference.`, `${capitalize(fit)}.`);
	} else if (crowd) {
		const level = occupancy.status === 'quiet' ? 'quiet' : 'moderately busy';
		sentences.push(`${capitalize(timing)} and currently ${level} (official ${crowd}).`, `${capitalize(fit)}.`);
	} else {
		sentences.push(`${capitalize(timing)}, and ${fit}.`, withoutOccupancy(occupancy));
	}
	return sentences.join(' ');
}

function noneSuitable(evaluations: GymEvaluation[], plan: WorkoutPlan): string {
	if (evaluations.length === 0) return 'No favorite gyms are configured.';
	return [
		`None of your gyms fits a ${plan.durationMinutes}-minute ${AREA_LABEL[plan.area]} workout leaving at ${formatClock(plan.departMinutes)}.`,
		...exclusions(evaluations, plan),
	].join(' ');
}

function exclusions(evaluations: GymEvaluation[], plan: WorkoutPlan): string[] {
	return evaluations.flatMap(({ gym, suitability, availability }) =>
		suitability.kind === 'unsuitable' ? [`${gym.name} ${whyExcluded(suitability, availability, plan)}.`] : [],
	);
}

function whyExcluded(
	suitability: Extract<Suitability, { kind: 'unsuitable' }>,
	availability: GymAvailability,
	plan: WorkoutPlan,
): string {
	const area = AREA_LABEL[plan.area];
	switch (suitability.reason) {
		case 'regular_closing_day':
			return 'is closed today (regular closing day)';
		case 'special_closure':
			return 'is closed today (special closure)';
		case 'temporary_closure':
			return 'is closed today (temporary closure)';
		case 'outside_operating_hours':
			return availability.reason === 'after_closing'
				? `has closed for today (it closed at ${availability.closingTime})`
				: `is closed by the time you would arrive (it closes at ${availability.closingTime})`;
		case 'facility_unavailable':
			return `has no ${area}`;
		case 'insufficient_time':
			return `is unavailable for your planned workout because its ${area} closes at ${availability.facilityClosingTime}, too early for ${plan.durationMinutes} minutes`;
	}
}

/** "level 2 of 3 as of 18:30" for a fresh official reading, otherwise null. */
function crowdReading(occupancy: GymOccupancy): string | null {
	if (occupancy.officialLevel === null || occupancy.observedAt === null || occupancy.stale) return null;
	return `level ${occupancy.officialLevel} of 3 as of ${jstClock(occupancy.observedAt)}`;
}

function withoutOccupancy(occupancy: GymOccupancy, giveReason = true): string {
	if (!giveReason) return 'This recommendation was made without current occupancy information.';
	const why =
		occupancy.note ??
		(occupancy.stale && occupancy.observedAt
			? `The latest official reading (level ${occupancy.officialLevel} of 3 as of ${jstClock(occupancy.observedAt)}) is stale.`
			: 'No occupancy data is available.');
	return `This recommendation was made without current occupancy information. ${why}`;
}

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
