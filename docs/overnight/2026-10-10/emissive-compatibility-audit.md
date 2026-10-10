# GLB 발광 확장과 Cesium 호환성 검증

2026-10-10 03:13 KST경 root는 artifacts/overnight-phase10/glb의 실제 생성19GLB와 설치된 Three0.186/Cesium1.146 SDK를 검사했다. 이것은 일반적인 추측이 아니라 이번 파일의 실제 변환 문제이다.

`src/building-model.ts` helper는 `emissive: color`, `emissiveIntensity:0.025`를 설정했다. Three GLTFExporter는 full linear `emissiveFactor`와 `KHR_materials_emissive_strength`의0.025를 함께 내보냈다. 실제 본관/장서각/학의정 GLB의 대다수재질에 이확장과 full emissiveFactor가있다. 예를들어 stone의Factor는 `[0.7605245,0.7304607,0.6375969]`다.

설치된 `node_modules/@cesium/engine/Source/Scene/Model/ModelUtility.js`의 supportedExtensions 목록에는 `KHR_materials_emissive_strength`가 없다. GltfLoader.js의 material로드는 gltfMaterial.emissiveFactor만 읽고 extension의emissiveStrength를 곱하지 않는다. 따라서 이번tiny발광의설계값이실행결과에그대로적용된다고볼수없다.

root가 hardware Chrome에서 실제조명1.8/diffuseDC.55와1.0/.35,1.2/.25를같은카메라·tiles0안정조건으로비교한15캡처는 `artifacts/lighting-review-phase10`에보존. 조명차의map전체평균절대RGB변화는장서각약.95/본관.75수준으로작았고, receive-shadow를키면큰그림자변화는있었다. 이측정단독으로원인을확정한것이아니라 GLB+SDK변환근거와함께판단했다.

후속수정: 일반비발광벽/지붕의 emissive를 제거. 정말발광이필요한재질은지원되지않는strength확장에의존하지말고emissiveFactor자체에배율을반영하여intensity1로export. 기본조명/그림자설정을먼저유지하고 발광수정뒤새렌더로비교한다. 수정전이미지는유지하며이문서단계에서수정후실물합격을주장하지않는다.