import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {schemaTypes} from './schemas'

export default defineConfig({
  name: 'default',
  title: 'VulnRadar',
  projectId: process.env.SANITY_STUDIO_PROJECT_ID as string,
  dataset: (process.env.SANITY_STUDIO_DATASET as string) || 'production',
  plugins: [structureTool()],
  schema: {types: schemaTypes},
})
