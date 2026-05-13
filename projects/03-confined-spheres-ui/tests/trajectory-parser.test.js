import test from "node:test";
import assert from "node:assert/strict";

import { parseLammpsDump } from "../src/trajectory-parser.js";

const twoFrameDump = `ITEM: TIMESTEP
0
ITEM: NUMBER OF ATOMS
2
ITEM: BOX BOUNDS ff ff pp
0 4
0 5
-0.25 0.25
ITEM: ATOMS id type x y z vx vy vz
2 1 3.0 4.0 0.0 0.2 0.3 0.0
1 1 1.0 2.0 0.0 0.0 0.1 0.0
ITEM: TIMESTEP
100
ITEM: NUMBER OF ATOMS
2
ITEM: BOX BOUNDS ff ff pp
0 4
0 5
-0.25 0.25
ITEM: ATOMS id type x y z vx vy vz
1 1 1.5 2.5 0.0 0.1 0.1 0.0
2 1 3.5 4.5 0.0 0.2 0.4 0.0
`;

test("parses LAMMPS custom dump frames", () => {
  const trajectory = parseLammpsDump(twoFrameDump);

  assert.equal(trajectory.frameCount, 2);
  assert.equal(trajectory.frames[0].timestep, 0);
  assert.equal(trajectory.frames[1].timestep, 100);
  assert.deepEqual(trajectory.frames[0].bounds, {
    xlo: 0,
    xhi: 4,
    ylo: 0,
    yhi: 5,
    zlo: -0.25,
    zhi: 0.25,
    columns: ["ff", "ff", "pp"],
  });
  assert.deepEqual(trajectory.frames[0].columns, ["id", "type", "x", "y", "z", "vx", "vy", "vz"]);
});

test("sorts atoms by id within each frame", () => {
  const trajectory = parseLammpsDump(twoFrameDump);

  assert.deepEqual(
    trajectory.frames[0].atoms.map((atom) => atom.id),
    [1, 2]
  );
  assert.deepEqual(trajectory.frames[0].atoms[0], {
    id: 1,
    type: 1,
    x: 1,
    y: 2,
    z: 0,
    vx: 0,
    vy: 0.1,
    vz: 0,
  });
});

test("throws for malformed dump files", () => {
  assert.throws(
    () => parseLammpsDump("ITEM: TIMESTEP\nwat\n"),
    /Invalid timestep/
  );
});
