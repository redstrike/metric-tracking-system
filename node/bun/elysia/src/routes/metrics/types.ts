export interface MetricDocument {
	_id?: string
	userId: string
	unitType: 'distance' | 'temperature'
	unit: string
	value: number
	createdAt: string
	updatedAt: string
	schemaVersion: number
}
