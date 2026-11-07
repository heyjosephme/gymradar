import type { ReactNode } from 'react';
import { Droplets } from 'lucide-react';
import { cn } from 'cn';
import { AREA_LABEL } from '@/lib/availability';
import { AREA_SHORT_LABEL, availabilityBadge, TRAVEL_MODE_LABEL } from '@/lib/present';
import type { GymEvaluation, WorkoutPlan } from '@/lib/types';
import { AREA_ICON, TRAVEL_ICON, weatherIcon } from './icons';
import { OccupancyMeter } from './OccupancyMeter';
import { PriorityBadge } from './PriorityBadge';
import { StatusBadge } from './StatusBadge';

type Props = {
	primary: GymEvaluation | null;
	explanation: string;
	plan: WorkoutPlan;
	leaving: string;
	now: Date;
};

/** The "next departure" panel: where to go, why, and the few facts that matter on the way out. */
export function RecommendationHero({ primary, explanation, plan, leaving, now }: Props) {
	const AreaIcon = AREA_ICON[plan.area];

	return (
		<section aria-labelledby="recommendation" className="flap-in overflow-hidden rounded-xl bg-card ring-2 ring-foreground">
			<div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 bg-foreground px-5 py-2 text-background">
				<span className="font-display text-sm font-semibold tracking-[0.2em] uppercase">Next up</span>
				<span className="flex items-center gap-1.5 text-xs tabular-nums">
					<AreaIcon className="size-3.5" aria-hidden />
					{plan.durationMinutes} min {AREA_LABEL[plan.area]} · {leaving}
				</span>
			</div>

			<div className="space-y-5 p-5">
				{primary ? (
					<div className="flex items-center gap-4">
						<PriorityBadge rank={primary.rank} size="lg" />
						<div className="min-w-0">
							<h2 id="recommendation" className="font-display text-4xl leading-none font-bold sm:text-5xl">
								<a href={`#gym-${primary.gym.id}`} className="hover:underline">
									{primary.gym.name}
								</a>
							</h2>
							<div className="mt-2 flex flex-wrap gap-2">
								<StatusBadge badge={availabilityBadge(primary.availability)} />
								{primary.suitability.kind === 'unknown' && (
									<StatusBadge badge={{ tone: 'warning', icon: 'alert', label: 'Check before going' }} />
								)}
							</div>
						</div>
					</div>
				) : (
					<h2 id="recommendation" className="font-display text-4xl leading-none font-bold sm:text-5xl">
						No gym fits this plan
					</h2>
				)}

				{primary && <Facts evaluation={primary} plan={plan} now={now} />}

				<p className="max-w-[68ch] text-sm leading-relaxed text-muted-foreground">{explanation}</p>
			</div>
		</section>
	);
}

function Facts({ evaluation, plan, now }: { evaluation: GymEvaluation; plan: WorkoutPlan; now: Date }) {
	const { gym, availability, suitability, occupancy, weather } = evaluation;
	const AreaIcon = AREA_ICON[plan.area];
	const TravelIcon = TRAVEL_ICON[gym.travel.mode];
	const WeatherIcon = weather ? weatherIcon(weather.code) : null;
	const closing = suitability.kind === 'suitable' ? suitability.facilityClosingTime : availability.facilityClosingTime;

	return (
		<dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg bg-border ring-1 ring-border sm:grid-cols-4">
			<Fact label={`${AREA_SHORT_LABEL[plan.area]} closes`}>
				<AreaIcon className="size-5 shrink-0 text-muted-foreground" aria-hidden />
				<span className="font-display text-2xl font-semibold tabular-nums">{closing ?? '—'}</span>
			</Fact>
			<Fact label="Occupancy">
				<OccupancyMeter occupancy={occupancy} now={now} size="lg" />
			</Fact>
			<Fact label={`Travel ${TRAVEL_MODE_LABEL[gym.travel.mode]}`}>
				<TravelIcon className="size-5 shrink-0 text-muted-foreground" aria-hidden />
				<span className="font-display text-2xl font-semibold tabular-nums">{gym.travel.minutes} min</span>
			</Fact>
			<Fact label="Weather">
				{weather && WeatherIcon ? (
					<>
						<WeatherIcon className="size-5 shrink-0 text-muted-foreground" aria-hidden />
						<span className="font-display text-2xl font-semibold tabular-nums">{Math.round(weather.temperatureC)}°</span>
						<span className="flex items-center gap-0.5 text-xs text-muted-foreground tabular-nums">
							<Droplets className="size-3.5" aria-hidden />
							{weather.precipitationChanceNext3h ?? '—'}%
						</span>
					</>
				) : (
					<span className="text-muted-foreground">Unavailable</span>
				)}
			</Fact>
		</dl>
	);
}

function Fact({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
	return (
		<div className={cn('bg-card px-4 py-3', className)}>
			<dt className="text-[0.65rem] font-semibold tracking-[0.14em] text-muted-foreground uppercase">{label}</dt>
			<dd className="mt-1 flex min-h-8 items-center gap-2">{children}</dd>
		</div>
	);
}
