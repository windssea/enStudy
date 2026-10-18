# Clay fox authoring

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
