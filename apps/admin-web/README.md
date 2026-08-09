# apps/admin-web — Console d'administration (Next.js)

**Interdiction 6 :** cette application ne touche jamais la base de données, et
n'importe jamais quoi que ce soit de `apps/api/src/`. Elle parle à l'API HTTP.

**Interdiction 11 :** aucun secret ici. Jamais. Ni clé Twilio, ni clé Orange,
ni chaîne de connexion. La gate `scan:secrets` refuse le merge.

Règle exécutable : `ARC-003` dans `tools/architecture-tests/rules.ts`.
