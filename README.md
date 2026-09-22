# LOOT

node.js bindings for LOOT, the Load Order Optimisation Tool for Oblivion, Skyrim, Skyrim SE, Fallout 3, Fallout: New Vegas and Fallout 4
See https://github.com/loot/loot for LOOT itself

# Caveats

This doesn't support the entire API and the API has been changed in a few places to fit better in a node.js environment.
For easier distribution, this includes libloot in binary form (see loot_api/readme.txt).

# Async

There is support for running commands asynchronously. The was this is implemented is unusual though: When instantiating an
"asynchronous" LOOT instance, a second process is created. The LOOT instance in the initial process acts as a proxy, relaying instructions
to the second process where they will be queued and processed in sequence.

# Keeping this module up to date

[1] Run the "vendor libloot" workflow from the Actions tab with the libloot release version. It replaces the Windows binaries and headers in loot_api with the official release, builds and strips the Linux library from the same tag (LOOT publishes no Linux binary), increments this module's version and pushes a `vendor/libloot-<version>` branch. Open the pull request from the link in the run's summary; one the workflow opened itself would start no CI run.

[2] On that pull request, go through https://loot-api.readthedocs.io/en/latest/api/changelog.html for each release since the previous version and check src/lootwrapper.cpp against any API change: renamed or removed functions, changed parameters. The wrapper function names match the API functions unless renamed. CI builds and tests the addon on Windows and Linux against the new library.

[3] Merge once CI is green.

For Vortex: pin `loot` in pnpm-workspace.yaml (the catalog entry and the built-dependencies entry) to the merge commit, run `pnpm install`, and test the plugin list, plugin details and sorting on a development build before opening the Vortex pull request.
