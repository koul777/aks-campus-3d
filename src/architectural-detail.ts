import {
  BufferGeometry,
  CanvasTexture,
  Color,
  Float32BufferAttribute,
  MeshStandardMaterial,
  RepeatWrapping,
  SRGBColorSpace,
} from "three";

/** Quiet metre-scaled material detail. Illustrative finish, not a source-photo texture. */
export function createArchitecturalMaterial(
  color: string,
  kind: "plaster" | "stone" = "plaster",
) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext("2d")!,
    image = ctx.createImageData(256, 256);
  let seed = 73421;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let y = 0; y < 256; y++)
    for (let x = 0; x < 256; x++) {
      const i = (y * 256 + x) * 4;
      const grain = (random() - 0.5) * 9;
      const mottling = Math.sin(x * 0.073) * Math.sin(y * 0.053) * 2.1;
      let value = 249 + grain + mottling;
      if (kind === "stone") {
        const row = Math.floor(y / 64),
          offset = row % 2 ? 64 : 0;
        const joint = y % 64 < 1 || (x + offset) % 128 < 1;
        if (joint) value = 217;
      }
      image.data[i] = image.data[i + 1] = image.data[i + 2] = value;
      image.data[i + 3] = 255;
    }
  ctx.putImageData(image, 0, 0);
  const texture = new CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = RepeatWrapping;
  texture.colorSpace = SRGBColorSpace;
  const material = new MeshStandardMaterial({
    color,
    map: texture,
    roughness: kind === "stone" ? 0.82 : 0.94,
  });
  material.name = `architectural-${kind}-${color}`;
  return material;
}

export function architecturalUv(geometry: BufferGeometry, period = 2.4) {
  const position = geometry.getAttribute("position"),
    normal = geometry.getAttribute("normal"),
    uv: number[] = [];
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i),
      y = position.getY(i),
      z = position.getZ(i);
    const nx = Math.abs(normal.getX(i)),
      ny = Math.abs(normal.getY(i)),
      nz = Math.abs(normal.getZ(i));
    uv.push((nx > nz ? -z : x) / period, (ny > 0.7 ? -z : y) / period);
  }
  geometry.setAttribute("uv", new Float32BufferAttribute(uv, 2));
}
