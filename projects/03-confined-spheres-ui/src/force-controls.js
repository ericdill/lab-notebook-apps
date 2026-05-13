import { forceColor } from "./forces.js";

export function renderForceControls(forceList, state, callbacks) {
  forceList.textContent = "";
  state.forces.forEach((force, index) => {
    const card = document.createElement("div");
    card.className = "force-card";
    card.dataset.forceId = String(force.id);

    const header = document.createElement("div");
    header.className = "force-card-header";
    const title = document.createElement("strong");
    title.textContent = `F${index + 1} sine force`;
    title.style.color = forceColor(index);
    header.append(title);

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "remove-force";
    remove.setAttribute("aria-label", `Remove force ${index + 1}`);
    remove.textContent = "x";
    remove.disabled = state.forces.length === 1;
    remove.addEventListener("click", () => callbacks.removeForce(force.id));
    header.append(remove);
    card.append(header);

    const grid = document.createElement("div");
    grid.className = "force-grid";
    grid.append(
      createForceField(force, "angleDeg", "Direction", "deg", -360, 360, 1, callbacks),
      createForceField(force, "amplitude", "Amplitude", "force", 0, 100, 0.1, callbacks),
      createForceField(force, "frequency", "Frequency", "cycles/time", 0, 100, 0.1, callbacks),
      createForceField(force, "phaseDeg", "Phase", "deg", -360, 360, 1, callbacks),
      createForceField(force, "rotationRateDeg", "Rotation rate", "deg/time", -360, 360, 1, callbacks)
    );
    card.append(grid);
    forceList.append(card);
  });
}

function createForceField(force, key, label, unit, min, max, step, callbacks) {
  const wrapper = document.createElement("div");
  wrapper.className = "mini-field";

  const fieldLabel = document.createElement("label");
  const inputId = `force-${force.id}-${key}`;
  fieldLabel.setAttribute("for", inputId);
  fieldLabel.textContent = `${label} (${unit})`;
  wrapper.append(fieldLabel);

  const input = document.createElement("input");
  input.id = inputId;
  input.type = "number";
  input.min = String(min);
  input.max = String(max);
  input.step = String(step);
  input.value = String(force[key]);
  input.addEventListener("input", (event) => {
    const parsed = Number.parseFloat(event.target.value);
    if (!Number.isFinite(parsed)) {
      return;
    }
    callbacks.updateForce(force.id, key, parsed);
  });
  wrapper.append(input);

  return wrapper;
}
