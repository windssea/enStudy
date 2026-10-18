"""Refine the hand-modelled Pikachu in a fresh Blender background document."""
import bpy
import bmesh
import hashlib
import json
import math
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
ROOT = Path(__file__).resolve().parents[2]
ASSET = ROOT/'src/assets/models/clay-pikachu-v2.glb'
PREVIEW = ROOT/'design-assets/previews/clay-pikachu-adventure-studio.png'
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(ROOT/'artifacts/pikachu-adventure-base.glb'))
asset_objects = list(bpy.context.scene.objects)
meshes = [obj for obj in asset_objects if obj.type == 'MESH']
for obj in meshes:
    if obj.name.startswith(('pikachu-yellow-body','pikachu-round-head','pikachu-foot-','pikachu-right-paw','pikachu-left-paw')):
        materials = list(obj.data.materials)
        bpy.ops.mesh.primitive_uv_sphere_add(segments=40,ring_count=28,radius=1)
        temporary = bpy.context.object
        obj.data = temporary.data
        for material in materials:
            obj.data.materials.append(material)
        bpy.data.objects.remove(temporary,do_unlink=True)
        if obj.name in ('pikachu-yellow-body','pikachu-round-head'):
            texture = bpy.data.textures.new(obj.name+'-hand-pressed',type='CLOUDS')
            texture.noise_scale = .3
            texture.noise_depth = 1
            modifier = obj.modifiers.new('Hand pressed clay','DISPLACE')
            modifier.texture = texture
            modifier.strength = .008
            modifier.mid_level = .5
            bpy.context.view_layer.objects.active = obj
            obj.select_set(True)
            bpy.ops.object.modifier_apply(modifier=modifier.name)
    for polygon in obj.data.polygons:
        polygon.use_smooth = True

bpy.context.view_layer.update()
attachments = []
def attach(detail_name,target_name,protrusion,intrusion,side=1):
    detail = bpy.data.objects[detail_name]
    target = bpy.data.objects[target_name]
    tree = BVHTree.FromPolygons([target.matrix_world@vertex.co for vertex in target.data.vertices],
                               [list(polygon.vertices) for polygon in target.data.polygons])
    detail.data = detail.data.copy()
    points = [detail.matrix_world@vertex.co for vertex in detail.data.vertices]
    depths = [-point.y*side for point in points]
    middle = (max(depths)+min(depths))/2
    radius = max((max(depths)-min(depths))/2,.000001)
    inverse = detail.matrix_world.inverted()
    for vertex,point,depth in zip(detail.data.vertices,points,depths):
        hit,normal,index,distance = tree.ray_cast(Vector((point.x,-5*side,point.z)),Vector((0,side,0)))
        if hit is None:
            raise RuntimeError('Floating detail ray miss: '+detail_name)
        relative = (depth-middle)/radius
        offset = relative*(protrusion if relative>=0 else intrusion)+.00015
        point.y = hit.y-side*offset
        vertex.co = inverse@point
    detail.data.update()
    attachments.append({'detail':detail_name,'surface':target_name,'vertices':len(points),'misses':0})
for side in (-1,1):
    attach('pikachu-eye-'+str(side),'pikachu-round-head',.022,.006)
    attach('pikachu-eye-glint-'+str(side),'pikachu-eye-'+str(side),.002,.001)
    attach('pikachu-red-cheek-'+str(side),'pikachu-round-head',.012,.005)
    attach('pikachu-smile-'+str(side),'pikachu-round-head',.008,.004)
attach('pikachu-tiny-nose','pikachu-round-head',.012,.005)
for i in (0,1):
    attach('pikachu-back-stripe-'+str(i),'pikachu-yellow-body',.013,.005,-1)

# Fit the cloth front to the larger of the head and body surfaces, preserving
# its thickness and closed boundary rather than leaving it floating or clipped.
def fit_cloth():
    detail=bpy.data.objects['pikachu-scarf-bib']
    targets=[bpy.data.objects[n] for n in ('pikachu-round-head','pikachu-yellow-body')]
    trees=[BVHTree.FromPolygons([o.matrix_world@v.co for v in o.data.vertices], [list(p.vertices) for p in o.data.polygons]) for o in targets]
    points=[detail.matrix_world@v.co for v in detail.data.vertices]
    depths=[-p.y for p in points]
    middle=(max(depths)+min(depths))/2
    radius=max((max(depths)-min(depths))/2,.000001)
    inverse=detail.matrix_world.inverted()
    for vertex,point,depth in zip(detail.data.vertices,points,depths):
        hits=[tree.ray_cast(Vector((point.x,-5,point.z)),Vector((0,1,0)))[0] for tree in trees]
        hits=[h for h in hits if h is not None]
        if not hits: raise RuntimeError('Scarf misses its supporting body')
        front=min(h.y for h in hits)
        relative=(depth-middle)/radius
        point.y=front-.012-relative*.018
        vertex.co=inverse@point
    detail.data.update()
    attachments.append({'detail':detail.name,'surface':'head/body envelope','vertices':len(points),'misses':0})
fit_cloth()
attach('pikachu-scarf-button','pikachu-scarf-bib',.008,.004)

