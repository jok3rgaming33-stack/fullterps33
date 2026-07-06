import postgres from "postgres"

declare global {
  // eslint-disable-next-line no-var
  var __sql: ReturnType<typeof postgres> | undefined
}

function createClient() {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL manquant. Ajoutez-le dans les variables d'environnement Vercel (Settings → Environment Variables) et dans .env.local en local.",
    )
  }
  return postgres(process.env.DATABASE_URL, { ssl: "require" })
}

// Réutilise la connexion entre les invocations en dev (hot reload) et en serverless (warm start)
export const sql = globalThis.__sql ?? createClient()
if (process.env.NODE_ENV !== "production") globalThis.__sql = sql
