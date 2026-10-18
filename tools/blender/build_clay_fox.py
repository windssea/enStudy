"""Build and render the original clay fox with Blender 5.2.

Input: artifacts/fox-base.glb exported from the procedural modelling source.
Output: editable .blend, a vertex-AO GLB, studio PNG and asset statistics.
Run only in a fresh background Blender session (see README in this folder).
"""
import bpy
import bmesh
import json
import math
import hashlib
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "artifacts/fox-base.glb"
ASSET = ROOT / "src/assets/models/clay-fox-v1.glb"
BLEND = ROOT / "design-assets/clay-fox-v1.blend"
PREVIEW = ROOT / "design-assets/previews/clay-fox-studio.png"

# This is a --factory-startup background document, never the user's open file.
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(SOURCE))
asset_objects = list(bpy.context.scene.objects)
meshes = [obj for obj in asset_objects if obj.type == 'MESH']
major_names = ('round-fox-head', 'cream-face-', 'muzzle-', 'orange-body',
               'cream-belly', 'fluffy-tail', 'cream-tail-tip')
for obj in meshes:
    if any(obj.name.startswith(name) for name in major_names):
        slots = list(obj.data.materials)
        bpy.ops.mesh.primitive_uv_sphere_add(segments=40, ring_count=28, radius=1)
        temporary = bpy.context.object
        geometry = temporary.data
        obj.data = geometry
        for material in slots:
            obj.data.materials.append(material)
        bpy.data.objects.remove(temporary, do_unlink=True)
        # Subtle hand-moulded variation, not a perfect plastic ellipsoid.
        if obj.name.startswith(('round-fox-head', 'orange-body', 'fluffy-tail')):
            obj.data = obj.data.copy()
            texture = bpy.data.textures.new(obj.name + '-hand-pressed', type='CLOUDS')
            texture.noise_scale = .28
            texture.noise_depth = 1
            modifier = obj.modifiers.new('Soft hand-moulded surface', 'DISPLACE')
            modifier.texture = texture
            modifier.strength = .012
            modifier.mid_level = .5
            bpy.context.view_layer.objects.active = obj
            obj.select_set(True)
            bpy.ops.object.modifier_apply(modifier=modifier.name)
    for polygon in obj.data.polygons:
        polygon.use_smooth = True

# Wrap facial details onto the actual clay surface instead of leaving beads
# floating in front of an ellipsoid. Preserve closed volume and the face outline.
bpy.context.view_layer.update()
attachments = []
def surface_tree(target):
    return BVHTree.FromPolygons(
        [target.matrix_world @ vertex.co for vertex in target.data.vertices],
        [list(polygon.vertices) for polygon in target.data.polygons])

def attach(detail_name, target_name, protrusion, intrusion):
    detail = bpy.data.objects[detail_name]
    target = bpy.data.objects[target_name]
    tree = surface_tree(target)
    detail.data = detail.data.copy()
    points = [detail.matrix_world @ vertex.co for vertex in detail.data.vertices]
    depths = [-point.y for point in points]
    midpoint = (max(depths) + min(depths)) / 2
    radius = max((max(depths) - min(depths)) / 2, .000001)
    inverse = detail.matrix_world.inverted()
    for vertex, point, depth in zip(detail.data.vertices, points, depths):
        hit, normal, index, distance = tree.ray_cast(Vector((point.x, -5, point.z)), Vector((0, 1, 0)))
        if hit is None:
            raise RuntimeError('Unsupported facial vertex: ' + detail_name)
        relative = (depth - midpoint) / radius
        offset = (protrusion if relative >= 0 else intrusion) * relative + .0005
        point.y = hit.y - offset
        vertex.co = inverse @ point
    detail.data.update()
    attachments.append({'detail': detail_name, 'surface': target_name, 'vertices': len(points), 'misses': 0})

