# 한국학중앙연구원 — 실제 지리 좌표의 Cesium 캠퍼스

## 현재 요구

사용자가 이전의 독립 바닥 위 박스 미니어처를 거부했다. 현재 목표는 실제 위성 지도 위에 주요 시설을 지리 좌표로 놓고 사진에서 식별되는 건물별 형태를 표현하는 것이다. 이전의 임의 모델 좌표는 폐기했다. 지도상의 위치는 OSM과 위성 영상으로 확인하고, 높이·지붕·입면은 사진 해석에 따른 추정임을 구분한다.

## 지리 근거

- OSM 공식 API: https://www.openstreetmap.org/api/0.6/map?bbox=127.050,37.389,127.059,37.396
- 원본 보존: `references/osm-map.xml`.
- 공식 안내도: https://www.aks.ac.kr/site/aks/kor/images/sub/img-campusmap.jpg?v=241218
- 공식 안내 페이지: https://www.aks.ac.kr/com/cmm/EgovContentView.do?lang=kor&menuNo=5010182000
- Esri World Imagery 원본: `references/campus-satellite.jpg`.
- 요청: https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export?bbox=127.0485,37.3895,127.0585,37.3965&bboxSR=4326&imageSR=4326&size=1600,1400&format=jpg&f=image

ArcGIS는 요청 bbox를 화면비에 맞추어 확장한다. 같은 요청의 `f=pjson` 응답으로 확인한 실제 이미지 extent는 longitude 127.0485–127.0585, latitude 37.388625–37.397375다. 따라서 원본 이미지의 픽셀 변환은 `lon=127.0485+x/1600*0.01`, `lat=37.397375-y/1400*0.00875`다. 요청 bbox의 latitude를 그대로 쓰면 위아래에 큰 위치 오차가 생긴다.

| 시설 | OSM way | anchor longitude | anchor latitude | 형태 근거 |
| --- | --- | ---: | ---: | --- |
| 본관 | 568039300 | 127.054106175 | 37.392969125 | 긴 2층·깊은 처마·전면 기둥 |
| 강당 | 568039301 | 127.0537554 | 37.393376475 | 거의 정방형의 큰 지붕·높은 열주 |
| 한국학도서관 | 568040936 | 127.052085025 | 37.3930578083 | 네 날개·중정·남쪽 확장부 |
| 문형관 | 568031170 | 127.05343584 | 37.39210644 | 북쪽 가로동과 남쪽 사각동·쌍중정 |
| 장서각 | 568031171 | 127.0542707857 | 37.3919575786 | 서쪽 복합공간과 동쪽 긴 수장동 |

anchor는 OSM 외곽 정점의 평균이다. 모델은 그 근처에 실제 크기의 블록들을 분해 배치한다. OSM 외곽이 설계도나 현장 측량과 동일하다고 주장하지 않는다. footprint의 작은 돌출부는 단순화하고, 주요 크기·방위·중정을 유지한다.

## 사진 관찰

사진 URL은 `https://www.aks.ac.kr/site/aks/kor/images/sub/img-campusmap-NN.jpg?v=241218`이다.

- 본관 NN=01, `references/administration.jpg`: 낮고 긴 2층 외벽, 넓고 짙은 지붕, 긴 처마, 중앙 계단과 전면 기둥. 모델의 수직 비례를 낮게 유지한다.
- 강당 NN=02, `references/hall.jpg`: 긴 흰색 열주, 세로로 긴 창, 넓은 전면 처마. 단순 창띠만으로 처리하면 건물의 특징이 사라지므로 열주를 별도 요소로 표현한다.
- 한국학도서관 NN=09, `references/library.jpg`: 긴 전면, 밝은 외벽, 얕은 지붕과 양끝 처마. 중정은 이 정면 사진만으로 알 수 없으며 공식 안내도와 위성 영상의 중심 빈 공간이 근거다.
- 문형관 NN=16, `references/munhyeong.jpg`: 공식 사진 자체가 사선 상공뷰다. 2개의 열린 중정, 흰색 다층 외벽, 회색 지붕, 층별 창을 확인했다.
- 장서각 NN=17, `references/jangseogak.jpg`: 밝은 석재와 넓은 창, 회녹색 또는 은회색으로 읽히는 현대식 지붕, 여러 동의 결합. 안내도의 선명한 청록색을 사진의 색상보다 우선하지 않는다.
- 정문 NN=19, `references/gate.jpg`: 도로 양옆 수직 기둥, 좌측의 낮은 긴 안내석벽, 한쪽 작은 경비시설. 도로를 가로지르는 지붕이나 큰 직육면체를 만들지 않는다.

