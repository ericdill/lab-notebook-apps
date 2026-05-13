import test from "node:test";
import assert from "node:assert/strict";

import { buildHexCell, buildSquareCell } from "../src/cell-model.js";
import { buildRunFiles, generateLammpsInput, generateParticlesData } from "../src/export-files.js";

function sampleState() {
  return {
    coordination: 4,
    edgeCount: 3,
    tightness: 0,
    disabledParticleIds: new Set([2]),
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
      {
        id: 2,
        kind: "sine",
        angleDeg: 0,
        amplitude: 1,
        frequency: 1,
        phaseDeg: 0,
        rotationRateDeg: 0,
      },
    ],
  };
}

test("particles.data exports only active particles with sequential LAMMPS ids", () => {
  const state = sampleState();
  const cell = buildSquareCell(3, 0);
  const data = generateParticlesData(state, cell);

  assert.match(data, /8 atoms/);
  assert.match(data, /0\.00000000 6\.00000000 xlo xhi/);
  assert.match(data, /Atoms # sphere/);
  assert.match(data, /1 1 2\.00000000 1\.00000000 1\.00000000 1\.00000000 0\.0/);
  assert.doesNotMatch(data, /2 1 2\.00000000 1\.00000000 3\.00000000 1\.00000000 0\.0/);
});

test("LAMMPS input includes rectangular wrapper and summed sine force variables", () => {
  const state = sampleState();
  const cell = buildSquareCell(3, 0);
  const input = generateLammpsInput(state, cell);

  assert.match(input, /read_data particles\.data/);
  assert.match(input, /atom_style sphere/);
  assert.match(input, /pair_style gran\/hooke\/history \$\{kn\} NULL \$\{gamman\} NULL 0\.0 1/);
  assert.match(input, /pair_coeff \* \*/);
  assert.match(input, /timestep 0\.00100000/);
  assert.match(input, /fix integrate all nve\/sphere disc/);
  assert.match(input, /variable particle_radius equal 1\.00000000/);
  assert.match(input, /variable wall_xlo equal xlo\+v_particle_radius/);
  assert.match(input, /variable wall_xhi equal xhi-v_particle_radius/);
  assert.match(input, /variable wall_ylo equal ylo\+v_particle_radius/);
  assert.match(input, /variable wall_yhi equal yhi-v_particle_radius/);
  assert.match(input, /fix wrapper all wall\/reflect xlo \$\{wall_xlo\} xhi \$\{wall_xhi\} ylo \$\{wall_ylo\} yhi \$\{wall_yhi\}/);
  assert.match(input, /variable f1_theta equal 1\.57079633\+0\.17453293\*time/);
  assert.match(input, /variable fdrive_x equal v_f1_x\+v_f2_x/);
  assert.match(input, /fix drive all addforce v_fdrive_x v_fdrive_y 0\.0/);
  assert.match(input, /thermo 1000/);
  assert.match(input, /dump traj all custom 500 dump\.confined_spheres\.lammpstrj id type radius x y z vx vy vz/);
  assert.match(input, /run 50000/);
  assert.match(input, /# Runtime: timestep 0\.001, run 50000, simulated time 50\./);
});

test("LAMMPS input uses custom runtime controls", () => {
  const state = {
    ...sampleState(),
    timestep: 0.0025,
    runSteps: 12345,
    dumpEvery: 123,
    thermoEvery: 456,
  };
  const cell = buildSquareCell(3, 0);
  const input = generateLammpsInput(state, cell);

  assert.match(input, /timestep 0\.00250000/);
  assert.match(input, /thermo 456/);
  assert.match(input, /dump traj all custom 123 dump\.confined_spheres\.lammpstrj id type radius x y z vx vy vz/);
  assert.match(input, /run 12345/);
  assert.match(input, /# Runtime: timestep 0\.0025, run 12345, simulated time 30\.8625\./);
});

test("hex LAMMPS input uses six independent plane walls instead of the rectangular wrapper", () => {
  const state = sampleState();
  const cell = buildHexCell(4, 0);
  const input = generateLammpsInput(state, cell);

  assert.doesNotMatch(input, /fix wrapper all wall\/reflect/);
  assert.doesNotMatch(input, /region hex_container intersect/);
  assert.match(input, /Physical confinement shape: hexagon/);
  assert.match(input, /region hex_side_1 plane .* side in units box/);
  assert.match(input, /region hex_side_6 plane .* side in units box/);
  assert.match(input, /fix hexwall_1 all wall\/region hex_side_1 harmonic 100\.0 0\.0 0\.00100000/);
  assert.match(input, /fix hexwall_6 all wall\/region hex_side_6 harmonic 100\.0 0\.0 0\.00100000/);
});

test("run export contains the expected four files", () => {
  const files = buildRunFiles(sampleState(), buildSquareCell(3, 0));
  assert.deepEqual(
    files.map((file) => file.filename),
    ["simulation.json", "particles.data", "in.confined_spheres.lammps", "README.txt"]
  );
});
