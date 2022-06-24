{
    "targets": [
        {
          "target_name": "node-loot",
            "includes": [
                "auto.gypi"
            ],
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
                "./loot_api/include",
                "<!(node -p \"require('node-addon-api').include_dir\")"
            ],
            "libraries": [
                "-l../loot_api/loot"
            ],
            'cflags!': ['-fno-exceptions', '-g', '-O0'],
            'cflags_cc!': ['-fno-exceptions'],
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
              }]
            ]
        }
    ],
    "includes": [
        "auto-top.gypi"
    ]
}
