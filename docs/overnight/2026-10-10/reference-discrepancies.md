# 19시설 외관 근거 대조 — 2026-10-10

이 문서는 사진에서 관찰되는 형태와 데이터/생성 코드의 차이를 기록한다. 현재 브라우저 렌더를 검수한 PASS 보고서가 아니다. 사진에 보이지 않는 뒷면·정확한 높이·방위는 확정하지 않았다. 단위 높이와 치수는 모델 추정값이며 사진으로 측량값을 검증할 수 없다.

검토 기준 파일: `src/data/geographic-buildings.ts` SHA256 `FED5C00EDF381745605489437C9EE1FC7EABDC20C835629DC928DE0207EAD017`; `src/building-model.ts` SHA256 `D332BAA60872F2CA778725043D02912CCF2427C021F19EF286CA0438F60E408C`. 이후 수정은 별도 렌더 검수 대상이다. 아래 경로는 프로젝트 루트 기준이다.

## 먼저 수정할 근거가 강한 항목

1. 보인재: 주동 사이 연결부가 높은 3층 커튼월인 데이터는 2024년 사진과 상충한다. 낮은 1층 연결부와 주동 끝 높은 유리 계단실을 분리한다.
2. 시습재: 두 계단탑의 `windowBand:false`는 실제 큰 세로 유리와 상충한다. 낮은 주동 옥상 위 후퇴한 층/차양·설비도 실루엣에 중요하다.
3. 청계학당: 앞채를 단순 맞배지붕으로 끝내면 사진 양끝의 사선 하향 지붕면과 팔작 끝 형태가 사라진다. 사진이 확인되는 앞채부터 지붕 끝을 수정한다.
4. 국은관: 균등 반복 돌출창만으로는 상층 돌출창과 하층 중앙 깊은 출입구·상부 캐노피의 차이가 사라진다.

## 시설별 대조

