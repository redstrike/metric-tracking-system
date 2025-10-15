import { Elysia } from 'elysia'
import { mapAllEndpoints } from './routes'

const app = new Elysia()

mapAllEndpoints(app)

app.listen(3000)
console.log(`🦊 Elysia is running at http://${app.server?.hostname}:${app.server?.port}`)
