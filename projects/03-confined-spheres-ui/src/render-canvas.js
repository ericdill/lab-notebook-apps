import { getBounds, particleCentroid, RADIUS } from "./cell-model.js";
import { forceColor, forceVector } from "./forces.js";

export function drawCell(canvas, cell, state) {
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, Math.floor(rect.width * dpr));
  canvas.height = Math.max(1, Math.floor(rect.height * dpr));

  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, rect.width, rect.height);

  const bounds = getBounds(cell);
  const spanX = bounds.maxX - bounds.minX;
  const spanY = bounds.maxY - bounds.minY;
  const margin = 44;
  const scale = Math.min(
    (rect.width - 2 * margin) / spanX,
    (rect.height - 2 * margin) / spanY
  );
  const offsetX = rect.width / 2 - scale * (bounds.minX + spanX / 2);
  const offsetY = rect.height / 2 + scale * (bounds.minY + spanY / 2);

  const project = (point) => ({
    x: offsetX + point.x * scale,
    y: offsetY - point.y * scale,
  });

  drawPolygon(ctx, cell.lammpsDomain, project, {
    fillStyle: "rgba(216, 224, 228, 0.28)",
    strokeStyle: "rgba(95, 111, 122, 0.48)",
    lineWidth: 1,
    lineDash: [6, 5],
  });
  drawPolygon(ctx, cell.confinementBoundary, project, {
    fillStyle: "rgba(30, 127, 116, 0.10)",
    strokeStyle: "#1e7f74",
    lineWidth: 2,
    lineDash: [],
  });

  const hitRegions = drawParticles(ctx, cell, state, project, scale);
  drawParticleCenters(ctx, cell, state, project, scale);
  drawForceVectors(ctx, cell, state, project, bounds, scale);

  return { particles: hitRegions };
}

export function drawTrajectoryFrame(canvas, cell, frame, options = {}) {
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, Math.floor(rect.width * dpr));
  canvas.height = Math.max(1, Math.floor(rect.height * dpr));

  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, rect.width, rect.height);

  const bounds = trajectoryBounds(cell, frame);
  const spanX = bounds.maxX - bounds.minX;
  const spanY = bounds.maxY - bounds.minY;
  const margin = 44;
  const scale = Math.min(
    (rect.width - 2 * margin) / spanX,
    (rect.height - 2 * margin) / spanY
  );
  const offsetX = rect.width / 2 - scale * (bounds.minX + spanX / 2);
  const offsetY = rect.height / 2 + scale * (bounds.minY + spanY / 2);

  const project = (point) => ({
    x: offsetX + point.x * scale,
    y: offsetY - point.y * scale,
  });

  const lammpsDomain = [
    { x: frame.bounds.xlo, y: frame.bounds.ylo },
    { x: frame.bounds.xhi, y: frame.bounds.ylo },
    { x: frame.bounds.xhi, y: frame.bounds.yhi },
    { x: frame.bounds.xlo, y: frame.bounds.yhi },
  ];
  drawPolygon(ctx, lammpsDomain, project, {
    fillStyle: "rgba(216, 224, 228, 0.18)",
    strokeStyle: "rgba(95, 111, 122, 0.48)",
    lineWidth: 1,
    lineDash: [6, 5],
  });
  if (cell?.confinementBoundary) {
    drawPolygon(ctx, cell.confinementBoundary, project, {
      fillStyle: "rgba(30, 127, 116, 0.06)",
      strokeStyle: "#1e7f74",
      lineWidth: 2,
      lineDash: [],
    });
  }

  const hitRegions = [];
  ctx.save();
  ctx.strokeStyle = "rgba(95, 111, 122, 0.34)";
  ctx.lineWidth = 1;
  for (const atom of frame.atoms) {
    const p = project(atom);
    const radiusPx = RADIUS * scale;
    const selected = options.selectedAtomId === atom.id;
    hitRegions.push({
      id: atom.id,
      x: p.x,
      y: p.y,
      radius: radiusPx,
    });
    ctx.beginPath();
    ctx.arc(p.x, p.y, radiusPx, 0, 2 * Math.PI);
    ctx.fillStyle = selected ? "#fff4c2" : "#ffffff";
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = selected ? "#b2841d" : "#172026";
    ctx.beginPath();
    ctx.arc(p.x, p.y, Math.max(2.2, 0.055 * scale), 0, 2 * Math.PI);
    ctx.fill();
  }
  ctx.restore();

  return { particles: hitRegions };
}