for side in (-1, 1):
    attach('eye-' + str(side), 'cream-face-' + str(side), .018, .006)
    attach('eye-glint-' + str(side), 'eye-' + str(side), .002, .001)
    attach('eye-small-glint-' + str(side), 'eye-' + str(side), .002, .001)
    attach('blush-' + str(side), 'cream-face-' + str(side), .004, .002)
    attach('boot-toe-' + str(side), 'boot-' + str(side), .012, .004)
attach('little-nose', 'muzzle-base', .02, .006)
attach('nose-glint', 'little-nose', .002, .001)
attach('gentle-smile', 'muzzle-base', .007, .003)
attach('sun-badge', 'cream-belly', .014, .004)
attach('sun-badge-centre', 'sun-badge', .004, .002)

# Validate closed solids after welding only coincident export seams. A half-torus
# smile has two open ends; cap those deliberately before baking/exporting.
topology = []
for obj in meshes:
    obj.data = obj.data.copy()
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    bmesh.ops.remove_doubles(bm, verts=list(bm.verts), dist=0.000001)
    boundary = [edge for edge in bm.edges if edge.is_boundary]
    if boundary:
        bmesh.ops.holes_fill(bm, edges=boundary, sides=0)
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    if bm.calc_volume(signed=True) < 0:
        bmesh.ops.reverse_faces(bm, faces=list(bm.faces))
    problems = {'boundary_edges': sum(edge.is_boundary for edge in bm.edges),
                'non_manifold_edges': sum(not edge.is_manifold for edge in bm.edges),
                'degenerate_faces': sum(face.calc_area() < 1e-12 for face in bm.faces),
                'invalid_coordinates': sum(not all(math.isfinite(value) for value in vertex.co) for vertex in bm.verts)}
    if any(problems.values()) or bm.calc_volume() <= 0:
        raise RuntimeError('Invalid clay solid ' + obj.name + ': ' + str(problems))
    topology.append({'name': obj.name, **problems, 'volume': bm.calc_volume()})
    bm.to_mesh(obj.data)
    bm.free()
    obj.data.update()

