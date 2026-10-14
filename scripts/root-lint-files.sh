#!/usr/bin/env bash
# Lists the lintable files no workspace package owns: top-level configuration
# and dot-directories. Each package lints its own directory through turbo.

set -euo pipefail

git ls-files -- ':(glob)*' ':(glob).*/**' | while IFS= read -r file; do
	case ${file} in
		*.ts | *.tsx | *.mts | *.cts | *.js | *.jsx | *.mjs | *.cjs | *.json | *.jsonc | *.css)
			printf '%s\n' "${file}"
			;;
		*) ;;
	esac
done
