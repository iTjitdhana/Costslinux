## Deployment Guide

### Environments
- Development: local machine
- Staging/Production: set endpoints, domains, database hosts per environment

### Prerequisites
- Node.js 18+
- MySQL 8+
- Windows (batch scripts provided) or compatible shell

### Configuration
- Backend uses root `config.env` (see `config.env.example`).
- Frontend uses `frontend/.env` (see `docs/ENV_EXAMPLES.md`).

### Build & Run
1) Install dependencies
```
cd backend && npm install
cd ../frontend && npm install
cd ..
```

2) Start services (Windows)
```
scripts\start-backend.bat
scripts\start-frontend.bat
```

3) Manual start
```
cd backend && npm start
# open a new terminal
cd frontend && npm start
```

### Environment-specific Settings
- Backend `PORT` (default 3104)
- Frontend `PORT` (default 3014)
- Database hosts/users/passwords
- CORS allowed origins

### Health Checks
- Backend: `GET /health`, `GET /test`

### Reverse Proxy (optional)
- Use a proxy (e.g., Nginx) for SSL and routing.
- Set CORS and `REACT_APP_API_URL` accordingly.

### Backups & Rollback
- SQL and scripts in `database/`, `backend/scripts/`, and `scripts/`.
- Useful scripts:
  - `scripts/backup_database.js`
  - `scripts/rollback_database.js`
  - `database/rollback_merge.sql`

### Deployment Checklist
- [ ] Set environment variables from examples
- [ ] Run database migrations/updates
- [ ] Start services and verify health
- [ ] Smoke test critical pages and APIs
- [ ] Configure monitoring/logging


