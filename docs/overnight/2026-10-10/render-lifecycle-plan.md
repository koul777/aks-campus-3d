# Cesium on-demand 렌더 시험 설계 — 구현 전 읽기 검토

현재 기본은 `requestRenderMode:false`, `maximumRenderTimeChange:Infinity`, Cesium 기본 render loop이다. 이 문서는 `?diagnostics=1&render=ondemand` 후보이며 코드·빌드·GPU 실행을 변경하지 않았다. 이전 초기 LOD 정체가 있었으므로 단순 true 치환은 권하지 않는다.

## 설치된1.146 소스 근거

- `@cesium/engine/Source/Scene/Scene.js:4653`: 렌더 여부는 requestRenderMode, 명시 request, cameraChanged, 일부 scene 상태로 결정한다. `postUpdate`는 update 과정에서 발생하지만 `postRender`는 실제 렌더에만 발생한다(4699/4719).
- 같은 파일708/712: RequestScheduler requestCompleted, TaskProcessor taskCompleted가 다음 렌더를 요청한다.812/817: imageryLayersUpdated/terrainProviderChanged도 요청한다. afterRender callback이 true를 반환하면 다시 requestRender한다(4194).
- `Scene/Model/Model.js:2155`: 리소스/증분 텍스처 처리 중에는 afterRender의 true로 렌더를 이어간다. ready는 최초 렌더 뒤 afterRender에서 설정하며 실제 그리기는 다음 frame이다(2120).
- `Widget/CesiumWidget.js:1055/1070`: resize가 실제 canvas 크기를 바꾸면 requestRender한다. 기본 loop는 유지하며 useDefaultRenderLoop를 끄지 않는다.
- 공개 계약: [Scene](https://cesium.com/learn/cesiumjs/ref-doc/Scene.html), [explicit rendering 설명](https://cesium.com/blog/2018/01/24/cesium-scene-rendering-performance/).

## 누락·보완 표

| 생명주기 | 현재 요청과 SDK 보장 | on-demand에서 필요한 최소 보완 / 검증 |
|---|---|---|
| 초기 imagery/DEM/19 GLB 생성 | SDK 요청/worker 완료는 자동. 각각의 모델 추가 뒤 명시 request가 있다. 사용자 fetch·GLB export 완료는 SDK RequestScheduler에 자동 포함되지 않는다 | Viewer 초기 true를 피하고 초기 refinement/GLB 로딩은 연속 렌더 유지. fetch/export 완료 후 primitive 추가의 명시 request 유지 |
| aux stock/pruned/clustered 추가 | 마지막 startup monitor 등록 직후 request가 있다. Model loader도 처리 중 재요청 | aux 추가마다 request 명시하면 소유권이 더 명확함.19+모든 aux ready를 그대로 확인 |
| startup의12 postRender 안정 frame | 현재 monitor는 다음 frame을 요청하지 않는다 | 처음부터 true면 tilesLoaded/ready 뒤 재요청이 멎어12frame을 못 채우고 loader가 남을 수 있다. 연속 startup 또는 gate가 미완료일 때 제한적 request 필요 |
| ready 직후 전체 bounding fit | setReady와 같은 callback에서 camera fit. cameraChanged가 렌더를 발생시킴 | fit 후 새 타일이 생길 수 있으므로 final overview camera의 타일/실제 frame 안정 이후에만 on-demand로 전환하는 별도 완료 조건 필요. 첫 시점의 tilesLoaded만으로 전환하지 않음 |
| focus 비동기 DEM·lookAt | promise 완료 뒤 request가 있다 | 유지. 이전 명령 cancellation/생성된 viewer 생존 검사 유지 |
| focus collision 복원3 postRender | 첫 요청만 있고 monitor 자체 재요청 없음.3frame 전 camera가 안정되면 정지할 수 있음 | 최소3렌더 frame을 명시 이어주고 collision 복원 직후 request. public footpoint height와 native 예상고도 일치 검사 유지 |
| focus10초 deadline | deadline은 postRender에서만 검사하며 별도 timer가 없음 | 렌더가 멎으면10초 후에도 cancel/복원이 실행되지 않을 수 있다. 소유된 wall-clock timer로 복원·monitor해제·최종request, user input/newcommand/unmount에서도 timer해제.10초 전체를 항상 렌더하도록 만들지는 않음 |
| left/right/zoom/top/oblique/reset | command effect 끝과 전체 fit 조기return에 request 있음 | 유지. 선택 target 높이/id 보존 검사. command resize replay를 만들지 않음 |
| 마우스/touch orbit/zoom 및 inertia | cameraChanged는 SDK 자동 조건 | 직접 gesture·inertia 끝 idle까지 실제 frame 확인. 수동 request를 매 RAF에 영구 추가하지 않음 |
| React labels / model show | 각 effect에서 show 변경 뒤 request 있음 | 현재충분. aux도 model toggle에 포함됨. 로딩 중 visibility 변경과 새 primitive show의 일치 확인 |
| 실제 시설 pick | 이벤트는 onSelect→React focus command로 이어짐 | pick 자체가 repaint를 항상 필요로 하지는 않음. selection camera/label 변경의 기존명시 request 유지 |
| viewport / DPR / mobile 크기 변경 | CesiumWidget.resize가 request | 기본loop 유지.375/768/desktop·주소창 높이·모달 변화 후canvas stale 여부 확인. 앱 별도 resize animationloop 불필요 |
| terrain/site grading | terrain callback은 모델 생성 중 준비하며 tiles 요청 완료는 SDK 경로 | 현재는 시각 런타임 편집이 없어 추가요청 불필요. 향후 provider/지형 데이터 교체는 공개 provider 재설정+request 필요 |
| 조명·환경·shadow diagnostics | 각각의 공개API hook 끝 request 있음 | 유지. 환경 cubemap 후속command가 끝날 때 idle로 돌아가는지 확인 |
| native dialog / photo UI | Canvas 상태를 바꾸지 않는 DOM UI | 지도 repaint 강제 불필요. modal Escape/focus trap 검증은 유지 |
| error/context loss / cleanup | DOM fallback으로 scene unmount·viewer destroy | 추가 timer/monitor ownership까지 cleanup. 실패 시 계속 request loop를 남기지 않음 |

## 시간에 따른 변화

Viewer의 공개 기본 `shouldAnimate:false`이며 앱에서 clock을 켜지 않는다. scene.light는 고정 DirectionalLight 방향/강도이고 IBL SH도 고정이다. 앱 water normal 및 procedural 재질은 정적이며 수면 애니메이션이 없다. 따라서 현재 사용자 idle 동안 자동으로 바뀌어야 하는 낮빛·물결은 없다.

DynamicEnvironmentMapManager는 enabled이며 atmosphere 변화/이동/설정에 반응한다. 설치 소스의 시간 재생성은 SUNLIGHT dynamicLighting이고 simulation time 차이가 maximumSecondsDifference(default3600초)를 넘는 경우다(866–889). 앱 clock이 정지한 상태에서는 wall-clock 한 시간이 지났다는 사실만으로 낮빛 재생이 필요하지 않다. 향후 clock 재생을 켜면 Infinity를 유지할지 재검토하고 시간-driven 렌더를 별도 계약해야 한다.

## 첫 opt-in 권고

초기에는 연속 렌더를 유지한다.19+aux ready, startup12frame 및 최종 union camera fit 이후 실제 새 camera의 tilesLoaded와 렌더 안정성을 확인한 뒤 공개 scene.requestRenderMode=true로 전환한다. focus 같은 제한된3frame/collision window는 필요한 frame만 재요청한다. render loop 자체는 켜두며 비공개 상태를 수정하지 않는다. 기본 production은 현행 유지한다.

## 비교 조건과 QA 변경

- 동일 Intel Arc/D3D11, viewport/DPR, 카메라·데이터·trial 옵션으로 연속 기본과 opt-in을 순차 비교한다. cold와 warm은 별도 기록하고13.397초 cold 수치를 warm과 직접 비교하지 않는다.
- 초기19+aux 실제 ready, 최종overview tile queue0, 모든19focus 방향/target, 수동 orbit/zoom/inertia, model/label 토글, pick, modal,375/768 reset을 재검증한다. on-demand에서는 idle frame 증가 자체를 PASS 조건으로 쓰지 않는다.
- diagnostics.frames는 실제postRender 횟수다. 준비/command 때 증가하고 tile 안정 후10초 idle에서는 거의 정지해야 한다. timer나pre/postUpdate 수는 렌더 frame 수와 분리해 기록한다.
- 로딩시간/idle rendered frames/행동후복구 지연/오류·HTTP를 함께 측정한다. 안정화되기 전에 idle GPU절감만 측정하지 않는다. 세 장면(main focus, Haku near, overview)에서 정지·재개 화면을 직접 본다.
- 기존 QA의 'Nframe 더 기다림'은 완성상태·명시입력후 새 rendered frame·최종camera tile queue 기준으로 바꿔야 한다. camera이동 직후 이전 tilesLoaded true가 남는 race를 피하기 위해 최소한 이동후 실제새frame을 먼저 확인한다.

아직 구현·채택하지 않았다.
