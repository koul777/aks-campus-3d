# Phase4 source 준비

직접 열람: 공식 gate.jpg·cheonggye-hakdang.jpg·gugeun.jpg, 2021 항공 siseupjae/face-b-1024.jpg. 데이터는 Astra가 해석하며 치수·가려진 면은 추정이다.

- 청계학당 앞채 hip-gable 계약: 아래 네 경사면과 위 맞배면/측면 합각을 나누어 생성. 깊이3m 퇴공간만 몸체를 후퇴시키고 뒤쪽 실내 몸체는 유지. 목재 바닥·얇은 금색 난간 추가.
- 국은관 bayWindowRows가 지정한 상층만 두꺼운 돌출 창틀 생성. 하층 평창은 동일 행의 평면 프레임으로 구별한다.
- 정문 pillarProfile: 높이에 따른 곡선 중심 이동과 taper를 반영한 분절 석재 loft. 일반 직육면체와 겹치지 않음.
- 보인재 낮은 연결동 rooftop의 thin terrace railing 생성. 시습재 유리계단축·상부 퇴대는 source 데이터의 별도 parts로 생성하며 curtain-grid의 층선은 windowRows에 맞춤.
- 명시 windowLayouts가 있는 면은 generic 및 brick-grid 창 반복을 건너뛰어 이중 배열을 방지. 창이 아닌 벽돌 줄눈은 유지.

source TypeScript 검사 통과. root Phase3 실제 검수 중이므로 dist를 바꾸지 않았다. 다음 build·실물 비교 후에만 형상 결과를 평가한다.

root Phase3 실제 관측: 19개 GLB 총20,936,228bytes/214,144triangles. 텍스처UV·단위법선·유한좌표·인덱스범위·퇴화면 없음 검사 통과. 소프트웨어GPU 초기 준비40.688초, JS/콘솔/네트워크 오류 없음. 핵심4시설 선택 후 타일queue0. 장서각·문형관·학의정은 시야에 보였으나 보인재는 west저층link방향/음수base가 실제DEM에 묻힘으로 전면 재현을 검증하지 못했다. focusSide와 자료 기반 지면 관계의 계약이 필요하다. 전체19시설 최종 외관 합격을 의미하지 않는다.

최종 Phase4에는 보인재 lowestdatum을0으로 이동하고 상부동을+3.1로 조정한 추정 grade 및 south focusSide를 포함했다. 학의정은 사진/위성 해석으로 anchor를 북쪽 약28m 이동하고 주변 pond·동쪽 접근 deck을 같은 ENU frame으로 생성했다. 수면 local0.12m는 지형 clipping 검수 대상이다. production build1641modules/1.77초 통과 후 source/dist 동결, root 단독19시설 검수 대기.

## 성능 후속 후보

현재 GLB는 브라우저가 매번 생성한다. root가 diagnostics blobUrl로 실제 19개 GLB를 감사·보존하면, 데이터를 변경하지 않는 구간에서 검증된 static GLB를 사전 내보내 초기 CPU export 시간을 줄일 수 있다. 파일은 데이터·geometry 변경에 맞춰 재생성하고 source hash/manifests로 stale 모델을 방지해야 한다. 실제 성능 개선은 같은 viewport/Swiftshader의 초기 ready·frame/time·tile queue를 비교한 뒤 판단한다.

requestRenderMode는 초기 지형/영상 refine를 멈춘 과거 문제가 있으므로 무조건 켜지 않는다. 초기 준비 후 전환을 별도 실험하고 tile progress·camera/control·visibility 변경·resize 때 requestRender가 유지되는지 확인해야 한다. 지도 자체의 실제 타일 refinement와 DOM loader만 숨기는 것은 별개의 관측이다.
