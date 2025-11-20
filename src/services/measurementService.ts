import type { Measurement } from "@models/dto/Measurement";
import type { Stats } from "@models/dto/Stats";

/**
 * Calculate statistics from the given measrements.
 * If the array is empty, returns 0 for all values.
 * This function does not filter the measurements by date.
 *
 * @param measurements - Array of measurements to calculate statistics from.
 * @param startDate - Optional start date to filter measurements.
 * @param endDate - Optional end date to filter measurements.
 *
 * @returns An object containing the calculated statistics:
 * - mean: The average value of the measurements.
 * - lowerThreshold: The minimum value of the measurements.
 * - upperThreshold: The maximum value of the measurements.
 * - variance: The variance of the measurements.
 */
export function calculateStatistics(
	measurements: Measurement[],
	startDate?: Date,
	endDate?: Date,
): Stats {
	if (!measurements?.length) {
		return { mean: 0, lowerThreshold: 0, upperThreshold: 0, variance: 0 };
	}

	const values = measurements.map((m) => m.value);
	const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
	const variance =
		values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
	const stdDev = Math.sqrt(variance);

	const lowerThreshold = mean - 2 * stdDev;
  	const upperThreshold = mean + 2 * stdDev;

	return {
		...(startDate ? { startDate } : {}),
		...(endDate ? { endDate } : {}),
		mean,
		variance,
		lowerThreshold,
		upperThreshold,
	};
}
