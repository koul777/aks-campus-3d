# 밝아진 지붕의 면 경계 — 읽기 진단

직접 확인: roof-review-phase15/neutral-none-hakuijeong.png 및 neutral-none-cheonggye.png. 현재 모델 CAST_ONLY이므로 반복적인 면 내부의 줄 방향과 큰 삼각 명암을 self-shadow acne로만 설명할 수 없다.

코드에서 확인한 불일치:

1. 본체는 각 삼각형의 normal에서 계산한 cross/down-slope 좌표를0.33/0.34m로 나눈 UV다. curved eave strip은 여전히 worldX/4,worldN/2이다. 동일 기와 map이 서로 다른 방향·주기로 적용된다.
2. rim/main은 동일 roof.color/metalness.12 material cache 객체를 공유한다. main에서 추가하는 rib normalMap이 rim에도 적용되지만 rim의 UV는 예전 world projection이다.
3. 처마 곡면은 모서리 y+0.23/edge중간 y−0.12와 안쪽edge y를 이어 붙인 별도 평면 삼각형이다. nonindexed flat normals이므로 각 삼각형의 밝은 면/어두운 면 경계가 드러난다. 이것은 UV만의 문제와 geometry의 법선 문제를 구분해야 한다.

작은 수정 제안: 각 roof facet에 기준 eave edge와 단일 좌표계를 정의한다. U는 edge along-distance, V는 경사면의 uphill/downhill distance로 하고 동일 facet의 두 삼각형 및 해당 처마 strip에 같은 원점·기준축을 사용한다. curved strip은 연결된 정점에 제한적으로 법선을 평활화하고, hip/ridge의 실제 꺾임은 별도 법선으로 남긴다. 처마의 높이/폭과 tile색은 이 변경에서 유지한다. 금속과 flat roof에는 적용하지 않는다.

평면 triangle pair의 기존 slope projection은 두 삼각형의 normal이 같다면 원칙적으로 같은 UV다. 따라서 본체의 모든 대각선을 phase discontinuity로 단정하지 않는다. 첫 시험은 Haku/Cheong 두 실제 각도의 연속선·대각선·normal 검사를 포함해야 한다. 현재 문서는 제안이며 app source/dist 수정 없음.
