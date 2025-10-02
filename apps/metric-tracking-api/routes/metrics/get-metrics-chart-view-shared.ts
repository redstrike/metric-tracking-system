import type { MetricDocument } from './types.ts'

export function getUTCEndOfDay(isoDateOnlyStr = ''): Date {
	if (isoDateOnlyStr.length > 0 && isoDateOnlyStr.length !== 10) {
		throw new Error('Invalid ISO date only string')
	}
	// Append 'T00:00:00.000Z' to force UTC interpretation to prevent local time zone offsets from shifting the date forward/backward.
	const date = isoDateOnlyStr.length === 10 ? new Date(isoDateOnlyStr + 'T00:00:00.000Z') : new Date()
	date.setUTCHours(23, 59, 59, 999)
	return date
}

export const sharedPipelineStages = (sortBy: 1 | -1 /* asc or desc */) => [
	// Stage 2: Sort by createdAt descending to prepare for grouping
	{
		$sort: {
			createdAt: -1,
		},
	},
	// Stage 3: Convert createdAt string to Date object for accurate date grouping
	{
		$addFields: {
			createdAtDate: { $toDate: '$createdAt' },
		},
	},
	// Stage 4: Group by date (year-month-day) and get the latest entry for each day
	{
		$group: {
			_id: {
				$dateToString: {
					format: '%Y-%m-%d',
					date: '$createdAtDate',
				},
			},
			latestMetric: { $first: '$$ROOT' },
		},
	},
	// Stage 5: Project the desired fields
	{
		$project: {
			_id: '$latestMetric._id',
			userId: '$latestMetric.userId',
			unit: '$latestMetric.unit',
			unitType: '$latestMetric.unitType' as 'distance' | 'temperature',
			value: '$latestMetric.value' as unknown as number,
			createdAt: '$latestMetric.createdAt',
		} satisfies MetricDocument,
	},
	// Stage 6: Sort the final results by createdAt in the requested order
	{
		$sort: {
			createdAt: sortBy,
		},
	},
]
