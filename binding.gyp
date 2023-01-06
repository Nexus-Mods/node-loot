{
    "targets": [
        {
          "target_name": "node-loot",
            "sources": [
                "src/lootwrapper.cpp",
                "src/lootwrapper.h",
                "src/exceptions.cpp",
                "src/exceptions.h",
                "src/string_cast.cpp",
                "src/string_cast.h",
                "src/napi_helpers.cpp",
                "src/napi_helpers.h",
                "src/util.cpp",
                "src/util.h"
            ],
            "include_dirs": [
                "./libloot/include",
                "<!(node -p \"require('node-addon-api').include_dir\")"
            ],
            'cflags!': ['-fno-exceptions', '-g', '-O0'],
            'cflags_cc': [ '-std=c++17' ],
            'cflags_cc!': ['-fno-exceptions' ],
            'msvs_settings': {
              'VCCLCompilerTool': {
                'ExceptionHandling': 1,
                'RuntimeLibrary': 2,
                'Optimization': 0
              },
            },
            'msbuild_settings': {
                "ClCompile": {
                    'AdditionalOptions': ['-std:c++17', '/Ob2', '/Oi', '/Ot', '/Oy', '/GL', '/GF', '/Gy']
                }
            },
            "conditions": [
              ["OS=='win'", {
                "defines!": [
                  "_HAS_EXCEPTIONS=0"
                ],
                "defines": [
                  "_HAS_EXCEPTIONS=1",
                  "WINVER=0x600"
                ],
                "libraries": [
                  "-l../libloot/loot"
                  "-DelayLoad:node.exe",
                ],
                'msvs_settings': {
                  "VCLibrarianTool": {
                    'AdditionalOptions': [ '/LTCG' ]
                  },
                  'VCLinkerTool': {
                    'LinkTimeCodeGeneration': 1
                  }
                }
              }],
              ["OS!='win'", {
                "libraries": [
                  "../libloot/libloot.so"
                ]
              }]
            ]
        }
    ]
}
