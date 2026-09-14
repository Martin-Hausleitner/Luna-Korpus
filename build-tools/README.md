# Build tooling

The supported reproducible build is `python3 build.py` at the repository root. It uses Aster's unchanged standard-library builder and the committed source/assets. No npm or network is needed.

The scripts here record the original vendoring/assembly operation in a sibling-clone workspace. They are provenance, not a one-command update service. Use the commit and SHA-256 locks in app-mapping.json when refreshing upstream packages. The build-only JavaScript packager versions are pinned in package-lock.json.
