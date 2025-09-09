# RBAC Menu Display — Test Guide

This guide explains how to verify that role-based menus render correctly and link to the right URLs.

## 0) Prerequisites

- Backend running at `http://localhost:3104`
- Frontend running at `http://localhost:3014` (optional for UI checks)
- Node.js available to run test scripts

---

## 1) API-Level Tests (CLI)

### 1.1 List all roles
```bash
curl -s http://localhost:3104/api/roles | jq '.[] | {display_name, url_prefix, menu_items}'
```

### 1.2 Get role by URL prefix
```bash
# Planner
curl -s "http://localhost:3104/api/roles/by-url/%2Fplanner%2F" | jq '{display_name, url_prefix, menu_items}'

# Operation (case sensitive)
curl -s "http://localhost:3104/api/roles/by-url/%2FOperation%2F" | jq '{display_name, url_prefix, menu_items}'
```

---

## 2) Scripted Tests

Two ready-to-run scripts exist in the project root:

### 2.1 Role permissions quick check
```bash
node test_role_access_control.js
```
Outputs each role and whether it includes the `"Logs การผลิต"` permission, plus examples for Worker/Admin/Planner.

### 2.2 Navbar role badge and classification check
```bash
node test_role_display.js
```
Verifies that roles like Operation are treated as admin-style (badge color red) while others are user-style (blue).

---

## 3) Programmatic “Visible Menus” listing

Use this snippet to compute visible menus and their final hrefs for any role prefix using the same mapping logic as the UI.

```javascript
const axios = require('axios');

const MENU_URL_MAP = {
  dashboard: '/',
  logs: '/logs',
  cost_analysis: '/cost-analysis',
  inventory: '/inventory',
};

async function listVisibleMenus(prefix) {
  const { data: role } = await axios.get(`http://localhost:3104/api/roles/by-url/${encodeURIComponent(prefix)}`);
  const visible = (role.menu_items || []).map((key) => {
    const base = MENU_URL_MAP[key] ?? '/';
    const clean = base.startsWith('/') ? base.slice(1) : base;
    const href = base === '/' ? role.url_prefix : role.url_prefix + clean;
    return { key, href };
  });
  console.log({ role: role.display_name, visible });
}

listVisibleMenus('/planner/');
```

Run:
```bash
node -e "require('./RBAC_MENU_TEST.md');" # (copy the snippet into a separate .js file instead)
```

---

## 4) UI-Level Tests (Browser)

1. Navigate to a role path, e.g. `/planner/` or `/Operation/`.
2. Open the menu (hamburger) in the top right.
3. Confirm that only allowed items are shown, and each item’s link starts with the current role prefix.

Optional debug (temporary) in `frontend/src/components/Navbar.js` after `visibleNavigation` is built:
```javascript
console.log('Role:', currentRole?.display_name, 'Visible menus:', visibleNavigation.map(i => ({ name: i.name, href: i.href })));
```

---

## 5) Troubleshooting

- Empty menu: check `GET /api/roles/by-url/:prefix` returns the expected `menu_items` array.
- Wrong links (double slash): ensure base paths remove the leading `/` before concatenation.
- Role not detected: verify prefix format (leading and trailing slash) and case consistency across DB/URL.
- UI shows pages without permission: confirm page-level guard (e.g., `LogsTest.js`) and protect sensitive APIs on the backend.

---

## 6) What “passes” a test

- Role’s `menu_items` exactly matches the rendered items in the Navbar.
- Each rendered menu item’s `href` equals `role.url_prefix + basePath` (or the prefix root for dashboard).
- Access-denied UI appears when opening a page not included in `menu_items`.

---

Use this guide to automate checks in CI or to quickly validate a new role configuration end-to-end.
