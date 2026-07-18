import db from './db';
import { sql } from 'drizzle-orm';

export interface EffectiveObservation {
	date: string;
	value: number;
	dimensions: string;
}

/**
 * Executes a deterministic CTE query to retrieve the active observations for a metric.
 * Resolves overlapping date conflicts by picking the value from the latest completed import batch (completedAt DESC, id DESC).
 */
export async function getEffectiveObservations(
	sourceId: string,
	metricId: string,
	startDate?: string,
	endDate?: string
): Promise<EffectiveObservation[]> {
	// Build where conditions safely using Drizzle SQL chunks
	const conditions = [
		sql`o.source_id = ${sourceId}`,
		sql`o.metric_id = ${metricId}`,
		sql`b.status = 'completed'`,
		sql`b.reverted_at IS NULL`
	];

	if (startDate) {
		conditions.push(sql`o.date >= ${startDate}`);
	}

	if (endDate) {
		conditions.push(sql`o.date <= ${endDate}`);
	}

	// Dynamic CTE query using Drizzle SQL template literals
	const query = sql`
		WITH ranked_observations AS (
			SELECT 
				o.date,
				o.value,
				o.dimensions,
				ROW_NUMBER() OVER (
					PARTITION BY o.date, o.dimensions, o.metric_id 
					ORDER BY b.completed_at DESC, o.id DESC
				) as rn
			FROM metric_observations o
			INNER JOIN import_batches b ON o.import_batch_id = b.id
			WHERE ${sql.join(conditions, sql` AND `)}
		)
		SELECT date, value, dimensions
		FROM ranked_observations
		WHERE rn = 1
		ORDER BY date ASC
	`;

	const results = await db.all<EffectiveObservation>(query);
	return results;
}