## 데이터와 좌표 계약

`src/data/geographic-buildings.ts`가 모델 배치와 형태의 단일 데이터다. `anchor`는 WGS84 longitude/latitude이며, `parts[].footprint`는 anchor 중심 local ENU 기반 미터 좌표다. 좌표를 먼저 건물 주축에 맞춰 정렬하고 `rotationDegrees=15.5`를 적용한다. 이 각도는 동쪽 축에서 북쪽으로 반시계 회전이다. Cesium HPR의 heading 부호와 혼동하지 않는다.

각 part의 `baseHeight`는 바닥에서의 상대 높이, `height`는 지붕 제외 본체 높이다. roof의 type, height, color, eaves를 따로 가진다. `windowRows`는 사진 기반 층별 창행 수, `columnCount`는 남쪽 전면 열주 수다. 측량 기반 층고나 기둥 개수의 확정 기록으로 취급하지 않는다.

지붕과 본체는 생성기를 분리한다. courtyard는 여러 날개 사이를 실제로 비워 표현한다. 합쳐진 거대한 상자에 위쪽 작은 색상 사각형을 올려 중정처럼 보이게 만들지 않는다. 별도 지리 좌표형 데이터가 있으므로 예전 `src/data/buildings.ts` 임의 배치 데이터는 새 장면에서 사용하지 않는다.

## 지도와 화면

Cesium을 실제 위성 영상과 함께 사용한다. 지구상 다른 지역으로 이동하거나 확대·축소해 지도라는 사실이 확인되어야 한다. 지도 제공자의 attribution을 유지한다. 고도는 이용 가능한 지형 자료와 지면 배치를 명시적으로 처리한다. 실제 terrain 자료가 없다면 지형이 정밀 재현되었다고 표시하지 않는다.

기본 구도에서는 5개 주요 건물과 정문, 주변 도로·숲이 함께 보이게 하고 개별 시설 선택 시 그 건물에 접근한다. UI에는 시설명, 실제 사진, 출처, 모델 추정 범위를 제공한다. 기존의 단독 미니어처 설명 문구는 제거한다.

## 검토 기준

1. 위성 도로·주변 건물·숲과 모델이 동일한 실제 장소에 겹친다.
2. 각 건물의 중심과 방위가 OSM 및 위성 footprint와 맞는다.
3. 본관과 강당의 지붕 비례·열주, 도서관과 문형관의 열린 중정, 장서각의 여러 동, 정문의 분리 기둥이 구별된다.
4. 시설 선택, 전체 보기, 궤도 이동, 확대·축소와 지도 로딩이 실제 화면에서 동작한다.
5. 정확한 측량 또는 현재 시점 디지털 트윈이라는 주장을 하지 않는다.
6. 실제 렌더와 공식 사진·위성을 비교한 뒤 완료 여부를 판단한다.

## 정문 위치 보완

정문 anchor는 longitude 127.055278122, latitude 37.392297333이다. 이는 동쪽 진입로 횡단보도 부근을 가리키며 기둥의 측량 중심점이 아니다. 확대 위성 타일 `https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/19/203351/447181` (`references/gate-tile-close.jpg`)과 정문 공식 사진을 교차 확인했다. 타일 픽셀 (169,108)을 기준으로 변환한 점이고, 기둥은 그 북쪽과 남쪽 양옆에 분리 배치했다. 기둥별 지리 위치와 안내벽 위치는 사진 기반 추정이다. status를 나머지 5개 OSM 기반 시설과 구분해 `photo-and-imagery-estimated`로 기록한다.

강당의 전면 열주는 동쪽의 포장 광장(위성 영상의 원형 무늬가 있는 공간)을 향한다. 데이터 `columnSide: east`로 구분하며, 본관·도서관은 기본 남쪽 전면을 사용한다.

## 렌더 검증에서 확인한 축 보정

Cesium `Model.fromGltfAsync`의 기본 `forwardAxis=Axis.Z`는 `Y_UP_TO_Z_UP` 외에 `Z_UP_TO_X_UP` 보정을 더하므로, 본 프로젝트의 Three 좌표(x=east, y=up, z=-north)와 함께 사용하면 지붕 외곽이 위성 대비 90도 돌아간다. `upAxis: Axis.Y, forwardAxis: Axis.X`를 명시하고 데이터의 실제 건물 회전 15.5도는 유지한다. 코드의 좌표 계산만으로 정합 완료를 판단하지 않고 건물 모델 on/off의 동일 카메라 상공 이미지로 비교한다.

