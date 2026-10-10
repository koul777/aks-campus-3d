"""Read-only summary of locally captured GLBs; no rendering or network calls."""
from pathlib import Path
import json
import struct
import sys

rows = []
directory = Path(sys.argv[1]) if len(sys.argv) > 1 else Path('artifacts/overnight-phase3/glb')
for path in directory.glob('*.glb'):
    data = path.read_bytes()
    length = struct.unpack_from('<I', data, 12)[0]
    model = json.loads(data[20:20 + length])
    triangles = sum(model['accessors'][primitive.get('indices', primitive['attributes']['POSITION'])]['count'] // 3
                    for mesh in model['meshes'] for primitive in mesh['primitives'])
    rows.append({'id': path.stem, 'bytes': len(data), 'triangles': triangles})
rows.sort(key=lambda row: row['triangles'], reverse=True)
print(json.dumps(rows, indent=2))
phase = directory.parent.name.removeprefix('overnight-')
Path(f'docs/overnight/2026-10-10/{phase}-model-cost.json').write_text(json.dumps(rows, indent=2), encoding='utf-8')
