"""Convert the downloaded OSM snapshot to a small, attributed local dataset.

Run with Python 3. No runtime Overpass/API dependency; original tags are retained.
"""
import collections
import datetime
import hashlib
import json
import pathlib
import xml.etree.ElementTree as ET

ROOT = pathlib.Path(__file__).resolve().parents[1]
source = ROOT / 'references/surroundings-20261013/osm-map.xml'
tree = ET.parse(source).getroot()
nodes = {n.attrib['id']: [float(n.attrib['lon']), float(n.attrib['lat'])] for n in tree.findall('node')}
buildings, roads = [], []
for way in tree.findall('way'):
    tags = {t.attrib['k']: t.attrib['v'] for t in way.findall('tag')}
    points = [nodes[n.attrib['ref']] for n in way.findall('nd') if n.attrib['ref'] in nodes]
    if not points:
        continue
    feature = {'id': way.attrib['id'], 'tags': tags, 'coordinates': points}
    if 'building' in tags and tags['building'] != 'no' and len(points) >= 4:
        buildings.append(feature)
    if 'highway' in tags:
        roads.append(feature)
data = {
    'source': 'https://api.openstreetmap.org/api/0.6/map?bbox=127.045,37.386,127.064,37.401',
    'attribution': '© OpenStreetMap contributors',
    'license': 'https://opendatacommons.org/licenses/odbl/1-0/',
    'snapshot': '2026-10-13',
    'sourceSha256': hashlib.sha256(source.read_bytes()).hexdigest(),
    'buildings': buildings, 'roads': roads,
}
target = ROOT / 'public/data/surroundings-osm.json'
target.parent.mkdir(parents=True, exist_ok=True)
target.write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
print(json.dumps({'buildings': len(buildings), 'roads': len(roads), 'bytes': target.stat().st_size, 'types': dict(collections.Counter(b['tags']['building'] for b in buildings))}, ensure_ascii=False))
for road in roads:
    if road['tags']['highway'] not in ('footway', 'path', 'steps', 'track', 'motorway', 'motorway_link', 'cycleway'):
        print(road['id'], road['tags'], 'points', len(road['coordinates']), 'ends', road['coordinates'][0], road['coordinates'][-1])
