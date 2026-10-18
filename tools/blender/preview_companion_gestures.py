"""Render the app's exported GLB poses, without replacing their geometry."""
import bpy
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
for kind in ('fox','pikachu'):
    for action in ('nod','stretch','tail','stretch-quiet'):
        bpy.ops.wm.open_mainfile(filepath=str(ROOT/('design-assets/clay-'+kind+('-v1.blend' if kind=='fox' else '-v2.blend'))))
        for obj in list(bpy.context.scene.objects):
            if obj.type in ('MESH','EMPTY') and not obj.name.startswith('Studio floor'):
                bpy.data.objects.remove(obj,do_unlink=True)
        bpy.ops.import_scene.gltf(filepath=str(ROOT/('artifacts/gesture-'+kind+'-'+action+'.glb')))
        scene=bpy.context.scene
        scene.render.resolution_x=640
        scene.render.resolution_y=640
        scene.cycles.samples=32
        scene.render.filepath=str(ROOT/('artifacts/gesture-'+kind+'-'+action+'.png'))
        bpy.ops.render.render(write_still=True)
print('COMPANION_GESTURES_RENDERED 8 actual GLB poses')
