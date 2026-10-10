# 자료 기반 geometry·texture 구조 검토

Sol 작성. 첫 자료 조사 구간의 개념 문서이며 source code·dist 변경 없음. 아래 관찰은 로컬 보존 원본을 직접 열람한 결과이며 치수는 확정하지 않는다.

## 직접 확인한 형상 차이

| 근거 이미지 | 관찰 | 현재 모델에서 필요한 변경 |
|---|---|---|
| `references/research-20261010/astra/ksde-jangseogak-design.jpg` | 유리 열주동과 낮은 연결동, 무창 수장고가 명확히 다름. 수장고의 세로 반복은 창문이 아니라 석재 핀·음영이고 어두운 수평 줄이 세 개 보임. 금속 지붕은 매우 얕고 밝음. | 기존 stone-grid의 청색 유리 삽입 제거. 유리동과 수장고를 서로 다른 facade generator로 분리. 석재 핀 깊이와 줄눈을 표현하고 수평 띠를 실제 해당 면에 지정. |
| `panorama/jangseogak/face-r-1024.jpg` | 수장고 측면에 좁고 작은 수직 개구부가 있으며 중앙 계단실은 돌출 유리 볼륨. 옥상은 중정/채광부가 드러남. 지하주차장 입구는 외벽 앞 운동장 아래 위치. | 전면 무창과 측면 제한된 개구부를 면별 설정. 계단실 돌출부와 채광부를 별도 part로 관리. 주차장 facade와 수장고 bulk를 겹치지 않게 확인. |
| `panorama/hakuijeong/face-r-1024.jpg` | 학의정 바닥·기둥 배치와 지붕이 네 각으로 보임. 회색 기와 지붕 끝이 살짝 들리고 꼭대기에 수직 장식이 있음. 흰 콘크리트 기둥으로 수면 위에 떠 있음. | 기존 육각 pavilion 생성 제거. 사각 바닥/네 모서리 목재 기둥과 흰 하부 지지, 난간, 네 경사면 지붕과 꼭대기 장식. 위치는 최신 자료 해석 데이터 유지. |
| `panorama/central/face-l-1024.jpg` | 문형관의 보이는 면은 큰 일률적 창 띠가 아니라 중간 큰 사각 창, 양쪽 좁은 수직창, 유리 수직축, 바닥 층 장식 띠가 구별됨. 넓은 기와 지붕의 용마루/깊은 처마가 선명함. | research generic grid 대신 면별 window sequence/세로 glass strip/지상층 pattern 구분. 공중 사진에서 보이는 내부와 외부 높이 차이를 Astra 자료 계약에 반영. |
| `panorama/central/face-b-1024.jpg` | 근접 지붕 측면에 얇은 수직 창, 깊은 처마와 모서리/용마루 기와 선이 보임. 사진의 그림자를 실제 벽 색으로 굽히면 안 됨. | 면별 창 위치와 지붕 프로필이 우선. 원본 사진 전체를 벽 재질로 붙이는 방식은 지양. |

## 권장 데이터와 생성 구조

현재 `facadeStyle` 하나가 여러 면을 같은 창 배열로 처리하여 실제의 비대칭을 지운다. Astra 확정 후 `facades`를 면별 목록으로 추가하는 것이 유리하다. 면은 local east/north/south/west, 각 항목은 solid / glazing / colonnade / archive-fins / research-pattern 등 확인된 유형과 bay sequence를 갖는다. 기존 style은 미확인 면의 fallback으로 유지할 수 있다. 창은 개수뿐 아니라 normalized horizontal intervals, 층별 높이와 개구부 높이를 표현해야 한다. 치수는 추정임을 데이터에서 유지한다.

geometry는 body·recessed facade·columns·roof surface·ridge/eave·opening frames로 분리하되 export 전에 같은 material의 정적 mesh를 병합한다. 실제 개구부만 glass material을 쓰고 석재의 어두운 음영 핀을 glass로 치환하지 않는다. 작은 줄눈은 texture로, 깊이와 silhouette을 바꾸는 처마·핀·기둥·계단실은 geometry로 생성한다.

지붕은 기와와 금속을 별도 재질/UV 규칙으로 관리한다. 기와 UV는 경사 길이 방향의 행과 처마 방향의 골을 실제 모델 단위로 반복해야 한다. 현재 square canvas texture를 모든 경사면에 단순 적용하면 긴 건물에서 크기가 늘어나며 용마루 방향과 행이 틀어질 수 있다. 각 경사면의 local tangent/downslope basis로 UV를 계산하고, 큰 기와 골/용마루는 제한된 반복 geometry, 작은 표면 요철은 normal 또는 roughness map으로 처리한다. 금속은 얇은 standing seam과 은회색 반사이며 기와와 같은 검은 골을 공유하지 않는다.

학의정은 arbitrary polygon pavilion과 분리된 square-pavilion 형상으로 확정한 네 각만 구현한다. 기와 끝 들림은 낮은 subdivided strips로 만들고 꼭대기 ornament는 실제 사진의 가는 축을 반영한다. 불필요하게 높은 피라미드로 증폭하지 않는다.

## 검증 순서

1. Astra가 자료에서 식별한 시설·방위·면별 특징을 데이터로 확정한다.
2. 장서각 잘못된 유리 수장고와 학의정 육각부터 수정한다.
3. 동일 시점의 전면/측면/위 렌더를 자료와 비교한다. 창 개수·비율·부재 깊이와 지붕 윤곽을 먼저 평가한다.
4. 재질은 같은 daylight 조건에서 비교하고 사진 자체의 하늘·수목·그림자를 벽 texture에 굽히지 않는다.
5. 전체19 ready/show·선택·복귀·모바일 및 WebGL fallback 회귀는 root 단독 브라우저로 검수한다. 소프트웨어 GPU 저각도 타일 로딩 시간은 별도 기록한다.

현재 단계에서는 새 외형 코드나 빌드를 실행하지 않았다. 자료상 주요 오류를 확인했지만 실측/사진측량 완료 또는 실물 동일 판단은 하지 않는다.
