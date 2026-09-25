# Public pages and operations workspace redesign

## Coverage

- Services, pricing calculator, franchise overview/application, about, merchant business page, contact, both tracking routes, privacy policy and terms.
- Login, password recovery/reset/setup, merchant registration and registration confirmation.
- Admin, merchant and staff pages receive the shared workspace layout, mobile drawer, navigation, header, card/table/form styling and common design tokens. Compact two-panel admin layouts stack on small screens. Route/pricing management components use the same blue palette.

## Functional boundaries

Existing permissions, RequireAuth, API endpoints, request payloads, session persistence, and post-login redirects are retained. Dashboard navigation still comes from the authorized server menu. No fabricated commercial metrics or shipment results are added. Account dropdowns expose only routes present in the corresponding portal. The notification button now opens the existing admin notifications page.

The actual branch save implementation already uses `updateBranch`; references to nonexistent fallback exports were removed. The missing `MapOutlined` import was replaced with the already imported location icon.

The public API still requires `NEXT_PUBLIC_API_URL`. When unavailable, visitors now see a contact-oriented message instead of an environment-variable setup instruction.

## Architecture

`PublicHero.jsx` and `public-pages.css` provide a reusable public page header, action styles and form surfaces. `BrandTheme.jsx` applies real Ant Design ConfigProvider tokens under the existing SSR registry. `workspace.css` is shared by all three authenticated portals. `auth-pages.css` scopes sign-in and account-recovery styles; the former login stylesheet that targeted every `main` element has been removed.

The homepage design and original logo are retained. The courier illustration is reused on desktop sign-in; its provenance is recorded in `homepage-redesign.md`.

## Dashboard visual verification

The separate `.codex-ui-preview` directory in the task workspace contains a visual harness with a copy of the actual dashboard layout and synthetic menu/row data. It has no backend, credentials or real business data and is not part of the application build. Authentication in the real app is not bypassed. Live dashboard workflows require an authenticated backend session and cannot be validated using the fixture.

## Verification

- Production build succeeds across all 88 routes; removed two pre-existing invalid imports so the build no longer reports those warnings.
- Browser checked the shared admin, merchant and staff workspace using synthetic data, including mobile navigation, Escape dismissal, and 320px overflow correction.
- Browser verified the production sign-in design and required-field validation.
- At 320px, services, pricing, franchise, franchise application, about, business, contact, tracking, legal pages, merchant registration and password recovery have no document-level horizontal overflow.
- Pricing map controls retain their behavior and now have labeled close/search controls, keyboard-accessible search results, modal semantics, focus containment, Escape dismissal and focus restoration.
- `git diff --check` passes.

## Local preview

`next.config.js` now accepts an optional `NEXT_DIST_DIR`; default builds still use `.next`. The local preview uses `.next-redesign` to avoid concurrent development servers replacing production assets. This directory is gitignored.

Live login, parcel results, quotes, submissions and authenticated operations still require a configured backend and an authorized account. No live customer data or outgoing form submissions were used during verification.
