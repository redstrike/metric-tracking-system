import type { WithId } from 'mongodb'
import { distanceUnits, temperatureUnits } from '../shared.ts'
import type { ConversionMap, MetricDocument } from './types.ts'

export function getUnitType(unit: string): string {
	if (distanceUnits.includes(unit)) {
		return 'distance'
	} else if (temperatureUnits.includes(unit)) {
		return 'temperature'
	}
	throw new Error('Invalid unit or unit type (distance or temperature)')
}

export function convertMetrics(
	result: WithId<MetricDocument>[],
	unitType: string,
	toUnit: string,
	convertToBase: (unitType: string, value: number, originalUnit: string) => number,
	convertFromBase: (unitType: string, value: number, targetUnit: string) => number
) {
	return result.map((metric) => {
		const baseValue = convertToBase(unitType, metric.value, metric.unit)
		const convertedValue = convertFromBase(unitType, baseValue, toUnit)
		return { ...metric, unit: toUnit, value: convertedValue }
	})
}

/**
 * Helper to convert a value from an original unit to the base unit (Meter or °C).
 */
export function convertToBase(unitType: string, value: number, originalUnit: string): number {
	const conversionFn = CONVERSION_MAP[unitType]?.[originalUnit]?.toBase
	if (typeof conversionFn === 'function') {
		return conversionFn(value)
	}
	throw new Error(`Unsupported unit conversion: ${originalUnit} for type ${unitType}`)
}

/**
 * Helper to convert a value from the base unit (Meter or °C) to the target unit.
 */
export function convertFromBase(unitType: string, baseValue: number, targetUnit: string): number {
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
