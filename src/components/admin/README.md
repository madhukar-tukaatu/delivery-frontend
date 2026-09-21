# Admin frontend structure

## Routes
- `src/app/admin/*` - App Router pages (prefer `.jsx`). Site routes under `src/app/(site)` left untouched.

## Components
- `src/components/admin/ui` - AdminPageHeader, KPICard, AdminUI, PageTools, StatCard
- `src/components/admin/layout` - CompactAdminLayout, CompactPageLayout
- `src/components/admin/access|branch|branches|branchStaff|rate-admin|pickups|staff` - domain UI
- Shared shells (merchant/staff too): `DashboardLayout`, `RequireAuth` stay in `src/components`

## Services
- `src/services/admin` - admin APIs
- `src/services/merchant` - merchant APIs
- `src/services/site` - public site API
- Flat `src/services/<name>.js` files are compatibility re-exports

## Design
- Tokens: `src/lib/designTokens.js`
- Theme: `src/app/admin/admin-theme.css`
