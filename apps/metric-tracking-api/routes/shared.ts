export function responseSchema(successDataProp = {}) {
	const errorResponseSchema = {
		type: 'object',
		required: ['success'],
		properties: {
			success: { type: 'boolean', default: false },
			message: { type: 'string' },
			data: {}, // unknown
			error: {}, // Error | unknown
		},
	}
	return {
		response: {
			200: {
				type: 'object',
				required: ['success'],
				properties: {
					success: { type: 'boolean', default: true },
					message: { type: 'string' },
					data: successDataProp, // {} => allows any valid JSON type (object, array, number, string, boolean, or null)
				},
			},
			400: errorResponseSchema,
			500: errorResponseSchema,
		},
	}
}

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
		default: new Date().toISOString(),
	},
	isoDateOnlyStr: {
		type: 'string',
		description: 'ISO 8601 compliance date only string (UTC). Example: 2025-10-01',
		format: 'date',
		default: new Date().toISOString().split('T')[0],
	},
	sort: { type: 'string', enum: ['asc', 'desc'] as const, default: 'asc' },
} as const
