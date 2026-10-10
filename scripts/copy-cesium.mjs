import { cp, mkdir } from 'node:fs/promises';
for (const directory of ['Workers', 'Assets', 'ThirdParty', 'Widgets']) {
  await mkdir(`public/cesium/${directory}`, { recursive: true });
  await cp(`node_modules/cesium/Build/Cesium/${directory}`, `public/cesium/${directory}`, { recursive: true });
}
