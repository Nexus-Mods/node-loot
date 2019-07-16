{
    "targets": [
        {
            "includes": [
                "auto.gypi"
            ],
            "sources": [
                "src/lootwrapper.cpp",
                "src/lootwrapper.h",
                "src/exceptions.cpp",
                "src/exceptions.h",
                "src/string_cast.cpp",
                "src/string_cast.h"
            ],
            "include_dirs": [
                "./loot_api/include"
            ],
            "libraries": [
                "-l../loot_api/loot"
            ],
            'cflags!': ['-fno-exceptions'],
            'cflags_cc!': ['-fno-exceptions'],
            'msbuild_settings': {
                "ClCompile": {
                    "ExceptionHandling": 1,
                    'AdditionalOptions': ['-std:c++17', '/Ob2', '/Oi', '/Ot', '/Oy', '/GL', '/GF', '/Gy', '/MT']
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
                  'VCCLCompilerTool': {
                    'ExceptionHandling': 1,
                    'RuntimeLibrary': 0
                  },
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
