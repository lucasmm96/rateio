import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  out: './drizzle/migrations',
  // Connection string lida de variável de ambiente — nunca hardcoded
  dbCredentials: {
    url: process.env.DATABASE_URL ?? '',
  },
})
