{
  description = "node-loot linux build shell";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs = { self, nixpkgs }: let
    system = "x86_64-linux";
    pkgs = import nixpkgs { inherit system; };
  in {
    devShells.${system}.default = pkgs.mkShell {
      packages = with pkgs; [
        nodejs_24
        yarn
        python3
        gnumake
        gcc
        pkg-config
        patchelf
      ];

      shellHook = ''
        export CC=${pkgs.gcc}/bin/gcc
        export CXX=${pkgs.gcc}/bin/g++
        # Only add project-local lib dir; avoid overriding libstdc++ for node itself.
        export LD_LIBRARY_PATH="$PWD/loot_api''${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"
      '';
    };
  };
}
