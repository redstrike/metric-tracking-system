import { openapi } from '@elysiajs/openapi'
import { Elysia } from 'elysia'
import z from 'zod'
import { mapAllEndpoints } from './routes'

export const app = new Elysia()

// Reference: https://elysiajs.com/patterns/openapi
const apiDocPath = '/docs'
app.use(
	openapi({
		path: apiDocPath,
		mapJsonSchema: { zod: z.toJSONSchema },
	})
)

mapAllEndpoints(app)

app.listen(3000)
console.log(`🦊 Elysia is running...\n📄 API Reference: http://${app.server?.hostname}:${app.server?.port}${apiDocPath}`)