for material in bpy.data.materials:
    if not material.use_nodes:
        continue
    node = next((n for n in material.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None)
    if not node:
        continue
    colour = node.inputs['Base Color'].default_value
    dark_bead = max(colour[:3]) < .12
    values = {'Roughness': .32 if dark_bead else .88,
              'Metallic': 0, 'Specular IOR Level': .32 if dark_bead else .25,
              'Subsurface Weight': 0 if dark_bead else .035,
              'Subsurface Scale': .018, 'Sheen Weight': 0 if dark_bead else .08,
              'Sheen Roughness': 1.0}
    for name, value in values.items():
        if name in node.inputs:
            node.inputs[name].default_value = value
    if not dark_bead:
        noise = material.node_tree.nodes.new('ShaderNodeTexNoise')
        noise.name = 'Fine air-dry clay grain'
        noise.inputs['Scale'].default_value = 100
        noise.inputs['Detail'].default_value = 2
        bump = material.node_tree.nodes.new('ShaderNodeBump')
        bump.inputs['Strength'].default_value = .15
        bump.inputs['Distance'].default_value = .004
        material.node_tree.links.new(noise.outputs['Fac'], bump.inputs['Height'])
        material.node_tree.links.new(bump.outputs['Normal'], node.inputs['Normal'])

scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.device = 'CPU'
scene.cycles.samples = 48
scene.cycles.use_denoising = True
scene.render.resolution_x = 896
scene.render.resolution_y = 896
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'PNG'
scene.view_settings.view_transform = 'AgX'
scene.world.use_nodes = True
scene.world.node_tree.nodes['Background'].inputs['Color'].default_value = (.78, .82, .9, 1)
scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value = .22

bpy.ops.mesh.primitive_plane_add(size=200, location=(0, 0, -.025))
floor = bpy.context.object
floor.name = 'Studio floor — not exported'
floor_material = bpy.data.materials.new('Warm seamless studio')
floor_material.use_nodes = True
floor_material.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (.93, .84, .68, 1)
floor_material.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = .9
floor.data.materials.append(floor_material)

def area(name, position, power, size, colour):
    data = bpy.data.lights.new(name, 'AREA')
    data.energy = power
    data.shape = 'DISK'
    data.size = size
    data.color = colour
    light = bpy.data.objects.new(name, data)
    scene.collection.objects.link(light)
    light.location = position
    light.rotation_euler = (Vector((0, 0, 1)) - light.location).to_track_quat('-Z', 'Y').to_euler()

area('Large soft key', (-3.5, -4.5, 6), 600, 5, (1, .89, .77))
area('Cool studio fill', (4, -1, 3.5), 220, 4, (.79, .9, 1))
area('Cream rim', (2, 3.5, 4.5), 450, 3, (1, .95, .87))
camera_data = bpy.data.cameras.new('Clay portrait camera')
camera = bpy.data.objects.new('Clay portrait camera', camera_data)
scene.collection.objects.link(camera)
camera.location = (3, -7, 2.6)
camera.rotation_euler = (Vector((-.15, 0, 1.02)) - camera.location).to_track_quat('-Z', 'Y').to_euler()
camera_data.type = 'ORTHO'
camera_data.ortho_scale = 2.85
scene.camera = camera

# Vertex AO is baked into the glTF, so the browser retains contact depth without
# an SSAO post-processing pass or a large baked texture atlas.
bpy.ops.object.select_all(action='DESELECT')
for obj in meshes:
    attribute = obj.data.color_attributes.get('ClayAO') or obj.data.color_attributes.new(
        name='ClayAO', type='FLOAT_COLOR', domain='CORNER')
    obj.data.color_attributes.active_color = attribute
    obj.select_set(True)
bpy.context.view_layer.objects.active = meshes[0]
scene.cycles.samples = 16
bpy.ops.object.bake(type='AO', target='VERTEX_COLORS')
for obj in meshes:
    for colour in obj.data.color_attributes['ClayAO'].data:
        ao = max(0, min(1, colour.color[0]))
        value = .66 + .34 * (ao ** .5)
        colour.color = (value, value, value, 1)
scene.cycles.samples = 48

for obj in asset_objects:
    obj.select_set(True)
ASSET.parent.mkdir(parents=True, exist_ok=True)
BLEND.parent.mkdir(parents=True, exist_ok=True)
PREVIEW.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.export_scene.gltf(filepath=str(ASSET), export_format='GLB',
    use_selection=True, export_apply=True, export_animations=False,
    export_cameras=False, export_lights=False, export_vertex_color='NAME',
    export_vertex_color_name='ClayAO', export_all_vertex_colors=False)
bpy.ops.wm.save_as_mainfile(filepath=str(BLEND), compress=True)
scene.render.filepath = str(PREVIEW)
bpy.ops.render.render(write_still=True)
for label, position in [('front', (0, -7, 2.3)), ('back', (-3, 7, 2.6)), ('side', (7, -.7, 2.6))]:
    camera.location = position
    camera.rotation_euler = (Vector((-.15, 0, 1.02)) - camera.location).to_track_quat('-Z', 'Y').to_euler()
    scene.render.filepath = str(ROOT / ('artifacts/clay-fox-' + label + '.png'))
    bpy.ops.render.render(write_still=True)
for obj in meshes:
    obj.data.calc_loop_triangles()
stats = {'blender': bpy.app.version_string, 'meshes': len(meshes),
         'triangles': sum(len(obj.data.loop_triangles) for obj in meshes),
         'glb_bytes': ASSET.stat().st_size, 'vertex_ao': True,
         'preview': str(PREVIEW.relative_to(ROOT))}
(ROOT / 'artifacts/clay-fox-blender-stats.json').write_text(json.dumps(stats, indent=2), encoding='utf8')
(ROOT / 'design-assets/clay-fox-v1.qa.json').write_text(json.dumps({'blender': bpy.app.version_string, 'glb_sha256': hashlib.sha256(ASSET.read_bytes()).hexdigest(), 'closed_solids': True, 'surface_attachments': attachments, 'objects': topology}, indent=2), encoding='utf8')
print('CLAY_FOX_COMPLETE ' + json.dumps(stats))
