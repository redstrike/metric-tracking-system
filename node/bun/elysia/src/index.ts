import { Elysia } from 'elysia'
import { z } from 'zod'
import type { MongoClient } from 'mongodb'

// Reuse the same unit lists from the Watt reference implementation
const distanceUnits = ['m', 'cm', 'inch', 'feet', 'yard'] as const
const temperatureUnits = ['c', 'f', 'k'] as const

const createMetricBodySchema = z.object({
	userId: z.string().max(36),
	unit: z.enum(['m', 'cm', 'inch', 'feet', 'yard', 'c', 'f', 'k']),
	value: z.number(),
	createdAt: z.string().optional(),
})

export interface MongoLike {
	client?: MongoClient
	db: { collection: (name: string) => any }
}

export interface AppDeps {
	mongo?: MongoLike
	config?: { metricsCollectionName?: string }
}

export interface MetricDocument {
	_id?: string
	userId: string
	unitType: 'distance' | 'temperature'
	unit: string
	value: number
	createdAt: string
	updatedAt: string
	schemaVersion: number
}

export function createApp(deps?: AppDeps) {
	const app = new Elysia()

	// If dependencies are provided, attach them to app.state for DI
	if (deps?.mongo) {
		;(app.state as unknown as Record<string, any>).mongo = deps.mongo
	}
	if (deps?.config) {
		;(app.state as unknown as Record<string, any>).config = deps.config
	}

	app.get('/', () => ({
		success: true,
		message: 'Hello world!',
	}))

	// POST /v0/metrics - mirror Fastify createMetricHandler
	app.post('/v0/metrics', async (c) => {
		const parseResult = createMetricBodySchema.safeParse(c.body)
		if (!parseResult.success) {
			c.status(400)
			// return Zod error details (array of issues)
			return { success: false, message: 'Invalid request body', error: parseResult.error.issues }
		}

		const { userId, unit, value, createdAt } = parseResult.data

		let unitType: 'distance' | 'temperature'
		if ((distanceUnits as readonly string[]).includes(unit)) {
			unitType = 'distance'
		} else if ((temperatureUnits as readonly string[]).includes(unit)) {
			unitType = 'temperature'
		} else {
			c.status(400)
			return { success: false, message: 'Invalid `unit`: cannot find a compatible unit type' }
		}

		// Expect a Mongo client on app.state.mongo and config on app.state.config
		const appState = app.state as unknown as Record<string, any>
		const mongo = appState?.mongo
		const config = appState?.config
		const metricsCollectionName = config?.metricsCollectionName ?? 'metrics'

		const metrics = mongo?.db?.collection(metricsCollectionName)
		if (!metrics) {
			c.status(500)
			return { success: false, message: 'Database connection error' }
		}

		const now = new Date().toISOString()
		const metric = { userId, unitType, unit, value, createdAt: createdAt ?? now, updatedAt: now, schemaVersion: 1 }

		try {
			const result = await metrics.insertOne(metric)
			return { success: true, message: 'Metric created successfully', data: result }
		} catch (error) {
			c.status(500)
			return { success: false, message: 'Failed to create metric', error }
		}
	})

	return app
}

// When run directly, start the server. Tests can import createApp() without starting.
if (process.env.ELYsia_RUN === '1' || import.meta.main) {
	const app = createApp()
	app.listen(3000)
	console.log(`🦊 Elysia is running at http://${app.server?.hostname}:${app.server?.port}`)
}
