export const responseSchema = {
	type: 'object',
	required: ['success'],
	properties: {
		success: { type: 'boolean' },
		message: { type: 'string' },
		data: {}, // {} => allows any valid JSON type (object, array, number, string, boolean, or null)
		error: {},
	},
} as const

export const distanceUnits = ['m', 'cm', 'inch', 'feet', 'yard']
export const temperatureUnits = ['c', 'f', 'k']

export const schemaProps = {
	userId: { type: 'string', maxLength: 36 },
	unit: { type: 'string', enum: ['m', 'cm', 'inch', 'feet', 'yard', 'c', 'f', 'k'] as const },
	unitType: { type: 'string', enum: ['distance', 'temperature'] as const },
	isoDateStr: {
		type: 'string',
		description: 'ISO 8601 compliance date string (UTC). Example: 2025-09-30T20:18:38.111Z',
		format: 'date-time',
	},
	isoDateOnlyStr: {
		type: 'string',
		description: 'ISO 8601 compliance date only string (UTC). Example: 2025-10-01',
		format: 'date',
	},
	sort: { type: 'string', enum: ['asc', 'desc'] as const, default: 'asc' },
} as const
