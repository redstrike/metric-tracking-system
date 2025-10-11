
import { type FastifyInstance } from 'fastify'
import { PlatformaticApplication, PlatformaticServiceConfig } from '@platformatic/service'

declare module 'fastify' {
  interface FastifyInstance {
    platformatic: PlatformaticApplication<PlatformaticServiceConfig>
  }
}
