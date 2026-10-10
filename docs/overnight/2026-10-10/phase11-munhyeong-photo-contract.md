# 문형관 2026 입면 대조 — 동쪽 면 계약

직접 열람: `references/research-20261010/high-resolution-search/target-224304013123-0.jpg` (1200×900, [공식 출판문화부 인터뷰](https://m.blog.naver.com/aksblog/224304013123)), `target-224263386724-9.jpg` (4000×2252, [공식 봄 사진](https://m.blog.naver.com/aksblog/224263386724)), 기존 `references/research-20261010/panorama/campus-vr/central/aksAir/face-l-1024.jpg`. 게시일은 root 수집 기록 기준2026-06-04/2026-04-27. 이 문서는 source-only 검토이며 데이터 수정 없음.

## 면 방위

4000px 사진 왼쪽의 장서각 수장고, 문형관 앞 원형 포장광장, 오른쪽 남북 도로가 기존 항공파노라마와 일치한다. 항공사진 오른쪽 뒤에는 북쪽의 도서관이 있다. 따라서 문형관을 동쪽에서 서쪽으로 보는 구도이다. 1200px의 큰 유리 현관은 **남쪽 매스의 east면**, 4000px의 아래 개방부가 있는 건물은 **북쪽 매스의 east면**이다. 사진상 정면을 이유로 south면에 동일 창을 적용해서는 안 된다.

## 확인된 차이

| 부분 | 직접 관찰 | 현재 모델 차이 | 계약 권고 |
|---|---|---|---|
| 남쪽 매스 east면 위3층 | 큰 수평 분할창. 상부는 넓은 고정유리1장, 하부는 창마다2~3개 비대칭 개폐창. 최상층에 왼쪽 가장자리 일부를 포함해 최소8창이 보임 | `mullions:2` 세로3등분을 창 전체높이에 동일하게 적용하면 틀림 | 창 가로 중간/약상부55% 지점에 transom, 하부 전용 분할. 전체 베이수는 왼쪽 crop 밖이 있어8개로확정하지말고 기존OSM길이/항공을추가대조 |
| 남쪽 매스 east면 지상층 | 가느다란 세로창, 중앙4짝 이상 유리문+상부고정유리, 낮은3~4단 계단과 왼쪽접근램프 | 현재4층 모두 같은2.4×1.8m창9베이 | 위층3개 sill만 windowLayouts로 지정; 지상층은 glazedOpenings로 좁은창폭 약0.7m높이2.0m 및 별도문폭약7m. 확인된동쪽만 적용 |
| 남쪽 매스 east면 벽 | 석재 모듈 줄눈, 둥근 부착기둥이 지상부터3층 상단띠까지 올라감. 최상층까지 연속하지 않음 | 일반박스벽/동일층띠 | half-round pilaster descriptor: 확인된면side, centers, radius≈0.35m, base0/top≈11m(추정). 높이와간격은그림비례 |
| 두 매스 east면1층 위 | 청회색 회문 무늬의 넓은 띠. 단순얇은수평줄과 다름 | 작은floorBands만 존재 | 전용 얇은 geometry/반복pattern texture로 한층경계만. pattern색은벽보다어두운청회색. 모든면에무조건반복금지 |
| 북쪽 매스 east면 | 위3층창, 아래층은 큰 어두운 개방부. 둥근기둥이최상층아래층띠까지만 이어짐 | 현재north wing height11.7m/windowRows3는 아래개방층을 생략하고전체벽으로막음 | 별도지상pilotis/개방base층+상부3층벽. 현지형고차와data base를root확인후결정. 각층높이를사진없이강제로같게늘리지않음 |

## 최소 renderer 계약 제안

기존 `windowLayouts`에 선택적으로 `transom?:{upperFraction:number;lowerFractions:number[]}`를 추가하면 상부넓은고정유리/하부작은창을 표현할 수 있다. `mullions`와 함께 지정되면 transom이 우선하며 전높이 세로창살을 중복 생성하지 않는다. `lowerFractions`합은1, 예 `[0.28,0.28,0.44]`; 실제사진의 일부창은2개이므로 모든창3개를확인했다고기술하지않는다. 필요하면 개별창배열로추가분리한다.

지상층은 기존 `glazedOpenings`를 사용하되 같은side가있다는이유로 upper `windowLayouts`까지제거하면안된다. 현재renderer가면전체generic을skip하는것과 explicit두descriptor가공존하는것을구분해야한다. 문주변의가느다란창은 중앙출입문영역에생성하지않는다.

기둥/회문띠/북동pilotis는 별도단계이다. 첫수정은 면방위와 층별창형태부터검수하고, 단순한창모양수정과 북쪽동높이/지형수정을 한꺼번에합격판정하지않는다.

## 유리 패치 후보

1200px 사진 최상층 중앙오른쪽 창의 상부고정유리: TL(641,269), TR(691,267), BR(693,289), BL(641,291). 약50×22px로 본관전경보다낫지만 여전히 근접재질용고해상도는 아니다. 잎/벽/창틀을 제외하고 원본경계확대검수후 사용하는 후보다.

east면을 바라보는 사진 왼쪽은 local south, 오른쪽은 local north이다. 대응평면 TL=[Efront,Nmin,Ztop], TR=[Efront,Nmax,Ztop], BR=[Efront,Nmax,Zbottom], BL=[Efront,Nmin,Zbottom]. Three변환[x=E,y=Z,z=−N] 뒤 UV방향을 확인한다. 서쪽·북쪽·남쪽 창에 이 이미지를 검증없이 붙이지 않는다.
