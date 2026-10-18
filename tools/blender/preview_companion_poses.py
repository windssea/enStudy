"""Render runtime poses exported from the exact checked-in partner GLB."""
import bpy
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
for label in ('wave','quiet'):
    bpy.ops.wm.open_mainfile(filepath=str(ROOT/'design-assets/clay-pikachu-v1.blend'))
    # This is our fresh background document, not the user's open Blender scene.
    for obj in list(bpy.context.scene.objects):
        if obj.type in ('MESH','EMPTY') and obj.name!='Studio floor - not exported':
            bpy.data.objects.remove(obj,do_unlink=True)
    bpy.ops.import_scene.gltf(filepath=str(ROOT/('artifacts/loaded-pikachu-'+label+'.glb')))
    scene=bpy.context.scene
    scene.render.filepath=str(ROOT/('artifacts/pikachu-runtime-'+label+'.png'))
    bpy.ops.render.render(write_still=True)
print('RUNTIME_POSES_COMPLETE wave and quiet from actual GLB.')
