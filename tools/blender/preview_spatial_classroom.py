"""Inspect the exact Three.js teaching geometry, then render all four placements.

Uses a fresh background Blender document; never touches an open user document.
The runtime source, not this Blender QA scene, owns geometry and animation.
"""
import bpy, bmesh, json, hashlib, math
from mathutils import Vector
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
report = {"blender": bpy.app.version_string, "poses": {}, "source_hashes": {}}
for source in ("src/scene/spatialModel.ts", "packages/domain/spatial.ts"):
    report["source_hashes"][source] = hashlib.sha256((ROOT/source).read_bytes()).hexdigest()
for pose in ("home", "in", "on", "under"):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    asset = ROOT/f"artifacts/spatial-{pose}.glb"
    bpy.ops.import_scene.gltf(filepath=str(asset))
    meshes = [obj for obj in bpy.context.scene.objects if obj.type == 'MESH']
    topology = []
    for obj in meshes:
        bm = bmesh.new()
        bm.from_mesh(obj.data)
        # Exported UV/normal seams duplicate vertices; weld only the QA copy.
        bmesh.ops.remove_doubles(bm, verts=list(bm.verts), dist=0.000001)
        bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
        issues = {"boundary_edges": sum(e.is_boundary for e in bm.edges),
                  "nonmanifold_edges": sum(not e.is_manifold for e in bm.edges),
                  "degenerate_faces": sum(f.calc_area()<1e-12 for f in bm.faces),
                  "invalid_vertices": sum(not all(math.isfinite(v) for v in vert.co) for vert in bm.verts)}
        volume = bm.calc_volume()
        if any(issues.values()) or volume <= 0:
            raise RuntimeError(f"Invalid runtime solid {obj.name}: {issues}, volume={volume}")
        topology.append({"name": obj.name, **issues, "volume": volume})
        bm.free()
        obj.data.calc_loop_triangles()
    report["poses"][pose] = {"meshes": len(meshes), "triangles": sum(len(o.data.loop_triangles) for o in meshes), "source_glb_sha256": hashlib.sha256(asset.read_bytes()).hexdigest(), "objects": topology}
    scene=bpy.context.scene
    scene.render.engine='CYCLES'
    scene.cycles.device='CPU'
    scene.cycles.samples=32
    scene.cycles.use_denoising=True
    scene.render.resolution_x=960
    scene.render.resolution_y=660
    scene.render.resolution_percentage=100
    scene.render.image_settings.file_format='PNG'
    scene.view_settings.view_transform='AgX'
    scene.world=bpy.data.worlds.new('Warm classroom studio')
    scene.world.use_nodes=True
    scene.world.node_tree.nodes['Background'].inputs['Color'].default_value=(.82,.87,.96,1)
    scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value=.25
    bpy.ops.mesh.primitive_plane_add(size=200, location=(0,0,-.005))
    floor=bpy.context.object
    floor.name='Studio floor - QA only'
    mat=bpy.data.materials.new('Warm paper floor');mat.diffuse_color=(.94,.85,.7,1);floor.data.materials.append(mat)
    def light(name, location, power, size, colour):
        data=bpy.data.lights.new(name,'AREA');data.energy=power;data.shape='DISK';data.size=size;data.color=colour
        obj=bpy.data.objects.new(name,data);scene.collection.objects.link(obj);obj.location=location
        obj.rotation_euler=(Vector((0,0,.7))-obj.location).to_track_quat('-Z','Y').to_euler()
    # GLTF import maps Three's positive Z (front) to Blender's negative Y.
    light('Large warm softbox',(-3,-4,6),550,5,(1,.89,.78))
    light('Cool fill',(4,-2,3.5),220,4,(.78,.9,1))
    light('Soft rim',(1,4,4),350,3,(1,.95,.87))
    data=bpy.data.cameras.new('Position learning camera');data.type='ORTHO';data.ortho_scale=5.4
    camera=bpy.data.objects.new('Position learning camera',data);scene.collection.objects.link(camera)
    camera.location=(2,-7,3.0);camera.rotation_euler=(Vector((0,0,.8))-camera.location).to_track_quat('-Z','Y').to_euler();scene.camera=camera
    scene.render.filepath=str(ROOT/f'design-assets/previews/clay-position-{pose}.png')
    if pose=='in': bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'design-assets/clay-position-classroom.blend'),compress=True)
    bpy.ops.render.render(write_still=True)
(ROOT/'design-assets/clay-position-classroom.qa.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf8')
print('SPATIAL_CLASSROOM_COMPLETE '+json.dumps({k:{'meshes':v['meshes'],'triangles':v['triangles']} for k,v in report['poses'].items()}))
