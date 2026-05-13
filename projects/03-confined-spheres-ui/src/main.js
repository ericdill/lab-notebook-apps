import { buildCell } from "./cell-model.js";
import { buildSimulationConfig, formatNumber, normalizeDisabledParticles } from "./config.js";
import { buildRunFiles, downloadTextFile } from "./export-files.js";
import { defaultForce } from "./forces.js";
import { renderForceControls } from "./force-controls.js";
import { drawCell, drawTrajectoryFrame } from "./render-canvas.js";
import { DEFAULT_RUNTIME, runtimeSettings } from "./runtime.js";
import { parseLammpsDump } from "./trajectory-parser.js";

const state = {
  coordination: 4,
  edgeCount: 6,
  tightness: 0.1,
  timestep: DEFAULT_RUNTIME.timestep,
  runSteps: DEFAULT_RUNTIME.runSteps,
  dumpEvery: DEFAULT_RUNTIME.dumpEvery,
  thermoEvery: DEFAULT_RUNTIME.thermoEvery,
  disabledParticleIds: new Set(),
  forces: [defaultForce(1)],
  viewMode: "setup",
  trajectory: null,
  trajectoryFrameIndex: 0,
  selectedAtomId: null,
};

let nextForceId = 2;
let playTimer = null;
let lastRender = {
  particles: [],
};

const els = {
  coordination: [...document.querySelectorAll('input[name="coordination"]')],
  coordinationLabel: document.getElementById("coordinationLabel"),
  edgeCount: document.getElementById("edgeCount"),
  edgeCountNumber: document.getElementById("edgeCountNumber"),
  edgeCountLabel: document.getElementById("edgeCountLabel"),
  edgeCountValue: document.getElementById("edgeCountValue"),
  edgeCountHint: document.getElementById("edgeCountHint"),
  tightness: document.getElementById("tightness"),
  tightnessNumber: document.getElementById("tightnessNumber"),
  tightnessValue: document.getElementById("tightnessValue"),
  particleCount: document.getElementById("particleCount"),
  nearestNeighbor: document.getElementById("nearestNeighbor"),
  cellWidth: document.getElementById("cellWidth"),
  cellHeight: document.getElementById("cellHeight"),
  addForce: document.getElementById("addForce"),
  forceList: document.getElementById("forceList"),
  timestep: document.getElementById("timestep"),
  runSteps: document.getElementById("runSteps"),
  dumpEvery: document.getElementById("dumpEvery"),
  thermoEvery: document.getElementById("thermoEvery"),
  runtimeSummary: document.getElementById("runtimeSummary"),
  trajectoryFile: document.getElementById("trajectoryFile"),
  viewMode: [...document.querySelectorAll('input[name="viewMode"]')],
  playTrajectory: document.getElementById("playTrajectory"),
  trajectoryFrame: document.getElementById("trajectoryFrame"),
  trajectoryStatus: document.getElementById("trajectoryStatus"),
  downloadConfig: document.getElementById("downloadConfig"),
  downloadData: document.getElementById("downloadData"),
  downloadInput: document.getElementById("downloadInput"),
  downloadReadme: document.getElementById("downloadReadme"),
  cellJson: document.getElementById("cellJson"),
  previewTitle: document.getElementById("previewTitle"),
  previewSubtitle: document.getElementById("previewSubtitle"),
  canvas: document.getElementById("previewCanvas"),
};

