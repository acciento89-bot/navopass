#!/bin/bash
# Root-owned pure Kotlin/JUnit execution only; no Gradle, Android or native process.
set -euo pipefail
cd -- "$(dirname -- "$0")/.."
if [ "$#" -ne 2 ]; then echo 'Usage: bash scripts/run-service-draft-core-tests.sh /absolute/java /external/result.jar' >&2; exit 2; fi
draft_java="$1"
draft_output="$2"
test -x "$draft_java"
draft_cache='/Volumes/SSK SSD/Kamilunavo/Cache/Gradle/caches/modules-2/files-2.1'
draft_jar() {
  local matches=( "$draft_cache/$1/$2/$3/"*"/$2-$3.jar" )
  if [ "${#matches[@]}" -ne 1 ] || [ ! -f "${matches[0]}" ]; then echo "Missing or ambiguous cached dependency $1:$2:$3" >&2; return 2; fi
  printf '%s' "${matches[0]}"
}
draft_compiler="$(draft_jar org.jetbrains.kotlin kotlin-compiler-embeddable 2.3.21)"
draft_stdlib="$(draft_jar org.jetbrains.kotlin kotlin-stdlib 2.3.21)"
draft_script="$(draft_jar org.jetbrains.kotlin kotlin-script-runtime 2.3.21)"
draft_reflect="$(draft_jar org.jetbrains.kotlin kotlin-reflect 1.6.10)"
draft_daemon="$(draft_jar org.jetbrains.kotlin kotlin-daemon-embeddable 2.3.21)"
draft_coroutines="$(draft_jar org.jetbrains.kotlinx kotlinx-coroutines-core-jvm 1.8.0)"
draft_trove="$(draft_jar org.jetbrains.intellij.deps trove4j 1.0.20200330)"
draft_annotations="$(draft_jar org.jetbrains annotations 13.0)"
draft_junit="$(draft_jar junit junit 4.13.2)"
draft_hamcrest="$(draft_jar org.hamcrest hamcrest-core 1.3)"
draft_json="$(draft_jar org.json json 20240303)"
draft_compiler_cp="$draft_compiler:$draft_stdlib:$draft_script:$draft_reflect:$draft_daemon:$draft_coroutines:$draft_trove:$draft_annotations"
draft_test_cp="$draft_stdlib:$draft_annotations:$draft_junit:$draft_hamcrest:$draft_json"
"$draft_java" -Xmx384m -XX:MaxMetaspaceSize=192m -XX:+UseSerialGC -cp "$draft_compiler_cp" org.jetbrains.kotlin.cli.jvm.K2JVMCompiler \
  -no-stdlib -no-reflect -jvm-target 17 -classpath "$draft_test_cp" -d "$draft_output" \
  android/app/src/main/java/de/kamilunavo/navopass/ServiceDraft.kt \
  android/app/src/main/java/de/kamilunavo/navopass/ServiceDraftArchive.kt \
  android/app/src/test/java/de/kamilunavo/navopass/ServiceDraftTextSafetyTest.kt
"$draft_java" -Xmx128m -XX:+UseSerialGC -cp "$draft_output:$draft_test_cp" org.junit.runner.JUnitCore de.kamilunavo.navopass.ServiceDraftTextSafetyTest
