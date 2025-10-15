import { fromTypes, openapi } from '@elysiajs/openapi'
import { Elysia } from 'elysia'
import { mapAllEndpoints } from './routes'

export const app = new Elysia()

// Reference: https://elysiajs.com/patterns/openapi
app.use(
	openapi({
		references: fromTypes(process.env.NODE_ENV === 'production' ? 'dist/index.d.ts' : 'src/index.ts'),
		path: '/docs',
	})
)

mapAllEndpoints(app)

app.listen(3000)
console.log(`🦊 Elysia is running at http://${app.server?.hostname}:${app.server?.port}`)
