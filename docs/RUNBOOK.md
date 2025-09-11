## Operations Runbook

### Start/Stop
- Start all: double-click `start-system.bat`
- Start backend only: `scripts\\start-backend.bat`
- Start frontend only: `scripts\\start-frontend.bat`
- Stop all: `scripts\\stop-system.bat`

### Health & Status
- Backend health: `http://localhost:3104/health`
- API test: `http://localhost:3104/test`

### Logs
- Backend: terminal output where backend runs
- Frontend: browser DevTools Console (F12)

### Common Issues
- Backend DB connection fails: check `config.env`, MySQL service, network, `default_itemvalue`
- Frontend cannot reach API: check CORS, API base URL, firewall
- Port in use: `netstat -ano | findstr :3104` or `:3014`, then stop the process

### Backups
- Run `scripts/backup_database.js`

### Rollback
- Use `scripts/rollback_database.js` or `database/rollback_merge.sql`

### Escalation
- Review relevant docs in `docs/` (RBAC, price issues, duplicates)
- Contact maintainer listed in README Support section


