import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { responseSchema, schemaProps } from '../shared.ts'
import type { MetricDocument } from './types.ts'
import { convertFromBase, convertMetrics, convertToBase, getUnitType } from './unit-converter.ts'

export const getMetricsHandlerSchema = {
	querystring: {
		type: 'object',
		required: ['userId', 'unit'],
		properties: {
			userId: schemaProps.userId,
			unit: schemaProps.unit,
			sort: schemaProps.sort,
			toUnit: schemaProps.unit,
		},
	},
	...responseSchema,
}

export async function getMetricsHandler(this: FastifyInstance, request: FastifyRequest, reply: FastifyReply) {
	const { metricsCollectionName } = this.config
	const { userId, unit, sort, toUnit } = request.query as {
		userId: string
		unit: (typeof schemaProps.unit.enum)[number]
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
		const result = await metrics.find({ userId, unit }).sort({ createdAt: sortBy }).toArray()
		if (toUnit && unitType) {
			const convertedMetrics = convertMetrics(result, unitType, toUnit, convertToBase, convertFromBase)
			return { success: true, data: convertedMetrics }
		}
		return { success: true, data: result }
	} catch (error) {
		return reply.status(500).send({ success: false, message: 'Failed to get metrics', error })
	}
}
