# Phase8 환경 반사·수면 그림자·기와 UV 검토

이번 변경은 diagnostics `__aksSetEnvironmentFactor(value)` 훅만이다. 각 Model의 공개 imageBasedLightingFactor를(1,value)로 바꾸며0..1 범위를 사용한다. 기본factor(1,0)는 유지하고 root가 동일 구도0/.4/.7을 비교한다. source TypeScript 통과, Phase7 dist 변경 없음.

## SDK 근거

현재설치된 공식Cesium1.146 소스 `node_modules/@cesium/engine/Source/Scene/DynamicEnvironmentMapManager.js`는 enabled=true, mipmapLevels=7을 기본값으로 선언하며 cubewidth=2^(levels-1)=64이다. 따라서 현재 factor의 specular값0을 바꾸는 것이 새 임의HDR환경을 도입하는 것보다 작은 비교다. ModelDrawCommand는 Model.shadows를 cast/receive flag로 적용하며 translucent command도 별도 관리한다. 투명재질만으로 수면의cast를 없앨 수 있다고 가정하지 않는다.

## 수면 분리의 실행 가능한 구조

현재 학의정의 정자·기초·접근deck·수면은 하나의 GLB/Model이다. Model.shadows는 모델 전체에 적용되므로 수면만 그림자를 끄려면 공개API 경계에서 모델을 분리해야 한다. 구조물을 CAST_ONLY로 유지하고 수면은 별도GLB를 같은 ENU/modelMatrix/시설datum에 놓아 RECEIVE_ONLY로 설정하면 수면이 거대한 그림자를 만들지 않으면서 정자 그림자는 수신할 수 있다. 실제flatwater가 수신하는 다른그림자에 acne가남는지는A/B로확인해야한다.

동편연못도 bridge구조와 water를 나눈다. 시설 목록/구조물modelRefs는19개로 유지하고 siteModels를 별도관리하면 시설수가늘지 않는다. picking id는 같은시설id로연결할수있다. diagnostics에는 두layer의primitive/URL을 명시하여 export검사에 누락되지않게한다. 물GLB에는 구조부가없고 구조GLB에는 수면이없도록 exportlayer계약이필요하다. 아직구현하지않았으며전체shadowoff로대체하지않는다.

## 기와 source와 현재 UV

직접열람: `references/research-20261010/panorama/campus-vr/central/aksAir/face-f-1024.jpg`. 본관 경사면의 골은 용마루에서 처마를 향해 내려오고 사선hip면에서는 그 면의 경사방향으로 바뀐다. 촬영시점이확정되지않은 이 이미지의 초록처마색을현재색으로복제하지않는다.

현재texture는8열×4행의 offset 사각줄눈이고 UV가모든면에서worldx/4,worldnorth/2이다. 따라서 평면상 약0.5×0.5m 블록이 되며 slope surface거리/방향과무관하다. 특히east/west hip면의 골이 실제downslope방향과맞지않는다. 이는 자료에서확인한 방향과 source code의명확한차이이며 임의색변형보다 UV basis·기와골 hierarchy교정이먼저다. 정확한기와폭·겹침길이는현재사진만으로실측확정하지않는다.

후속안은 각roofplane의normal로downhill평면방향을구하고, 직교eave tangent와 실제slope거리로UV를계산하는것이다. 같은planar면의triangle은같은기준을사용하고hip seam에서만방향이바뀐다. normal map의암/수기와골과겹침띠를자료에맞게생성하되 모듈치수는사진비례추정으로데이터에남긴다. 용마루·추녀·끝들림같은윤곽은geometry로유지한다. 이번묶음에서는 roofgeometry/texture/data/terrain을변경하지않았다.