## 사진별 전면 디테일 계약

현재 모델의 상세 입면은 `facadeStyle`, `facadeSide`, `facadeBays`, `entrance`, `plaque`로 정의한다. 본관의 남쪽과 강당의 동쪽이 주전면이다. 사진에 보이지 않는 뒷면을 같은 창 배열로 확정하지 않는다.

- 본관: 2층의 가로로 긴 비례, 얇은 흰 기둥, 중앙 후퇴 출입부, 약 11m 폭 계단. 기둥 14개와 13bay는 사진의 리듬을 재현하기 위한 해석값이다. 수목에 가린 부분까지 확인된 실제 개수라고 주장하지 않는다. 기존 출입구 앞의 독립된 큰 박스는 사진에 부합하지 않아 제거했다.
- 강당: 동쪽 전면의 큰 열주, 약 9기둥/8bay, 높고 좁은 창과 중앙문, 폭 넓은 낮은 계단. 일반적인 작은 정사각 창의 전면 반복을 사용하지 않는다.
- 도서관: 처마 바로 아래의 긴 수평 창띠, 밝은 전면 기둥, 중앙 명판과 출입부. 개별 창 개수는 사진 해상도 한계로 근사치다.
- 문형관: 중정의 네 가장자리를 두르는 연속된 회색 기와 경사띠와 안쪽 흰 파라펫. 각 wing이 서로 무관한 작은 우진각으로 보이면 실제 사진과 다르다. `roof.courtyardEdge`는 경사지붕이 올라가서 중정에 닿는 쪽을 가리킨다.
- 장서각: 3층의 큰 유리 모듈, 밝은 석재 격자, 끝동의 수직 유리면, 회녹색 금속지붕과 얇은 처마. 전통건물과 같은 작은 창 배열을 적용하지 않는다.
- 정문: 분리된 흰색 사각기둥의 수평 줄눈과 상단 마감, 서쪽 낮은 석벽의 기관 명판. 건물처럼 지붕을 연결하지 않는다.

`roof.fasciaDepth/fasciaColor`는 처마의 밝은 하부 두께를 나타내고, `roof.surface`는 기와와 금속을 구분한다. 정면 사진과 나란히 놓은 실제 근접 렌더에서 전면 특징을 비교해야 하며, descriptor가 코드에 존재한다는 이유만으로 닮음이 확인된 것은 아니다.

## 확정 범위: 공식 시설 19개 전체

사용자가 나머지 13개 시설을 모두 추가하도록 요구했다. 현재 `geographicBuildings`는 공식 번호 1–19 순서로 정렬되며, 지도와 목록 모두 전체 19개를 사용한다. 연못과 주차장을 지상 건물 박스로 대체하지 않는다.

| 번호 | 시설 | 위치 근거 / 형태 |
| --- | --- | --- |
| 01 | 본관 | OSM 568039300 / 긴 2층·남쪽 회랑·중앙 계단 |
| 02 | 강당 | OSM 568039301 / 동쪽 열주·큰 지붕 |
| 03 | 국은관 | OSM 568039517 / 2층 크림벽·돌출창·계단 |
| 04 | 동편연못 | 위성·안내도 해석 / 숲속 물 영역, 서쪽 저수지와 다름 |
| 05 | 청계관 | OSM 568039518 / 2층 게스트하우스·돌출창 |
| 06 | 진현관 | OSM 568039519 / 2층·중앙 캐노피 |
| 07 | 운중관 | OSM 568039621 / 긴 열주동·북쪽 부속동 |
| 08 | 식당/매점 | OSM 568039516 / 낮은 지붕·중앙 높은 작은 지붕 |
| 09 | 한국학도서관 | OSM 568040936 / 중정·수평 창띠 |
| 10 | 학의정 | 위성·안내도 해석 / 물 위 육각 열린 목조 정자 |
| 11 | 청계학당 | 위성·안내도 해석 / 중정을 둘러싼 목조 한옥군 |
| 12 | 이택재 | 위성 위치 해석+2024년 건물 사진 / 살구 벽돌·4층·4열 발코니 |
| 13 | 한국학대학원 | OSM 568041256 / 긴 2층·중앙 기와 현관 |
| 14 | 보인재 | 위성 위치 해석+2024년 건물 사진 / 여러 벽돌동·유리 연결부 |
| 15 | 시습재 | OSM 495418884 / 붉은 벽돌 장대동·2개 계단탑 |
| 16 | 문형관 | OSM 568031170 / 2중정·연속 경사지붕 |
| 17 | 장서각 | OSM 568031171 / 회녹 금속지붕·석재 격자와 유리 동 |
| 18 | 지하주차장 | 위성·안내도 해석 / 낮은 옹벽 입구·지상 건물 아님 |
| 19 | 정문 | 확대 위성·공식 사진 / 분리 기둥·낮은 안내석벽 |

