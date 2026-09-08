# Geographic index

The index offers List, Grid and a geographic view. Its label and projection adapt to the current era-filtered selection: regions separated by more than 60 spherical degrees use an orthographic globe; compact selections use a fitted Mercator map. Switching layouts keeps the era filter. Embedded pages preserve their grid default and internal links.

## Attribution model

`data/ornaments/origins.json` holds reviewed attributions keyed by stable source ID. It is separate from the Notion-generated export so routine syncs do not overwrite it. Each record includes a country code, basis, explanatory note and a museum evidence URL.

The reviewed active set has no museum-confirmed places of creation. The geography represents cultural or artist-nationality attributions, documented in the source-linked data file. There is no visible disclaimer row. It must not be presented as precise production locations. Modern country positions and borders are orientation aids only.

`lib/ornaments/geography.ts` resolves reviewed records first, then recognized explicit catalog-region aliases. It deliberately does not infer a location from a holding museum, an artist name, a title or a depicted/project site. Unknown or ambiguous future records are not plotted and remain available in List and Grid. To add another country, extend the region registry and its representative coordinate, then add reviewed source-linked records as needed.

## Interaction

- Select a region using a country or floating count label.
- Selecting a region animates the camera to center and zoom into that country in either projection. Reset restores the overview; manual controls interrupt camera motion.
- Floating labels are 28px high. Connectors meet the facing edge, avoid rounded corners and stay anchored during entrance animations; placement also discourages lines crossing other labels.
- Region names are uppercase. Labels use collision-aware placement calculated once for the overview and keep their pin-relative offsets during pan, rotation and zoom. They move beyond the canvas naturally instead of being clamped or repacked at its edges. Layout is recalculated only for a changed collection, projection type or viewport.
- Region/count labels float above the globe and map with anchored pins, subtle shadows, and a spring entrance when they rotate or scroll into view. Reduced-motion preferences disable the animation.
- The SVG viewBox and projection follow the actual canvas width and height, so Mercator maps fill the pane rather than sitting inside a fixed-aspect-ratio box.
- There is no visible instruction row. Keyboard help stays screen-reader accessible; a small map credit and floating zoom controls remain over the map.
- The map starts immediately beneath the existing List / Grid / Globe controls, without a separate Geographic Index row.
- The geography fills the full catalog width. There is no right panel, region-selection grid, bottom specimen grid or replacement drawer. Browse and open specimens through the existing List and Grid views.
- Drag the globe to rotate or a regional map to pan; use the zoom buttons and Reset.
- Pinch with two fingers on the map or floating labels to zoom around the moving midpoint, between 0.75× and 8×. Lifting one finger resumes a rebased single-finger drag without a jump; a pinch never activates a country. Trackpad pinch is supported through non-passive Ctrl-wheel handling and Safari gesture events, scoped to the map area. Ordinary scrolling and browser zoom outside the map are not intercepted.
- Globe drag sensitivity uses the zoomed projection radius and latitude rather than a fixed degrees-per-pixel rate, keeping zoomed movement close to pointer distance. Arrow keys move approximately 40 screen pixels in either projection instead of taking large angular jumps.
- Keyboard: Tab to floating labels; Enter or Space selects a region. On the geographic surface itself, arrows move, plus/minus zoom and Home resets.
- Era or archive changes reset geographic selection and bounds. Admin archive controls remain available in List and Grid.
- Map geometry is bundled from `world-atlas` / Natural Earth; no API key, map tiles, tracking or runtime map service is needed.

## Verification inventory

- List → Globe → Grid → List, with selected-state indicators.
- Full collection: 19 specimens and six regional attributions; select countries and restore the overview with Reset.
- Era filtering switches Globe → Map → Globe and updates counts.
- No sidebar or specimen grid in geography; full-width map on desktop, mobile and embedded pages.
- Globe drag, map pan, zoom in/out, Reset; keyboard rotation and marker activation.
- Touch pinch in/out, midpoint anchoring, two-finger translation, limits, touch cancellation and pinch-to-drag handoff; trackpad pinch, normal scrolling, and label activation after a gesture.
- Continuous drag paths: label-to-pin offsets and connector endpoints remain stable during movement and after pointer release; labels do not jump when peers leave or re-enter the view.
- Desktop, 375px mobile and embedded layouts; List / Grid navigation remains available.
- Reduced motion and storage-denied iframe environments.
- Off-path cases: empty selection, single-region selection, unknown/ambiguous region, previously selected region removed by filtering.

Unit coverage is in `lib/ornaments/geography.test.ts`, `lib/ornaments/geography-labels.test.ts` and `lib/ornaments/geography-camera.test.ts`, including pan paths, changing pin order/visibility, zoom-aware drag sensitivity, pinch focal-point preservation, zoom limits and reversibility. Run `npm test`, `npx tsc --noEmit` and `npm run build`. The repository's existing lint failures in legacy effect-based state synchronization and the admin login anchor are outside this geographic-view change.
