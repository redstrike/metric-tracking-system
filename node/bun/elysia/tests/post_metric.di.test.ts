import { createApp } from '../src/index'
import assert from 'assert'
import { createMockCollection } from './helpers/mockCollection'

// Dependency Injection style: inject a mock mongo with insertOne stub
async function run() {
	const { collection: mockCollection, store: inserted } = createMockCollection()

	// Create app with DI mocks
	const app = createApp({ mongo: { db: { collection: () => mockCollection } }, config: { metricsCollectionName: 'metrics' } })
	// Prepare request for POST /v0/metrics
	const body = { userId: 'user-1', unit: 'm', value: 123 }
	const res = await app.handle({ method: 'POST', url: '/v0/metrics', body } as any)

	function parseResponse(res: any) {
		return (async () => {
			// Prefer text() then parse as JSON to avoid consuming the body twice
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
		})()
	}

	const result = await parseResponse(res)

	assert.strictEqual(result.success, true)
	assert.strictEqual(result.message, 'Metric created successfully')
	assert.strictEqual(result.data?.acknowledged, true)

	// Validate the inserted mock document
	assert.strictEqual(inserted.length, 1)
	assert.strictEqual(inserted[0].userId, 'user-1')

	console.log('post_metric.di.test.ts passed')
}

run().catch((err) => {
	console.error(err)
	process.exitCode = 1
})
