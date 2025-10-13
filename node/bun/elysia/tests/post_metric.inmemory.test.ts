import { createApp } from '../src/index'
import assert from 'assert'
import { createMockCollection } from './helpers/mockCollection'

// In-memory collection mock that simulates insertOne behavior and stores docs in an array
async function run() {
	const { collection: inMemoryCollection, store } = createMockCollection()

	const app = createApp({ mongo: { db: { collection: () => inMemoryCollection } }, config: { metricsCollectionName: 'metrics' } })

	const body = { userId: 'u2', unit: 'cm', value: 5.5 }
	const res = await app.handle({ method: 'POST', url: '/v0/metrics', body } as any)

	async function parseResponse(res: any) {
		if (res && typeof res.text === 'function') {
			const text = await res.text()
			try {
				return JSON.parse(text)
			} catch {
				return text
			}
		}

		if (res && typeof res.json === 'function') {
			return await res.json()
		}

		return res
	}

	const result = await parseResponse(res)

	assert.strictEqual(result.success, true)
	assert.strictEqual(store.length, 1)
	assert.strictEqual(store[0].userId, 'u2')
	assert.strictEqual(store[0].unit, 'cm')

	console.log('post_metric.inmemory.test.ts passed')
}

run().catch((err) => {
	console.error(err)
	process.exitCode = 1
})
