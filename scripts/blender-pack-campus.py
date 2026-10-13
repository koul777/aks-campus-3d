"""Package the remaining procedural facilities without changing their geometry."""
import bpy,pathlib,json,hashlib,time
root=pathlib.Path(__file__).resolve().parents[1]
inputs=root/'artifacts/upgrade-20261013/blender-input'
outputs=root/'public/models/campus';outputs.mkdir(parents=True,exist_ok=True)
work=root/'artifacts/upgrade-20261013/blender'
reports=[]
for source in sorted(inputs.glob('*.glb')):
 name=source.stem
 if name in ['main','hall','library','jangseogak','surroundings']:continue
 start=time.time();bpy.ops.wm.read_factory_settings(use_empty=True)
 bpy.ops.import_scene.gltf(filepath=str(source))
 for obj in bpy.context.scene.objects:
  if obj.type=='MESH':
   modifier=obj.modifiers.new('Export triangulation','TRIANGULATE')
   if hasattr(modifier,'keep_custom_normals'):modifier.keep_custom_normals=True
 destination=outputs/f'{name}.glb'
 bpy.ops.export_scene.gltf(filepath=str(destination),export_format='GLB',export_yup=True,
  export_apply=True,export_normals=True,export_tangents=True,export_texcoords=True,export_animations=False,
  export_materials='EXPORT',export_draco_mesh_compression_enable=True,export_draco_mesh_compression_level=6,
  export_draco_position_quantization=16,export_draco_normal_quantization=12,export_draco_texcoord_quantization=14)
 bpy.ops.wm.save_as_mainfile(filepath=str(work/f'{name}.blend'))
 placement=json.loads(source.with_suffix('.json').read_text())
 reports.append({'id':name,'blender':bpy.app.version_string,'finish':'source geometry, triangulation and Draco packaging only',
  'bytes':destination.stat().st_size,'inputBytes':source.stat().st_size,
  'inputSha256':hashlib.sha256(source.read_bytes()).hexdigest(),'outputSha256':hashlib.sha256(destination.read_bytes()).hexdigest(),
  'anchor':placement['anchor'],'groundHeight':placement['groundHeight'],'groundClearance':placement['groundClearance'],'seconds':round(time.time()-start,2)})
 print('PACKAGED',name,destination.stat().st_size,flush=True)
(outputs/'manifest.json').write_text(json.dumps({'generated':'2026-10-13','pipeline':'scripts/blender-pack-campus.py','models':reports},indent=2))
