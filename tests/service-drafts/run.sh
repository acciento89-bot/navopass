#!/bin/sh
set -eu
cd "$(dirname "$0")/../.."
out="${TMPDIR:-/tmp}/navopass-service-drafts-$$"
trap 'rm -f "$out"' EXIT
swiftc ios/NavoPass/ServiceDraft.swift ios/NavoPass/ServiceDraftArchive.swift tests/service-drafts/main.swift -o "$out"
"$out"
