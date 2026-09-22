LOOT is being developed by "Ortham" at https://github.com/loot/libloot under the GPLv3.

This directory holds libloot in binary form to simplify the build process.

libloot.dll, libloot.lib, libloot.pdb and include/ are an unmodified copy of the official Windows
release of the version named in include/loot/loot_version.h.

libloot.so.0 is the same version's C++ wrapper built from source by the "vendor libloot" workflow
on ubuntu-22.04 (glibc 2.34, GLIBCXX 3.4.29) and stripped, since LOOT publishes no Linux binary.
