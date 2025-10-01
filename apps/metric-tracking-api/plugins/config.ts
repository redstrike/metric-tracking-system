import { type FastifyInstance, type FastifyPluginOptions } from 'fastify'
import type { AppConfig, ConversionMap } from './types.ts'

export default async function (fastify: FastifyInstance, opts: FastifyPluginOptions) {
	fastify.decorate('config', {
		metricsCollectionName: 'metrics',
		distanceUnits: ['m', 'cm', 'inch', 'feet', 'yard'] as const,
		temperatureUnits: ['c', 'f', 'k'] as const,
		convertToBase,
		convertFromBase,
	} as const satisfies AppConfig)
}

/**
 * Helper to convert a value from an original unit to the base unit (Meter or °C).
 */
function convertToBase(unitType: string, value: number, originalUnit: string): number {
	const conversionFn = CONVERSION_MAP[unitType]?.[originalUnit]?.toBase
	if (typeof conversionFn === 'function') {
		return conversionFn(value)
	}
	throw new Error(`Unsupported unit conversion: ${originalUnit} for type ${unitType}`)
}

/**
 * Helper to convert a value from the base unit (Meter or °C) to the target unit.
 */
function convertFromBase(unitType: string, baseValue: number, targetUnit: string): number {
	const conversionFn = CONVERSION_MAP[unitType]?.[targetUnit]?.fromBase
	if (typeof conversionFn === 'function') {
		return conversionFn(baseValue)
	}
	throw new Error(`Unsupported unit conversion: ${targetUnit} for type ${unitType}`)
}

const CONVERSION_MAP: ConversionMap = {
	// Distance conversions (Base: Meter)
	distance: {
		m: {
			toBase: (v: number) => v,
			fromBase: (v: number) => v,
		},
		cm: {
			toBase: (v: number) => v * 0.01, // v * (1 m / 100 cm)
			fromBase: (v: number) => v * 100, // v * (100 cm / 1 m)
		},
		inch: {
			toBase: (v: number) => v * 0.0254,
			fromBase: (v: number) => v / 0.0254,
		},
		feet: {
			toBase: (v: number) => v * 0.3048,
			fromBase: (v: number) => v / 0.3048,
		},
		yard: {
			toBase: (v: number) => v * 0.9144,
			fromBase: (v: number) => v / 0.9144,
		},
	},

	// Temperature conversions (Base: °C)
	temperature: {
		c: {
			toBase: (v: number) => v,
			fromBase: (v: number) => v,
		},
		f: {
			toBase: (v: number) => (v - 32) * (5 / 9),
			fromBase: (v: number) => v * (9 / 5) + 32,
		},
		k: {
			toBase: (v: number) => v - 273.15,
			fromBase: (v: number) => v + 273.15,
		},
	},
}
