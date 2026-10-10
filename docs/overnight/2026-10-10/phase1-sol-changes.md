# 첫 자료 기반 형상 수정

구현 파일: `src/building-model.ts`, `src/Scene.tsx`. 데이터 계약은 Astra가 담당한다.

- 실제 사각 학의정 데이터의 네 꼭짓점을 바닥·목재 기둥·흰 수상 기초기둥·난간에 그대로 사용한다. 정사각 hip 지붕의 ridge 양끝이 중앙에서 만나는 모임지붕으로 수정하고, 꼭대기에 가는 축과 작은 층형 장식을 추가했다. 영길이 ridge 생성은 건너뛴다.
- archive-fins는 청색 유리창 없이 석재 세로핀과 세 개의 어두운 수평 띠를 지정 면에 생성한다. 별도 facades의 narrow-openings만 확인된 면에 작은 수직 개구부를 생성한다. part id에 용도를 고정하지 않는다.
- 문형관 flat roof core의 rooftop 계약으로 얕은 흰 파라펫과 천창을 생성한다. 개수와 균등 배열은 사진 기반 추정이며 실측 배치가 아니다.
- facade 배치·열주·후퇴 몸체와 focus 카메라는 north/west도 지원한다. 기존 ENU/GLB 축 보정은 유지한다.
- static material별 병합과 lazy Cesium 구조를 유지했다. Scene은 cardinal focus 외 큰 변경이 없다.

source TypeScript 검사 통과. 최종 데이터 확정 뒤 production build 및 root 단독 실제 렌더 비교가 필요하다. 육각/열린 중정/유리 수장고라는 기존 해석 오류를 바로잡는 단계이며 사진과 동일한 재현 완료 주장은 아니다.

## 첫 렌더 실패 뒤 수정

root 실캡처에서 장서각·학의정이 focus 후 화면 밖으로 벗어남을 확인했다. 기존 12도 카메라가 실제 지형에 너무 낮게 놓였고, Cesium이 위치를 들어 올린 후 시선이 원래 target으로 돌아오지 않았다. focus는 예상 카메라 위치의 실제 DEM을 읽어 최소25도 및 지면+40m를 확보한다. 초기10초 동안 충돌로 카메라 위치가 바뀌면 동일 target을 다시 바라본다. 사용자 조작이나 새 명령은 이 보정을 해제한다. 진단에는 target·모델 위치/고도/경계구·camera 방향을 추가했다.

그림자는2048 해상도·soft filtering·normal offset·darkness0.35·거리1600m로 조정했다. source 계약이 확정된 본관 west 좁은 창과 장서각 roofwell 경사 링/낮은 데크/긴 천창도 같은 빌드에 포함해 root에 명시했다. production build는1641modules,1.64초로 성공. 실제 조준 개선과 그림자 품질은 다음 root 단독 렌더에서 검증하며 아직 합격 주장 없음.

## Phase2 실제 오류와 Phase3 수정

root 실제 런타임에서 fragment shader의 `v_texCoord_0 undeclared`를 확보했다. 새 천창 geometry에 유리 texture가 있지만 UV가 없었던 직접 오류다. 천창 UV를 추가하고, export 직전 모든 textured mesh의 UV·좌표/법선 유한값을 보장하며 법선을 정규화했다. 퇴화 지붕 triangle은 생성하지 않는다. renderError의 실제 상세와 실패 전 진단 스냅샷을 보존하며, diagnostics models.blobUrl로 root가 생성 GLB를 직접 감사할 수 있다.

Phase3에는 Astra의 문형관2body/넓은 평데크/짧은 천창/내측 파라펫, 면별 windowLayouts를 반영했다. 본관·강당도 명시 창 배열이 generic 배열을 대체한다. 보인재의 낮은 유리 연결부와 추가층 데이터도 포함되었으며 신규 terraceRailing은 아직 생성하지 않는다. build1641modules/1.47초 성공. 렌더 오류 해소·19개 GLB accessor·focus 조준은 root 실제 검수가 필요하며 source/dist를 동결했다.
