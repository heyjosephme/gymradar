import type { CSSProperties, ReactNode } from 'react';
import { Clock3, Droplets, ExternalLink, Navigation } from 'lucide-react';
import { cn } from 'cn';
import { AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { availabilityBadge, directionsUrl, minutesAgo, suitabilityBadge } from '@/lib/present';
import { jstClock } from '@/lib/time';
import type { GymEvaluation, WorkoutPlan } from '@/lib/types';
import { AREA_ICON, TRAVEL_ICON, weatherIcon } from './icons';
import { useMessages } from './messages';
import { OccupancyMeter } from './OccupancyMeter';
import { PriorityBadge } from './PriorityBadge';
import { StatusBadge } from './StatusBadge';

/** Shared with the board's column header so labels line up with the cells. */
export const BOARD_GRID =
	'grid grid-cols-[2.75rem_minmax(0,1fr)_auto] md:grid-cols-[2.75rem_minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1.35fr)_5rem_5.5rem_4.75rem]';

type Props = {
	evaluation: GymEvaluation;
	plan: WorkoutPlan;
	now: Date;
	recommended: boolean;
	/** Position on the board, for the staggered entrance. */
	index: number;
};

export function GymRow({ evaluation, plan, now, recommended, index }: Props) {
	const m = useMessages();
	const { gym, rank, availability, suitability, occupancy, weather } = evaluation;
	const name = m.gymName(gym);
	const AreaIcon = AREA_ICON[plan.area];
	const TravelIcon = TRAVEL_ICON[gym.travel.mode];
	const WeatherIcon = weather ? weatherIcon(weather.code) : null;
	// On the board, unsuitable gyms show why they can't be used; the others show whether they're open.
	const status = suitability.kind === 'unsuitable' ? suitabilityBadge(suitability, m) : availabilityBadge(availability, m);
	const facilityClosing = !gym.areas[plan.area]
		? m.ui.noArea(plan.area)
		: availability.facilityClosingTime && m.ui.areaUntil(m.areaShort[plan.area], availability.facilityClosingTime);

	return (
		<AccordionItem
			value={gym.id}
			id={`gym-${gym.id}`}
			className="flap-in not-last:border-b-0"
			style={{ '--flap-index': index } as CSSProperties}
		>
			<div
				className={cn(
					BOARD_GRID,
					'items-center gap-x-4 gap-y-3 rounded-lg bg-card px-3 py-3 ring-1 ring-foreground/10 sm:px-4',
					recommended && 'ring-2 ring-foreground',
				)}
			>
				<div className="col-start-1 row-start-1">
					<PriorityBadge rank={rank} />
				</div>

				<div className="col-start-2 row-start-1 min-w-0">
					<div className="flex items-center gap-2">
						<h3 className="truncate font-display text-xl leading-tight font-semibold sm:text-2xl">{name}</h3>
						{recommended && <Badge className="font-semibold uppercase">{m.ui.nextUp}</Badge>}
					</div>
					<StatusBadge badge={status} className="mt-1" />
				</div>

				<div className="col-span-3 row-start-2 grid grid-cols-2 gap-x-4 gap-y-3 border-t pt-3 sm:grid-cols-4 md:contents">
					<Cell label={m.ui.columns.today} className="md:col-start-3 md:row-start-1">
						<div className="flex items-center gap-1.5 font-medium tabular-nums">
							<Clock3 className="size-4 shrink-0 text-muted-foreground" aria-hidden />
							{availability.openingTime ? `${availability.openingTime}–${availability.closingTime}` : '—'}
						</div>
						{facilityClosing && (
							<div className="flex items-center gap-1.5 text-xs text-muted-foreground tabular-nums">
								<AreaIcon className="size-3.5 shrink-0" aria-hidden />
								{facilityClosing}
							</div>
						)}
					</Cell>

					<Cell label={m.ui.columns.occupancy} className="md:col-start-4 md:row-start-1">
						<OccupancyMeter occupancy={occupancy} now={now} />
					</Cell>

					<Cell label={m.ui.columns.travel} className="md:col-start-5 md:row-start-1">
						<div className="flex items-center gap-1.5 font-medium tabular-nums">
							<TravelIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
							{m.ui.travelMinutes(gym.travel.minutes)}
						</div>
						<div className="text-xs text-muted-foreground">{m.travelMode[gym.travel.mode]}</div>
					</Cell>

					<Cell label={m.ui.columns.weather} className="md:col-start-6 md:row-start-1">
						{weather && WeatherIcon ? (
							<>
								<div className="flex items-center gap-1.5 font-medium tabular-nums">
									<WeatherIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
									{Math.round(weather.temperatureC)}°
								</div>
								<div className="flex items-center gap-1 text-xs text-muted-foreground tabular-nums">
									<Droplets className="size-3.5 shrink-0" aria-hidden />
									{weather.precipitationChanceNext3h ?? '—'}%<span className="sr-only">{m.ui.rainChance}</span>
								</div>
							</>
						) : (
							<div className="text-muted-foreground">—</div>
						)}
					</Cell>
				</div>

				<div className="col-start-3 row-start-1 flex items-center justify-end gap-0.5 md:col-start-7">
					<Button asChild variant="ghost" size="icon-sm">
						<a href={availability.sourceUrl} target="_blank" rel="noreferrer" aria-label={m.ui.officialPageFor(name)}>
							<ExternalLink />
						</a>
					</Button>
					<AccordionTrigger
						heading={false}
						aria-label={m.ui.detailsFor(name)}
						className="flex-none rounded-md p-2 hover:bg-muted hover:no-underline"
					/>
				</div>
			</div>

			<AccordionContent className="px-1 pt-2 pb-1">
				<RowDetails evaluation={evaluation} plan={plan} now={now} />
			</AccordionContent>
		</AccordionItem>
	);
}

function Cell({ label, className, children }: { label: string; className?: string; children: ReactNode }) {
	return (
		<div className={cn('min-w-0', className)}>
			<div className="mb-0.5 text-[0.65rem] font-semibold tracking-[0.14em] text-muted-foreground uppercase md:sr-only">{label}</div>
			{children}
		</div>
	);
}

/** The long-form explanations, kept out of the board until asked for. */
function RowDetails({ evaluation, plan, now }: { evaluation: GymEvaluation; plan: WorkoutPlan; now: Date }) {
	const m = useMessages();
	const d = m.ui.details;
	const { gym, availability, suitability, occupancy, weather } = evaluation;
	const workout =
		suitability.kind === 'suitable'
			? d.startAt(suitability.startAt, suitability.waitsForOpening, suitability.minutesAvailable, plan.area)
			: suitability.detail;
	const occupancyText = m.joinSentences(
		[
			d.source(m.source[occupancy.source].long),
			occupancy.observedAt && d.readingAt(jstClock(occupancy.observedAt), minutesAgo(occupancy.observedAt, now, m)),
			occupancy.stale && d.staleNote,
			occupancy.note,
		].filter((sentence): sentence is string => Boolean(sentence)),
	);

	return (
		<div className="grid gap-x-6 gap-y-3 rounded-lg bg-muted/50 px-4 py-3 sm:grid-cols-2">
			<Detail label={d.availability}>{availability.detail}</Detail>
			<Detail label={d.workout}>
				<StatusBadge badge={suitabilityBadge(suitability, m)} className="mr-2 mb-1" />
				{workout !== availability.detail && workout}
			</Detail>
			<Detail label={d.occupancy}>{occupancyText}</Detail>
			<Detail label={d.weather}>
				{weather
					? d.weatherLine(
							m.weather(weather.code),
							weather.temperatureC.toFixed(1),
							String(weather.precipitationChanceNext3h ?? '—'),
							jstClock(weather.observedAt),
						)
					: m.ui.unavailable}
			</Detail>

			{evaluation.scheduleNotices.length > 0 && (
				<Detail label={d.notices} className="sm:col-span-2">
					<ul lang="ja" className="list-disc pl-5">
						{evaluation.scheduleNotices.map((notice) => (
							<li key={notice}>{notice}</li>
						))}
					</ul>
				</Detail>
			)}
			{(evaluation.officialNotes.length > 0 || evaluation.closingDaysText) && (
				<Detail label={d.notes} className="sm:col-span-2">
					<ul lang="ja" className="space-y-0.5 text-muted-foreground">
						{evaluation.closingDaysText && <li>[休館日] {evaluation.closingDaysText}</li>}
						{evaluation.officialNotes.map((note) => (
							<li key={note.title}>
								[{note.title}] {note.text}
							</li>
						))}
					</ul>
				</Detail>
			)}

			<div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground sm:col-span-2">
				<a href={directionsUrl(gym.coordinates, gym.travel.mode)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1">
					<Navigation className="size-3.5" aria-hidden />
					{d.directions}
				</a>
				<a href={availability.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1">
					<ExternalLink className="size-3.5" aria-hidden />
					{d.officialPage}
				</a>
				<span>{availability.retrievedAt ? d.fetchedAt(jstClock(availability.retrievedAt)) : d.notFetched}</span>
			</div>
		</div>
	);
}

function Detail({ label, className, children }: { label: string; className?: string; children: ReactNode }) {
	return (
		<div className={className}>
			<div className="mb-0.5 text-[0.65rem] font-semibold tracking-[0.14em] text-muted-foreground uppercase">{label}</div>
			<div>{children}</div>
		</div>
	);
}
