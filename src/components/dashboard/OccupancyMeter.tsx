import { TriangleAlert } from 'lucide-react';
import { cn } from 'cn';
import { observedText } from '@/lib/present';
import type { GymOccupancy } from '@/lib/types';
import { useMessages } from './messages';

/** Mirrors Konami's pictogram: N of 3 standing figures lit. */
function Figures({ level, stale }: { level: 1 | 2 | 3; stale: boolean }) {
	return (
		<svg viewBox="0 0 30 16" className="h-4 w-[30px] shrink-0" aria-hidden>
			{[0, 1, 2].map((index) => (
				<g
					key={index}
					transform={`translate(${index * 10} 0)`}
					className={cn(
						// One hue: crowding is context, not a verdict. Stale readings drop to gray.
						index < level ? (stale ? 'fill-muted-foreground' : 'fill-meter') : stale ? 'fill-border' : 'fill-meter-track',
					)}
				>
					<circle cx="4" cy="2.6" r="2.4" />
					<rect x="1.2" y="5.8" width="5.6" height="10.2" rx="2" />
				</g>
			))}
		</svg>
	);
}

/** Level, source and freshness of the official reading, or an explicit not-applicable/unknown. */
export function OccupancyMeter({ occupancy, now, size = 'default' }: { occupancy: GymOccupancy; now: Date; size?: 'default' | 'lg' }) {
	const m = useMessages();
	const { officialLevel: level, stale } = occupancy;
	const observed = observedText(occupancy, now, m);

	if (level === null) {
		return (
			<div className="min-w-0">
				<div className={cn('font-medium text-muted-foreground', size === 'lg' && 'text-base')}>{m.occupancyLabel[occupancy.status]}</div>
				<div className="text-xs text-muted-foreground">{m.ui.noReading}</div>
			</div>
		);
	}

	return (
		<div className="min-w-0">
			<div className="flex flex-wrap items-center gap-x-2">
				<Figures level={level} stale={stale} />
				<span className={cn('font-semibold whitespace-nowrap', size === 'lg' && 'text-base')}>{m.occupancyLabel[occupancy.status]}</span>
				<span className="text-xs text-muted-foreground tabular-nums">{level}/3</span>
				{stale && (
					<span className="inline-flex items-center gap-1 text-xs font-semibold">
						<TriangleAlert className="size-3.5 text-warning" strokeWidth={2.5} aria-hidden />
						{m.ui.stale}
					</span>
				)}
			</div>
			<div className="flex items-center gap-1.5 text-xs text-muted-foreground tabular-nums">
				{!stale && <span className="live-dot size-1.5 rounded-full bg-good" aria-hidden />}
				<span>
					{m.source[occupancy.source].short} · <span className="whitespace-nowrap">{observed ?? m.ui.timeUnknown}</span>
				</span>
			</div>
		</div>
	);
}
