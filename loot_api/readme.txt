LOOT is being developed by "Ortham" at https://github.com/loot/libloot under the GPLv3.

This directory holds libloot in binary form to simplify the build process. include/ is shared by
all platforms; the libraries are in one directory per architecture, named as node names it
(process.arch, which binding.gyp sees as target_arch).

All of it is built by the "vendor libloot" workflow from the sources of the version named in
include/loot/loot_version.h:

- include/ is that tag's cpp/include, unmodified.
- x64/libloot.dll, x64/libloot.lib, arm64/libloot.dll and arm64/libloot.lib are its C++ wrapper,
  built by .github/actions/build-libloot-windows.
- x64/libloot.so.0 is its C++ wrapper, built on ubuntu-22.04 (glibc 2.34, GLIBCXX 3.4.29) and
  stripped by .github/actions/build-libloot.
