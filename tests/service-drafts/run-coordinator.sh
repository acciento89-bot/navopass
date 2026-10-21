#!/bin/sh
set -eu
cd "$(dirname "$0")/../.."
out="${TMPDIR:-/tmp}/navopass-coordinator-tests-$$"
trap 'rm -f "$out"' EXIT
swiftc -parse-as-library ios/NavoPass/ServiceDraft.swift ios/NavoPass/ServiceDraftArchive.swift ios/NavoPass/ServiceDraftCoordinator.swift tests/service-drafts/coordinator-tests.swift -o "$out"
"$out"
