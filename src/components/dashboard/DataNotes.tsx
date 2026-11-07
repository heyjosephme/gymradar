import { Info } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

export function DataNotes() {
	return (
		<Accordion type="single" collapsible>
			<AccordionItem value="about">
				<AccordionTrigger className="text-muted-foreground">
					<span className="flex items-center gap-2">
						<Info className="size-4" aria-hidden />
						About the data
					</span>
				</AccordionTrigger>
				<AccordionContent>
					<ul className="list-disc space-y-1.5 pl-5 text-muted-foreground">
						<li>
							Occupancy is Konami's official 館内利用状況, calculated from check-ins (not a head count): 3 levels, updated
							about every 30 minutes, and it can differ from actual conditions. Readings older than 60 minutes are
							marked stale.
						</li>
						<li>
							Hours and closures come from each club's official page and the Cabinet Office holiday list. Days without
							official hours are unconfirmed, never assumed open.
						</li>
						<li>Travel times are your own estimates. Weather is from Open-Meteo.</li>
						<li>Details and limitations: docs/konami-data-sources.md.</li>
					</ul>
				</AccordionContent>
			</AccordionItem>
		</Accordion>
	);
}
