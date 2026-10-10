# Phase7 source 구현

root Phase6 실제동일구도 그림자OFF에서 Moiré가 모두 사라져 self-shadow acne를 확인했다. public Model.shadows를 CAST_ONLY로 바꾸어 건물은 그림자를 지형에 드리우고 자기 표면의 잘못된 수신을 제거한다. private depth bias는 변경하지 않는다. 같은 시점 root실제비교가 필요하다.

이택재 balconyStacks는 정면 몸체를1.2m 후퇴시키고 벽돌 piers/spandrels를 원래 면에 복원한다.4개 넓은 glazing stack과 위3층별 독립 slab/rail을 생성하며 bay 사이를 가로지르는 generic corridor는 만들지 않는다. 벽돌 UV는 변환을 bake한 뒤 다시 계산해 몸체·복원 piers에서 실제단위 크기와 위상이 맞는다.

지하주차장은 확인된 옹벽 방위·새 anchor·낮은forecourt datum을 데이터에서 읽는다. 연속벽의 동쪽에2개의 어두운 얕은 opening, PARKING표기, 상부안전난간과18m 국소접근면을 생성한다. 뒤편 큰 grass volume/slab을 만들지 않으며 지형 접속은 root terrain이 담당한다. 특별시설의공통1m부유여유는 getFacilityGroundClearance를 통해0으로 연결한다.

정자수면은4m 단위UV·녹색의 작고 제한된 변화·미세wave normal을 생성했다. 이 텍스처는 사진 또는 실측표면이 아니다. 흰 수상기초는 water.elevation-0.5까지 내려간다. 동편연못도 동일한 물재질규칙을 적용한다. dynamic environment/IBLspecular는 이번묶음에 도입하지 않았다.

source TypeScript 통과. root terrain·데이터 완료 연락까지 build 보류하며 브라우저 실행 없음. 이후19GLB구조와동일구도실물비교 결과로평가한다.
