import test from "node:test";
import assert from "node:assert/strict";

import { buildHexCell, buildSquareCell, DIAMETER, RADIUS } from "../src/cell-model.js";
import { buildSimulationConfig } from "../src/config.js";
import { forceVector } from "../src/forces.js";

test("square cell uses n by n particles and tight boundary clearance", () => {
  const cell = buildSquareCell(6, 0.1);

  assert.equal(cell.particles.length, 36);
  assert.equal(cell.edgeSphereCount, 6);
  assert.equal(cell.dimensions.width, 2 * 0.1 + 6 * DIAMETER);
  assert.equal(cell.dimensions.height, 2 * 0.1 + 6 * DIAMETER);
  assert.deepEqual(cell.particles[0], { id: 1, x: 1.1, y: 1.1 });
});

test("hex cell interprets n as particles per edge", () => {
  for (const edgeCount of [1, 2, 3, 6]) {
    const cell = buildHexCell(edgeCount, 0);
    assert.equal(cell.particles.length, 3 * edgeCount * (edgeCount - 1) + 1);
    assert.equal(cell.edgeSphereCount, edgeCount);
    assert.equal(cell.confinementBoundary.length, 6);
  }
});

test("hex confinement expands by requested particle-radius clearance", () => {
  const tight = buildHexCell(4, 0);
  const loose = buildHexCell(4, 0.25 * RADIUS);

  assert.equal(loose.dimensions.confinement_apothem - tight.dimensions.confinement_apothem, 0.25);
});

test("simulation config separates active and disabled particles", () => {
  const state = {
    coordination: 4,
    edgeCount: 3,
    tightness: 0,
    timestep: 0.002,
    runSteps: 2500,
    dumpEvery: 125,
    thermoEvery: 250,
    disabledParticleIds: new Set([2, 8]),
    forces: [
      {
        id: 1,
        kind: "sine",
        angleDeg: 90,
        amplitude: 2,
        frequency: 0.5,
        phaseDeg: 45,
        rotationRateDeg: 10,
      },
    ],
  };
  const cell = buildSquareCell(3, 0);
  const config = buildSimulationConfig(state, cell);

  assert.equal(config.cell.particle_count, 9);
  assert.equal(config.cell.active_particle_count, 7);
  assert.deepEqual(config.cell.disabled_particle_ids, [2, 8]);
  assert.deepEqual(config.cell.active_particle_ids, [1, 3, 4, 5, 6, 7, 9]);
  assert.deepEqual(config.runtime, {
    timestep: 0.002,
    run_steps: 2500,
    simulated_time: 5,
    dump_every: 125,
    thermo_every: 250,
    expected_dump_frames: 21,
  });
  assert.equal(config.driving_forces[0].function, "sine");
  assert.deepEqual(config.driving_forces[0].direction_vector, { x: 0, y: 1 });
});

test("force vectors are unit vectors from the configured direction angle", () => {
  assert.deepEqual(forceVector({ angleDeg: 0 }), { x: 1, y: 0 });

  const diagonal = forceVector({ angleDeg: 45 });
  assert.equal(Number(diagonal.x.toFixed(6)), 0.707107);
  assert.equal(Number(diagonal.y.toFixed(6)), 0.707107);
});
