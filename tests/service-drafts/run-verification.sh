#!/bin/sh
set -eu
cd "$(dirname "$0")/../.."
out="${TMPDIR:-/tmp}/navopass-session-adapter-$$"
trap 'rm -f "$out"' EXIT
swiftc -parse-as-library ios/NavoPass/ServiceDraft.swift ios/NavoPass/ServiceDraftArchive.swift ios/NavoPass/ServiceDraftCoordinator.swift ios/NavoPass/ServiceDraftSessionAdapter.swift tests/service-drafts/verification-tests.swift -o "$out"
"$out"
