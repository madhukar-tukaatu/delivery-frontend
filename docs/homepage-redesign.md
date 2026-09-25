# Tukaatu Express homepage redesign

## Scope

Bright tracking-first homepage, shared public header/footer, and progressively enhanced reveal component. Existing public routes, merchant login, pricing calculator, tracking API, and contact forms are retained. The duplicate `src/app/page.js` entry was removed so `src/app/(site)/page.jsx` alone owns `/`.

The homepage submits a trimmed, URL-encoded tracking number to `/tracking?tracking=…`. Blank and whitespace-only input is rejected. Quotes use `/pricing`; pickups and merchant enquiries use `/contact`. The footer uses the existing contact page email; its placeholder telephone number is deliberately not repeated.

## Design and accessibility

Navy `#0B1F33`, blue `#1677B8`, delivery yellow `#F4C542`, white and off-white surfaces. Responsive navigation includes login/contact links, expanded state, Escape dismissal and focus restoration. A skip link, visible focus indicators, labeled tracking field and reduced-motion styles are included. The delivery journey becomes vertical cards on small screens. Reveal content remains visible without JavaScript.

The merchant dashboard is an illustrative capability preview with no fabricated commercial metrics. Kathmandu–Pokhara is shown as an illustrative route, with a clear service-availability disclaimer. It is not verified coverage data.

## Asset provenance

Asset: `public/images/experience/nepal-courier.webp` (1400 × 933, approximately 237 KB). Created with the built-in imagegen tool, then compressed to WebP. The existing Tukaatu logo remains unchanged. The hero is an editorial illustration, not documentary photography of company staff or vehicles. Its alt text identifies it as an illustration. Authentic company photography can replace this asset when available.

Final generation prompt:

> Create a premium editorial illustration for the Tukaatu Express Nepal logistics website hero. Landscape 3:2 composition, beautifully art-directed painterly realism with very subtle paper texture, fresh sunlit sky blue, warm butter yellow, off-white and deep ink accents. A friendly Nepali courier in a clean blue jacket and yellow motorcycle helmet beside a practical blue delivery scooter with secured cardboard parcels, a compact blue delivery van behind him, on a Kathmandu street with authentic warm terracotta Newari brick architecture and a small pagoda roof, green foothills in the distance. Bright natural morning light, human warmth, elegant cinematic composition, generous sky in upper quarter. Courier and vehicles centered so image works cropped to portrait or landscape. Premium editorial campaign quality, not a 3D toy, not generic stock, no floating phones, no UI, no lettering, no invented logos, no watermarks. This is clearly an illustrated brand scene, not documentary photography. Detailed physically plausible vehicles and hands.

## Backend requirements

Live tracking, price quotes and enquiry submission require the existing `NEXT_PUBLIC_API_URL` configuration and an available backend. No mock shipment responses or artificial success states were introduced.

## Validation

- JSX/CSS parsing and `git diff --check` passed.
- Production build passed after removing the duplicate `/` route. Existing admin import warnings remain for `updateBranchOffice`, `saveBranch`, and `MapOutlined`; these are outside the public redesign.
- Browser-checked the homepage at desktop and 390px mobile; checked horizontal overflow at 320px and 768px. All logo/hero images loaded.
- Mobile menu exposes all links, reports expanded state, and closes with Escape.
- Whitespace-only tracking input is rejected. `  QA-TKT & /  ` is trimmed and sent to `/tracking?tracking=QA-TKT%20%26%20%2F`, and the existing tracking page receives the exact decoded value.
- Eleven public routes returned HTTP 200: `/`, `/services`, `/pricing`, `/franchise`, `/franchise/apply`, `/about`, `/contact`, `/login`, `/tracking`, `/privacy-policy`, `/terms-conditions`.
- Live shipment lookup could not be completed because this local checkout does not configure `NEXT_PUBLIC_API_URL`. Pricing/enquiry backend calls likewise need the existing API configuration. No claim of measured Core Web Vitals is made.
