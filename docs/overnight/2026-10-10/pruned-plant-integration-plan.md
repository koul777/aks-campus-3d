# 본관 네 전정수목 opt-in 설계

원본 `tier-crown-contract.json`과2025 본관 사진을 근거로 한다. 기존 landscape의 west/east small-pruned, large-pruned 네 후보만 사용한다. 개체 height/crownDiameter는 기존 후보값이 우선이며 계약 템플릿6.5/3.6m를 모든 개체에 덮어쓰지 않는다. 수종·정확 치수·줄기 위치는 미검증이다.

별도 `pruned-plant-model.ts`에서 큰 개체4단/작은 개체3단의 겹치는 둥근 수관을 만든다. 윤곽에는 안정된 개체 seed의3–6% 유기 요철만 넣고 층 사이 큰 공기 틈·원반·원뿔을 만들지 않는다. 짧은 줄기와 위쪽 가지가 수관 내부에 연결된다. 불투명 MeshStandard, 자체발광0, 어두운 녹색군과 거친 표면을 사용하며 본관 지붕·벽을 수관으로 가리지 않는지 검수한다.

첫 시험은 near2–5k triangles/개체를 목표로 static merge한 보조GLB 하나다. 사진 원본의 큰 나무/작은 나무 폭과 본관 베이 점유를 비교하기 전에는 기본 활성화하지 않는다. `?diagnostics=1&planting=pruned`만 허용하고 stock TreeSmall02의 별도 `landscape=1`과 독립한다. 다른17후보를 자동 생성하지 않는다.

Scene은 Main localEN을 실제ENU로 변환하고 root `getVisualGroundElevation`으로 수정된 전면 둔덕을 샘플한다. ground-origin 모델의 줄기 하단이 이 표면에 맞는다. 로딩/모델표시 toggle/URL·primitive cleanup은 기존 보조 모델과 같은 소유권으로 관리한다. 모델19 count와 캠퍼스 건물 bounding fit에 보조 식재를 합치지 않는다.

현재는 설계만이며 phase15 roof 빌드 이후 순차 구현한다.
