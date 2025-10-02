import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { schemaProps, responseSchema } from '../shared.ts'
import type { MetricDocument } from './types.ts'
import { getUnitType, convertMetrics, convertToBase, convertFromBase } from './unit-converter.ts'

export const getMetricsByUnitTypeHandlerSchema = {
	querystring: {
		type: 'object',
		required: ['userId', 'unitType'],
		properties: {
			userId: schemaProps.userId,
			unitType: schemaProps.unitType,
			sort: schemaProps.sort,
			toUnit: schemaProps.unit,
		},
	},
	...responseSchema,
}

export async function getMetricsByUnitTypeHandler(this: FastifyInstance, request: FastifyRequest, reply: FastifyReply) {
	const { metricsCollectionName } = this.config
	const { userId, unitType, sort, toUnit } = request.query as {
		userId: string
		unitType: (typeof schemaProps.unitType.enum)[number]
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
		const result = await metrics.find({ userId, unitType }).sort({ createdAt: sortBy }).toArray()
		if (toUnit && unitType) {
			const convertedMetrics = convertMetrics(result, unitType, toUnit, convertToBase, convertFromBase)
			return { success: true, data: convertedMetrics }
		}
		return { success: true, data: result }
	} catch (error) {
		return reply.status(500).send({ success: false, message: 'Failed to get metrics', error })
	}
}
