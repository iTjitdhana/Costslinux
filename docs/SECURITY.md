## Security Guide

### Secrets Management
- Do not commit real credentials.
- Use `config.env` (root) and `frontend/.env` with least privilege accounts.

### RBAC
- See `docs/RBAC_GUIDE.md` for roles and permissions.

### Network & CORS
- Restrict CORS via `ALLOWED_ORIGINS`.
- Limit database access to trusted networks.

### Data Protection
- Backup schedules documented in `docs/DEPLOYMENT.md` and `RUNBOOK.md`.
- Review access to `default_itemvalue` as it contains price data.

### Dependencies
- Keep `npm` packages up to date; review for known vulnerabilities.


