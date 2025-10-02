import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import type { Collection, WithId } from 'mongodb'
import { responseSchema, schemaProps } from '../shared.ts'
import { getUTCEndOfDay, sharedPipelineStages } from './get-metrics-chart-view-shared.ts'
import type { MetricDocument } from './types.ts'
import { convertFromBase, convertMetrics, convertToBase, getUnitType } from './unit-converter.ts'

export const getMetricsChartViewHandlerSchema = {
	querystring: {
		type: 'object',
		required: ['userId', 'unit', 'startDate'],
		properties: {
			userId: schemaProps.userId,
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
	const { userId, unit, startDate, endDate, sort, toUnit } = request.query as {
		userId: string
		unit: (typeof schemaProps.unit.enum)[number]
		startDate: string
		endDate: string
		sort: (typeof schemaProps.sort.enum)[number]
		toUnit?: (typeof schemaProps.unit.enum)[number]
	}
	const sortBy = sort === 'asc' ? 1 : -1

	let unitType: string | undefined
	if (toUnit && toUnit !== unit) {
		const originalUnitType = getUnitType(unit)
		const toUnitType = getUnitType(toUnit)
		if (originalUnitType !== toUnitType) {
			return reply.status(400).send({ success: false, message: 'Invalid `toUnit`: must be the same unit type as the original unit' })
		}
		unitType = originalUnitType
	}

	const metrics = request.server.mongo.db?.collection<MetricDocument>(metricsCollectionName)
	if (!metrics) {
		return reply.status(500).send({ success: false, message: 'Database connection error' })
	}

	try {
		const result = await getChartMetricsByUnit(metrics, userId, unit, startDate, getUTCEndOfDay(endDate).toISOString(), sortBy)
		if (toUnit && unitType) {
			const convertedMetrics = convertMetrics(result as WithId<MetricDocument>[], unitType, toUnit, convertToBase, convertFromBase)
			return { success: true, data: convertedMetrics }
		}
		return { success: true, data: result }
	} catch (error) {
		return reply.status(500).send({ success: false, message: `Failed to get metrics`, error })
	}
}

async function getChartMetricsByUnit(
	metrics: Collection<MetricDocument>,
	userId: string,
	unit: string,
	startDate: string,
	endDate: string,
	sortBy: 1 | -1 // asc or desc
) {
	const pipeline = [
		// Stage 1: Filter by userId, unit, and date range
		{
			$match: {
				userId,
				unit,
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
