import { type FastifyInstance, type FastifyPluginOptions } from 'fastify'
import { type AppConfig } from '../plugins/types.ts'

declare module 'fastify' {
	interface FastifyInstance {
		config: AppConfig
	}
}

export default async function (fastify: FastifyInstance, opts: FastifyPluginOptions) {
	const BaseResponseSchema = {
		type: 'object',
		required: ['success'],
		properties: {
			success: { type: 'boolean' },
			message: { type: 'string' },
			data: {}, // {} => allows any valid JSON type (object, array, number, string, boolean, or null)
			error: {},
		},
	} as const

	const RootRouteSchema = {
		GET: {
			response: {
				200: BaseResponseSchema,
			},
		},
	} as const

	fastify.route({
		method: 'GET',
		url: '/',
		schema: RootRouteSchema.GET,
		handler: async (request, reply) => {
			return { success: true, message: 'Metric Tracking API is running' }
		},
	})

	interface MetricDocument {
		_id?: string
		userId: string
		unit: string
		unitType: 'distance' | 'temperature'
		value: number
		createdAt: string
	}

	const distanceUnits = fastify.config.distanceUnits
	const temperatureUnits = fastify.config.temperatureUnits

	const props = {
		userId: { type: 'string', maxLength: 36 },
		unit: { type: 'string', enum: ['m', 'cm', 'inch', 'feet', 'yard', 'c', 'f', 'k'] as const },
		unitType: { type: 'string', enum: ['distance', 'temperature'] as const },
		isoDateStr: {
			type: 'string',
			description: 'ISO 8601 compliance date string. Example: 2025-09-30T20:18:38.111Z',
			format: 'date-time',
		},
		sort: { type: 'string', enum: ['asc', 'desc'] as const },
	} as const

	const metricsCollectionName = fastify.config.metricsCollectionName

	fastify.route({
		method: 'POST',
		url: '/metrics',
		schema: {
			body: {
				type: 'object',
				required: ['userId', 'unit', 'value', 'createdAt'],
				properties: {
					userId: props.userId,
					unit: props.unit,
					value: { type: 'number' },
					createdAt: props.isoDateStr,
				},
			},
			...BaseResponseSchema,
		},
		handler: async (request, reply) => {
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
		},
	})

	fastify.route({
		method: 'GET',
		url: '/metrics',
		schema: {
			querystring: {
				type: 'object',
				required: ['userId', 'unitType'],
				properties: {
					userId: props.userId,
					unitType: props.unitType,
					sort: { ...props.sort, default: 'desc' },
				},
			},
			...BaseResponseSchema,
		},
		handler: async (request, reply) => {
			const { userId, unitType, sort } = request.query as {
				userId: string
				unitType: (typeof props.unitType.enum)[number]
				sort: (typeof props.sort.enum)[number]
			}
			const sortBy = sort === 'asc' ? 1 : -1

			const metrics = request.server.mongo.db?.collection<MetricDocument>(metricsCollectionName)
			if (!metrics) {
				return reply.status(500).send({ success: false, message: 'Database connection error' })
			}

			try {
				const result = await metrics.find({ userId, unitType }).sort({ createdAt: sortBy }).toArray()
				return { success: true, data: result }
			} catch (error) {
				return reply.status(500).send({ success: false, message: 'Failed to get metrics', error })
			}
		},
	})

	fastify.route({
		method: 'GET',
		url: '/metrics-by-unit',
		schema: {
			querystring: {
				type: 'object',
				required: ['userId', 'unit'],
				properties: {
					userId: props.userId,
					unit: props.unit,
					sort: { ...props.sort, default: 'desc' },
				},
			},
			...BaseResponseSchema,
		},
		handler: async (request, reply) => {
			const { userId, unit, sort } = request.query as {
				userId: string
				unit: (typeof props.unit.enum)[number]
				sort: (typeof props.sort.enum)[number]
			}
			const sortBy = sort === 'asc' ? 1 : -1

			const metrics = request.server.mongo.db?.collection<MetricDocument>(metricsCollectionName)
			if (!metrics) {
				return reply.status(500).send({ success: false, message: 'Database connection error' })
			}

			try {
				const result = await metrics.find({ userId, unit }).sort({ createdAt: sortBy }).toArray()
				return { success: true, data: result }
			} catch (error) {
				return reply.status(500).send({ success: false, message: 'Failed to get metrics', error })
			}
		},
	})
}
