import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { responseSchema, schemaProps } from '../shared.ts'
import type { MetricDocument } from './types.ts'
import { convertFromBase, convertMetrics, convertToBase, getUnitType } from './unit-converter.ts'

export const getMetricsHandlerSchema = {
	querystring: {
		type: 'object',
		required: ['userId', 'unitType'],
		properties: {
			userId: schemaProps.userId,
			unitType: schemaProps.unitType,
			unit: schemaProps.unit,
			sort: schemaProps.sort,
			toUnit: schemaProps.unit,
		},
	},
	...responseSchema,
}

export async function getMetricsHandler(this: FastifyInstance, request: FastifyRequest, reply: FastifyReply) {
	const { metricsCollectionName } = this.config
	const { userId, unitType, unit, sort, toUnit } = request.query as {
		userId: string
		unitType: (typeof schemaProps.unitType.enum)[number]
		unit?: (typeof schemaProps.unit.enum)[number]
		sort?: (typeof schemaProps.sort.enum)[number]
		toUnit?: (typeof schemaProps.unit.enum)[number]
	}
	const sortBy = sort === 'asc' ? 1 : -1

	if (unit && getUnitType(unit) !== unitType) {
		return reply.status(400).send({ success: false, message: 'Invalid `unit`: must be the same as unit type' })
	}

	if (toUnit && getUnitType(toUnit) !== unitType) {
		return reply.status(400).send({ success: false, message: 'Invalid `toUnit`: must be the same as unit type' })
	}

	const metrics = request.server.mongo.db?.collection<MetricDocument>(metricsCollectionName)
	if (!metrics) {
		return reply.status(500).send({ success: false, message: 'Database connection error' })
	}

	try {
		const filter = unit ? { userId, unitType, unit } : { userId, unitType } // Index: userId_text_unitType_text_createdAt_text
		const result = await metrics.find(filter).sort({ createdAt: sortBy }).toArray()
		if (toUnit) {
			const convertedMetrics = convertMetrics(result, unitType, toUnit, convertToBase, convertFromBase)
			return { success: true, data: convertedMetrics }
		}
		return { success: true, data: result }
	} catch (error) {
		return reply.status(500).send({ success: false, message: 'Failed to get metrics', error })
	}
}
