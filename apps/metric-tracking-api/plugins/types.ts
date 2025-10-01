export interface AppConfig {
	metricsCollectionName: string
	distanceUnits: readonly string[]
	temperatureUnits: readonly string[]
	convertToBase: (unitType: string, value: number, originalUnit: string) => number
	convertFromBase: (unitType: string, value: number, targetUnit: string) => number
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
