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
                    'AdditionalOptions': ['-std:c++17']
                }
            }
        }
    ],
    "includes": [
        "auto-top.gypi"
    ]
}
