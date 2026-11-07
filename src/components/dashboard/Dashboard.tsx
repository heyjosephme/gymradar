import { Moon, Radar, Sun } from 'lucide-react';
import { cn } from 'cn';
import { Accordion } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LOCALE_NAMES, messages, type Locale } from '@/i18n';
import type { GymEvaluation, WorkoutPlan } from '@/lib/types';
import { DataNotes } from './DataNotes';
import { BOARD_GRID, GymRow } from './GymRow';
import { MessagesProvider, useMessages } from './messages';
import { PlanBar } from './PlanBar';
import { RecommendationHero } from './RecommendationHero';

/** Plain, serializable data: the page renders on the server and hydrates in the browser. */
export type DashboardProps = {
	locale: Locale;
	/** This page in each language, keeping the current plan. */
	localeUrls: Record<Locale, string>;
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

export function Dashboard(props: DashboardProps) {
	return (
		<MessagesProvider value={messages[props.locale]}>
			<DashboardBody {...props} />
		</MessagesProvider>
	);
}

function DashboardBody({
	locale,
	localeUrls,
	nowIso,
	clock,
	dateLabel,
	holiday,
	plan,
	departValue,
	leaving,
	evaluations,
	primaryId,
	explanation,
}: DashboardProps) {
	const m = useMessages();
	const now = new Date(nowIso);
	const primary = evaluations.find((evaluation) => evaluation.gym.id === primaryId) ?? null;
	// Both lists keep the saved priority order; unsuitable gyms only move to their own section.
	const available = evaluations.filter((evaluation) => evaluation.suitability.kind !== 'unsuitable');
	const unavailable = evaluations.filter((evaluation) => evaluation.suitability.kind === 'unsuitable');

	return (
		<main className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:py-10">
			<div className="flex items-center justify-end gap-2">
				<LanguageSwitch locale={locale} localeUrls={localeUrls} />
				<ThemeToggle />
			</div>

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
						{holiday && <Badge variant="secondary">{m.ui.holiday(holiday)}</Badge>}
						{dateLabel}
					</div>
				</div>
			</header>

			<PlanBar plan={plan} departValue={departValue} />

			<RecommendationHero primary={primary} explanation={explanation} plan={plan} leaving={leaving} now={now} />

			{evaluations.length === 0 && <p className="text-muted-foreground">{m.ui.noFavorites}</p>}
			{available.length > 0 && (
				<Board title={m.ui.yourGyms} note={m.ui.yourGymsNote} evaluations={available} plan={plan} now={now} primaryId={primaryId} />
			)}
			{unavailable.length > 0 && (
				<Board
					title={m.ui.notAvailable}
					note={m.ui.notAvailableNote}
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

function LanguageSwitch({ locale, localeUrls }: { locale: Locale; localeUrls: Record<Locale, string> }) {
	const m = useMessages();
	return (
		<nav aria-label={m.ui.languages} className="flex overflow-hidden rounded-md text-xs ring-1 ring-foreground/15">
			{(Object.keys(localeUrls) as Locale[]).map((target) => (
				<a
					key={target}
					href={localeUrls[target]}
					lang={target}
					hrefLang={target}
					aria-current={target === locale ? 'page' : undefined}
					className={cn(
						'px-2.5 py-1 transition-colors',
						target === locale ? 'bg-foreground font-semibold text-background' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
					)}
				>
					{LOCALE_NAMES[target]}
				</a>
			))}
		</nav>
	);
}

/** Light by default. Both icons render and CSS shows the right one, so server and browser agree. */
function ThemeToggle() {
	const m = useMessages();
	return (
		<Button type="button" variant="ghost" size="icon-sm" aria-label={m.ui.themeToggle} onClick={toggleTheme}>
			<Moon className="dark:hidden" />
			<Sun className="hidden dark:block" />
		</Button>
	);
}

function toggleTheme() {
	const dark = document.documentElement.classList.toggle('dark');
	try {
		localStorage.setItem('theme', dark ? 'dark' : 'light');
	} catch {
		// Storage is unavailable (e.g. blocked): the choice lasts until the page reloads.
	}
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
	const m = useMessages();
	return (
		<section className="space-y-2">
			<div className="flex flex-wrap items-baseline justify-between gap-x-4">
				<h2 className="font-display text-xl font-semibold tracking-[0.06em] uppercase">{title}</h2>
				<p className="text-xs text-muted-foreground">{note}</p>
			</div>
			<div aria-hidden className={`${BOARD_GRID} hidden gap-x-4 px-4 text-[0.65rem] font-semibold tracking-[0.14em] text-muted-foreground uppercase md:grid`}>
				<span />
				<span>{m.ui.columns.gym}</span>
				<span>{m.ui.columns.today}</span>
				<span>{m.ui.columns.occupancy}</span>
				<span>{m.ui.columns.travel}</span>
				<span>{m.ui.columns.weather}</span>
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
