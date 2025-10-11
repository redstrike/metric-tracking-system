import { type FastifyInstance, type FastifyPluginOptions } from 'fastify'

const dbName = process.env.MONGODB_DB_NAME
const connectionStr = process.env.MONGODB_CONNECTION_STRING

if (!dbName) {
	throw new Error('MONGODB_DB_NAME is not defined')
}

if (!connectionStr) {
	throw new Error('MONGODB_CONNECTION_STRING is not defined')
}

export default async function (fastify: FastifyInstance, opts: FastifyPluginOptions) {
	fastify.register(import('@fastify/mongodb'), {
		forceClose: true, // Force to close the mongodb connection when app stopped
		database: dbName,
		url: connectionStr,

		// monitorCommands: true,
		// this.mongo.client.once('commandStarted', (event) => {
		//   console.error({ command: event.command })
		// })
	})
}

// Indexes
// 1. userId_text_unitType_text_createdAt_text (Created)
// 2. userId_text_unit_text_createdAt_text (Failed to create due to Atlas free tier limit)
