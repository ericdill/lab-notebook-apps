import { DIAMETER, RADIUS } from "./cell-model.js";
import { forceToConfig } from "./forces.js";
import { runtimeSettings } from "./runtime.js";

export function formatNumber(value, digits = 2) {
  return Number.parseFloat(value.toFixed(digits)).toString();
}

export function normalizeDisabledParticles(disabledParticleIds, cell) {
  const validParticleIds = new Set(cell.particles.map((particle) => particle.id));
  return new Set(
    [...disabledParticleIds].filter((particleId) => validParticleIds.has(particleId))
  );
}

export function activeParticleIds(cell, disabledParticleIds) {
  return cell.particles
    .filter((particle) => !disabledParticleIds.has(particle.id))
    .map((particle) => particle.id);
}

export function buildSimulationConfig(state, cell) {
  const disabledParticleIds = normalizeDisabledParticles(state.disabledParticleIds, cell);
  const activeIds = activeParticleIds(cell, disabledParticleIds);
  const lammpsMarginDiameters = state.tightness / DIAMETER;
  const runtime = runtimeSettings(state);

  return {
    cell: {
      coordination_number: state.coordination,
      packing: cell.packing,
      confinement_shape: cell.confinementShape,
      edge_sphere_count: cell.edgeSphereCount,
      particle_radius: RADIUS,
      particle_diameter: DIAMETER,
      boundary_clearance_radius_units: state.tightness,
      equivalent_margin_diameter_units: Number(lammpsMarginDiameters.toFixed(6)),
      particle_count: cell.particles.length,
      active_particle_count: activeIds.length,
      disabled_particle_ids: [...disabledParticleIds].sort((a, b) => a - b),
      active_particle_ids: activeIds,
      dimensions_radius_units: Object.fromEntries(
        Object.entries(cell.dimensions).map(([key, value]) => [key, Number(value.toFixed(6))])
      ),
      confinement_boundary_vertices_radius_units: cell.confinementBoundary.map((point) => ({
        x: Number(point.x.toFixed(6)),
        y: Number(point.y.toFixed(6)),
      })),
      lammps_domain_vertices_radius_units: cell.lammpsDomain.map((point) => ({
        x: Number(point.x.toFixed(6)),
        y: Number(point.y.toFixed(6)),
      })),
    },
    runtime: {
      timestep: runtime.timestep,
      run_steps: runtime.runSteps,
      simulated_time: Number((runtime.timestep * runtime.runSteps).toFixed(8)),
      dump_every: runtime.dumpEvery,
      thermo_every: runtime.thermoEvery,
      expected_dump_frames: Math.floor(runtime.runSteps / runtime.dumpEvery) + 1,
    },
    driving_forces: state.forces.map(forceToConfig),
  };
}
