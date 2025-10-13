import registerMongo from './plugins/mongodb'
import { createApp } from './index'

async function run() {
  const app = createApp()

  // Register Mongo plugin (will read env vars)
  await registerMongo(app)

  await app.listen(3000)
  console.log(`🦊 Elysia is running at http://${app.server?.hostname}:${app.server?.port}`)
}

if (import.meta.main) {
  run().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}

export default run
