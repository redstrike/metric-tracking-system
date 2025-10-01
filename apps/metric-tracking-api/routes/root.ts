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
		value: number
		createdAt: string
	}

	const props = {
		userId: { type: 'string', maxLength: 36 },
		unit: { type: 'string', enum: ['m', 'cm', 'inch', 'feet', 'yard', 'c', 'f', 'k'] },
		isoDateStr: {
			type: 'string',
			description: 'ISO 8601 compliance date string. Example: 2025-09-30T20:18:38.111Z',
			format: 'date-time',
		},
		sort: { type: 'string', enum: ['asc', 'desc'] },
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
			const metrics = request.server.mongo.db?.collection<MetricDocument>(metricsCollectionName)
			if (!metrics) {
				return reply.status(500).send({ success: false, message: 'Database connection error' })
			}
			try {
				const result = await metrics.insertOne(request.body as MetricDocument)
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
			const { userId, unit, sort } = request.query as { userId: string; unit: string; sort: 'asc' | 'desc' }
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
