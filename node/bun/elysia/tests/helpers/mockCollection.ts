export function createMockCollection() {
  const store: any[] = []

  const collection = {
    insertOne: async (doc: any) => {
      const _id = `mock-${store.length + 1}`
      const record = { _id, ...doc }
      store.push(record)
      return { acknowledged: true, insertedId: _id }
    },
  }

  return { collection, store }
}
