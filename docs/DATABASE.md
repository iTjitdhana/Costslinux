## Database Guide

### Databases
- Main: `esp_tracker` (production data)
- Auxiliary: `default_itemvalue` (reference prices)

### Connection
- Configure via root `config.env` (see `config.env.example`).

### Schema & Migrations
- SQL files under `database/` (e.g., `create_tables.sql`, `update_unit_conversions.sql`).
- Node scripts under `backend/scripts/` for migrations and data fixes.

### Setup
1) Create databases and users in MySQL
2) Apply schema: run `database/create_tables.sql`
3) Apply updates: run additional `database/*.sql` as needed
4) Seed data: see `database/insert_*` scripts

### Maintenance
- Backups: `scripts/backup_database.js`
- Merge/verify: see `docs/MERGE_DATABASE_GUIDE.md` and `scripts/verify_merge.js`
- Rollback: `database/rollback_merge.sql`, `scripts/rollback_database.js`

### Troubleshooting
- Check `backend/database/*.js` connections
- Verify credentials and network
- See `docs/PRICE_ISSUE_ANALYSIS.md` and related price/debug docs


