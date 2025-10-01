import { type FastifyInstance, type FastifyPluginOptions } from 'fastify'
import { type Collection } from 'mongodb'
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
			description: 'ISO 8601 compliance date string (UTC). Example: 2025-09-30T20:18:38.111Z',
			format: 'date-time',
		},
		isoDateOnlyStr: {
			type: 'string',
			description: 'ISO 8601 compliance date only string (UTC). Example: 2025-10-01',
			format: 'date',
		},
		sort: { type: 'string', enum: ['asc', 'desc'] as const, default: 'asc' },
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
				required: ['userId', 'unit'],
				properties: {
					userId: props.userId,
					unit: props.unit,
					sort: props.sort,
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

	fastify.route({
		method: 'GET',
		url: '/metrics-by-unit-type',
		schema: {
			querystring: {
				type: 'object',
				required: ['userId', 'unitType'],
				properties: {
					userId: props.userId,
					unitType: props.unitType,
					sort: props.sort,
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

	function getUTCEndOfDay(isoDateOnlyStr = ''): Date {
		if (isoDateOnlyStr.length > 0 && isoDateOnlyStr.length !== 10) {
			throw new Error('Invalid ISO date only string')
		}
		// Append 'T00:00:00.000Z' to force UTC interpretation to prevent local time zone offsets from shifting the date forward/backward.
		const date = isoDateOnlyStr.length === 10 ? new Date(isoDateOnlyStr + 'T00:00:00.000Z') : new Date()
		date.setUTCHours(23, 59, 59, 999)
		return date
	}

	fastify.route({
		method: 'GET',
		url: '/chart-metrics',
		schema: {
			querystring: {
				type: 'object',
				required: ['userId', 'unit', 'startDate'],
				properties: {
					userId: props.userId,
					unit: props.unit,
					startDate: props.isoDateOnlyStr,
					endDate: { ...props.isoDateOnlyStr, default: getUTCEndOfDay().toISOString().split('T')[0] },
					sort: props.sort,
				},
			},
			...BaseResponseSchema,
		},
		handler: async (request, reply) => {
			const { userId, unit, startDate, endDate, sort } = request.query as {
				userId: string
				unit: (typeof props.unit.enum)[number]
				startDate: string
				endDate: string
				sort: (typeof props.sort.enum)[number]
			}
			const sortBy = sort === 'asc' ? 1 : -1

			const metrics = request.server.mongo.db?.collection<MetricDocument>(metricsCollectionName)
			if (!metrics) {
				return reply.status(500).send({ success: false, message: 'Database connection error' })
			}

			try {
				const result = await getChartMetricsByUnit(metrics, userId, unit, startDate, getUTCEndOfDay(endDate).toISOString(), sortBy)
				return { success: true, data: result }
			} catch (error) {
				return reply.status(500).send({ success: false, message: `Failed to get metrics`, error })
			}
		},
	})

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
}