function updateUi(options = {}) {
  const cell = buildCell(state);
  state.disabledParticleIds = normalizeDisabledParticles(state.disabledParticleIds, cell);
  const config = buildSimulationConfig(state, cell);
  const label = state.coordination === 4 ? "Square confinement" : "Hexagonal confinement";
  const edgeText = state.coordination === 4
    ? `${state.edgeCount} spheres along each edge`
    : `${state.edgeCount} spheres per hex edge`;

  els.coordinationLabel.textContent = `CN = ${state.coordination}`;
  els.edgeCountLabel.textContent = state.coordination === 4
    ? "Spheres per square edge"
    : "Spheres per hex edge";
  els.edgeCountHint.textContent = state.coordination === 4
    ? "For CN=4 this creates a square n by n lattice."
    : "For CN=6 this builds a true triangular-lattice hexagon from n particles on each side.";
  els.edgeCount.value = String(Math.min(state.edgeCount, Number(els.edgeCount.max)));
  els.edgeCountNumber.value = String(state.edgeCount);
  els.edgeCountValue.textContent = String(state.edgeCount);
  els.tightness.value = String(Math.min(state.tightness, Number(els.tightness.max)));
  els.tightnessNumber.value = String(state.tightness);
  els.tightnessValue.textContent = `${formatNumber(state.tightness, 2)} r`;
  const runtime = runtimeSettings(state);
  els.timestep.value = String(runtime.timestep);
  els.runSteps.value = String(runtime.runSteps);
  els.dumpEvery.value = String(runtime.dumpEvery);
  els.thermoEvery.value = String(runtime.thermoEvery);
  const expectedFrames = Math.floor(runtime.runSteps / runtime.dumpEvery) + 1;
  els.runtimeSummary.textContent = `Simulated time ${formatNumber(runtime.timestep * runtime.runSteps, 4)}, about ${expectedFrames} trajectory frames.`;

  els.particleCount.textContent = String(config.cell.active_particle_count);
  els.nearestNeighbor.textContent = "2.00 r";
  els.cellWidth.textContent = `${formatNumber(cell.dimensions.width, 2)} r`;
  els.cellHeight.textContent = `${formatNumber(cell.dimensions.height, 2)} r`;
  updateTrajectoryControls();
  els.previewTitle.textContent = state.viewMode === "trajectory" && state.trajectory
    ? "Trajectory viewer"
    : label;
  els.previewSubtitle.textContent = trajectorySubtitle(edgeText);
  els.cellJson.textContent = JSON.stringify(config, null, 2);

  if (!options.preserveForceInputs) {
    renderForceControls(els.forceList, state, {
      removeForce,
      updateForce,
    });
  }
  if (state.viewMode === "trajectory" && state.trajectory) {
    const frame = state.trajectory.frames[state.trajectoryFrameIndex];
    lastRender = drawTrajectoryFrame(els.canvas, cell, frame, {
      selectedAtomId: state.selectedAtomId,
    });
  } else {
    lastRender = drawCell(els.canvas, cell, state);
  }
}

function setEdgeCount(value) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    return;
  }
  state.edgeCount = Math.max(2, Math.min(64, parsed));
  updateUi();
}

function setTightness(value) {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) {
    return;
  }
  state.tightness = Math.max(0, Math.min(10, parsed));
  updateUi();
}

function setTimestep(value) {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) {
    return;
  }
  state.timestep = Math.max(0.000001, parsed);
  updateUi();
}

function setRuntimeInteger(key, value) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed)) {
    return;
  }
  state[key] = Math.max(1, parsed);
  updateUi();
}

function toggleParticleAt(clientX, clientY) {
  const rect = els.canvas.getBoundingClientRect();
  const x = clientX - rect.left;
  const y = clientY - rect.top;
  let hit = null;
  for (const particle of lastRender.particles) {
    const distance = Math.hypot(x - particle.x, y - particle.y);
    if (distance <= particle.radius && (!hit || distance < hit.distance)) {
      hit = { ...particle, distance };
    }
  }
  if (!hit) {
    return;
  }
  if (state.viewMode === "trajectory" && state.trajectory) {
    state.selectedAtomId = state.selectedAtomId === hit.id ? null : hit.id;
    updateUi();
    return;
  }
  if (state.disabledParticleIds.has(hit.id)) {
    state.disabledParticleIds.delete(hit.id);
  } else {
    state.disabledParticleIds.add(hit.id);
  }
  updateUi();
}

function addForce() {
  state.forces.push(defaultForce(nextForceId));
  nextForceId += 1;
  updateUi();
}

function removeForce(forceId) {
  state.forces = state.forces.filter((candidate) => candidate.id !== forceId);
  updateUi();
}

function updateForce(forceId, key, value) {
  const force = state.forces.find((candidate) => candidate.id === forceId);
  if (!force) {
    return;
  }
  force[key] = value;
  updateUi({ preserveForceInputs: true });
}

function downloadRunFile(filename) {
  const cell = buildCell(state);
  state.disabledParticleIds = normalizeDisabledParticles(state.disabledParticleIds, cell);
  const file = buildRunFiles(state, cell).find((candidate) => candidate.filename === filename);
  if (!file) {
    return;
  }
  downloadTextFile(file);
}

async function importTrajectory(file) {
  if (!file) {
    return;
  }
  stopPlayback();
  const text = await file.text();
  state.trajectory = parseLammpsDump(text);
  state.trajectoryFrameIndex = 0;
  state.selectedAtomId = null;
  state.viewMode = "trajectory";
  syncViewModeInputs();
  updateUi();
}

