# Phase 11 데이터 적용 기록

root 승인 후 `src/data/geographic-buildings.ts`와 공개 비교사진을 수정했다. renderer·terrain·dist는 수정하지 않았다. 아래 모든 길이·높이는 사진비례와 기존 평면에 맞춘 추정이다.

- 본관:14열주를 실제 중앙 넓은 간격을 반영한 비균등 위치로 지정. 남쪽 상하층 개별유리, 중앙 낮고넓은 상부5pane와 하부4짝 출입문을 분리.28단·깊이18m의 계단과6~8m구간 참을 지정. 참 높이는 bodybase−1.2m로 추정하므로 root 지면 하단 샘플과 검증 필요.
- 도서관: 남쪽 위층 짧은 창13베이, 아래층 개별창과 중앙 출입문을 별도 지정. 이전 두층 ribbon 제거. 가려진 창은 추정이다.
- 문형관: 확인한 면은 두 동 모두east. 남쪽동 상부3층 transom, 하부 좁은세로창과 유리현관,3개 둥근부착기둥과 회문띠를 지정. 북쪽동은 기존벽상단11.7m를 유지하고 아래3.2m층에 뒤로물린 core와 동쪽4개기둥, 위8.5m에3창층을 배치. 개방부깊이·높이는미측량. 지붕전체를높이지않았다.
- 정문: Phase10위치교정에 이어 승인된 팔각경비실추가. 자세한 근거는 gate-position-audit.md.

## 원본 비교사진

| 시설 | public 파일 | source SHA-256 |
|---|---|---|
| 본관 | `/references/main-20250410.jpg` | e0418fcffde4d274553de4a100b7400e3e0c7b95fea26a6eb48544e22dcfad3b |
| 도서관 | `/references/library-20250410.jpg` | 43b79faf551c7285113248c0bd244b36405cffcc3683262db369e4fa01a55708 |
| 문형관 | `/references/munhyeong-20260604.jpg` | f339a135a5842197551049b41b6f14aaa468af468591d6df9fd8665b56c7ba3e |

세 원본과 public복사본의 해시 동일 확인. source URL·날짜 기준·SHA-256은 각 시설 `photoEvidence`/`photoSourceUrl`에 저장했다. 본관·도서관 날짜는 원본파일명 촬영일, 문형관은 공식게시일기준이다. 고해상도사진이 있다고 건물치수가 측량됐다는 뜻은 아니다.

## 검증 상태

데이터 타입검사 `npx tsc --noEmit` 통과. renderer 새descriptor 대응은 Sol 소유이며, 실제 렌더 합격을 의미하지 않는다. root QA에서 본관 계단 하단·참, 중앙발코니폭, 문형관 east면 창 분할과 북동 개방층·지면, 팔각경비실 위성중첩을 우선 확인한다. source type검사 후 앱 빌드를 실행하지 않았다.
