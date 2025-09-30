
import { join } from 'node:path'
import { readFile } from 'node:fs/promises'
import { create } from '@platformatic/service'
import { test } from 'node:test'


type testfn = Parameters<typeof test>[0]
type TestContext = Parameters<Exclude<testfn, undefined>>[0]

export async function getServer (t: TestContext) {

  // We go up two folder because this files executes in the dist folder
  const config = JSON.parse(await readFile(join(import.meta.dirname, "..", "watt.json"), 'utf8'))
  // Add your config customizations here. For example you want to set
  // all things that are set in the config file to read from an env variable
  config.server ||= {}
  config.server.logger ||= {}
  config.server.logger.level = 'warn'
  config.watch = false

  // Add your config customizations here
  const server = await create(join(import.meta.dirname, "../"), config)
  await server.start({}) // sets .getApplication()
  t.after(() => server.stop())

  return server.getApplication();
}
  