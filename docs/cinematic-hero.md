# Cinematic delivery hero

The homepage hero is a scroll-controlled image sequence, not live-action video. Eight generated photographic scenes use scroll-linked camera pushes/pans and cross-dissolves. All images are illustrative, not actual fleet/staff photography.

Built-in image_gen was used (not CLI). Assets are saved in `public/images/experience/cinematic/`, optimized to 1600px WebP. First frame has high priority, subsequent scenes load after hydration. No video dependency or animation library is added. Native scrolling is preserved; chapter navigation, skip story, replay and reduced-motion manual scenes are supported. Tracking still trims and encodes the existing tracking route.

## Exact prompt template

Use case: photorealistic-natural. Asset type: widescreen cinematic website hero sequence for Tukaatu Express in Nepal. Create ONE photorealistic cinematic frame, 16:9 widescreen. Scene: {SCENE} Visual continuity: premium natural documentary advertising photography, navy blue #1677B8 uniforms/vehicles, warm yellow #F4C542 accents, same small kraft parcel with blue tape stripe wherever relevant. Warm bright natural light, refined restrained color grade, realistic Nepali people and geography, 35mm cinematic lens, detailed believable materials. Composition: subjects and key action on center-right, keep left quarter visually calmer for optional UI; allow center crop on mobile. No typography, no subtitles, no watermark, no added logos, no montage, no illustration, no UI mockup.

## Scene substitutions

### order

An over-the-shoulder close-up of a young adult Nepali woman at home in Kathmandu ordering an item on her smartphone, a subtle generic blue shopping interface with NO legible text. Warm window light, textured modern Nepali home, natural human details.

Saved asset: `public/images/experience/cinematic/order.webp`.

### store

A Nepali female merchant in a bright small contemporary Kathmandu clothing shop receiving an order on her tablet while packing a single small kraft cardboard box with a blue tape stripe. Clothing shelves behind, authentic working environment.

Saved asset: `public/images/experience/cinematic/store.webp`.

### pickup

A friendly Nepali courier wearing navy blue polo and yellow helmet collecting a small kraft box with a blue tape stripe from a Nepali female merchant outside her local Kathmandu clothing store. A blue delivery scooter beside them. Human handover, genuine candid expressions.

Saved asset: `public/images/experience/cinematic/pickup.webp`.

### origin

Inside a tidy bright Nepal logistics origin branch, two Nepali workers in navy workwear scanning and sorting small kraft parcels on a clean counter; one central box has a blue tape stripe. Open roller door, organized shelves, natural daylight.

Saved asset: `public/images/experience/cinematic/origin.webp`.

### transport

Cinematic wide landscape shot of a blue delivery van travelling on a safe paved mountain road between green terraced hills in Nepal, Himalaya foothills in distance, morning sunshine, slight natural motion blur on road, van sharp, no company marks.

Saved asset: `public/images/experience/cinematic/transport.webp`.

### destination

A Nepali logistics team in navy workwear unloading kraft parcels with blue tape stripes from a blue van into a bright provincial destination branch in Nepal; inviting local architecture, early afternoon sun, careful handling.

Saved asset: `public/images/experience/cinematic/destination.webp`.

### rider

A Nepali delivery rider wearing a yellow helmet and navy jacket riding a blue scooter with a securely mounted delivery box through a quiet sunlit residential lane in Pokhara, Nepal. Realistic street scale, trees and homes, natural forward movement.

Saved asset: `public/images/experience/cinematic/rider.webp`.

### door

Warm close cinematic photograph of a smiling Nepali woman receiving a small kraft parcel with blue tape stripe from a navy-uniformed courier wearing a yellow helmet at the doorway of a modern Nepali home. Focus on hands and parcel, faces also visible, warm afternoon light, authentic human moment.

Saved asset: `public/images/experience/cinematic/door.webp`.


## Verification

Production build passes (88 routes). Browser verified all eight image requests complete, transport and doorstep chapter navigation, reverse scroll to origin branch, pinned scene position, skip-story exit, mobile 390px and 320px widths with no horizontal overflow, tracking form visible above fold, and whitespace tracking validation. Reduced-motion behavior is implemented through the media preference with static/manual scene selection. Assets total approximately 1.2 MB.
