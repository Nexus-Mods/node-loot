{
    "targets": [
        {
            "includes": [
                "auto.gypi"
            ],
            "sources": [
                "src/lootwrapper.cpp"
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
                    'AdditionalOptions': ['-std:c++17']
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
                ]
              }]
            ]
        }
    ],
    "includes": [
        "auto-top.gypi"
    ]
}