| 번호 / 시설 | 직접 확인할 파일과 눈에 보이는 근거 | 현재 데이터와 남은 차이 / 작업 판단 |
|---|---|---|
| 01 본관 | `references/administration.jpg`; `references/research-20261010/panorama/campus-vr/central/aksAir/face-f-2048.jpg`. 길고 낮은 2층, 깊은 처마, 중앙 계단과 출입부; 항공 사진은 긴 수평 용마루와 사면 지붕을 보여준다. | 2층/긴 몸체/입구 계단은 표현돼 있다. 반복 13칸과 중앙 출입부의 실제 문·창 배치는 같다고 검증되지 않았다. 중앙 현관을 일반 창 반복에서 분리하고 사진 대비 렌더 확인. 지붕 높이 3.2m 자체는 검증 불가. |
| 02 강당 | `references/hall.jpg`; `references/research-20261010/panorama/campus-vr/east/eastyard/face-f-2048.jpg`; `references/research-20261010/panorama/campus-vr/central/aksAir/face-f-2048.jpg`. 높은 정면 기둥, 두 높이의 기하 무늬 창, 중앙 문, 넓은 계단. 항공상 큰 사면 지붕. | 9기둥/8칸/두 층 정면은 데이터에 있다. 실제 기하 창살, 중앙 문과 측면 창 구분을 렌더에서 확인해야 한다. 낮은 지상 사진만 보고 평지붕으로 바꾸지 않는다. |
| 03 국은관 | `references/gugeun.jpg`. 윗층 창은 흰 상자 프레임이 돌출하고 중앙 출입구 위 큰 평판 캐노피/발코니가 보인다. 아래층 창과 출입구는 윗층 반복과 다르다. 전면 긴 오름 계단. | `bay-window`가 모든 행에 균등 적용되므로 층별 차이가 사라진다. 캐노피를 별도 부재로, 하층 중앙을 문/후퇴 공간으로 만든다. 8계단은 추정이며 사진의 정확한 단수를 주장하지 않는다. |
| 04 동편연못 | `references/east-pond.jpg`; `references/research-20261010/panorama/eastpond/face-b-1024.jpg`, `face-l-1024.jpg`. 흰색 3개 아치 개구부의 다리, 굽은 물가, 주변 보행로와 수목. | 생성 코드에 3아치 다리가 이미 있다. 남은 차이는 단순 8각 수면과 실제 곡선 물가, 다리 양끝과 육지 연결이다. 다리 길이 28m와 방향은 사진으로 확정되지 않았다. 서쪽 운중저수지와 혼동하지 않는다. |
| 05 청계관 | `references/cheonggye.jpg`. 2층 크림색 벽, 돌출 흰 창틀, 얕은 기와 처마가 보인다. | 기본 2층 돌출창은 근거와 맞는다. 현재 6칸 규칙 배열/정면 방향은 단일 사선 사진으로 완전 검증되지 않았다. 무조건 새 창 수를 정하지 말고 보이는 면만 맞춘다. |
| 06 진현관 | `references/jinhyeon.jpg`. 양 층 돌출 창틀, 중앙의 넓고 얇은 캐노피와 그 위 얇은 난간이 구별된다. | 캐노피 슬래브는 별도 part에 있다. 난간과 중앙 현관의 층별 비대칭이 반복 창과 분리되어야 한다. 나머지 측면은 미확인. |
| 07 운중관 | `references/unjung.jpg`. 긴 2층 회랑, 연속 수평 발코니/난간, 얇은 처마, 경사진 잔디와 전면 진입 계단. | `colonnade`로 기둥은 표현하지만 실제 긴 수평 발코니 띠를 렌더에서 확인해야 한다. 뒤 부속동 높이·창 배열은 전면 사진으로 증명되지 않는다. 경사 잔디와 접근 계단이 평면 바닥으로 생략되면 사진과 큰 차이가 난다. |
| 08 식당/매점 | `references/cafeteria.jpg`; `references/research-20261010/panorama/campus-vr/central/aksAir/face-f-2048.jpg`. 낮은 본체 위 큰 기와 사면 지붕, 중앙의 작은 높인 지붕, 그늘진 전면 유리/기둥. | 큰 지붕+작은 상부 지붕은 이미 분리돼 있다. 작은 상부 지붕 아래 둘레 창/루버는 `windowBand:false`로 빠질 가능성이 있다. 사진에서 실제로 보이는 틈/밝기만 반영하고 전체 유리로 추정하지 않는다. |
| 09 한국학도서관 | `references/library.jpg`; `references/research-20261010/panorama/hakuijeong/face-b-3840.jpg`; `references/research-20261010/panorama/siseupjae/face-r-1024.jpg`. 정면의 긴 상층 창띠와 아래 기둥, 서측의 큰 막힌 벽 및 중앙 세로 어두운 유리, 깊고 얇은 처마. | 남쪽 반복 창띠만으로 서측 특징을 대체하면 안 된다. 4개 지붕 부재가 만든 내부 공간이 실제 열린 중정인지 현재 사진으로 확정하지 않았다. 문형관에 대한 평지붕 발견을 도서관에 자동 적용하지 않는다. |
| 10 학의정 | `references/hakuijeong.jpg`; `references/research-20261010/panorama/hakuijeong/face-r-3840.jpg`. 현재는 사각 목조 정자, 네모 모임지붕과 꼭대기 장식, 흰 수상 기초, 열린 난간. | 사각 평면/기둥/난간/기초/장식은 생성 코드에 있다. 난간이 네 변 모두 막혀 있으므로 실제 출입구와 육지 접근 접속은 검수 필요. 좌표는 VR 촬영점 기반 추정으로 정자 중심 측량값이 아니다. 이전 VR의 육각 정자를 현재 모델 근거로 쓰지 않는다. |
| 11 청계학당 | `references/cheonggye-hakdang.jpg`. 앞의 긴 개방 회랑과 뒤의 높은 중심채, 양옆 낮은 날개. 앞채 양 끝에 사선 하향 지붕면, 귀 처마가 보인다. 나무 기둥 사이 흰 벽·목재 창이 부분적으로 섞인다. | 4동의 높낮이는 있으나 모두 `gable`이다. 앞채 지붕 끝의 팔작 형태를 우선 표현한다. 모든 정면을 같은 목재 창 반복으로 채우면 개방 회랑이 닫힌 건물처럼 보인다. 뒤·옆 모든 채의 지붕 형식은 각각 사진을 확인한 뒤 수정한다. |
| 12 이택재 | `references/itaekjae.jpg`. 2024년 건물의 살구색 벽돌, 4층의 넓은 발코니 반복, 평지붕 테두리. | 4층/4칸 발코니는 근거에 맞는다. 현재 뒤쪽 계단 부재 위치와 전체 깊이는 정면 사진으로 확인되지 않는다. **현재 2024년 기숙사는 2021년 항공 사진에 없다.** 역사 위성의 지붕/외곽을 현 건물의 정답으로 쓰면 안 된다. |
| 13 한국학대학원 | `references/graduate-school.jpg`; `references/research-20261010/panorama/siseupjae/face-f-1024.jpg`; `references/research-20261010/panorama/hakuijeong/face-f-1024.jpg`. 긴 낮은 교육동, 반복 기둥과 지붕, 중앙 진입부. 항공에서는 일부가 수목에 가린다. | 긴 본체와 전면 진입 부재는 존재한다. 측면/뒷면 및 입구 작은 지붕의 끝 모양은 완전히 확인되지 않았다. 가린 영역에 상세 창을 만들어도 검증된 복원이라고 주장하지 않는다. |
| 14 보인재 | `references/boinjae.jpg`; `references/research-20261010/astra/blog-20240711_132106.jpg`; `references/research-20261010/astra/blog-20240731_153340.jpg`. 주차장 면은 분리된 벽돌 주동 사이 낮은 1층 유리/띠창 연결부. 높은 유리는 각 주동 끝의 세로 계단/로비. 잔디 면은 큰 막힌 벽, 좁은 세로 창띠와 튀어나온 유리 계단실. | `boin-glass-link` 11.3m 3층 커튼월과 설명의 '높은 유리 연결부'는 수정 대상. 주동 3층은 지형의 낮은 면에 보이는 하부 층과 구분해야 한다. 사진 속 주차장 면의 정확한 방위는 별도 지리 대조 전 미확정. **2024년 신축이며 2021년 항공에 현 건물 없음.** 2020년 설계안과 준공 사진이 다르므로 설계안을 그대로 구현하지 않는다. |
| 15 시습재 | `references/shiseubjae.jpg`; `references/research-20261010/panorama/siseupjae/face-b-1024.jpg`. 긴 붉은 벽돌 몸체, 두 높은 탑의 넓은 세로 유리, 주동 옥상 위 후퇴한 층과 차양, 옥상 설비가 보인다. | 두 탑 `windowBand:false`는 직접 불일치. 큰 세로 유리를 별도 면에 넣고 탑 윗부분의 가는 세로 홈도 구분한다. 모든 주동을 높이 10.7m의 평평한 3층 덩어리로 끝내면 옥상 후퇴 실루엣이 사라진다. 정면만으로 OSM 전체 복합 외곽의 모든 층수를 확정하지 않는다. |
| 16 문형관 | `references/munhyeong.jpg`; `references/research-20261010/panorama/campus-vr/central/aksAir/face-l-2048.jpg`; `references/research-20261010/panorama/central/face-l-3840.jpg`. 두 동의 지붕 중앙은 난간으로 둘러싼 평지붕이며 천창/설비가 있다. 그 바깥에 경사진 기와 지붕. 동 사이 좁은 외부 통로. | 평지붕 중심부 수정은 근거에 맞음. 열린 지상 중정으로 되돌리지 않는다. 현재 연결 부재가 사진의 동 사이 열린 통로를 막는지 실제 렌더 확인이 필요하다. 두 동의 서로 다른 창 행 수와 지면 높이는 전체를 같은 층수로 평준화하지 않는다. |
| 17 장서각 | `references/jangseogak.jpg`; `references/research-20261010/panorama/jangseogak/face-r-3840.jpg`; `references/research-20261010/panorama/campus-vr/central/aksAir/face-b-2048.jpg`. 서쪽 서고는 큰 무창 벽, 동쪽 공용동의 북향 정면은 유리/기둥. 동측 끝은 제한된 세로 창과 유리 계단. 지붕 중앙 평지붕/천창. | 동쪽 유리/서쪽 서고 수정 유지. 모든 면을 유리로 둘러싸거나 이를 반전하지 않는다. 동측 세로 창 7칸은 데이터 추정이며 사진과 개수/간격 비교 필요. 지붕 내부 낮은 부분을 기와로 모두 덮지 않는다. |
| 18 지하주차장 | `references/parking.jpg`; `references/research-20261010/panorama/jangseogak/face-r-3840.jpg`; `references/research-20261010/panorama/campus-vr/central/aksAir/face-d-1024.jpg`. 운동장/식재된 높은 지면 아래 옹벽과 어두운 차량 입구가 있다. | 생성 코드에 두 개 입구/중앙 기둥이 있다. 핵심은 그 위 높은 운동장 및 양쪽 옹벽과 연결되는 단면이다. 단독 입구 프레임만 평지에 세우면 지하 주차장으로 보이지 않는다. 수치 높이는 추정. |
| 19 정문 | `references/gate.jpg`; `references/research-20261010/panorama/jangseogak/face-d-3840.jpg`. 분리된 기둥, 측면 낮은 안내벽, 차량 차단기·작은 경비 시설, 횡단보도/차로와 연결된다. | 분리 기둥/안내벽은 있고 도로 횡단 지붕은 없다. 데이터에는 경비실/차단기가 없다. 정문 기둥 단면은 단순 정사각보다 세분돼 보이므로 근접 렌더에서 확인. 현재 anchor는 횡단보도 부근 해석점이며 기둥 위치의 측량치가 아니다. |

