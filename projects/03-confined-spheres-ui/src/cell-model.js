export const RADIUS = 1;
export const DIAMETER = 2 * RADIUS;
export const SQRT3 = Math.sqrt(3);

export function buildCell(state) {
  const clearance = state.tightness * RADIUS;
  if (state.coordination === 4) {
    return buildSquareCell(state.edgeCount, clearance);
  }
  return buildHexCell(state.edgeCount, clearance);
}

export function buildSquareCell(edgeCount, clearance) {
  const particles = [];
  const width = 2 * clearance + edgeCount * DIAMETER;
  const height = 2 * clearance + edgeCount * DIAMETER;

  for (let row = 0; row < edgeCount; row += 1) {
    for (let col = 0; col < edgeCount; col += 1) {
      particles.push({
        id: particles.length + 1,
        x: clearance + RADIUS + col * DIAMETER,
        y: clearance + RADIUS + row * DIAMETER,
      });
    }
  }

  const boundary = [
    { x: 0, y: 0 },
    { x: width, y: 0 },
    { x: width, y: height },
    { x: 0, y: height },
  ];

  return {
    kind: "square",
    packing: "square",
    confinementShape: "square",
    coordinationNumber: 4,
    edgeSphereCount: edgeCount,
    nx: edgeCount,
    ny: edgeCount,
    particles,
    confinementBoundary: boundary,
    lammpsDomain: boundary,
    dimensions: { width, height },
  };
}

export function buildHexCell(edgeCount, clearance) {
  const particles = [];
  const sideShell = edgeCount - 1;
  const latticeSize = DIAMETER / SQRT3;

  for (let q = -sideShell; q <= sideShell; q += 1) {
    for (let r = -sideShell; r <= sideShell; r += 1) {
      const s = -q - r;
      if (Math.max(Math.abs(q), Math.abs(r), Math.abs(s)) > sideShell) {
        continue;
      }
      particles.push({
        id: particles.length + 1,
        q,
        r,
        x: SQRT3 * latticeSize * (q + r / 2),
        y: 1.5 * latticeSize * r,
      });
    }
  }

  const normals = [
    { x: SQRT3 / 2, y: 0.5 },
    { x: 0, y: 1 },
    { x: -SQRT3 / 2, y: 0.5 },
    { x: -SQRT3 / 2, y: -0.5 },
    { x: 0, y: -1 },
    { x: SQRT3 / 2, y: -0.5 },
  ];
  const apothem = Math.max(
    ...normals.map((normal) =>
      Math.max(...particles.map((p) => p.x * normal.x + p.y * normal.y))
    )
  ) + RADIUS + clearance;
  const circumradius = (2 * apothem) / SQRT3;
  const confinementBoundary = Array.from({ length: 6 }, (_, index) => {
    const angle = index * Math.PI / 3;
    return {
      x: circumradius * Math.cos(angle),
      y: circumradius * Math.sin(angle),
    };
  });
  const domainXs = confinementBoundary.map((point) => point.x);
  const domainYs = confinementBoundary.map((point) => point.y);
  const xlo = Math.min(...domainXs);
  const xhi = Math.max(...domainXs);
  const ylo = Math.min(...domainYs);
  const yhi = Math.max(...domainYs);
  const lammpsDomain = [
    { x: xlo, y: ylo },
    { x: xhi, y: ylo },
    { x: xhi, y: yhi },
    { x: xlo, y: yhi },
  ];

  return {
    kind: "hexagonal-confinement",
    packing: "hex",
    confinementShape: "hexagon",
    coordinationNumber: 6,
    edgeSphereCount: edgeCount,
    particles,
    confinementBoundary,
    lammpsDomain,
    dimensions: {
      width: xhi - xlo,
      height: yhi - ylo,
      confinement_apothem: apothem,
    },
  };
}

export function getBounds(cell) {
  const xs = [
    ...cell.lammpsDomain.map((p) => p.x),
    ...cell.confinementBoundary.map((p) => p.x),
    ...cell.particles.map((p) => p.x - RADIUS),
    ...cell.particles.map((p) => p.x + RADIUS),
  ];
  const ys = [
    ...cell.lammpsDomain.map((p) => p.y),
    ...cell.confinementBoundary.map((p) => p.y),
    ...cell.particles.map((p) => p.y - RADIUS),
    ...cell.particles.map((p) => p.y + RADIUS),
  ];
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
  };
}

export function particleCentroid(particles) {
  return particles.reduce(
    (accumulator, particle) => ({
      x: accumulator.x + particle.x / particles.length,
      y: accumulator.y + particle.y / particles.length,
    }),
    { x: 0, y: 0 }
  );
}
