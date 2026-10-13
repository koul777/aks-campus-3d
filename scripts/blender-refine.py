"""Refine source GLBs in Blender 4.5 LTS, preserving their geographic model origin.

blender --background --factory-startup --python scripts/blender-refine.py -- main hall library jangseogak
The source geometry is photo-proportioned. Bevels and AO are visual finishes, not surveyed detail.
"""
import bpy,bmesh,sys,math,json,time,pathlib,hashlib
from mathutils import Vector
from mathutils.bvhtree import BVHTree

ROOT=pathlib.Path(__file__).resolve().parents[1]
INPUT=ROOT/'artifacts/upgrade-20261013/blender-input'
OUTPUT=ROOT/'public/models/blender'
WORK=ROOT/'artifacts/upgrade-20261013/blender'
OUTPUT.mkdir(parents=True,exist_ok=True);WORK.mkdir(parents=True,exist_ok=True)
names=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else ['main']
SAMPLES=20;RANGE=2.6;STRENGTH=.43
directions=[]
for sample in range(SAMPLES):
    # Deterministic cosine-weighted hemisphere samples; no stochastic frame-to-frame noise.
    u=(sample+.5)/SAMPLES;phi=sample*math.pi*(3-math.sqrt(5))
    directions.append((math.sqrt(u)*math.cos(phi),math.sqrt(u)*math.sin(phi),math.sqrt(1-u)))

def material_data(obj):
    material=obj.data.materials[0] if obj.data.materials else None
    node=next((n for n in material.node_tree.nodes if n.type=='BSDF_PRINCIPLED'),None) if material and material.use_nodes else None
    color=tuple(node.inputs['Base Color'].default_value) if node else (.7,.7,.7,1)
    roughness=node.inputs['Roughness'].default_value if node else .8
    metalness=node.inputs['Metallic'].default_value if node else 0
    return material,color,roughness,metalness