topology = []
for obj in meshes:
    obj.data = obj.data.copy()
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.000001)
    bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces))
    if bm.calc_volume(signed=True)<0:
        bmesh.ops.reverse_faces(bm,faces=list(bm.faces))
    problems = {'boundary_edges':sum(edge.is_boundary for edge in bm.edges),
                'non_manifold_edges':sum(not edge.is_manifold for edge in bm.edges),
                'degenerate_faces':sum(face.calc_area()<1e-12 for face in bm.faces),
                'invalid_coordinates':sum(not all(math.isfinite(value) for value in vertex.co) for vertex in bm.verts)}
    if any(problems.values()) or bm.calc_volume()<=0:
        raise RuntimeError('Invalid Pikachu solid '+obj.name+': '+str(problems))
    topology.append({'name':obj.name,**problems,'volume':bm.calc_volume()})
    bm.to_mesh(obj.data)
    bm.free()
    obj.data.update()

for material in bpy.data.materials:
    if not material.use_nodes:
        continue
    node = next((node for node in material.node_tree.nodes if node.type=='BSDF_PRINCIPLED'),None)
    if not node:
        continue
    bead = node.inputs['Roughness'].default_value < .5
    for name,value in {'Roughness':.32 if bead else .88,'Metallic':0,'Specular IOR Level':.32 if bead else .25,
                       'Subsurface Weight':0 if bead else .035,'Subsurface Scale':.018,'Sheen Weight':0 if bead else .08}.items():
        if name in node.inputs:
            node.inputs[name].default_value = value
    if not bead:
        noise = material.node_tree.nodes.new('ShaderNodeTexNoise')
        noise.inputs['Scale'].default_value = 100
        bump = material.node_tree.nodes.new('ShaderNodeBump')
        bump.inputs['Strength'].default_value = .15
        bump.inputs['Distance'].default_value = .004
        material.node_tree.links.new(noise.outputs['Fac'],bump.inputs['Height'])
        material.node_tree.links.new(bump.outputs['Normal'],node.inputs['Normal'])
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
scene.world.node_tree.nodes['Background'].inputs['Color'].default_value=(.78,.82,.9,1)
scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value=.22
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.003))
floor=bpy.context.object
floor.name='Studio floor - not exported'
floor_mat=bpy.data.materials.new('Warm seamless floor')
floor_mat.diffuse_color=(.93,.84,.68,1)
floor.data.materials.append(floor_mat)
def area(name,position,power,size,colour):
    data=bpy.data.lights.new(name,'AREA')
    data.energy=power
    data.shape='DISK'
    data.size=size
    data.color=colour
    obj=bpy.data.objects.new(name,data)
    scene.collection.objects.link(obj)
    obj.location=position
    obj.rotation_euler=(Vector((0,0,1))-obj.location).to_track_quat('-Z','Y').to_euler()
area('Large warm softbox',(-3.5,-4.5,6),600,5,(1,.89,.77))
area('Cool fill',(4,-1,3.5),220,4,(.79,.9,1))
area('Warm rim',(2,3.5,4.5),450,3,(1,.95,.87))
data=bpy.data.cameras.new('Clay partner camera')
camera=bpy.data.objects.new('Clay partner camera',data)
scene.collection.objects.link(camera)
camera.location=(3,-7,2.8)
camera.rotation_euler=(Vector((.05,0,1.12))-camera.location).to_track_quat('-Z','Y').to_euler()
data.type='ORTHO'
data.ortho_scale=3.0
scene.camera=camera
bpy.ops.object.select_all(action='DESELECT')
for obj in meshes:
    attribute=obj.data.color_attributes.new(name='ClayAO',type='FLOAT_COLOR',domain='CORNER')
    obj.data.color_attributes.active_color=attribute
    obj.select_set(True)
bpy.context.view_layer.objects.active=meshes[0]
scene.cycles.samples=16
bpy.ops.object.bake(type='AO',target='VERTEX_COLORS')
for obj in meshes:
    for colour in obj.data.color_attributes['ClayAO'].data:
        value=.66+.34*max(0,min(1,colour.color[0]))**.5
        colour.color=(value,value,value,1)
scene.cycles.samples=48
for obj in asset_objects:
    obj.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(ASSET),export_format='GLB',use_selection=True,export_apply=True,
    export_animations=False,export_cameras=False,export_lights=False,export_vertex_color='NAME',export_vertex_color_name='ClayAO')
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'design-assets/clay-pikachu-v2.blend'),compress=True)
scene.render.filepath=str(PREVIEW)
bpy.ops.render.render(write_still=True)
for label,position in [('front',(0,-7,2.4)),('back',(-3,7,2.8)),('side',(7,-.7,2.8))]:
    camera.location=position
    camera.rotation_euler=(Vector((.05,0,1.12))-camera.location).to_track_quat('-Z','Y').to_euler()
    scene.render.filepath=str(ROOT/('artifacts/clay-pikachu-v2-'+label+'.png'))
    bpy.ops.render.render(write_still=True)
for obj in meshes:
    obj.data.calc_loop_triangles()
stats={'blender':bpy.app.version_string,'meshes':len(meshes),'triangles':sum(len(obj.data.loop_triangles) for obj in meshes),'glb_bytes':ASSET.stat().st_size,'vertex_ao':True}
qa={**stats,'glb_sha256':hashlib.sha256(ASSET.read_bytes()).hexdigest(),'closed_solids':True,'surface_attachments':attachments,'objects':topology}
(ROOT/'design-assets/clay-pikachu-v2.qa.json').write_text(json.dumps(qa,indent=2),encoding='utf8')
print('CLAY_PIKACHU_COMPLETE '+json.dumps(stats))
