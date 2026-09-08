# Geographic index

The index offers List, Grid and a geographic view. Its label and projection adapt to the current era-filtered selection: regions separated by more than 60 spherical degrees use an orthographic globe; compact selections use a fitted Mercator map. Switching layouts keeps the era filter. Embedded pages preserve their grid default and internal links.

## Attribution model

`data/ornaments/origins.json` holds reviewed attributions keyed by stable source ID. It is separate from the Notion-generated export so routine syncs do not overwrite it. Each record includes a country code, basis, explanatory note and a museum evidence URL.

The reviewed active set has no museum-confirmed places of creation. The geography represents cultural or artist-nationality attributions, described in each specimen link's tooltip. The visible disclaimer row has been removed. It must not be presented as precise production locations. Modern country positions and borders are orientation aids only.

`lib/ornaments/geography.ts` resolves reviewed records first, then recognized explicit catalog-region aliases. It deliberately does not infer a location from a holding museum, an artist name, a title or a depicted/project site. Unknown or ambiguous future records appear under Unplaced rather than disappearing or receiving invented coordinates. To add another country, extend the region registry and its representative coordinate, then add reviewed source-linked records as needed.

## Interaction

- Select a region using a country, count marker or region button.
- Region names are uppercase, and the selection grid has 2px gaps between hover backgrounds.
- Region/count labels float above the globe and map, with collision avoidance, anchored pins, subtle shadows, and a spring entrance when they rotate or scroll into view. Reduced-motion preferences disable the animation.
- The SVG viewBox and projection follow the actual canvas width and height, so Mercator maps fill the pane rather than sitting inside a fixed-aspect-ratio box.
- There is no visible instruction row. Keyboard help stays screen-reader accessible; a small map credit and floating zoom controls remain over the map.
- The map starts immediately beneath the existing List / Grid / Globe controls, without a separate Geographic Index row.
- Browse specimens in the scrollable two-column right panel; there is no separate bottom grid or single-specimen preview.
- Hover or focus a specimen to highlight its country; open it to reach the existing source detail page. Attribution notes remain available in the link tooltips and the source-linked data file.
- Drag the globe to rotate or a regional map to pan; use the zoom buttons and Reset.
- Keyboard: Tab to regions and specimens; Enter opens a specimen, and Enter or Space selects a region. On the geographic surface itself, arrows move, plus/minus zoom and Home resets.
- Era or archive changes reset geographic selection and bounds. Admin archive controls remain available on specimen cards.
- Map geometry is bundled from `world-atlas` / Natural Earth; no API key, map tiles, tracking or runtime map service is needed.

## Verification inventory

- List → Globe → Grid → List, with selected-state indicators.
- Full collection: 19 specimens and six regional attributions; select all regions and restore All regions.
- Era filtering switches Globe → Map → Globe and updates counts and specimen selection.
- Every specimen is linked from the right-panel grid, with source-detail navigation and country highlighting.
- Globe drag, map pan, zoom in/out, Reset; keyboard rotation and marker activation.
- Desktop, 375px mobile and embedded layouts, including independently scrolling specimen panels.
- Reduced motion and storage-denied iframe environments.
- Off-path cases: empty selection, single-region selection, unknown/ambiguous region, previously selected region removed by filtering.

Unit coverage is in `lib/ornaments/geography.test.ts`. Run `npm test`, `npx tsc --noEmit` and `npm run build`. The repository's existing lint failures in legacy effect-based state synchronization and the admin login anchor are outside this geographic-view change.
