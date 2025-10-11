import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { distanceUnits, responseSchema, schemaProps, temperatureUnits } from '../shared.ts'
import type { MetricDocument } from './types.ts'

export const createMetricHandlerSchema = {
	body: {
		type: 'object',
		required: ['userId', 'unit', 'value'],
		properties: {
			userId: schemaProps.userId,
			unit: schemaProps.unit,
			value: { type: 'number' },
			createdAt: schemaProps.isoDateStr,
		},
	},
	...responseSchema({
		type: 'object',
		properties: { acknowledged: { type: 'boolean' }, insertedId: { type: 'string' } },
	}),
}

export async function createMetricHandler(this: FastifyInstance, request: FastifyRequest, reply: FastifyReply) {
	const { metricsCollectionName } = this.config
	const { userId, unit, value, createdAt } = request.body as {
		userId: string
		unit: (typeof schemaProps.unit.enum)[number]
		value: number
		createdAt: string // createdAt ?? schemaProps.isoDateStr.default
	}

	let unitType: MetricDocument['unitType']
	if (distanceUnits.includes(unit)) {
		unitType = 'distance'
	} else if (temperatureUnits.includes(unit)) {
		unitType = 'temperature'
	} else {
		return reply.status(400).send({ success: false, message: 'Invalid `unit`: cannot find a compatible unit type' })
	}

	const metrics = this.mongo.db?.collection<MetricDocument>(metricsCollectionName)
	if (!metrics) {
		return reply.status(500).send({ success: false, message: 'Database connection error' })
	}

	const now = new Date().toISOString()
	const metric = { userId, unitType, unit, value, createdAt: createdAt ?? now, updatedAt: now, schemaVersion: 1 } satisfies MetricDocument

	try {
		const result = await metrics.insertOne(metric)
		return { success: true, message: 'Metric created successfully', data: result }
	} catch (error) {
		return reply.status(500).send({ success: false, message: 'Failed to create metric', error })
	}
}
