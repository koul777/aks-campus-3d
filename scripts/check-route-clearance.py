import json,pathlib
from shapely.geometry import Polygon, LineString
from shapely.strtree import STRtree
root=pathlib.Path(__file__).resolve().parents[1]
data=json.loads((root/'artifacts/upgrade-20261013/route-geometry.json').read_text())
obstacles=[(p['id'],Polygon(p['points']).buffer(0)) for p in data['obstacles']]
tree=STRtree([p for _,p in obstacles])
report=[]
for route in data['routes']:
 hits=[]
 for sample in route['samples']:
  actor=Polygon(sample['points'])
  for index in tree.query(actor):
   name,polygon=obstacles[index]
   if actor.intersection(polygon).area>.001:hits.append({'obstacle':name,'distance':sample['distance'],'center':sample['center']})
 report.append({'id':route['id'],'length':route['length'],'hits':hits})
print(json.dumps([{'id':r['id'],'hits':len(r['hits']),'obstacles':sorted(set(h['obstacle'] for h in r['hits']))} for r in report]))
(root/'artifacts/upgrade-20261013/route-clearance.json').write_text(json.dumps(report,indent=2))
road_report=[]
for road in data.get('roads',[]):
 surface=LineString(road['points']).buffer(road['width']/2,cap_style=2,join_style=1)
 hits=[{'id':name,'area':surface.intersection(polygon).area} for name,polygon in obstacles if surface.intersection(polygon).area>.01]
 road_report.append({'id':road['id'],'hits':hits})
(root/'artifacts/upgrade-20261013/road-clearance.json').write_text(json.dumps(road_report,indent=2))
print(json.dumps(road_report))
assert not any(route['hits'] for route in report)
assert not any(road['hits'] for road in road_report)
