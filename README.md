# Player Statue Builder Web

A browser prototype that converts modern 64 x 64 and legacy 64 x 32 Minecraft skins into palette-matched block statues. It includes a Three.js preview and exports Minecraft schematics, structure files, functions, project data, and 3D models.

## Palette compatibility

Block colors are based on the hand-measured maps in SkyTechBytes' [PlayerStatueBuilderX `ColorMaps.java`](https://github.com/SkyTechBytes/PlayerStatueBuilder/blob/master/src/main/java/com/skytechbytes/playerstatuebuilder/builder/ColorMaps.java). The effective upstream maps provide wool, planks, terracotta, concrete, stained glass, and grayscale families.

Color matching defaults to upstream-compatible LAB with equal component weights. RGB, absolute RGB, HSB, and HSL are also available in Build Rules. The LAB conversion intentionally preserves upstream's non-gamma-corrected RGB-to-XYZ calculation rather than substituting a textbook CIELAB conversion.

Legacy skins are expanded to the modern 64 x 64 layout before statue generation by mirroring the right leg and arm into the missing left-side UV regions. Transparent pixels remain empty; partially transparent skin pixels prefer stained glass candidates, matching the upstream alpha thresholds.

## Export architecture

Generation produces a `SchematicDocument` before any file conversion. Its palette stores Minecraft block states, preview colors, and opacity once; placed blocks contain only XYZ coordinates and a palette index. The document also carries dimensions, Minecraft data version, model metadata, and generator identity.

The PSB JSON exporter writes the deterministic `psb-statue` format. It expands palette indices into block states, sorts blocks numerically by X, Y, and Z, and excludes the project name, skin source, model label, preview colors, and exporter choice. Identical generated blocks therefore produce identical JSON whether the skin came from a PNG upload or player lookup.

Each output converter is isolated under `src/exporters/` and accepts only that document. `src/exporters/index.ts` is the registry used by the UI, so converters do not depend on Vue, Pinia, skin parsing, or statue generation.

Available outputs:

- `.litematic` — Litematica region with a packed block-state palette.
- `.schem` — Sponge Schematic v2 for WorldEdit-compatible tools.
- `.nbt` — vanilla Java Edition structure-block format.
- `.schematic` — legacy MCEdit/WorldEdit numeric block format.
- `.mcfunction` — readable relative `setblock` commands.
- Clipboard command — a self-contained Java Edition command-block command that builds relative to the command block; highly detailed statues that exceed Minecraft's command-size limit must use `.mcfunction` instead.
- `.glb` — binary glTF 2.0 model with mapped colors and glass alpha.
- `-compat.glb` — opaque RGB-only glTF for importers that reject vertex alpha or blended materials.
- `.ply` — colored voxel mesh with an RGBA vertex property.
- `-compat.ply` — RGB-only PLY for strict readers that reject the optional alpha property.
- `.csv` — XYZ, block-state, and color table.
- `.psb.json` — lossless canonical project document.

## Download telemetry

Telemetry about statue creations is sent when an export is downloaded.

The legacy `.schematic` format predates mangrove planks and namespaced block states, so mangrove planks are represented as jungle planks in that one converter. Modern Minecraft formats preserve the original block state. The 3D formats emit complete cubes, including hidden internal faces, to keep conversion deterministic and dependency-free.

## Serve locally

```bash
npm install
npm run dev
```

Open the URL printed by Vite, normally `http://localhost:5173/`.

Player-name lookup works on static hosting. Following upstream's `MineskinSkinFetcher`, the browser requests `https://mineskin.eu/download/{username}` directly and falls back to MCHeads' public name endpoint. Both services currently allow browser CORS, so no Node, PHP, or serverless API is required.

To deploy under a normal `public_html` directory, run `npm run build` and upload the contents of `dist/` to `public_html/`. These third-party public endpoints can still change their CORS policy, availability, or rate limits independently of this project.

Production check and preview:

```bash
npm test
npm run build
npm run preview
```

## Setup commands used

The initial command run was:

```bash
npx create-vite@latest . --template vue-ts && npm install && npm install pinia three && npm run build
```

`create-vite` entered its interactive flow, installed the template dependencies, and started the Vite development server. Because that server kept running, the remaining chained commands did not execute and the process had to be stopped.

Dependency setup then continued with the exact command:

```bash
npm install pinia three && npm install --save-dev @types/three vitest && npm run build
```

For a future non-interactive scaffold, use:

```bash
npx create-vite@latest . --no-interactive --template vue-ts
```
