/** Calendar date in Japan, "YYYY-MM-DD". */
export type IsoDate = string;
/** Wall-clock time in Japan, "HH:MM" (24-hour). */
export type ClockTime = string;

// Japan has no daylight saving time, so a fixed offset is exact.
const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

export type JstMoment = {
	date: IsoDate;
	/** Minutes since midnight, Japan time. */
	minutes: number;
	/** 0 = Sunday … 6 = Saturday. */
	weekday: number;
};

export function toJst(instant: Date): JstMoment {
	const shifted = new Date(instant.getTime() + JST_OFFSET_MS);
	return {
		date: shifted.toISOString().slice(0, 10),
		minutes: shifted.getUTCHours() * 60 + shifted.getUTCMinutes(),
		weekday: shifted.getUTCDay(),
	};
}

export function weekdayOf(date: IsoDate): number {
	return new Date(`${date}T00:00:00Z`).getUTCDay();
}

/** The instant at which a Japan wall-clock time occurs on a Japan calendar date. */
export function jstInstant(date: IsoDate, time: ClockTime): Date {
	return new Date(`${date}T${time}:00+09:00`);
}

export function parseClock(time: ClockTime): number {
	const [hours, minutes] = time.split(':').map(Number);
	return hours * 60 + minutes;
}

export function formatClock(minutes: number): ClockTime {
	return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

/** The Japan wall-clock time of an instant (ISO 8601 string or Date). */
export function jstClock(instant: string | Date): ClockTime {
	return formatClock(toJst(new Date(instant)).minutes);
}
