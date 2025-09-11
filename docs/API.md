## API Documentation

Base URL (dev): `http://localhost:3104`

### Health
- `GET /health` → 200 OK
- `GET /test` → simple connectivity test

### Resources (high-level)
- Batches: create/list/update production batches
- Materials: BOM and weighing operations
- Prices: pricing derived from `default_itemvalue`
- Production: record production results
- Costs: calculate and retrieve cost reports
- Roles: RBAC and permissions
- Workplans: daily work planning

Endpoints are implemented under `backend/routes/routes/*.js`.

### Example: Prices
- `GET /api/prices?materialId=<id>` → returns price info

### Errors
- JSON structure: `{ message, code?, details? }`

### Auth
- If authentication is enforced in your environment, include headers/tokens accordingly (RBAC guide).

### Postman/Swagger
- Import routes manually or generate from source. A formal OpenAPI spec can be added later.


