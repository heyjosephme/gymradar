import { Info } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useMessages } from './messages';

export function DataNotes() {
	const m = useMessages();
	return (
		<Accordion type="single" collapsible>
			<AccordionItem value="about">
				<AccordionTrigger className="text-muted-foreground">
					<span className="flex items-center gap-2">
						<Info className="size-4" aria-hidden />
						{m.ui.about}
					</span>
				</AccordionTrigger>
				<AccordionContent>
					<ul className="list-disc space-y-1.5 pl-5 text-muted-foreground">
						{m.ui.aboutItems.map((item) => (
							<li key={item}>{item}</li>
						))}
					</ul>
				</AccordionContent>
			</AccordionItem>
		</Accordion>
	);
}
