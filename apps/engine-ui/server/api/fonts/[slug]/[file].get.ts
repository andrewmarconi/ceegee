import { join } from 'path'
import { existsSync, readFileSync } from 'fs'

export default defineEventHandler((event) => {
  const slug = getRouterParam(event, 'slug')
  const file = getRouterParam(event, 'file')

  if (!slug || !file) {
    throw createError({ statusCode: 400, message: 'Missing slug or file parameter' })
  }

  // Prevent path traversal
  if (slug.includes('..') || file.includes('..')) {
    throw createError({ statusCode: 400, message: 'Invalid path' })
  }

  const filePath = join(process.cwd(), 'data', 'fonts', slug, file)

  if (!existsSync(filePath)) {
    throw createError({ statusCode: 404, message: 'Font file not found' })
  }

  setResponseHeader(event, 'Content-Type', 'font/woff2')
  setResponseHeader(event, 'Cache-Control', 'public, max-age=31536000, immutable')
  return readFileSync(filePath)
})
