import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { distanceUnits, responseSchema, schemaProps, temperatureUnits } from '../shared.ts'
import type { MetricDocument } from './types.ts'

export const createMetricHandlerSchema = {
	body: {
		type: 'object',
		required: ['userId', 'unit', 'value', 'createdAt'],
		properties: {
			userId: schemaProps.userId,
			unit: schemaProps.unit,
			value: { type: 'number' },
			createdAt: schemaProps.isoDateStr,
		},
	},
	...responseSchema,
}

export async function createMetricHandler(this: FastifyInstance, request: FastifyRequest, reply: FastifyReply) {
	const { metricsCollectionName } = this.config
	const { unit } = request.body as Omit<MetricDocument, 'unitType'>

	let unitType: MetricDocument['unitType']
	if (distanceUnits.includes(unit)) {
		unitType = 'distance'
	} else if (temperatureUnits.includes(unit)) {
		unitType = 'temperature'
	} else {
		return reply.status(400).send({ success: false, message: 'Invalid unit or unit type (distance or temperature)' })
	}

	const metrics = request.server.mongo.db?.collection<MetricDocument>(metricsCollectionName)
	if (!metrics) {
		return reply.status(500).send({ success: false, message: 'Database connection error' })
	}

	const metric = { ...(request.body as MetricDocument), unitType }

	try {
		const result = await metrics.insertOne(metric)
		return { success: true, message: 'Metric created successfully', data: result }
	} catch (error) {
		return reply.status(500).send({ success: false, message: 'Failed to create metric', error })
	}
}
