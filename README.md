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

