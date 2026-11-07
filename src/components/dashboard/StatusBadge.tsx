import { CircleCheck, CircleHelp, CircleX, Clock3, TriangleAlert } from 'lucide-react';
import { cn } from 'cn';
import { Badge } from '@/components/ui/badge';
import type { Badge as BadgeModel } from '@/lib/present';

const ICONS = { check: CircleCheck, x: CircleX, alert: TriangleAlert, help: CircleHelp, clock: Clock3 };
const TONE = {
	good: 'text-good',
	warning: 'text-warning',
	critical: 'text-critical',
	neutral: 'text-muted-foreground',
};

/** A status as icon + label: the color is never the only signal. */
export function StatusBadge({ badge, className }: { badge: BadgeModel; className?: string }) {
	const Icon = ICONS[badge.icon];
	return (
		<Badge variant="outline" className={cn('h-6 gap-1.5 bg-card px-2 font-semibold [&>svg]:size-3.5!', className)}>
			<Icon className={TONE[badge.tone]} strokeWidth={2.5} aria-hidden />
			{badge.label}
		</Badge>
	);
}
