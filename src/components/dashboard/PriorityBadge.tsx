import { cn } from 'cn';
import { useMessages } from './messages';

/** Your personal priority, styled like a station-number sign. Conditions never change it. */
export function PriorityBadge({ rank, size = 'default' }: { rank: number; size?: 'default' | 'lg' }) {
	const m = useMessages();
	return (
		<div
			className={cn(
				'flex shrink-0 items-center justify-center rounded-md border-[3px] border-foreground bg-card font-display leading-none font-bold tabular-nums',
				size === 'lg' ? 'size-16 text-4xl' : 'size-11 text-2xl',
			)}
		>
			<span className="sr-only">{m.ui.personalPriority} </span>
			<span aria-hidden className="text-[0.5em] text-muted-foreground">
				#
			</span>
			<span>{rank}</span>
		</div>
	);
}
