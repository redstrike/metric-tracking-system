import type { AppConfig } from '../plugins/types.ts'

declare module 'fastify' {
	interface FastifyInstance {
		config: AppConfig
	}
}
