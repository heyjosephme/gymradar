import {
	Bike,
	Car,
	Cloud,
	CloudDrizzle,
	CloudFog,
	CloudLightning,
	CloudRain,
	CloudSnow,
	CloudSun,
	Dumbbell,
	Footprints,
	Sun,
	TramFront,
	Waves,
	type LucideIcon,
} from 'lucide-react';
import type { TravelMode, WorkoutArea } from '@/lib/types';

export const AREA_ICON: Record<WorkoutArea, LucideIcon> = { gym: Dumbbell, pool: Waves };

export const TRAVEL_ICON: Record<TravelMode, LucideIcon> = {
	walking: Footprints,
	bicycling: Bike,
	transit: TramFront,
	driving: Car,
};

/** An icon for a WMO weather interpretation code. */
export function weatherIcon(code: number): LucideIcon {
	if (code <= 1) return Sun;
	if (code === 2) return CloudSun;
	if (code === 45 || code === 48) return CloudFog;
	if (code >= 51 && code <= 57) return CloudDrizzle;
	if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return CloudRain;
	if ((code >= 71 && code <= 77) || code === 85 || code === 86) return CloudSnow;
	if (code >= 95) return CloudLightning;
	return Cloud;
}
