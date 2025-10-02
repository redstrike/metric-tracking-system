import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import type { Collection, WithId } from 'mongodb'
import { responseSchema, schemaProps } from '../shared.ts'
import { getUTCEndOfDay, sharedPipelineStages } from './get-metrics-chart-view-shared.ts'
import type { MetricDocument } from './types.ts'
import { convertFromBase, convertMetrics, convertToBase, getUnitType } from './unit-converter.ts'

export const getMetricsChartViewByUnitTypeHandlerSchema = {
	querystring: {
		type: 'object',
		required: ['userId', 'unitType', 'startDate'],
		properties: {
			userId: schemaProps.userId,
			unitType: schemaProps.unitType,
			startDate: schemaProps.isoDateOnlyStr,
			endDate: { ...schemaProps.isoDateOnlyStr, default: getUTCEndOfDay().toISOString().split('T')[0] },
			sort: schemaProps.sort,
			toUnit: schemaProps.unit,
		},
	},
	...responseSchema,
}

export async function getMetricsChartViewByUnitTypeHandler(this: FastifyInstance, request: FastifyRequest, reply: FastifyReply) {
	const { metricsCollectionName } = this.config
	const { userId, unitType, startDate, endDate, sort, toUnit } = request.query as {
		userId: string
		unitType: (typeof schemaProps.unitType.enum)[number]
		startDate: string
		endDate: string
		sort: (typeof schemaProps.sort.enum)[number]
		toUnit?: (typeof schemaProps.unit.enum)[number]
	}
	const sortBy = sort === 'asc' ? 1 : -1

	if (toUnit) {
		const toUnitType = getUnitType(toUnit)
		if (unitType !== toUnitType) {
			return reply.status(400).send({ success: false, message: 'Invalid `toUnit`: must be the same unit type as the original unit' })
		}
	}

	const metrics = request.server.mongo.db?.collection<MetricDocument>(metricsCollectionName)
	if (!metrics) {
		return reply.status(500).send({ success: false, message: 'Database connection error' })
	}

	try {
		const result = await getChartMetricsByUnitType(metrics, userId, unitType, startDate, getUTCEndOfDay(endDate).toISOString(), sortBy)
		if (toUnit && unitType) {
			const convertedMetrics = convertMetrics(result as WithId<MetricDocument>[], unitType, toUnit, convertToBase, convertFromBase)
			return { success: true, data: convertedMetrics }
		}
		return { success: true, data: result }
	} catch (error) {
		return reply.status(500).send({ success: false, message: `Failed to get metrics`, error })
	}
}

async function getChartMetricsByUnitType(
	metrics: Collection<MetricDocument>,
	userId: string,
	unitType: string,
	startDate: string,
	endDate: string,
	sortBy: 1 | -1 // asc or desc
) {
	const pipeline = [
		// Stage 1: Filter by userId, unitType, and date range
		{
			$match: {
				userId,
				unitType,
				createdAt: {
					$gte: startDate,
					$lte: endDate,
				},
			},
		},
		...sharedPipelineStages(sortBy),
	]

	try {
		const result = await metrics.aggregate(pipeline).toArray()
		return result
	} catch (err) {
		throw new Error('Failed to aggregate metrics', { cause: err })
	}
}