function setTrajectoryFrame(value) {
  if (!state.trajectory) {
    return;
  }
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed)) {
    return;
  }
  state.trajectoryFrameIndex = Math.max(0, Math.min(state.trajectory.frames.length - 1, parsed));
  updateUi();
}

function togglePlayback() {
  if (!state.trajectory) {
    return;
  }
  if (playTimer) {
    stopPlayback();
    updateUi();
    return;
  }
  state.viewMode = "trajectory";
  syncViewModeInputs();
  playTimer = window.setInterval(() => {
    state.trajectoryFrameIndex = (state.trajectoryFrameIndex + 1) % state.trajectory.frames.length;
    updateUi();
  }, 250);
  updateUi();
}

function stopPlayback() {
  if (!playTimer) {
    return;
  }
  window.clearInterval(playTimer);
  playTimer = null;
}

function updateTrajectoryControls() {
  const hasTrajectory = Boolean(state.trajectory);
  els.playTrajectory.disabled = !hasTrajectory;
  els.playTrajectory.textContent = playTimer ? "Pause" : "Play";
  els.trajectoryFrame.disabled = !hasTrajectory;
  els.trajectoryFrame.max = hasTrajectory ? String(state.trajectory.frames.length - 1) : "0";
  els.trajectoryFrame.value = String(state.trajectoryFrameIndex);

  if (!hasTrajectory) {
    els.trajectoryStatus.textContent = "Import a LAMMPS dump to scrub frames.";
    return;
  }
  const frame = state.trajectory.frames[state.trajectoryFrameIndex];
  const selected = state.selectedAtomId ? `, selected atom ${state.selectedAtomId}` : "";
  els.trajectoryStatus.textContent = `${state.trajectory.frames.length} frames, timestep ${frame.timestep}, ${frame.atoms.length} atoms${selected}`;
}

function trajectorySubtitle(edgeText) {
  if (!(state.viewMode === "trajectory" && state.trajectory)) {
    return `${edgeText}, ${formatNumber(state.tightness, 2)} r clearance`;
  }
  const frame = state.trajectory.frames[state.trajectoryFrameIndex];
  const selected = state.selectedAtomId ? `, atom ${state.selectedAtomId}` : "";
  return `Frame ${state.trajectoryFrameIndex + 1}/${state.trajectory.frames.length}, timestep ${frame.timestep}${selected}`;
}

function syncViewModeInputs() {
  els.viewMode.forEach((input) => {
    input.checked = input.value === state.viewMode;
  });
}

els.coordination.forEach((input) => {
  input.addEventListener("change", () => {
    state.coordination = Number(input.value);
    updateUi();
  });
});

els.edgeCount.addEventListener("input", (event) => setEdgeCount(event.target.value));
els.edgeCountNumber.addEventListener("input", (event) => setEdgeCount(event.target.value));
els.tightness.addEventListener("input", (event) => setTightness(event.target.value));
els.tightnessNumber.addEventListener("input", (event) => setTightness(event.target.value));
els.timestep.addEventListener("input", (event) => setTimestep(event.target.value));
els.runSteps.addEventListener("input", (event) => setRuntimeInteger("runSteps", event.target.value));
els.dumpEvery.addEventListener("input", (event) => setRuntimeInteger("dumpEvery", event.target.value));
els.thermoEvery.addEventListener("input", (event) => setRuntimeInteger("thermoEvery", event.target.value));
els.canvas.addEventListener("click", (event) => {
  toggleParticleAt(event.clientX, event.clientY);
});
els.addForce.addEventListener("click", addForce);
els.trajectoryFile.addEventListener("change", (event) => {
  importTrajectory(event.target.files?.[0]).catch((error) => {
    stopPlayback();
    els.trajectoryStatus.textContent = `Could not parse trajectory: ${error.message}`;
  });
});
els.viewMode.forEach((input) => {
  input.addEventListener("change", () => {
    state.viewMode = input.value;
    stopPlayback();
    updateUi();
  });
});
els.trajectoryFrame.addEventListener("input", (event) => setTrajectoryFrame(event.target.value));
els.playTrajectory.addEventListener("click", togglePlayback);
els.downloadConfig.addEventListener("click", () => downloadRunFile("simulation.json"));
els.downloadData.addEventListener("click", () => downloadRunFile("particles.data"));
els.downloadInput.addEventListener("click", () => downloadRunFile("in.confined_spheres.lammps"));
els.downloadReadme.addEventListener("click", () => downloadRunFile("README.txt"));
window.addEventListener("resize", updateUi);

updateUi();
