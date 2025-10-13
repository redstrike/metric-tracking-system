import { createApp } from '../src/index'
import assert from 'assert'

async function run() {
  const app = createApp()

  // Elysia apps have a `handle` method which can be used to simulate requests without opening a network socket.
  const res = await app.handle({ method: 'GET', url: '/' } as any)

  // res may be a Response-like object. Elysia returns the actual JSON-compatible object for simple handlers.
  // If a Response object is returned, use res.json()
  let body: any
  if ('json' in res && typeof (res as any).json === 'function') {
    body = await (res as any).json()
  } else {
    body = res
  }

  assert.strictEqual(body.success, true)
  assert.strictEqual(typeof body.message, 'string')

  console.log('root.test.ts passed')
}

run().catch((err) => {
  console.error(err)
  process.exitCode = 1
})
