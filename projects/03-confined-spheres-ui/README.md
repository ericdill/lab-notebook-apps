# Confined Spheres UI

Static browser UI for designing a confined hard-sphere LAMMPS setup.

## Web App

After the GitHub Pages workflow has run on `main`, the app should be available at:

```text
https://ericdill.github.io/lab-notebook-apps/projects/03-confined-spheres-ui/
```

Jim-facing instructions live in [JIM_QUICKSTART.md](./JIM_QUICKSTART.md).

## Current Export Flow

The app downloads separate files through the browser:

- `simulation.json`
- `particles.data`
- `in.confined_spheres.lammps`
- `README.txt`

Those files land in the browser's normal download directory, usually `~/Downloads`.

## Installing LAMMPS

Use the package manager that matches the machine that will run the simulation.

Ubuntu/Debian:

```bash
sudo apt-get install lammps
```

macOS with Homebrew:

```bash
brew install lammps
```

Conda environment:

```bash
conda install lammps
```

After exporting the files into one directory, run:

```bash
lmp -in in.confined_spheres.lammps
```

Some installs name the executable `lammps` instead of `lmp`:

```bash
lammps -in in.confined_spheres.lammps
```

## Next Steps

1. Add a single run-bundle download so the exported files stay together instead of landing as separate browser downloads.
2. Split Build and Analyze into more explicit app tabs as analysis features grow.

## Trajectory Visualization Plan

Use the exported LAMMPS dump as the next major validation surface.

1. Add trajectory import.
   - Drag/drop or file picker for `dump.confined_spheres.lammpstrj`.
   - Parse LAMMPS custom dump frames: timestep, atom count, box bounds, and atom rows.
   - Store frames in memory as `{ timestep, atoms: [{ id, type, x, y, z, vx, vy, vz }] }`.

2. Add a movie viewer.
   - Reuse the existing canvas.
   - Add a mode toggle for setup vs trajectory view.
   - Add a frame/time slider and play/pause control.
   - Draw particles from the selected frame.
   - Overlay the exported confinement boundary when `simulation.json` is available.

3. Add linked metrics.
   - Current timestep updates all visible views.
   - Show timestep, frame index, atom count, and simulated time when known.
   - Support clicking a particle to select its atom ID.

4. Add analysis panels after the movie viewer works.
   - Position histogram over all frames.
   - RDF for the current frame.
   - RDF averaged across frames.
   - Selected-particle position trace and histogram.
   - Selected-particle nearest-neighbor distance over time.

Suggested implementation files:

- `src/trajectory-parser.js`
- `src/trajectory-viewer.js`
- `src/trajectory-controls.js`
- `tests/trajectory-parser.test.js`

Parser validation should start with a tiny two-frame dump fixture with known coordinates before connecting the parser to the UI.

## Local Checks

```bash
mise exec node -- node --test
```
