# Phase5 벽돌 형상 비용 개선 준비

근거: Phase3 captured GLB에서 시습재83,964·보인재48,696·이택재26,328 triangles. 세 벽돌 기숙사가 전체의74.2%이며 파일 용량의73.1%다. 세 건물에 반복된 줄눈 BoxGeometry가 주요 비용 후보다.

허가받은 변경은 벽돌 벽면 표식의 body mesh에 모델단위 UV를 적용하고, 기존 줄눈 박스를 제거하는 것이다. 창틀·창문·발코니·계단탑·진입 형상은 유지한다. brick는 사진 비례 추정0.24×0.075m, 줄눈6mm이며 실측으로 표시하지 않는다. 줄눈을 포함한1.968×0.648m 타일에8×8 벽돌, half running-bond 배열, 데이터 외벽색 근방의 제한된 색 변화,1.5mm 얕은 줄눈 normal을 생성한다. 생성 텍스처는 실제 사진/사진측량 원본이라고 표시하지 않는다.

수직 벽 UV는 표면의 수평방향 거리와 높이로 계산해 어느 벽면에서도 같은 brick 크기를 유지한다. 직접 지정된 brick body만 적용하고 유리 연결부에는 적용하지 않는다. GLB exporter 앞의 textured mesh UV·유한좌표·단위법선 검사를 유지한다. normalMap도 export 뒤 dispose하여 누수를 방지한다.

Astra가 같은 source 묶음에서 장서각 curtain-grid를 제거하고 자료 기반 framedGlazing으로 변경했다. 유리창 누락 회귀를 막기 위해6큰기둥·5구획·석재끝bay·2창군×3pane·지정된2층 높이를 생성하고 기둥base/폭 계약을 구현했다. Bayindex는 localE/N 증가를 기준으로 방위와 일치한다. 따라서 다음 성능 비교는 이 작은 형상 교정도 포함하며 완전히 동일한 geometry 조건은 아니다.

Phase4 QA 중 source만 준비했다. 다음 build를 root가 실제 초기 ready·19뷰·GLB triangles/bytes·텍스처UV에 대해 이전 조건과 비교한 뒤 개선 여부를 판단한다. 아직 실제 성능 향상 수치를 주장하지 않는다.

root Phase5 실제 GLB 감사:19개 모델7,064,044bytes/69,028triangles, 구조검사 오류0. Phase3의20,936,228bytes/214,144triangles보다 용량66.3%·삼각형67.8% 감소했다. 이 사이Phase4형상과JSG프레임 교정도 포함하므로 완전히 같은geometry에서의 순수texture효과라고 해석하지 않는다. 실제초기로딩/FPS 개선은 별도root 런타임 결과가 필요하다.
