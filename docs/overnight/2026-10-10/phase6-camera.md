# 선택 카메라의 이전 지형 캐시 문제

root가 Cesium SDK와 실제 위치를 대조해 확인한 문제: 첫 선택 뒤 camera높이가 이전 시점의globeHeight+35m와 정확히 같았다. 화면이 바뀌기 전에 controller가 옛 지형 높이로 카메라를 한 번 올리고 이후 낮추지 않아 본관 전면이25도 대신48.8도로 표시되었다.

source 준비는 focus 이동 동안만 public `enableCollisionDetection`을 잠시 끈다. 새 시점의3렌더 프레임과 public `globe.getHeight(camera.positionCartographic)`가 읽은 DEM과3m 이내로 일치한 것을 확인한 뒤 원래 충돌 설정을 복구한다. 사용자 조작·새 명령·10초 종료도 복구 경로다. 항상 끄는 방식은 사용하지 않는다. 초기10초 위치가 지형 충돌로 바뀌면 target을 다시 바라보는 기존 보정은 유지한다.

최소zoom거리2m, 사진 비교 focus의 지면 여유는 일반시설10m/정자4m, 최소 수평거리24m/14m다. 실제 DEM을 읽고 필요한 경우25도보다 높게 놓아 실제 산비탈과 겹치지 않게 한다. 지형을 평평하게 바꾸지 않는다.

diagnostics만 SDK의 readonly 내부 globeHeight를 관찰용으로 노출한다. 제품 동작은 publiccontroller/globe/camera API를 사용하며 내부 값에 쓰지 않는다. source TypeScript 통과, Phase5 성능비교용 dist는 변경하지 않았다. 실제첫본관각도/정자크기/19선택/사용자회전은 다음 rootQA로 확인해야 한다.

Phase6 build에는 root의 getFacilityElevation API를 건물 고도에 연결하고, diagnostics에서 public SceneTransforms로 projected model center를 제공했다. 기와rim보다높던 fascia cap을0.18m 낮춰 관통을 막고, 금속 경사면은 처마외곽까지연장했다. Moiré는 deck뿐 아니라다른벽/지붕에도관측되었고 deck와body높이는0.65m달라coplanar라고단정하지않는다. 진단전용publicshadowon/off hook으로root가동일구도 비교할 수 있다. build1642modules/1.51초 성공 뒤 source/dist 동결. 실제카메라/pond지형/그림자원인은root실행확인대기.