13개 추가 시설의 공식 사진을 모두 `view_image`로 직접 확인했다. 공식 사진 원본·로컬 대응은 `references/official-photo-manifest.json`에 기록되어 있다. 앱의 `photoUrl`은 로컬 `/references/*.jpg`, `photoSourceUrl`은 공식 웹사이트 URL이다.

이택재·보인재는 공식 대학원 기숙사 안내의 2024년 준공 건물이다. 출처: https://grad.aks.ac.kr/com/cmm/EgovContentView.do?menuNo=5010130000 . 과거 OSM 또는 촬영 시점이 오래된 위성 영상을 신축 건물의 측량 외곽이라고 주장하지 않는다. 이 두 건물은 현재 공식 사진의 모습과 안내도상 위치를 반영하며 `photo-and-imagery-estimated`를 유지한다. 학의정·동편연못은 수목 가림 때문에 위치와 윤곽의 불확실성도 남아 있다.

## 최종 사진 비교에서 우선 해결할 차이

최신 `main-close.png`에서 기존 일반 창 생성기는 본관의 전면 13bay 데이터를 무시하고 약 21개의 작은 창을 반복했다. 전면 창은 사진의 기둥 사이 bay 수에 맞추고, 기둥보다 뒤로 들어간 벽면을 실제 기하로 생성한다. 본관 회랑 깊이 2.4m, 강당 3.2m, 도서관 1.5m는 외관 재현용 추정이다. 본관 지붕 높이는 3.2m, 강당은 5m로 완화했다. 눈높이 사진에서는 처마가 용마루를 가리므로 사진에 보이는 지붕 두께만으로 실제 높이를 확정하지 않는다.

전면 비교 구도는 본관 남쪽과 강당 동쪽을 향하는 낮은 시점을 사용한다. 전체 캠퍼스 확인용 52도 상공 시점만으로 정면 사진과 닮음을 판정할 수 없다. 지붕에는 어두운 기와 표면, 용마루와 추녀 선, 밝은 처마 하부가 함께 읽혀야 한다.

## 2026-10-10 원본 자료 조사에 따른 정정 — 이전 추정보다 우선

- 학의정은 **사각** 마루·사각 모임지붕이다. 기존 육각 추정은 철회한다. `references/research-20261010/panorama/hakuijeong/face-r-1024.jpg`를 직접 확인했다. 공식 파노라마 촬영좌표 인근으로 위치를 보정했으나 건물 중심 측량값은 아니다.
- 문형관은 **중앙 평옥상 두 개**와 주변 경사지붕이다. 기존 지면까지 뚫린 두 중정 해석을 철회한다. 공식16사진과 `references/research-20261010/panorama/campus-vr/central/aksAir/face-l-1024.jpg`를 대조했다. 흰 파라펫 안의 천창·설비·평옥상 바닥이 보인다. 데이터에 중앙 옥상 코어를 채웠으며 높이는 추정이다. `courtyardEdge`라는 이전 필드명은 현재 주변 경사지붕의 높은 안쪽 끝을 뜻하며 실제 중정을 의미하지 않는다.
- 장서각 수장동은 일반 창 격자가 아닌 **무창 석재 입면, 수평 띠와 얕은 세로 핀**이다. `archive-fins` 유형을 추가하고 `windowBand:false`로 수정했다. 설계사 공식 실사 `references/research-20261010/astra/ksde-jangseogak-design.jpg`와 공식 역사 PDF가 근거다. 동측의 일부 작은 수직 개구부·유리 계단실은 면별로 별도 모델링해야 한다.
- 장서각 넓은 금속지붕 중앙의 긴 채광부와 직사각 개구부열은 현재 모델의 남은 큰 차이다. 2021 항공 파노라마를 따라 지붕 평면 재구성이 필요하다.

