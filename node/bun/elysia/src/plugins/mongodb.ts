import { type Elysia } from 'elysia'
import { MongoClient } from 'mongodb'

const dbName = process.env.MONGODB_DB_NAME
const connectionStr = process.env.MONGODB_CONNECTION_STRING

if (!dbName) {
  throw new Error('MONGODB_DB_NAME is not defined')
}

if (!connectionStr) {
  throw new Error('MONGODB_CONNECTION_STRING is not defined')
}

export default async function registerMongo(app: Elysia) {
  const client = new MongoClient(connectionStr)
  await client.connect()

  // Attach to state similar to the Fastify plugin
  ;(app.state as unknown as Record<string, any>).mongo = { client, db: client.db(dbName) }
  ;(app.state as unknown as Record<string, any>).config = { metricsCollectionName: 'metrics' }

  // close the client when process exits
  const close = async () => {
    try {
      await client.close()
    } catch (e) {
      // ignore
    }
  }

  // Best-effort hooks
  process.on('exit', close)
  process.on('SIGINT', close)
  process.on('SIGTERM', close)
}

export { MongoClient }
