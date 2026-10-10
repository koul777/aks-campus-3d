# 이택재 상부 유리의 원본 사진 UV 적용 가능성

`docs/photographic-facade-proposal.md`와966×644 원본 `references/itaekjae.jpg`를 직접 열람했다. **실행 가능하지만 기존 geometry의 전체 정면을 한 사진으로 덮으면 안 된다.** 이번 문서는 검토이며 소스·데이터·이미지·빌드를 바꾸지 않았다.

상부 세 줄의 큰 유리는 보이지만 아래 절반에는 발코니 난간이 겹친다. 가장 위 왼쪽 opening은 대략x213..325,y248..316이며 깨끗한 상부 유리는 약y250..273뿐이다. 원본 rail을 뒤 glass에 붙이고 앞에 생성 rail을 두면 이중 난간이 생긴다. 원본을 지우거나 새 이미지를 만드는 대신 receiver의 상부 영역만 원본 UV로 매핑하고 하부 유리는 기존 재질을 유지하는 방식이 적절하다.

제안된 전체벽 homography의14.6m..3.65m와 photo200..459px를 현재 balcony floor에 그대로 적용하면 upper opening의 높이가 약10px 이상 어긋날 수 있다. 기존 model upperglass top13.05m와 사진의 유리top약249px가 정확히 등록되지 않기 때문이다. 전체벽 envelope는 위치 찾기에만 쓰고 각 실제 opening의 확인된 네 corner를 별도 대응해야 한다. 원본 mullion도 geometry mullion과 중복될 수 있으므로 각 pane 안쪽의 cleanpatch를 별도로 받는 것이 안전하다.

구현 계약 후보는 photoGlassPatches의 각 항목에 side/bay/row/pane, 원본URL/hash/dimensions, pixelTL/TR/BR/BL, 대상상부영역의 height interval을 담는 것이다. 데이터 해석은 Astra가 맡고 Sol은 해당 기존 backglass의 source-covered submesh에만 적용한다. 원본JPEG를 TextureLoader로 그대로 읽고 UV로 선택영역을 참조한다. local public/reference라 새 외부서비스가 필요하지 않다. source raster를 crop/rectify/inpaint하지 않는다.

해당 patch의 기존 PBR glass를 그 영역에서 대체해 coplanar두면을 남기지 않는다. PlaneGeometry를 충분히 subdivide하고 targetplane→sourcepixel homography를 각vertex에서 평가한다. normal two-triangle quad의UV보간만으로 일반homography라고 주장하지 않는다. corner/interior 재투영 오차를 픽셀단위로 확인한다. Texture.flipY와GLB export의Y변환은 한 번만 검증한다.

사진에 이미 들어 있는 반사/그림자는 capturedappearance다. MeshBasicMaterial은 현재공식Three GLTFExporter에서KHR_materials_unlit를내보내고 Cesium은unlitlighting을지원하므로 사진patch가새daylight로이중어두워지는것을피할수있는후보다. 프레임·벽돌·난간·처마는기존기하/PBR을유지한다. 환경반사factor A/B와사진유리patch A/B는분리해야한다. 기본광택에원본반사를또얹으면같은반사가두번보일수있다.

해상도 한계도명확하다. clean상부patch는한opening당약100×20여pixels라매우가까운뷰에서세부를복원할수없다. 시야가바뀌어도원본반사는고정되며투명실내가생기는것이아니다. 정면/사선실제캡처에서mirror·난간중복·나무/울타리부착·recess폐쇄·sidewrap이없을때만시범적용을유지한다. 현재자료로photogrammetry 또는숨은입면복원을주장하지않는다.
