import { moduleManifests } from 'modules/registry';
import { upsertModule } from 'engine-core';

export default defineNitroPlugin(() => {
  const db = useDb();

  for (const manifest of Object.values(moduleManifests)) {
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
    });
  }

  console.log(`[CeeGee] Registered ${Object.keys(moduleManifests).length} modules`);
});
