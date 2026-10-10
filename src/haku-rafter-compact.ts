import { Vector3 } from "three";

/** Retain the sampled roof envelope, with at most 2 mm downward drift. */
export const hakuRafterCompactBounds = {
  chordToleranceMetres: 0.001,
  downwardOffsetMetres: 0.001,
  maximumDeviationMetres: 0.002,
} as const;

/**
 * Input samples lie on a straight X/Z rafter path. Undefined samples remain gaps.
 * Test every original sample, including roof triangulation crossings. Each input
 * span is linear, so the endpoint tests also bound its entire interpolated span.
 * A 1 mm downward offset cancels the permitted 1 mm upward chord error.
 */
export function compactHakuRafterSamples(samples: (Vector3 | undefined)[]) {
  const result: (Vector3 | undefined)[] = [];
  const bounds = hakuRafterCompactBounds;
  let maximumDownwardDeviationMetres = 0;
  let maximumUpwardDeviationMetres = 0;
  let sourceSegments = 0;
  let compactSegments = 0;
  for (let cursor = 0; cursor < samples.length;) {
    if (!samples[cursor]) {
      result.push(undefined);
      cursor++;
      continue;
    }
    const run: Vector3[] = [];
    while (cursor < samples.length && samples[cursor]) run.push(samples[cursor++]!);
    sourceSegments += Math.max(0, run.length - 1);
    let start = 0;
    const lower = (point: Vector3) => point.clone().add(new Vector3(0, -bounds.downwardOffsetMetres, 0));
    result.push(lower(run[0]));
    while (start < run.length - 1) {
      let selected = start + 1;
      for (let end = start + 2; end < run.length; end++) {
        const a = run[start], b = run[end];
        const dx = b.x - a.x, dz = b.z - a.z, squared = dx * dx + dz * dz;
        if (squared < 1e-12) continue;
        let valid = true;
        for (let index = start + 1; index < end; index++) {
          const point = run[index];
          const t = ((point.x - a.x) * dx + (point.z - a.z) * dz) / squared;
          const height = a.y + (b.y - a.y) * t;
          if (Math.abs(height - point.y) > bounds.chordToleranceMetres) {
            valid = false;
            break;
          }
        }
        if (valid) selected = end;
      }
      const a = run[start], b = run[selected];
      const dx = b.x - a.x, dz = b.z - a.z, squared = dx * dx + dz * dz;
      for (let index = start; index <= selected; index++) {
        const point = run[index];
        const t = squared > 1e-12 ? ((point.x - a.x) * dx + (point.z - a.z) * dz) / squared : 0;
        const drift = a.y + (b.y - a.y) * t - bounds.downwardOffsetMetres - point.y;
        maximumDownwardDeviationMetres = Math.max(maximumDownwardDeviationMetres, -drift);
        maximumUpwardDeviationMetres = Math.max(maximumUpwardDeviationMetres, drift);
      }
      result.push(lower(b));
      compactSegments++;
      start = selected;
    }
  }
  return { samples: result, sourceSegments, compactSegments, maximumDownwardDeviationMetres, maximumUpwardDeviationMetres };
}
