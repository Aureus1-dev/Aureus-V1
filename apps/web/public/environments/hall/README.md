# Aureus Hall Environment Assets

Launch asset package for the no-logo Living Hall member experience.

## Integration

These assets are already installed at `apps/web/public/environments/hall/` and are served from `/environments/hall/...`. The runtime mapping lives in `design-system/components/living-hall/hall-manifest.ts`.

## Lighting states

The nine files in `lighting-states/` describe one fixed Hall across a living day:

1. Deep night — embers only; candle extinguished.
2. Predawn — first cool light.
3. Dawn/breakfast — warm light; bird perched outside.
4. Morning — awake; bird departs.
5. Noon — clearest neutral daylight.
6. Afternoon — steady directional light.
7. Golden hour — warm return light.
8. Evening — fireplace and one candle lit.
9. Late night — fire settling; candle extinguished.

Use the member's local time to select a state. Crossfade slowly between states; do not play them as rapid animation frames. The help composer remains available throughout.

## Render passes

- `hall-beauty-reference.webp`: clean no-logo Hall reference.
- `hall-surface-normal.webp`: normal-map-style surface orientation pass.
- `hall-depth-white-near.webp`: grayscale depth pass; white is near and black is far.

The normal and depth passes are AI-derived rather than geometry-rendered. For the Pilot-5 launch, keep shader displacement subtle (approximately 4–6 px maximum) to avoid exposing small edge differences.

## Living effects

- Fireplace: slow independent flame or ember loop appropriate to the active lighting state.
- Leaves: restrained 12–18 second movement loop.
- Bird: morning only, at most once per session; chirp only when sound is enabled.
- Candle: off during daylight, on in evening, off again late at night.
- Reduced motion: disable foliage, bird, and displacement motion while preserving static lighting selection.

## Launch identity rule

No logo, Mark, placeholder symbol, or opening-logo animation is part of this asset package. Plain text `Aureus` may remain in the fixed interface layer. The Member's Mark and final institutional logo are deferred and must not block launch.
