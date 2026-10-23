#!/usr/bin/env bash
set -euo pipefail
root=$(cd "$(dirname "$0")/.." && pwd)
helper="$root/.github/scripts/android-foreground.sh"
test -s "$helper" || { echo 'Missing bounded launcher recovery'; exit 1; }
fixture=$(mktemp -d)
trap 'rm -rf "$fixture"' EXIT
mkdir "$fixture/bin"
cat > "$fixture/bin/adb" <<'ADB'
#!/usr/bin/env bash
printf '%s\n' "$*" >> "$QA_LOG"
if [[ "$*" == 'shell dumpsys window' ]]; then
 if [[ "$QA_MODE" == app ]]; then
  echo "mCurrentFocus=Window{fixture Application Not Responding: $PACKAGE_NAME}"
 elif [[ "$QA_MODE" == stuck || ( "$QA_MODE" == launcher && ! -f "$QA_RECOVERED" ) ]]; then
  echo 'mCurrentFocus=Window{fixture Application Not Responding: com.android.launcher3}'
 else echo "mCurrentFocus=Window{fixture u0 $PACKAGE_NAME/.MainActivity}"; fi
elif [[ "$*" == 'shell am force-stop com.android.launcher3' ]]; then touch "$QA_RECOVERED"; fi
ADB
cat > "$fixture/bin/sleep" <<'SLEEP'
#!/usr/bin/env bash
exit 0
SLEEP
chmod +x "$fixture/bin/adb" "$fixture/bin/sleep"
export PATH="$fixture/bin:$PATH" PACKAGE_NAME=de.kamilunavo.navopass QA_LOG="$fixture/commands" QA_RECOVERED="$fixture/recovered" QA_MODE=launcher
source "$helper"
wait_for_foreground
[[ $(grep -Fc 'shell am force-stop com.android.launcher3' "$QA_LOG") == 1 ]]
grep -Fq "shell am start -W -n $PACKAGE_NAME/.MainActivity" "$QA_LOG"
export QA_MODE=stuck
: > "$QA_LOG"
if wait_for_foreground; then echo 'Persistent launcher ANR must fail'; exit 1; fi
[[ $(grep -Fc 'shell am force-stop com.android.launcher3' "$QA_LOG") == 1 ]]
export QA_MODE=app
: > "$QA_LOG"
if wait_for_foreground; then echo 'App ANR must fail acceptance'; exit 1; fi
! grep -Fq 'force-stop' "$QA_LOG"
export QA_MODE=normal
: > "$QA_LOG"
wait_for_foreground
! grep -Fq 'force-stop' "$QA_LOG"
echo 'Android foreground recovery checks passed; app ANRs remain blocking.'