상세 출처, 직접 확인 범위, 아직 확보하지 못한 도면은 `references/research-20261010/astra/research-manifest.json` 및 `EXTERIOR-EVIDENCE.md`에 기록한다. 원본 입면·단면을 확보하기 전 높이·부재 치수를 실측이라고 표시하지 않는다.

추가 방위 교차 확인: 운동장 북쪽에서 남쪽을 보는 장서각 설계사 사진의 왼쪽은 동쪽이다. 긴 유리 열주동은 동쪽, 무창 수장동은 서쪽 작은 동으로 역할을 바로잡았다. 기존 `jang-east-archive`는 삭제하고 `jang-east-public-wing`, `jang-west-archive`로 교체했다. 북쪽 운동장면은 유리/핀, 동측 끝면은 작은 수직 개구부와 돌출 유리계단이다. 기본 style을 모든 면에 반복하지 않고 `facades`에서 면별로 지정한다.

보인재 추가자료: 공식2024.8 뉴스레터는 일반 신축기숙사를 지상4층으로 설명한다. 새 사진의 높은 잔디쪽에서는3층만 주로 보이고 낮은쪽은 추가층이 보인다. 종전3층 단정은 철회한다. 현재 모델은 지반과 층별 노출차이를 추가 교정해야 한다.

## 자료 교정 3단계 데이터 계약

`windowLayouts`는 확인한 면의 창 폭·높이(m), 창 하단 높이 배열, 수직 분할선 수, 창 열수 및 층 띠를 명시한다. 기존 일반 창 생성기는 해당 면을 건너뛴다. 본관 남측13bay×2층, 강당 동측8bay×2층, 문형관 넓은2·3분할 사각창과 모서리 좁은창을 사진 비례로 지정했다. 이는 창의 유형을 재현하는 추정치이며 개수·치수의 실측 확인을 뜻하지 않는다. 미확인 면은 기존 추정값이 남는다.

문형관은 기존 아홉 경사지붕 조각과 코어를 두 개의 완전한 연구동 몸체+중앙 `roof.well`로 교체했다. 바깥 경사띠의 추정 폭5~6m, 지붕 상승2m, 내부 평옥상 상승0.65m 및 파라펫1.1m로, 종전11~15m폭 경사띠가 만드는 거대한 각진 지붕을 줄였다. 천창은 중앙의 짧은6m 지붕으로 지정한다. 코어를 실제 내부 중정처럼 지면까지 뚫지 않는다. 연결동은 OSM 외곽에 근거한 기존 위치를 유지한다.

보인재 낮은 주차장쪽1층은 높은 잔디쪽 기준면 아래3.1m로 가정해 별도 part로 두었다. 위쪽3개층+아래1개층이며, 낮은 연결부 위에는 얇은 금속난간을 지정한다. 실제 사진 두 방향에서 낮은 연결부와 주동 끝의 높은 유리 축은 확인했지만 주차장면의 정확한 방위는 독립 확정되지 않았다. 현재 서측 배정과 모든 footprint는 지도 기반 추정이다. Cesium 지반과의 교차 확인에서 아래층이 과하게 묻히거나 떠오르면 datum을 수정해야 한다. 지상4층이란 문구만을 이유로 모든 면에 네 줄 창을 똑같이 노출시키지 않는다.

본관 지붕3.2m·강당5m 상승값은 이번 자료에서 새 실측치가 나오지 않아 유지했다. 처마의 낮고 넓은 실루엣은 항공·정면을 함께 대조하며, 임의의 뾰족한 모서리 장식을 추가하지 않는다.
# Phase 4 site and façade contract

`focusSide` selects the representative façade independently of the first sub-part. `site.water` and `site.bridge` provide local ENU site context without adding a twentieth facility. They inherit the facility rotation; their elevations and boundaries are estimates documented with the source imagery.

The 학의정 panorama XML locates the camera, not the pavilion. Its downward cube face shows a lawn/path; the pavilion is approximately 28 m north in the pond. The model centre is now inferred from that view and nearby library orientation. The irregular pond and eastern access deck are approximate and require rendered alignment review.

보인재 uses its lowest visible floor as local elevation zero; upper wings begin at +3.1 m. Coarse regional DEM cannot establish the local terrace levels, so this does not claim measured grading. A south selection view presents the photo-derived brick/window façade instead of choosing a low west-side connector as the focus direction.
