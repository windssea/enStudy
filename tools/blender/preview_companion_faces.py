"""Inspect generated closed eyelids, then render the exact app-exported poses."""
import bpy
import bmesh
import hashlib
import json
import math
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2]
export=json.loads((ROOT/'artifacts/companion-faces-export.json').read_text(encoding='utf-8'))
objects=[]
for kind in ('fox','pikachu'):
    for label in ('open','closed','side','quiet'):
        bpy.ops.wm.open_mainfile(filepath=str(ROOT/('design-assets/clay-'+kind+('-v1.blend' if kind=='fox' else '-v2.blend'))))
        for obj in list(bpy.context.scene.objects):
            if obj.type in ('MESH','EMPTY') and not obj.name.startswith('Studio floor'):
                bpy.data.objects.remove(obj,do_unlink=True)
        path=ROOT/('artifacts/face-'+kind+'-'+('closed' if label=='side' else label)+'.glb')
        bpy.ops.import_scene.gltf(filepath=str(path))
        scene=bpy.context.scene
        if label=='closed':
            lids=[obj for obj in scene.objects if obj.type=='MESH' and obj.name.startswith('companion-closed-eye-')]
            if len(lids)!=2: raise RuntimeError('Missing closed-eye solids: '+kind)
            for obj in lids:
                bm=bmesh.new()
                bm.from_mesh(obj.data)
                bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=1e-7)
                problems={'boundary_edges':sum(e.is_boundary for e in bm.edges),
                    'non_manifold_edges':sum(not e.is_manifold for e in bm.edges),
                    'inconsistent_edges':sum(not e.is_contiguous for e in bm.edges),
                    'degenerate_faces':sum(f.calc_area()<1e-12 for f in bm.faces),
                    'invalid_coordinates':sum(not all(math.isfinite(x) for x in v.co) for v in bm.verts)}
                volume=bm.calc_volume(signed=True)
                if any(problems.values()) or volume<=0:raise RuntimeError('Invalid lid '+kind+'/'+obj.name+': '+str(problems))
                obj.data.calc_loop_triangles()
                objects.append({'kind':kind,'name':obj.name,**problems,'volume':volume,'triangles':len(obj.data.loop_triangles)})
                bm.free()
            bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/('design-assets/clay-'+kind+'-closed-eyes.blend')),compress=True)
        camera=scene.camera
        target=Vector((0,0,1.30))
        camera.location=(2.1,-7,2.3) if label!='side' else (6,-3.5,2.5)
        camera.rotation_euler=(target-camera.location).to_track_quat('-Z','Y').to_euler()
        camera.data.ortho_scale=1.7
        scene.render.resolution_x=640
        scene.render.resolution_y=640
        scene.cycles.samples=32
        scene.render.filepath=str(ROOT/('artifacts/face-'+kind+'-'+label+'.png'))
        bpy.ops.render.render(write_still=True)
report={'blender':bpy.app.version_string,**export,'objects':objects,'closed_solids':True}
(ROOT/'design-assets/companion-closed-eyes.qa.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
print('CLOSED_EYES_COMPLETE '+str(len(objects))+' solids / 8 actual renders')
