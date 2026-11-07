import { useState, type ReactNode } from 'react';
import { ArrowRight, Dumbbell, Waves } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import type { WorkoutArea, WorkoutPlan } from '@/lib/types';
import { useMessages } from './messages';

/** The planned workout. A plain GET form, so every plan has a shareable URL. */
export function PlanBar({ plan, departValue }: { plan: WorkoutPlan; departValue: string }) {
	const m = useMessages();
	const [area, setArea] = useState<WorkoutArea>(plan.area);

	return (
		<form method="get" className="flex flex-wrap items-end gap-x-4 gap-y-3 rounded-xl bg-card p-3 ring-1 ring-foreground/10">
			<input type="hidden" name="area" value={area} />
			<Field label={m.ui.workout} group>
				<ToggleGroup
					type="single"
					variant="outline"
					spacing={0}
					value={area}
					onValueChange={(value) => value && setArea(value as WorkoutArea)}
				>
					<ToggleGroupItem value="gym" aria-label={m.area.gym}>
						<Dumbbell /> {m.areaShort.gym}
					</ToggleGroupItem>
					<ToggleGroupItem value="pool" aria-label={m.area.pool}>
						<Waves /> {m.areaShort.pool}
					</ToggleGroupItem>
				</ToggleGroup>
			</Field>
			<Field label={m.ui.minutes}>
				<Input type="number" name="duration" min={15} max={240} step={5} defaultValue={plan.durationMinutes} className="w-20 tabular-nums" />
			</Field>
			<Field label={m.ui.leaveAt} hint={m.ui.blankIsNow}>
				<Input type="time" name="depart" defaultValue={departValue} className="w-28 tabular-nums" />
			</Field>
			<Button type="submit" className="ml-auto">
				{m.ui.update} <ArrowRight data-icon="inline-end" />
			</Button>
		</form>
	);
}

/** A labelled control. `group` labels a set of buttons, which a <label> can't do. */
function Field({ label, hint, group, children }: { label: string; hint?: string; group?: boolean; children: ReactNode }) {
	const Root = group ? 'div' : 'label';
	return (
		<Root className="flex flex-col gap-1" {...(group && { role: 'group', 'aria-label': label })}>
			<span className="text-[0.65rem] font-semibold tracking-[0.14em] text-muted-foreground uppercase" aria-hidden={group}>
				{label}
				{hint && <span className="ml-1.5 font-normal tracking-normal normal-case">{hint}</span>}
			</span>
			{children}
		</Root>
	);
}
