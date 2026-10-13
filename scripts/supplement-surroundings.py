"""Add non-duplicate Overture footprints; preserves source attribution per feature.

Requires shapely; run import-surroundings.py and export-campus-footprints.mjs first.
"""
import json
import pathlib
import hashlib
from shapely.geometry import Polygon, shape
from shapely.ops import transform

ROOT=pathlib.Path(__file__).resolve().parents[1]
folder=ROOT/'references/surroundings-20261013'
data=json.loads((ROOT/'public/data/surroundings-osm.json').read_text(encoding='utf-8'))
overture_file=folder/'overture-buildings-wide.geojson'
overture=json.loads(overture_file.read_text(encoding='utf-8'))
campus=json.loads((folder/'campus-footprints.json').read_text(encoding='utf-8'))
project=lambda geometry:transform(lambda x,y:((x-127.0537)*88400,(y-37.3926)*111000),geometry)
occupied=[project(Polygon(b['coordinates'])).buffer(0) for b in data['buildings']]
protected=[project(Polygon(b['coordinates'])).buffer(1.5) for b in campus]
added=[]
rejected=[]
for feature in overture['features']:
    geometry=shape(feature['geometry'])
    props=feature['properties']
    if geometry.geom_type!='Polygon' or props.get('is_underground'):
        rejected.append([feature['id'],'non-surface-polygon']);continue
    projected=project(geometry).buffer(0)
    if not projected.is_valid or projected.area<6:
        rejected.append([feature['id'],'invalid-or-under-6m2']);continue
    if any(projected.intersection(p).area/max(1,min(projected.area,p.area))>.18 for p in occupied+protected):
        rejected.append([feature['id'],'overlap-existing']);continue
    tags={'building':'yes','source':'Overture Maps 2026-09-23.1','source:geometry':'Qian Shi et al., East Asian Buildings (CC BY 4.0)'}
    if props.get('height'):tags['height']=str(props['height'])
    if props.get('num_floors'):tags['building:levels']=str(props['num_floors'])
    if props.get('names',{}).get('primary'):tags['name']=props['names']['primary']
    coordinates=[[round(x,7),round(y,7)] for x,y,*_ in geometry.exterior.coords]
    item={'id':'overture:'+feature['id'],'tags':tags,'coordinates':coordinates,'sources':props.get('sources',[])}
    data['buildings'].append(item);added.append(item['id']);occupied.append(projected)
data['supplementalSource']={
    'provider':'Overture Maps Foundation',
    'release':'2026-09-23.1','retrieved':'2026-10-13',
    'url':'https://docs.overturemaps.org/guides/buildings/',
    'underlyingSource':'Qian Shi et al. (2023), A First High-quality Vector Data of Buildings in East Asian Countries Based on a Comprehensive Large-scale Mapping Framework',
    'underlyingDoi':'https://doi.org/10.5281/zenodo.8174931',
    'underlyingLicense':'https://creativecommons.org/licenses/by/4.0/',
    'license':'https://opendatacommons.org/licenses/odbl/1-0/',
    'bbox':[127.045,37.386,127.064,37.401],
    'sourceSha256':hashlib.sha256(overture_file.read_bytes()).hexdigest(),
    'changes':'Filtered to local area, excluded overlap with OSM/campus models, retained exterior polygons. Heights and facades are illustrative estimates unless tagged.',
}
target=ROOT/'public/data/surroundings.json'
target.write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
report={'osmOriginal':len(data['buildings'])-len(added),'overtureAdded':len(added),'rejected':rejected,'total':len(data['buildings']),'added':added}
(folder/'supplement-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({k:v for k,v in report.items() if k not in ['rejected','added']}))
