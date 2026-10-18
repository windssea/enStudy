# Clay fox authoring

## v0.34 closed eyes

```powershell
node scripts/export-companion-faces.mjs
& 'D:/Program Files/Blender Foundation/Blender 5.2/blender.exe' --background --factory-startup --python tools/blender/preview_companion_faces.py
```

The app now uses surface-conforming, capped eyelid tubes instead of scaling fitted eye beads. The exporter captures open, closed, quiet and idle poses from both actual GLBs with the same pose code and current instance-local AO corrections. The independent checker rejects open or inconsistently wound solids without repairing them; its report binds the current source/model hashes. Eight Cycles views and editable closed-eye inspection scenes are produced. Model construction performs 310 surface probes per companion; animation swaps visibility and changes owned colour buffers only at state transitions. See [scope, tests and unverified device gates](../../docs/55-surface-safe-cartoon-blinks.md).

## v0.33 adventure Pikachu and expressive poses

```powershell
node scripts/export-pikachu-base.mjs --adventure
& 'D:/Program Files/Blender Foundation/Blender 5.2/blender.exe' --background --factory-startup --python tools/blender/build_clay_pikachu_v2.py
node scripts/export-companion-gestures.mjs
& 'D:/Program Files/Blender Foundation/Blender 5.2/blender.exe' --background --factory-startup --python tools/blender/preview_companion_gestures.py
```

The v2 model has a bent ear and closed scarf pieces, 30 meshes / 26,680 triangles / 1,279,276 bytes. Its 13 attachments and closed-solid QA are bound to the real GLB SHA-256. The old v1 source and assets remain reproducible by the commands below. Only v2 is imported into the current app bundle.

The eight new pose renders use the same absolute pose function as the browser, with both actual shipped GLBs. Clay runtime materials cap the source's full white sheen; since GLTFExporter omits Three's separate sheen intensity, inspection export bakes intensity into sheenColorFactor before Blender imports it. This preserves the intended material rather than reintroducing a white fabric layer. Fine browser bump is omitted in the pose export, without replacing any geometry. These are offline model inspections; browser rendering and device interaction remain separate gates. See [v0.33 scope and evidence](../../docs/54-expressive-clay-partners.md).

## Pikachu partner

The Pikachu character is from Pokémon; the clay model in this project is built from `src/scene/pikachuModel.ts`, not a downloaded character asset. Character-name reference: [official Pokémon parents page](https://parents.pokemon.com/en-us/video-games-and-apps/).

```powershell
node scripts/export-pikachu-base.mjs
& 'D:/Program Files/Blender Foundation/Blender 5.2/blender.exe' --background --factory-startup --python tools/blender/build_clay_pikachu.py
node scripts/export-companion-poses.mjs
& 'D:/Program Files/Blender Foundation/Blender 5.2/blender.exe' --background --factory-startup --python tools/blender/preview_companion_poses.py
```

Authoring export deliberately keeps original facial beads; Blender conforms them once. The runtime loading fallback conforms its own geometry. Feeding already-wrapped fallback geometry into the Blender attachment pass creates clipped edges and must be avoided. Closed smile arcs include end caps in the source. The build checks all 25 solids and 11 attached details, writes GLB-bound QA, a compressed editable blend and four Cycles views. Current asset: 22,924 triangles, 1,107,712 bytes. Runtime pose previews load the actual checked-in GLB and apply the same pose function used by the app, then render in the saved studio; they are not browser screenshots.

The original fox is built from the modelling sources in `src/scene/foxModel.ts`, refined in local Blender, then exported with vertex ambient occlusion. No downloaded characters, paid service or image-to-model placeholder is used.

The repository includes the editable `design-assets/clay-fox-v1.blend`, the runtime `src/assets/models/clay-fox-v1.glb`, and a Cycles studio preview. The preview proves the Blender model and lighting setup; it is not a browser or iPad screenshot.

Regenerate from the project root:

```powershell
node scripts/export-fox-base.mjs
& 'D:/Program Files/Blender Foundation/Blender 5.2/blender.exe' --background --factory-startup --python tools/blender/build_clay_fox.py
```

Use a fresh background document. The script clears that document, imports the generated base, refines major forms with higher resolution UV spheres, applies small hand-moulded deviations, creates matte clay shaders, bakes vertex AO, exports the selected character and renders a three-softbox Cycles preview. It does not edit a user's open Blender scene or preferences.

Validated version: Blender 5.2.1 LTS. The current file is 1,468,224 bytes with 31,868 triangles and 39 meshes. Facial details, blush, boot patches and the badge are wrapped onto their supporting surfaces. Every mesh is checked for closed manifold geometry, finite coordinates, nondegenerate faces and positive volume; the smile endpoints are capped. The checked-in QA report includes the exact GLB SHA-256. Four Cycles views are rendered for inspection, including the side and backpack.

CI checks the checked-in GLB and its QA binding without requiring Blender. Browser materials add a tiny deterministic clay-grain bump texture; the baked vertex AO is preserved. Independent clones share immutable geometry while owning their pose nodes and materials. Static topology and render inspection do not certify every animated pose or device.

Blender MCP was not exposed in the current session, and plugin discovery returned no matching connected capability. Authoring therefore used the installed Blender CLI directly. No MCP connection was fabricated or installed.

## Runtime word objects

The six word props are code-defined in `src/scene/wordObjectModel.ts`. Inspect the same geometry with:

```powershell
node scripts/export-word-objects.mjs
& 'D:/Program Files/Blender Foundation/Blender 5.2/blender.exe' --background --factory-startup --python tools/blender/preview_word_objects.py
```

The inspection checks all 25 solids without repairing their geometry. Its report binds the modelling source SHA-256; CI detects stale reports. `design-assets/previews/word-objects-studio.png` is a Cycles render of these actual meshes, not a browser screenshot. The browser uses the factory geometry directly and the shared clay studio. Only the preview export strips the tiny runtime bump texture and adds equivalent fine grain in Blender; it does not replace runtime geometry with an unrelated illustration.

## Position classroom

```powershell
node scripts/export-spatial-poses.mjs
& 'D:/Program Files/Blender Foundation/Blender 5.2/blender.exe' --background --factory-startup --python tools/blender/preview_spatial_classroom.py
```

The browser and the inspection use `src/scene/spatialModel.ts` and `packages/domain/spatial.ts`. The exporter places the same moving ball at home, in the box, on the table and under the table. Each pose has 13 closed solids / 8,504 triangles. The QA scene welds export seams only in a check copy and rejects invalid topology; it does not repair or substitute runtime geometry. Four Cycles images and the editable `.blend` preserve the inspected furniture, placements and studio lighting. The report binds both runtime source hashes; the unit suite rejects stale reports. WebGL, actual touch and device performance require separate browser/device checks.
