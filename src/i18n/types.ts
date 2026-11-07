import type { WorkoutArea } from '../lib/types.ts';

// What the domain logic wants to say, as data. Each locale turns these into whole sentences, so
// word order can follow the language instead of an English template.

/** When the recommended gym can be used. */
export type Timing = { kind: 'open' } | { kind: 'opens_at'; time: string } | { kind: 'open_on_arrival' };

/** A fresh official occupancy reading. */
export type Crowd = { status: 'quiet' | 'moderate' | 'busy'; level: number; asOf: string };

/** The planned workout fitting before the area's last-use time. */
export type Fit = { duration: number; area: WorkoutArea; closesAt: string };

/** Why a higher-priority gym was passed over. */
export type Exclusion =
	| { kind: 'regular_closing_day' | 'special_closure' | 'temporary_closure' }
	| { kind: 'closed_for_today'; closedAt: string | null }
	| { kind: 'closed_by_arrival'; closesAt: string | null }
	| { kind: 'no_area'; area: WorkoutArea }
	| { kind: 'not_enough_time'; area: WorkoutArea; closesAt: string | null; duration: number };
