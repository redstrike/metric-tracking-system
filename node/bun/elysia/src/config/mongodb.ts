import { MongoClient } from 'mongodb'

const dbName = process.env.MONGODB_DB_NAME
const connectionStr = process.env.MONGODB_CONNECTION_STRING
const metricsCollectionName = 'metrics'

if (!dbName) {
	throw new Error('MONGODB_DB_NAME is not defined')
}

if (!connectionStr) {
	throw new Error('MONGODB_CONNECTION_STRING is not defined')
}

export const mongoClient = new MongoClient(connectionStr)
export const metricsCollection = mongoClient.db(dbName).collection(metricsCollectionName)
