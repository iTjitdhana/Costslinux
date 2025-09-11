## System Architecture

### Overview
- Frontend: React + Tailwind, served on port 3014 in dev
- Backend: Node.js/Express API on port 3104
- Databases: MySQL (main: `esp_tracker`) and auxiliary `default_itemvalue`

### Components
- Frontend (`frontend/`): pages, components, services (`src/services/api.js`)
- Backend (`backend/`): `server.js`, `database/` connections, `routes/routes/*.js`
- Database scripts (`database/`): schema and migration SQL
- Operational scripts (`scripts/`, `backend/scripts/`): backup, merge, checks

### Data Flow
1. User interacts with React pages
2. Frontend calls Backend REST endpoints
3. Backend queries MySQL (main and `default_itemvalue`) and applies business logic
4. Responses returned to frontend for display and reports

### Routing (Backend)
- Routes organized under `backend/routes/routes/`:
  - `batches.js`, `materials.js`, `prices.js`, `production.js`, `roles.js`, `workplans.js`, `costs.js`

### Security & RBAC
- See `docs/RBAC_GUIDE.md` for role-based access details
- Secrets via `config.env` (not committed)

### Observability
- Logs via `morgan` and application logs in terminal
- Health endpoint `/health`

### Error Handling
- Centralized Express error handling with safe messages


### Diagram

```mermaid
flowchart LR
  subgraph Client
    UI[React Frontend\n(port 3014)]
  end

  subgraph Server
    API[Express API\n(port 3104)]
    Routes[Routes\n(batches, materials, prices, production, roles, workplans, costs)]
    DBConn[(DB Connections)]
  end

  subgraph Databases
    MainDB[(MySQL\nesp_tracker)]
    DefaultDB[(MySQL\ndefault_itemvalue)]
  end

  UI -->|HTTP/JSON| API
  API --> Routes
  Routes --> DBConn
  DBConn --> MainDB
  DBConn --> DefaultDB

  classDef db fill:#e7f5ff,stroke:#1c7ed6;
  classDef api fill:#e6fcf5,stroke:#0ca678;
  classDef ui fill:#fff4e6,stroke:#f08c00;
  class UI ui;
  class API,Routes,DBConn api;
  class MainDB,DefaultDB db;
```


