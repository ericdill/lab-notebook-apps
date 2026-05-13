export const DEFAULT_RUNTIME = {
  timestep: 0.001,
  runSteps: 50000,
  dumpEvery: 500,
  thermoEvery: 1000,
};

export function runtimeSettings(state) {
  return {
    timestep: positiveNumber(state.timestep, DEFAULT_RUNTIME.timestep),
    runSteps: positiveInteger(state.runSteps, DEFAULT_RUNTIME.runSteps),
    dumpEvery: positiveInteger(state.dumpEvery, DEFAULT_RUNTIME.dumpEvery),
    thermoEvery: positiveInteger(state.thermoEvery, DEFAULT_RUNTIME.thermoEvery),
  };
}

function positiveNumber(value, fallback) {
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function positiveInteger(value, fallback) {
  return Number.isInteger(value) && value > 0 ? value : fallback;
}
