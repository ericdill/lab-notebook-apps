export function degreesToRadians(degrees) {
  return degrees * Math.PI / 180;
}

export function forceVector(force) {
  const angle = degreesToRadians(force.angleDeg);
  return {
    x: Math.cos(angle),
    y: Math.sin(angle),
  };
}

export function forceToConfig(force) {
  const direction = forceVector(force);
  return {
    id: force.id,
    function: force.kind,
    amplitude: Number(force.amplitude),
    frequency: Number(force.frequency),
    phase_degrees: Number(force.phaseDeg),
    direction_degrees: Number(force.angleDeg),
    direction_vector: {
      x: Number(direction.x.toFixed(6)),
      y: Number(direction.y.toFixed(6)),
    },
    rotation_rate_degrees_per_time: Number(force.rotationRateDeg),
  };
}

export function forceColor(index) {
  const colors = ["#b64b2a", "#4c6fb6", "#7a5aa6", "#b2841d", "#2d7b45", "#a83e75"];
  return colors[index % colors.length];
}

export function defaultForce(id) {
  return {
    id,
    kind: "sine",
    angleDeg: 0,
    amplitude: 1,
    frequency: 1,
    phaseDeg: 0,
    rotationRateDeg: 0,
  };
}
