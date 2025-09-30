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
	})
}
