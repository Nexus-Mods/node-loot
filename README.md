# LOOT

node.js bindings for LOOT, the Load Order Optimisation Tool for Oblivion, Skyrim, Skyrim SE, Fallout 3, Fallout: New Vegas and Fallout 4
See https://github.com/loot/loot for LOOT itself

# Caveats

This doesn't support the entire API and the API has been changed in a few places to fit better in a node.js environment.
For easier distribution, this currently includes build artifacts (.dll and .lib as well as headers) for loot-api.

# Async

There is support for running commands asynchronously. The was this is implemented is unusual though: When instantiating an
"asynchronous" LOOT instance, a second process is created. The LOOT instance in the initial process acts as a proxy, relaying instructions
to the second process where they will be queued and processed in sequence.

# Keeping this module up to date

The following procedure should be followed to ensure a smooth transition to a new version of the LOOT API.

[1] Create a new branch based on the current master/main and clone it locally.
[2] Download the latest 64bit API release from https://github.com/loot/libloot/releases and replace the contents of the loot_api folder with the contents of the new release.
[3] Go to https://loot-api.readthedocs.io/en/latest/api/changelog.html#id1 and go through the changelog of each incremental API release to see what changed.
[4] Go to src/lootwrapper.cpp and verify whether any of the changed API functionality could potentially affect the module's wrapper. The wrapper function names will match the API functions (unless renamed) Things like changed function parameters, newly added/renamed functions should be reflected in the lootwrapper.cpp file as required. It's usually safe to assume that the return values will not change as LOOT is quite robust at this point and is widely used by Vortex and other applications.
[5] Increment the version of this module in the package.json file.
[6] Commit your changes to your new branch.

The below steps are only valid for Vortex. Please make sure you have a functioning development build of the source code.
[7] Open the package.json file in the gamebryo-plugin-management extension and change the loot dependency from `"loot": "Nexus-Mods/node-loot"` to `"loot": "Nexus-Mods/node-loot#YOUR_BRANCH",` (obviously change the Nexus-Mods/node-loot part if your repo is located somewhere else)
[8] Run `yarn install` to ensure the package manager pulls your updated loot module and `yarn build`.
[9] Run your Vortex development build and test all relevant functionality depending on the changes made to the LOOT API as noted in the changelogs.
