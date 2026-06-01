{
  pkgs ? import <nixpkgs> { },
}:

pkgs.mkShell {
  packages = with pkgs; [
    # runtime
    bun
    nodejs_24 # for packages that depend on node internals

    # supabase cli for connecting to and managing supabase projects
    supabase-cli

    # formatters
    treefmt
    nixfmt
    prettier

    # git hooks
    lefthook
  ];

  shellHook = ''
    # install hooks only when inside a git repo (skips CI and bare clones)
    [ -d .git ] && lefthook install
  '';
}
