## Coding Standards

### General
- Write clear, self-explanatory code with meaningful names
- Prefer early returns and guard clauses
- Handle errors explicitly; avoid silent failures
- Keep functions small and focused

### JavaScript/Node (Backend)
- Use `const`/`let`, avoid `var`
- Use async/await, avoid unhandled promises
- Centralize error handling in Express
- Environment config from `config.env` via `dotenv`

### React (Frontend)
- Components should be small and composable
- Use hooks; avoid unnecessary state lifting
- API calls centralized in `src/services/api.js`
- Keep presentational vs. container concerns separated

### Naming
- Functions: verbs (e.g., `calculateCost`)
- Variables: nouns (e.g., `batchResult`)
- Avoid abbreviations; use full words

### Formatting
- Match existing style; use Prettier defaults if configured
- Keep lines reasonable; break long expressions

### Comments
- Explain “why”, not “what”
- Avoid TODOs; create issues instead

### Security
- No secrets in code; use env vars
- Validate inputs at route boundaries


