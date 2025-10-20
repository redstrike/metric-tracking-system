import { createMetricBodySchema, createMetricHandler } from '@/routes/metrics/create-metric'
import { Elysia } from 'elysia'

export function mapAllEndpoints(app: Elysia) {
	// GET /
	app.get('/', () => ({ success: true, message: 'Hello world!' }))

	// POST /v0/metrics
	app.post('/v0/metrics', createMetricHandler, { body: createMetricBodySchema })
}
