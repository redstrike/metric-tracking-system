import { expect, test, describe } from 'bun:test'

describe('arithmetic', () => {
	test('1 + 1 = 2', () => {
		expect(1 + 1).toBe(2)
	})

	test('2 + 2 = 4', () => {
		expect(2 + 2).toBe(4)
	})

	test('4 + 1 = 5', () => {
		expect(4 + 1).toBe(5)
	})

	test('5 * 2 (async) = 10', async () => {
		const result = await Promise.resolve(5 * 2)
		expect(result).toBe(10)
	})
})
