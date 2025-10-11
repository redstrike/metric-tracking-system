import { type FastifyInstance, type FastifyPluginOptions, type FastifyReply, type FastifyRequest } from 'fastify'
import { createMetricHandler, createMetricHandlerSchema } from './metrics/create-metric.ts'
import { getMetricsChartViewHandler, getMetricsChartViewHandlerSchema } from './metrics/get-metrics-chart-view.ts'
import { getMetricsHandler, getMetricsHandlerSchema } from './metrics/get-metrics.ts'
import { responseSchema } from './shared.ts'

export default async function (fastify: FastifyInstance, opts: FastifyPluginOptions) {
	// GET /
	fastify.route({
		method: 'GET',
		url: '/',
		schema: { ...responseSchema() },
		handler:
			// oxlint-disable-next-line no-unused-vars
			function (this: FastifyInstance, request: FastifyRequest, reply: FastifyReply) {
				// The Fastify server will be bound to `this` when the handler is called. Note: using an arrow function will break the binding of this.
				return { success: true, message: 'Metric Tracking API is running' }
			},
	})

	const _v0_metrics = '/v0/metrics'

	// POST /v0/metrics
	fastify.route({ method: 'POST', url: _v0_metrics, schema: createMetricHandlerSchema, handler: createMetricHandler })

	// GET /v0/metrics
	fastify.route({ method: 'GET', url: _v0_metrics, schema: getMetricsHandlerSchema, handler: getMetricsHandler })

	// GET /v0/metrics/chart-view
	fastify.route({
		method: 'GET',
		url: `${_v0_metrics}/chart-view`,
		schema: getMetricsChartViewHandlerSchema,
		handler: getMetricsChartViewHandler,
	})
}
