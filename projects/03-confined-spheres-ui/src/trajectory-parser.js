export function parseLammpsDump(text) {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const frames = [];
  let index = 0;

  while (index < lines.length) {
    if (lines[index].trim() === "") {
      index += 1;
      continue;
    }
    expectLine(lines, index, "ITEM: TIMESTEP");
    index += 1;
    const timestep = parseInteger(lines[index], "timestep");
    index += 1;

    expectLine(lines, index, "ITEM: NUMBER OF ATOMS");
    index += 1;
    const atomCount = parseInteger(lines[index], "atom count");
    index += 1;

    if (!lines[index]?.startsWith("ITEM: BOX BOUNDS")) {
      throw new Error(`Expected ITEM: BOX BOUNDS at line ${index + 1}`);
    }
    const boxColumns = lines[index].trim().split(/\s+/).slice(3);
    index += 1;
    const x = parseBounds(lines[index], "x bounds");
    index += 1;
    const y = parseBounds(lines[index], "y bounds");
    index += 1;
    const z = parseBounds(lines[index], "z bounds");
    index += 1;

    if (!lines[index]?.startsWith("ITEM: ATOMS")) {
      throw new Error(`Expected ITEM: ATOMS at line ${index + 1}`);
    }
    const atomColumns = lines[index].trim().split(/\s+/).slice(2);
    index += 1;

    const atoms = [];
    for (let row = 0; row < atomCount; row += 1) {
      const values = lines[index]?.trim().split(/\s+/) ?? [];
      if (values.length < atomColumns.length) {
        throw new Error(`Expected atom row with ${atomColumns.length} values at line ${index + 1}`);
      }
      atoms.push(parseAtom(atomColumns, values));
      index += 1;
    }
    atoms.sort((a, b) => a.id - b.id);

    frames.push({
      timestep,
      atomCount,
      bounds: {
        xlo: x.lo,
        xhi: x.hi,
        ylo: y.lo,
        yhi: y.hi,
        zlo: z.lo,
        zhi: z.hi,
        columns: boxColumns,
      },
      columns: atomColumns,
      atoms,
    });
  }

  return {
    frameCount: frames.length,
    frames,
  };
}

function expectLine(lines, index, expected) {
  if (lines[index]?.trim() !== expected) {
    throw new Error(`Expected ${expected} at line ${index + 1}`);
  }
}

function parseInteger(value, label) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed)) {
    throw new Error(`Invalid ${label}: ${value}`);
  }
  return parsed;
}

function parseBounds(line, label) {
  const [lo, hi] = line.trim().split(/\s+/).map(Number);
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) {
    throw new Error(`Invalid ${label}: ${line}`);
  }
  return { lo, hi };
}

function parseAtom(columns, values) {
  const atom = {};
  columns.forEach((column, index) => {
    const raw = values[index];
    atom[column] = integerColumns.has(column) ? parseInteger(raw, column) : Number(raw);
    if (!Number.isFinite(atom[column])) {
      throw new Error(`Invalid atom ${column}: ${raw}`);
    }
  });
  if (!Number.isInteger(atom.id)) {
    throw new Error("LAMMPS dump atom rows must include integer id column");
  }
  return atom;
}

const integerColumns = new Set(["id", "type", "mol"]);
