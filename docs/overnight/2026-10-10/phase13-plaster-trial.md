# 본관 stock plaster 재질 시험 — 기본 비활성화

`?diagnostics=1&materials=1`에서 본관 body mesh에만 Poly Haven [White Plaster 02](https://polyhaven.com/a/white_plaster_02)의 CC0 diffuse / OpenGL normal / roughness 1K JPEG를 적용한다. public/materials 복사본은 수집 원본 바이트를 유지한다. 한국학중앙연구원 벽면을 스캔한 재질이 아니며, 기존 추정 외벽색을 원본 diffuse에 곱한 stock 표면 시험이다.

UV 반복 1은 모델 길이 1m에 대응한다. 지붕·계단·기둥·창과 다른 시설에는 적용하지 않는다. 기본 재질은 그대로 유지하며 정면/사선 실제 렌더 A/B 전에는 채택하지 않는다. 원본 diffuse는 sRGB, normal/roughness는 선형 입력이다.

독립 `?diagnostics=1&glass=environment` 옵션은 본관의 기존 가상 숲 반사 canvas를 제거하고, 중립 회녹색의 반사성 PBR 재질과 Cesium dynamic environment specular factor1을 시험한다. 거칠기0.12/metalness0.8은 외관 시험치이며 실제 유리의 측정 IOR·투과·내부를 재현한 값이 아니다. 기존 창/창틀 geometry는 유지한다. 다른 시설과 기본 화면은 바꾸지 않으며 plaster 결과와 혼합 판정하지 않는다.

사진 투영 수치 검증은 `node scripts/verify-photo-projection.mjs`로 재현할 수 있다. 독립적인 합성 원근 카메라 121점 최대 오차는 1.43e-13px 미만이며, 2×2m 벽에서 중앙 1×1m 영역을 제거한 잔여 면적은 3m²다. 이는 사진과 실제 건물의 등록 정확도나 시각 품질 판정과 다르다. 실제 shader / UV 방향 / 모델 normal은 root GLB 및 브라우저 검증이 필요하다.
