import { type FastifyInstance, type FastifyPluginOptions } from 'fastify'
import type { AppConfig } from './types.ts'

export default async function (fastify: FastifyInstance, opts: FastifyPluginOptions) {
	fastify.decorate('config', {
		metricsCollectionName: 'metrics',
		distanceUnits: ['m', 'cm', 'inch', 'feet', 'yard'],
		temperatureUnits: ['c', 'f', 'k'],
	} satisfies AppConfig)
}
