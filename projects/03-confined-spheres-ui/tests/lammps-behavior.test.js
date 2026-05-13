import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { buildHexCell } from "../src/cell-model.js";
import { buildRunFiles } from "../src/export-files.js";
import { parseLammpsDump } from "../src/trajectory-parser.js";

const lammps = findLammps();

test("LAMMPS reflective wall blocks a driven particle", { skip: !lammps }, () => {
  const workdir = mkdtempSync(join(tmpdir(), "confined-spheres-wall-"));
  writeFileSync(join(workdir, "one.data"), singleParticleData());
  writeFileSync(join(workdir, "in.wall.lammps"), reflectiveWallInput());

  execFileSync(lammps, ["-echo", "none", "-log", "log.lammps", "-in", "in.wall.lammps"], {
    cwd: workdir,
    encoding: "utf8",
  });

  const dump = parseLammpsDump(readText(join(workdir, "dump.wall.lammpstrj")));
  const finalFrame = dump.frames.at(-1);
  const particle = finalFrame.atoms[0];
  assert.ok(particle.x <= 0, `particle crossed the reflective wall: x=${particle.x}`);
});

test("LAMMPS harmonic plane-region wall blocks a driven particle", { skip: !lammps }, () => {
  const workdir = mkdtempSync(join(tmpdir(), "confined-spheres-region-wall-"));
  writeFileSync(join(workdir, "one.data"), singleParticleData());
  writeFileSync(join(workdir, "in.wall-region.lammps"), regionWallInput());

  execFileSync(lammps, ["-echo", "none", "-log", "log.lammps", "-in", "in.wall-region.lammps"], {
    cwd: workdir,
    encoding: "utf8",
  });

  const dump = parseLammpsDump(readText(join(workdir, "dump.wall-region.lammpstrj")));
  const finalFrame = dump.frames.at(-1);
  const particle = finalFrame.atoms[0];
  assert.ok(particle.x <= 0, `particle crossed the harmonic region wall: x=${particle.x}`);
});

test("generated hex export runs under LAMMPS with six plane walls", { skip: !lammps }, () => {
  const workdir = mkdtempSync(join(tmpdir(), "confined-spheres-hex-export-"));
  const state = {
    coordination: 6,
    edgeCount: 4,
    tightness: 0.1,
    disabledParticleIds: new Set(),
    forces: [],
  };
  const cell = buildHexCell(state.edgeCount, state.tightness);
  for (const file of buildRunFiles(state, cell)) {
    const content = file.filename === "in.confined_spheres.lammps"
      ? file.content.replace("\nrun 50000\n", "\nrun 1000\n")
      : file.content;
    writeFileSync(join(workdir, file.filename), content);
  }

  execFileSync(lammps, ["-echo", "none", "-log", "log.lammps", "-in", "in.confined_spheres.lammps"], {
    cwd: workdir,
    encoding: "utf8",
  });

  const dump = parseLammpsDump(readText(join(workdir, "dump.confined_spheres.lammpstrj")));
  assert.equal(dump.frames[0].atoms.length, cell.particles.length);
  assert.equal(dump.frames.at(-1).timestep, 1000);
});

function findLammps() {
  for (const candidate of ["lmp", "lammps"]) {
    const result = spawnSync("which", [candidate], { encoding: "utf8" });
    if (result.status === 0) {
      return candidate;
    }
  }
  return null;
}

function readText(path) {
  return readFileSync(path, "utf8");
}

function singleParticleData() {
  return [
    "LAMMPS single particle wall test",
    "",
    "1 atoms",
    "1 atom types",
    "",
    "-5 5 xlo xhi",
    "-2 2 ylo yhi",
    "-0.25 0.25 zlo zhi",
    "",
    "Masses",
    "",
    "1 1.0",
    "",
    "Atoms # atomic",
    "",
    "1 1 -4.0 0.0 0.0",
    "",
  ].join("\n");
}

function reflectiveWallInput() {
  return [
    "units lj",
    "dimension 2",
    "atom_style atomic",
    "boundary f f p",
    "read_data one.data",
    "mass 1 1.0",
    "pair_style zero 1.0",
    "pair_coeff 1 1",
    "timestep 0.005",
    "velocity all set 0.0 0.0 0.0",
    "fix keep2d all enforce2d",
    "fix integrate all nve",
    "fix midwall all wall/reflect xhi 0.0",
    "fix drive all addforce 1.0 0.0 0.0",
    "dump traj all custom 100 dump.wall.lammpstrj id type x y z vx vy vz",
    "run 2000",
    "",
  ].join("\n");
}

function regionWallInput() {
  return [
    "units lj",
    "dimension 2",
    "atom_style atomic",
    "boundary f f p",
    "read_data one.data",
    "mass 1 1.0",
    "pair_style zero 1.0",
    "pair_coeff 1 1",
    "timestep 0.005",
    "velocity all set 0.0 0.0 0.0",
    "fix keep2d all enforce2d",
    "fix integrate all nve",
    "region left_half plane 0.0 0.0 0.0 -1.0 0.0 0.0 side in units box",
    "fix midwall all wall/region left_half harmonic 100.0 0.0 1.0",
    "fix drive all addforce 1.0 0.0 0.0",
    "dump traj all custom 100 dump.wall-region.lammpstrj id type x y z vx vy vz",
    "run 2000",
    "",
  ].join("\n");
}
