#!/usr/bin/env bash
# Recover the specific emulator Launcher3 ANR once. App/System UI ANRs stay fatal.
current_focus() {
  adb shell dumpsys window | grep 'mCurrentFocus=' || true
}
wait_for_foreground() {
  local attempt focus recovered=0
  for attempt in $(seq 1 30); do
    focus="$(current_focus)"
    if [[ "$focus" == *'Application Not Responding: com.android.launcher3'* && "$recovered" == 0 ]]; then
      if [[ -n "${output_dir:-}" ]]; then
        mkdir -p "$output_dir/diagnostics"
        printf '%s\n' "$focus" > "$output_dir/diagnostics/launcher-before-recovery.txt"
      fi
      recovered=1
      adb shell am force-stop com.android.launcher3
      adb shell am start -W -n "$PACKAGE_NAME/.MainActivity"
    elif [[ "$focus" == *'Application Not Responding:'* ]]; then
      echo "ANR remains blocking: $focus" >&2
      return 1
    elif [[ "$focus" == *"$PACKAGE_NAME"* ]]; then
      return 0
    fi
    sleep 1
  done
  echo "Timed out waiting for $PACKAGE_NAME to become the foreground app." >&2
  current_focus >&2
  return 1
}
