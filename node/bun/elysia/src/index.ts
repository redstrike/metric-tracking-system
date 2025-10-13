import { Elysia } from 'elysia'

const app = new Elysia()

app.get('/', () => ({
	success: true,
	message: 'Hello world!',
}))

app.listen(3000)

console.log(`🦊 Elysia is running at http://${app.server?.hostname}:${app.server?.port}`)
