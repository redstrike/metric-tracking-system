import { Elysia } from 'elysia'
import { createMetricBodySchema, createMetricHandler } from './metrics/create-metric'

export function mapAllEndpoints(app: Elysia) {
	// GET /
	app.get('/', () => ({ success: true, message: 'Hello world!' }))

	// POST /v0/metrics
	app.post('/v0/metrics', createMetricHandler, { body: createMetricBodySchema })
}
