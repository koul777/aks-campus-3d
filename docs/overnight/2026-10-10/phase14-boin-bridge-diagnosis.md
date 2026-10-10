# 보인재 계단 유리 중첩 / 학의정 deck 계약

직접 확인: phase13/map-14.png, map-16.png 및 공식 boinjae.jpg. map16 배경 보인재 동측의 파란 조각은 north 매스 E3..31/N1..15와 glass-stair E23..31/N9..16의 동일 base3.1/height11.3에서 발생한다. E31/N9..15 외벽 두 장이 완전히 같은 평면이다. 조명·해상도 교체보다 북매스에서 계단 footprint를 빼는 notch가 우선이다. 확인된 유리 계단 part와 원래 외곽을 보존하며 Astra 데이터 소유자가 수정한다. flat roof는 이미 polygon Shape이므로 notch 외곽을 따라간다.

현재 학의정 deck은 thickness0.16m, start/end 좌표의 중점을 centerline으로 하고 localX 축을 3D 방향 quaternion에 맞춘다. start center는 site.bridge.elevation, end center는 sampled bridgeLandingHeight+0.08이다. 낮은 경사에서 끝의 하단은 sampled ground와 거의 같고 상면은 ground+0.16이다. 시작 상면은 site.bridge.elevation+0.08이다. 따라서 elevation을 상면값으로 정의할 경우 centerline은 elevation−0.08로 변경해야 한다. 원본 사진에 맞는 치수 측량값으로 주장하지 않는다.