function trajectoryBounds(cell, frame) {
  const xs = [
    frame.bounds.xlo,
    frame.bounds.xhi,
    ...frame.atoms.map((atom) => atom.x - RADIUS),
    ...frame.atoms.map((atom) => atom.x + RADIUS),
  ];
  const ys = [
    frame.bounds.ylo,
    frame.bounds.yhi,
    ...frame.atoms.map((atom) => atom.y - RADIUS),
    ...frame.atoms.map((atom) => atom.y + RADIUS),
  ];
  if (cell?.confinementBoundary) {
    xs.push(...cell.confinementBoundary.map((point) => point.x));
    ys.push(...cell.confinementBoundary.map((point) => point.y));
  }
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
  };
}

function drawPolygon(ctx, points, project, style) {
  ctx.save();
  ctx.lineJoin = "round";
  ctx.beginPath();
  points.forEach((point, index) => {
    const p = project(point);
    if (index === 0) {
      ctx.moveTo(p.x, p.y);
    } else {
      ctx.lineTo(p.x, p.y);
    }
  });
  ctx.closePath();
  ctx.fillStyle = style.fillStyle;
  ctx.strokeStyle = style.strokeStyle;
  ctx.lineWidth = style.lineWidth;
  ctx.setLineDash(style.lineDash);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawParticles(ctx, cell, state, project, scale) {
  const hitRegions = [];

  ctx.save();
  ctx.strokeStyle = "rgba(95, 111, 122, 0.26)";
  ctx.lineWidth = 1;
  for (const particle of cell.particles) {
    const p = project(particle);
    const radiusPx = RADIUS * scale;
    const disabled = state.disabledParticleIds.has(particle.id);
    hitRegions.push({
      id: particle.id,
      x: p.x,
      y: p.y,
      radius: radiusPx,
    });
    ctx.beginPath();
    ctx.arc(p.x, p.y, radiusPx, 0, 2 * Math.PI);
    ctx.fillStyle = disabled ? "rgba(214, 222, 226, 0.62)" : "#ffffff";
    ctx.fill();
    ctx.stroke();
    if (disabled) {
      drawDisabledMark(ctx, p, radiusPx);
    }
  }
  ctx.restore();

  return hitRegions;
}

function drawDisabledMark(ctx, point, radiusPx) {
  ctx.save();
  ctx.strokeStyle = "rgba(95, 111, 122, 0.62)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(point.x - radiusPx * 0.45, point.y - radiusPx * 0.45);
  ctx.lineTo(point.x + radiusPx * 0.45, point.y + radiusPx * 0.45);
  ctx.moveTo(point.x + radiusPx * 0.45, point.y - radiusPx * 0.45);
  ctx.lineTo(point.x - radiusPx * 0.45, point.y + radiusPx * 0.45);
  ctx.stroke();
  ctx.restore();
}

function drawParticleCenters(ctx, cell, state, project, scale) {
  ctx.save();
  ctx.fillStyle = "#172026";
  for (const particle of cell.particles) {
    if (state.disabledParticleIds.has(particle.id)) {
      continue;
    }
    const p = project(particle);
    ctx.beginPath();
    ctx.arc(p.x, p.y, Math.max(2.2, 0.055 * scale), 0, 2 * Math.PI);
    ctx.fill();
  }
  ctx.restore();
}

function drawForceVectors(ctx, cell, state, project, bounds, scale) {
  if (state.forces.length === 0) {
    return;
  }

  const center = project(particleCentroid(cell.particles));
  const maxAmplitude = Math.max(...state.forces.map((force) => Math.abs(force.amplitude)), 1);
  const span = Math.min(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY);
  const baseLength = 0.18 * span * scale;

  ctx.save();
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.font = "12px ui-sans-serif, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  state.forces.forEach((force, index) => {
    const direction = forceVector(force);
    const length = baseLength * (0.45 + 0.55 * Math.abs(force.amplitude) / maxAmplitude);
    const start = {
      x: center.x,
      y: center.y,
    };
    const end = {
      x: center.x + direction.x * length,
      y: center.y - direction.y * length,
    };
    const arrowAngle = Math.atan2(end.y - start.y, end.x - start.x);
    const color = forceColor(index);

    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(end.x, end.y);
    ctx.lineTo(
      end.x - 12 * Math.cos(arrowAngle - Math.PI / 7),
      end.y - 12 * Math.sin(arrowAngle - Math.PI / 7)
    );
    ctx.lineTo(
      end.x - 12 * Math.cos(arrowAngle + Math.PI / 7),
      end.y - 12 * Math.sin(arrowAngle + Math.PI / 7)
    );
    ctx.closePath();
    ctx.fill();

    ctx.fillText(`F${index + 1}`, end.x + 16 * Math.cos(arrowAngle), end.y + 16 * Math.sin(arrowAngle));
  });

  ctx.fillStyle = "#172026";
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(center.x, center.y, 4.5, 0, 2 * Math.PI);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}
