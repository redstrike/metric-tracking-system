import { schemaProps } from '../shared.ts'

export const metricDocumentSchema = {
	type: 'object',
	properties: {
		_id: { type: 'string' },
		userId: schemaProps.userId,
		unit: schemaProps.unit,
		unitType: schemaProps.unitType,
		value: { type: 'number' },
		createdAt: schemaProps.isoDateStr,
		updatedAt: schemaProps.isoDateStr,
	},
}
