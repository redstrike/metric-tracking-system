export interface MetricDocument {
	_id?: string
	userId: string
	unit: string
	unitType: 'distance' | 'temperature'
	value: number
	createdAt: string
	updatedAt: string
	schemaVersion: number
}

export type ConversionFn = (value: number) => number

export type UnitConversion = {
	toBase: ConversionFn
	fromBase: ConversionFn
}

export type ConversionMap = {
	[key: string]: {
		[unit: string]: UnitConversion
	}
}