## 캠퍼스 바닥·접근 맥락

- 문형관 앞 원형 포장과 직사각 보행 포장, 두 동 사이 통로: `references/research-20261010/panorama/campus-vr/central/aksAir/face-l-2048.jpg`. 공중에서 잘 보이는 식별 요소다. 위성 텍스처가 남아 있는지, 모델이 덮거나 높이 차이로 가리지 않는지 렌더 확인한다.
- 본관/강당 앞 계단과 전면 광장: `references/research-20261010/panorama/campus-vr/east/eastyard/face-f-2048.jpg`, `references/administration.jpg`. 건물만 맞고 진입 높이가 틀리면 떠 있는 외관처럼 보인다.
- 국은관·운중관의 오름 계단과 경사 잔디: 각각 공식 사진. 일정 평면으로 땅을 덮지 말고 계단 끝과 실제 지형 접합을 확인한다.
- 운동장 높은 대지·지하 주차장 옹벽·진입 도로: `references/research-20261010/panorama/campus-vr/central/aksAir/face-d-1024.jpg`, `references/research-20261010/panorama/jangseogak/face-r-3840.jpg`. DEM의 해상도가 옹벽을 표현하지 못할 수 있으므로 별도 구조가 필요한지 렌더에서 판단한다.
- 학의정 작은 연못과 접근로, 동편연못의 다리 양 끝은 모델과 물/육지 연결이 중요하다. 두 연못과 서쪽 저수지를 혼동하지 않는다.
- 정문 횡단보도, 차로, 차단기와 안내벽: `references/research-20261010/panorama/jangseogak/face-d-3840.jpg`. 큰 진입 동선이 확인되지만 현재 항공과 동일한 운영 상태라고 주장하지 않는다.

## 증거 범위

공식 시설 사진의 URL은 `https://www.aks.ac.kr/site/aks/kor/images/sub/img-campusmap-{01..19}.jpg?v=241218`이며 쿼리 문자열은 촬영일 증거가 아니다. 2021 항공 프로젝트의 저자·출처·원본 타일·SHA256은 `references/research-20261010/panorama-source.json`과 각 download manifest에 보존했다. `campus-vr` 구형 9장면은 촬영연도 미확정이며 이전 육각 학의정이 포함되므로 현재 외형 증거와 구분한다. 2024 블로그 사진은 Astra가 확보한 신규 준공 외관 자료이며 사진 파일명만으로 위치 방위를 확정하지 않았다. 현재 데이터의 모든 회전 15.5도와 면 지정은 별도 실제 지도 렌더에서 확인해야 한다. 이 보고서는 측량 정확도·완전 복원·assay 합격을 주장하지 않는다.
