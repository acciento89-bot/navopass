#!/bin/sh
set -eu
cd "$(dirname "$0")/../.."
out="${TMPDIR:-/tmp}/navopass-text-tests-$$"
trap 'rm -f "$out"' EXIT
swiftc -parse-as-library ios/NavoPass/ServiceDraft.swift tests/service-drafts/text-safety.swift -o "$out"
"$out"
