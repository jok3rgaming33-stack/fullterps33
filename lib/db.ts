import postgres from "postgres"

type Sql = ReturnType<typeof postgres>

let client: Sql | null = null

function getClient(): Sql {
  if (!client) {
    if (!process.env.DATABASE_URL) {
      throw new Error(
        "DATABASE_URL manquant. Ajoutez-le dans les variables d'environnement Vercel (Settings → Environment Variables) et dans .env.local en local.",
      )
    }
    client = postgres(process.env.DATABASE_URL, { ssl: "require" })
  }
  return client
}

// Proxy paresseux : la connexion n'est créée qu'au premier vrai appel `sql\`...\``,
// jamais au simple import du module. Ça évite de faire planter le build Next.js
// (qui importe ce module pour analyser les routes) quand DATABASE_URL n'est pas
// encore configuré — l'erreur ne surviendra qu'au moment d'une vraie requête.
export const sql: Sql = new Proxy(function sqlPlaceholder() {} as unknown as Sql, {
  apply(_target, thisArg, args) {
    const real = getClient() as unknown as (...a: unknown[]) => unknown
    return Reflect.apply(real, thisArg, args)
  },
  get(_target, prop) {
    return Reflect.get(getClient() as unknown as object, prop)
  },
})
