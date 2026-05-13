# Confined Spheres UI Quickstart

Web app:

```text
https://ericdill.github.io/lab-notebook-apps/projects/03-confined-spheres-ui/
```

## 1. Build a Simulation

Open the web app and choose:

- packing shape: square CN=4 or hex CN=6
- spheres per edge
- box looseness
- driving force vectors
- runtime settings

Click particles in the preview to remove or restore them.

## 2. Export Files

Download these files into one directory:

- `simulation.json`
- `particles.data`
- `in.confined_spheres.lammps`
- `README.txt`

The browser may put them in `Downloads`; move them into a single run folder before running LAMMPS.

## 3. Install LAMMPS

Ubuntu/Debian:

```bash
sudo apt-get install lammps
```

macOS with Homebrew:

```bash
brew install lammps
```

Conda:

```bash
conda install lammps
```

## 4. Run LAMMPS

From the directory containing the exported files:

```bash
lmp -in in.confined_spheres.lammps
```

Some installs name the executable `lammps`:

```bash
lammps -in in.confined_spheres.lammps
```

The run should produce:

- `log.lammps`
- `dump.confined_spheres.lammpstrj`

## 5. View the Trajectory

Return to the web app, use the trajectory file picker, and choose:

```text
dump.confined_spheres.lammpstrj
```

Switch to `Analyze`, then scrub the frame slider or press Play.
