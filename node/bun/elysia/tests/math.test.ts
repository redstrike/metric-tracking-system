import { expect, test, describe } from 'bun:test'

describe('arithmetic', () => {
	test('2 + 2', () => {
		expect(2 + 2).toBe(4)
	})

	test('2 * 2', () => {
		expect(2 * 2).toBe(4)
	})

	test('2 * 2 (async)', async () => {
		const result = await Promise.resolve(2 * 2)
		expect(result).toEqual(4)
	})
})
