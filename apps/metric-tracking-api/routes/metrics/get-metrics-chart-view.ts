import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import type { Collection, WithId } from 'mongodb'
import { responseSchema, schemaProps } from '../shared.ts'
import type { MetricDocument } from './types.ts'
import { convertFromBase, convertMetrics, convertToBase, getUnitType } from './unit-converter.ts'

export const getMetricsChartViewHandlerSchema = {
	querystring: {
		type: 'object',
		required: ['userId', 'unitType', 'startDate'],
		properties: {
			userId: schemaProps.userId,
			unitType: schemaProps.unitType,
			unit: schemaProps.unit,
			startDate: schemaProps.isoDateOnlyStr,
			endDate: { ...schemaProps.isoDateOnlyStr, default: getUTCEndOfDay().toISOString().split('T')[0] },
			sort: schemaProps.sort,
			toUnit: schemaProps.unit,
		},
	},
	...responseSchema,
}

export async function getMetricsChartViewHandler(this: FastifyInstance, request: FastifyRequest, reply: FastifyReply) {
	const { metricsCollectionName } = this.config
	const { userId, unitType, unit, startDate, endDate, sort, toUnit } = request.query as {
		userId: string
		unitType: (typeof schemaProps.unitType.enum)[number]
		unit?: (typeof schemaProps.unit.enum)[number]
		startDate: string
		endDate: string
		sort?: (typeof schemaProps.sort.enum)[number]
		toUnit?: (typeof schemaProps.unit.enum)[number]
	}
	const sortBy = sort === 'asc' ? 1 : -1

	if (unit && getUnitType(unit) !== unitType) {
		return reply.status(400).send({ success: false, message: 'Invalid `unit`: must be compatible with `unitType`' })
	}

	if (toUnit && getUnitType(toUnit) !== unitType) {
		return reply.status(400).send({ success: false, message: 'Invalid `toUnit`: must be compatible with `unitType`' })
	}

	const metrics = request.server.mongo.db?.collection<MetricDocument>(metricsCollectionName)
	if (!metrics) {
		return reply.status(500).send({ success: false, message: 'Database connection error' })
	}

	try {
		const result = await getChartMetrics(metrics, userId, unitType, unit, startDate, getUTCEndOfDay(endDate).toISOString(), sortBy)
		if (toUnit) {
			const convertedMetrics = convertMetrics(result as WithId<MetricDocument>[], unitType, toUnit, convertToBase, convertFromBase)
			return { success: true, data: convertedMetrics }
		}
		return { success: true, data: result }
	} catch (error) {
		return reply.status(500).send({ success: false, message: `Failed to get metrics`, error })
	}
}

function getUTCEndOfDay(isoDateOnlyStr = ''): Date {
	if (isoDateOnlyStr.length > 0 && isoDateOnlyStr.length !== 10) {
		throw new Error('Invalid ISO date only string')
	}
	// Append 'T00:00:00.000Z' to force UTC interpretation to prevent local time zone offsets from shifting the date forward/backward.
	const date = isoDateOnlyStr.length === 10 ? new Date(isoDateOnlyStr + 'T00:00:00.000Z') : new Date()
	date.setUTCHours(23, 59, 59, 999)
	return date
}

async function getChartMetrics(
	metrics: Collection<MetricDocument>,
	userId: string,
	unitType: string,
	unit: string | undefined,
	startDate: string,
	endDate: string,
	sortBy: 1 | -1 /* asc | desc */
) {
	const pipeline = [
		// Stage 1: Filter by userId, unitType, unit, and date range
		{
			$match: unit
				? {
						userId,
						unitType,
						unit,
						createdAt: {
							$gte: startDate,
							$lte: endDate,
						},
				  }
				: {
						userId,
						unitType,
						createdAt: {
							$gte: startDate,
							$lte: endDate,
						},
				  },
		},
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

	try {
		const result = await metrics.aggregate(pipeline).toArray()
		return result
	} catch (err) {
		throw new Error('Failed to aggregate metrics', { cause: err })
	}
}