for name in names:
    started=time.time()
    # Neighbourhood windows already use efficient single-sided panes. Preserve
    # them and finish the masonry; AO rays are shared across the full block.
    SAMPLES=12 if name=='surroundings' else 20
    RANGE=1.6 if name=='surroundings' else 2.6
    directions=[]
    for sample in range(SAMPLES):
        u=(sample+.5)/SAMPLES;phi=sample*math.pi*(3-math.sqrt(5))
        directions.append((math.sqrt(u)*math.cos(phi),math.sqrt(u)*math.sin(phi),math.sqrt(1-u)))
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(INPUT/f'{name}.glb'))
    objects=[o for o in bpy.context.scene.objects if o.type=='MESH']
    input_vertices=sum(len(o.data.vertices) for o in objects)
    bevelled=0
    for obj in objects:
        material,color,roughness,metalness=material_data(obj)
        matte=roughness>.45 and max(color[:3])>.21 and metalness<.2
        if not matte or (name=='surroundings' and not (.9<roughness<.96)):continue
        bpy.context.view_layer.objects.active=obj
        bpy.ops.object.select_all(action='DESELECT');obj.select_set(True)
        bm=bmesh.new();bm.from_mesh(obj.data)
        bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.00001)
        bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces))
        if name=='surroundings':
            # Distant block walls need only a coarse AO grid. Applying the largest
            # edge's subdivision count to every façade inflated geometry severely.
            for cuts in range(4,0,-1):
                edges=[e for e in bm.edges if e.calc_length()>12 and min(4,int(e.calc_length()/12))==cuts]
                if edges:bmesh.ops.subdivide_edges(bm,edges=edges,cuts=cuts,use_grid_fill=True)
        else:
            for _ in range(3):
                edges=[e for e in bm.edges if e.calc_length()>3.0]
                if not edges:break
                cuts=min(8,max(1,int(max(e.calc_length() for e in edges)/3.0)))
                bmesh.ops.subdivide_edges(bm,edges=edges,cuts=cuts,use_grid_fill=True)
        bm.to_mesh(obj.data);bm.free();obj.data.update()
        bevel=obj.modifiers.new('Architectural edge finish · 25 mm','BEVEL')
        bevel.width=.025;bevel.segments=1 if name=='surroundings' else 2;bevel.limit_method='ANGLE';bevel.angle_limit=.62
        bevel.affect='EDGES';bevel.use_clamp_overlap=True;bevel.harden_normals=True
        try:bpy.ops.object.modifier_apply(modifier=bevel.name);bevelled+=1
        except RuntimeError:obj.modifiers.remove(bevel)
    # BVH in world coordinates, so every object can occlude neighbouring recesses/columns.
    bpy.context.view_layer.update()
    vertices=[];polygons=[]
    for obj in objects:
        offset=len(vertices);vertices.extend(obj.matrix_world@v.co for v in obj.data.vertices)
        polygons.extend(tuple(offset+i for i in polygon.vertices) for polygon in obj.data.polygons)
    bvh=BVHTree.FromPolygons(vertices,polygons,all_triangles=False,epsilon=.0001)
    shaded=0;ao_min=1.0;ao_sum=0.0;ao_count=0
    for obj in objects:
        material,color,roughness,metalness=material_data(obj)
        matte=roughness>.45 and max(color[:3])>.21 and metalness<.2
        layer=obj.data.color_attributes.new(name='AmbientOcclusion',type='FLOAT_COLOR',domain='CORNER')
        obj.data.color_attributes.active_color=layer
        normal_matrix=obj.matrix_world.to_3x3().inverted().transposed()
        cache={}
        for polygon in obj.data.polygons:
            for loop_index in polygon.loop_indices:
                loop=obj.data.loops[loop_index];vertex=obj.data.vertices[loop.vertex_index]
                normal=(normal_matrix@(vertex.normal if polygon.use_smooth else polygon.normal)).normalized()
                point=obj.matrix_world@vertex.co
                key=tuple(round(c,4) for c in (*point,*normal))
                value=cache.get(key)
                if value is None:
                    value=1.0
                    if matte and normal.length>.5:
                        tangent=normal.cross(Vector((0,0,1)) if abs(normal.z)<.9 else Vector((0,1,0))).normalized()
                        bitangent=normal.cross(tangent).normalized()
                        origin=point+normal*.035
                        occlusion=0.0
                        for x,y,z in directions:
                            ray=(tangent*x+bitangent*y+normal*z).normalized()
                            hit,_,_,distance=bvh.ray_cast(origin,ray,RANGE)
                            if hit is not None:occlusion+=(1-distance/RANGE)**.55
                        value=max(.60,1-STRENGTH*occlusion/SAMPLES)
                    cache[key]=value
                    ao_min=min(ao_min,value);ao_sum+=value;ao_count+=1
                layer.data[loop_index].color=(value,value,value,1)
        if matte:shaded+=1
    bpy.ops.object.select_all(action='SELECT')
    for obj in objects:
        modifier=obj.modifiers.new('Export triangulation','TRIANGULATE')
        if hasattr(modifier,'keep_custom_normals'):modifier.keep_custom_normals=True
    destination=OUTPUT/f'{name}.glb'
    bpy.ops.export_scene.gltf(filepath=str(destination),export_format='GLB',export_yup=True,
        export_apply=True,export_normals=True,export_tangents=True,export_texcoords=True,export_animations=False,
        export_draco_mesh_compression_enable=True,export_draco_mesh_compression_level=6,
        export_draco_position_quantization=16,export_draco_normal_quantization=12,
        export_draco_texcoord_quantization=14,export_draco_color_quantization=10,
        export_materials='EXPORT',export_vertex_color='NAME',export_vertex_color_name='AmbientOcclusion',
        export_all_vertex_colors=False,export_active_vertex_color_when_no_material=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(WORK/f'{name}.blend'))
    stats={'id':name,'blender':bpy.app.version_string,'inputVertices':input_vertices,
        'outputVertices':sum(len(o.data.vertices) for o in objects),'triangles':sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in objects),
        'bevelledMeshes':bevelled,'aoMeshes':shaded,'aoSamples':SAMPLES,'aoRange':RANGE,'aoStrength':STRENGTH,
        'aoMin':ao_min,'aoMean':ao_sum/max(1,ao_count),'bytes':destination.stat().st_size,
        'inputSha256':hashlib.sha256((INPUT/f'{name}.glb').read_bytes()).hexdigest(),
        'outputSha256':hashlib.sha256(destination.read_bytes()).hexdigest(),'seconds':round(time.time()-started,2)}
    (WORK/f'{name}-report.json').write_text(json.dumps(stats,indent=2),encoding='utf8')
    print('BLENDER_REFINEMENT',json.dumps(stats),flush=True)
