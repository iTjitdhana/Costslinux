# Dynamic RBAC with URL-Prefix Routing — Implementation Guide

This document explains how to implement, migrate, and reuse the Dynamic Role‑Based Access Control (RBAC) pattern that prefixes routes with role URLs (e.g., `/admin/`, `/planner/`, `/Operation/`).

## 1) Data Model

Recommended table/collection: `role_configurations`

Fields:
- `id` (PK)
- `role_name` (machine name, e.g., `planner`)
- `display_name` (e.g., `Planner`)
- `color` (optional badge color)
- `url_prefix` (must include leading + trailing slash, e.g., `/planner/`)
- `menu_items` (array of menu identifiers; do NOT store as CSV)

Example record:
```json
{
  "role_name": "planner",
  "display_name": "Planner",
  "url_prefix": "/planner/",
  "menu_items": ["logs", "cost_analysis"]
}
```

Notes:
- Add a UNIQUE index on `url_prefix`.
- Keep `menu_items` as an array; if legacy data is stringified JSON or CSV, normalize at the API boundary.

## 2) Backend APIs

Expose CRUD endpoints and a “by URL” lookup used by the frontend.

- `GET   /api/roles` — list roles
- `GET   /api/roles/:id` — get a role
- `GET   /api/roles/by-url/:urlPrefix` — get by `url_prefix` (critical)
- `POST  /api/roles` — create role
- `PUT   /api/roles/:id` — update role
- `DELETE /api/roles/:id` — delete role

Validation:
- Ensure `url_prefix` is unique and normalized (leading/trailing slash).
- Ensure `menu_items` is always an array.

## 3) Authorization Helpers (Backend)

Implement a central permission checker and (optionally) middleware.

```js
function canAccess(role, menuKey) {
  return Array.isArray(role?.menu_items) && role.menu_items.includes(menuKey);
}
```

Middleware idea:
- Extract role from session/JWT or infer from `req.path` url prefix.
- Abort with 403 when `!canAccess(role, requiredMenuKey)`.

Always protect sensitive APIs on the backend (do not rely only on UI guards).

## 4) Frontend Integration (React example)

### 4.1 Load roles and build routes dynamically

- On app boot, fetch roles via `GET /api/roles`.
- For each role, generate a route tree under `role.url_prefix`.

```jsx
const generateRoleRoutes = (role) => {
  const p = role.url_prefix.replace(/\/$/, '');
  return [
    <Route key={`${p}-home`} path={`${p}/`} element={<Dashboard />} />,
    <Route key={`${p}-logs`} path={`${p}/logs`} element={<LogsPage />} />,
    // ...other pages
  ];
};
```

### 4.2 Determine current role from URL

```js
const path = location.pathname;
const prefix = `/${path.split('/')[1]}/`; // e.g., "/planner/"
const { data: currentRole } = await api.get(`/roles/by-url/${encodeURIComponent(prefix)}`);
```

### 4.3 Filter menu + build links by role

- Keep a single map from menu keys to base paths.
- Final link = `currentRole.url_prefix + basePath` (remove base path leading `/`).

```js
const MENU_URL_MAP = {
  dashboard: '/',
  logs: '/logs',
  cost_analysis: '/cost-analysis',
  inventory: '/inventory',
};

function buildHref(role, menuKey) {
  const base = MENU_URL_MAP[menuKey] ?? '/';
  const clean = base.startsWith('/') ? base.slice(1) : base;
  return base === '/' ? role.url_prefix : role.url_prefix + clean;
}
```

### 4.4 Page-level guard

Each sensitive page should check permission before rendering.

```jsx
if (!currentRole?.menu_items?.includes('logs')) {
  return <AccessDenied />; // show 403 UI or redirect
}
```

## 5) URL-Prefix Strategy

- Decide and enforce the convention: leading and trailing slash (`/Role/`).
- Case sensitivity is allowed; enforce consistency across DB, routes, and links.
- Provide redirects/fallbacks for unknown prefixes if desired.

## 6) Menu Keys & Mapping

Use stable, language-agnostic menu keys (e.g., `logs`, `inventory`, `cost_analysis`). Display names in any language can be mapped per locale.

- Treat these keys as the single source of truth.
- Keep one `MENU_URL_MAP` in the frontend.

## 7) Role Management UI (Recommended)

Functions:
- Create/Update role with auto-generated `url_prefix` from `role_name` (e.g., `/${role_name.toLowerCase()}/`).
- Prevent duplicate `url_prefix`.
- Manage `menu_items` via a checklist; persist as array.

## 8) Testing Strategy

- Unit: parsing `menu_items`, `canAccess(role, key)` truth table.
- Integration: `by-url` endpoint returns correct role for various cases.
- E2E: create a new role → refresh app → menu & routes reflect dynamically; guard blocks forbidden pages.

## 9) Common Pitfalls

- Guard only on the UI: always protect sensitive APIs on the backend too.
- Duplicate/typo menu names: use enum-like keys to avoid mismatch.
- Double slashes in URLs: strip leading `/` from base path before concatenation.
- Changing `url_prefix`: plan redirects/migrations for existing links.

## 10) Quick Adoption Checklist

1. Create `role_configurations` + seed initial roles.
2. Implement role APIs (CRUD + by-url).
3. Frontend: load roles, build dynamic routes, compute menu links with prefix.
4. Add page guards per sensitive page.
5. Add backend middleware for sensitive APIs.
6. Write unit/integration/E2E tests.

---

### Minimal Backend Contract (TypeScript-ish)

```ts
interface RoleConfiguration {
  id: number;
  role_name: string;
  display_name: string;
  url_prefix: string; // e.g., "/planner/"
  menu_items: string[]; // e.g., ["logs", "inventory"]
}
```

### Minimal Frontend Contract

- `GET /api/roles` → `RoleConfiguration[]`
- `GET /api/roles/by-url/:prefix` → `RoleConfiguration`

---

By following this guide, you can lift this Dynamic RBAC + URL prefix pattern into any web stack (Express, Nest, Django, Rails, Laravel, etc.) and any SPA framework (React, Vue, Angular) with minimal friction. Enjoy building securely! 🚀
