import { Radar } from 'lucide-react';
import { Accordion } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import type { GymEvaluation, WorkoutPlan } from '@/lib/types';
import { DataNotes } from './DataNotes';
import { BOARD_GRID, GymRow } from './GymRow';
import { PlanBar } from './PlanBar';
import { RecommendationHero } from './RecommendationHero';

/** Plain, serializable data: the page renders on the server and hydrates in the browser. */
export type DashboardProps = {
	/** The moment the page was computed, so relative times match between server and browser. */
	nowIso: string;
	clock: string;
	dateLabel: string;
	holiday: string | null;
	plan: WorkoutPlan;
	departValue: string;
	leaving: string;
	/** Every favorite gym, in personal priority order. */
	evaluations: GymEvaluation[];
	primaryId: string | null;
	explanation: string;
};

export function Dashboard({ nowIso, clock, dateLabel, holiday, plan, departValue, leaving, evaluations, primaryId, explanation }: DashboardProps) {
	const now = new Date(nowIso);
	const primary = evaluations.find((evaluation) => evaluation.gym.id === primaryId) ?? null;
	// Both lists keep the saved priority order; unsuitable gyms only move to their own section.
	const available = evaluations.filter((evaluation) => evaluation.suitability.kind !== 'unsuitable');
	const unavailable = evaluations.filter((evaluation) => evaluation.suitability.kind === 'unsuitable');

	return (
		<main className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:py-10">
			<header className="flex items-end justify-between gap-4">
				<div className="flex items-center gap-2">
					<Radar className="size-7" strokeWidth={2.25} aria-hidden />
					<h1 className="font-display text-3xl leading-none font-bold tracking-[0.08em] uppercase">GymRadar</h1>
				</div>
				<div className="text-right">
					<div className="font-display text-4xl leading-none font-semibold tabular-nums">
						{clock}
						<span className="ml-1 text-sm font-medium text-muted-foreground">JST</span>
					</div>
					<div className="mt-1 flex items-center justify-end gap-2 text-xs text-muted-foreground">
						{holiday && <Badge variant="secondary">{holiday} · holiday</Badge>}
						{dateLabel}
					</div>
				</div>
			</header>

			<PlanBar plan={plan} departValue={departValue} />

			<RecommendationHero primary={primary} explanation={explanation} plan={plan} leaving={leaving} now={now} />

			{evaluations.length === 0 && (
				<p className="text-muted-foreground">No favorite gyms yet. Add them, in order of preference, in src/config/gyms.ts.</p>
			)}
			{available.length > 0 && (
				<Board title="Your gyms" note="In your priority order. Conditions never change it." evaluations={available} plan={plan} now={now} primaryId={primaryId} />
			)}
			{unavailable.length > 0 && (
				<Board
					title="Not available for this workout"
					note="Closed, or the workout doesn't fit."
					evaluations={unavailable}
					plan={plan}
					now={now}
					primaryId={primaryId}
					offset={available.length}
				/>
			)}

			<DataNotes />
		</main>
	);
}

type BoardProps = {
	title: string;
	note: string;
	evaluations: GymEvaluation[];
	plan: WorkoutPlan;
	now: Date;
	primaryId: string | null;
	offset?: number;
};

function Board({ title, note, evaluations, plan, now, primaryId, offset = 0 }: BoardProps) {
	return (
		<section className="space-y-2">
			<div className="flex flex-wrap items-baseline justify-between gap-x-4">
				<h2 className="font-display text-xl font-semibold tracking-[0.06em] uppercase">{title}</h2>
				<p className="text-xs text-muted-foreground">{note}</p>
			</div>
			<div aria-hidden className={`${BOARD_GRID} hidden gap-x-4 px-4 text-[0.65rem] font-semibold tracking-[0.14em] text-muted-foreground uppercase md:grid`}>
				<span />
				<span>Gym</span>
				<span>Today</span>
				<span>Occupancy</span>
				<span>Travel</span>
				<span>Weather</span>
				<span />
			</div>
			<Accordion type="multiple" className="gap-2">
				{evaluations.map((evaluation, index) => (
					<GymRow
						key={evaluation.gym.id}
						evaluation={evaluation}
						plan={plan}
						now={now}
						recommended={evaluation.gym.id === primaryId}
						index={offset + index}
					/>
				))}
			</Accordion>
		</section>
	);
}
