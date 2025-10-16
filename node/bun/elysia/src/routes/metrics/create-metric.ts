import { type Context } from 'elysia'
import z from 'zod'
import { metricsCollection } from '../../config/mongodb'
import { distanceUnits, temperatureUnits } from './shared'

export const createMetricBodySchema = z.object({
	userId: z.string().max(36),
	unit: z.enum([...distanceUnits, ...temperatureUnits]),
	value: z.number(),
	createdAt: z.iso.datetime().optional(),
})

export async function createMetricHandler(context: Context) {
	const parseResult = createMetricBodySchema.safeParse(context.body)
	if (!parseResult.success) {
		context.status(400)
		return { success: false, message: 'Invalid request body', error: parseResult.error.issues }
	}

	const { userId, unit, value, createdAt } = parseResult.data

	let unitType: 'distance' | 'temperature'
	if ((distanceUnits as readonly string[]).includes(unit)) {
		unitType = 'distance'
	} else if ((temperatureUnits as readonly string[]).includes(unit)) {
		unitType = 'temperature'
	} else {
		context.status(400)
		return { success: false, message: 'Invalid `unit`: cannot find a compatible unit type' }
	}

	const now = new Date().toISOString()
	const metric = { userId, unitType, unit, value, createdAt: createdAt ?? now, updatedAt: now, schemaVersion: 1 }

	try {
		const result = await metricsCollection.insertOne(metric)
		return { success: true, message: 'Metric created successfully', data: result }
	} catch (error) {
		context.status(500)
		return { success: false, message: 'Failed to create metric', error }
	}
}
