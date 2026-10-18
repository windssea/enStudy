"""Inspect and render the actual code-defined word meshes in a fresh background document."""
import bpy
import bmesh
import json
import math
import hashlib
from pathlib import Path
from mathutils import Vector
ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'artifacts/word-objects-base.glb'
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(SOURCE))
checks = []
for obj in list(bpy.context.scene.objects):
    if obj.type != 'MESH':
        continue
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    bmesh.ops.remove_doubles(bm, verts=list(bm.verts), dist=.000001)
    problems = {'boundary_edges': sum(edge.is_boundary for edge in bm.edges),
                'non_manifold_edges': sum(not edge.is_manifold for edge in bm.edges),
                'degenerate_faces': sum(face.calc_area() < 1e-12 for face in bm.faces),
                'invalid_coordinates': sum(not all(math.isfinite(value) for value in vertex.co) for vertex in bm.verts)}
    volume = bm.calc_volume(signed=True)
    bm.free()
    if any(problems.values()) or volume <= 0:
        raise RuntimeError('Invalid runtime word solid ' + obj.name + ': ' + str(problems) + ' volume=' + str(volume))
    checks.append({'name': obj.name, **problems, 'volume': volume})
    for polygon in obj.data.polygons:
        polygon.use_smooth = not obj.name.startswith('pencil-shaft')

scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.device = 'CPU'
scene.cycles.samples = 48
scene.cycles.use_denoising = True
scene.render.resolution_x = 1200
scene.render.resolution_y = 800
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'PNG'
scene.view_settings.view_transform = 'AgX'
scene.world.use_nodes = True
scene.world.node_tree.nodes['Background'].inputs['Color'].default_value = (.8,.85,.95,1)
scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value = .25
for material in bpy.data.materials:
    if not material.use_nodes:
        continue
    principled = next((node for node in material.node_tree.nodes if node.type == 'BSDF_PRINCIPLED'), None)
    if not principled:
        continue
    principled.inputs['Roughness'].default_value = .88
    noise = material.node_tree.nodes.new('ShaderNodeTexNoise')
    noise.inputs['Scale'].default_value = 100
    bump = material.node_tree.nodes.new('ShaderNodeBump')
    bump.inputs['Strength'].default_value = .12
    bump.inputs['Distance'].default_value = .003
    material.node_tree.links.new(noise.outputs['Fac'],bump.inputs['Height'])
    material.node_tree.links.new(bump.outputs['Normal'],principled.inputs['Normal'])
bpy.ops.mesh.primitive_plane_add(size=200, location=(0,0,-.025))
floor = bpy.context.object
floor_material = bpy.data.materials.new('Warm studio floor')
floor_material.diffuse_color=(.92,.83,.67,1)
floor.data.materials.append(floor_material)
def light(name, position, power, size, colour):
    data = bpy.data.lights.new(name,'AREA')
    data.energy = power
    data.shape = 'DISK'
    data.size = size
    data.color = colour
    obj = bpy.data.objects.new(name,data)
    scene.collection.objects.link(obj)
    obj.location = position
    obj.rotation_euler = (Vector((0,-1,.5))-obj.location).to_track_quat('-Z','Y').to_euler()
light('Soft warm key',(-3,-5,7),750,5,(1,.9,.78))
light('Cool fill',(5,-2,5),350,4,(.8,.9,1))
light('Warm rim',(0,4,6),650,4,(1,.96,.86))
camera_data = bpy.data.cameras.new('Word gallery camera')
camera = bpy.data.objects.new('Word gallery camera',camera_data)
scene.collection.objects.link(camera)
camera.location=(4,-9,7)
camera.rotation_euler=(Vector((0,-1.1,.6))-camera.location).to_track_quat('-Z','Y').to_euler()
camera_data.type='ORTHO'
camera_data.ortho_scale=6.7
scene.camera=camera
scene.render.filepath=str(ROOT/'design-assets/previews/word-objects-studio.png')
bpy.ops.render.render(write_still=True)
source_text=(ROOT/'src/scene/wordObjectModel.ts').read_text(encoding='utf8').replace('\r\n','\n')
qa={'blender':bpy.app.version_string,'source_ts_sha256':hashlib.sha256(source_text.encode('utf8')).hexdigest(),'source_glb_sha256':hashlib.sha256(SOURCE.read_bytes()).hexdigest(),'objects':checks,'closed_solids':True}
(ROOT/'design-assets/word-objects.qa.json').write_text(json.dumps(qa,indent=2),encoding='utf8')
print('WORD_OBJECTS_COMPLETE '+str(len(checks))+' closed meshes; no geometry repair applied.')
