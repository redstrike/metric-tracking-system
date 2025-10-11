import { type FastifyInstance, type FastifyPluginOptions } from 'fastify'
import type { AppConfig } from './types.ts'

export default async function (fastify: FastifyInstance, opts: FastifyPluginOptions) {
	fastify.decorate('config', {
		metricsCollectionName: 'metrics',
	} as const satisfies AppConfig)
}
