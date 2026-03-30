import { allManifests } from 'modules'
import { upsertModule } from 'engine-core'

export default defineNitroPlugin(() => {
  const db = useDb()

  for (const manifest of allManifests) {
    upsertModule(db, {
      moduleKey: manifest.id,
      label: manifest.label,
      version: manifest.version,
      category: manifest.category,
      configSchema: manifest.configSchema,
      dataSchema: manifest.dataSchema,
      actions: manifest.actions,
      animationHooks: manifest.animationHooks,
      capabilities: manifest.capabilities,
      themeTokens: manifest.themeTokens
    })
  }

  console.log(`[CeeGee] Registered ${allManifests.length} modules`)
})
