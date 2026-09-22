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
                "src/napi_helpers.cpp",
                "src/napi_helpers.h",
                "src/util.cpp",
                "src/util.h"
            ],
            "include_dirs": [
                "./loot_api/include",
                "<!(node -p \"require('node-addon-api').include_dir\")"
            ],
            'cflags!': ['-fno-exceptions', '-g', '-O0'],
            'cflags_cc!': ['-fno-exceptions'],
            'msvs_settings': {
              'VCCLCompilerTool': {
                'ExceptionHandling': 1,
                'RuntimeLibrary': 2,
                'Optimization': 0,
                'AdditionalOptions': ['/std:c++20', '/Zc:__cplusplus']
              },
            },
            'msbuild_settings': {
                "ClCompile": {
                    'AdditionalOptions': ['/std:c++20', '/Zc:__cplusplus', '/Ob2', '/Oi', '/Ot', '/Oy', '/GL', '/GF', '/Gy']
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
                  "-l../loot_api/libloot",
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
              ["OS=='linux'", {
                "cflags_cc": [
                  "-std=c++20"
                ],
                "ldflags": [
                  "-Wl,-rpath,\\$$ORIGIN:\\$$ORIGIN/../../loot_api"
                ],
                "libraries": [
                  "-L../loot_api",
                  "-l:libloot.so.0"
                ]
              }]
            ]
        }
    ],
    "includes": [
        "auto-top.gypi"
    ]
}
