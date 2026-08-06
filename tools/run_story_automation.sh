#!/bin/bash

# Maestro Story Automation Runner Script
# Ensures Maestro path is loaded and triggers the story automation Maestro flow.

export PATH="$PATH:$HOME/.maestro/bin"

# Navigate to the repository root so that relative paths to maestro scripts work
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$REPO_ROOT" || exit 1

# Exit cleanly on Ctrl+C so that the retry logic doesn't misfire
trap 'echo ""; echo "Interrupted. Exiting."; exit 130' INT TERM

start_avd() {
    echo "Checking adb status and emulator..."
    adb start-server

    if ! adb devices | grep -q "emulator"; then
        echo "No emulator running. Starting Pixel8a AVD in visual mode..."
        nohup emulator -avd Pixel8a > /dev/null 2>&1 &
        
        echo "Waiting for emulator to boot..."
        adb wait-for-device
        
        while [ "$(adb shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" != "1" ]; do
            sleep 2
        done
        echo "Emulator booted successfully."
        sleep 5
    else
        echo "Emulator is already running."
    fi

    adb devices

    echo "Ensuring device is awake and screen stays on..."
    adb shell input keyevent KEYCODE_WAKEUP
    adb shell input keyevent 82 # Unlock screen if swipable
    adb shell svc power stayon true
}

restart_avd() {
    echo "=================================================="
    echo "Restarting AVD to keep RAM usage in check..."
    echo "=================================================="
    echo "Stopping emulator..."
    adb emu kill 2>/dev/null || true
    
    # Wait up to 15 seconds for emulator to gracefully shutdown
    local wait_time=0
    while adb devices 2>/dev/null | grep -q "emulator" && [ $wait_time -lt 15 ]; do
        sleep 1
        wait_time=$((wait_time + 1))
    done
    
    # Force kill any remaining emulator processes if still running
    if adb devices 2>/dev/null | grep -q "emulator" || pgrep -f "emulator.*-avd" > /dev/null 2>&1; then
        echo "Force killing remaining emulator processes..."
        pkill -9 -f "emulator.*-avd" 2>/dev/null || true
        adb kill-server 2>/dev/null || true
        sleep 2
        adb start-server 2>/dev/null || true
    fi
    
    start_avd
}

switch_profile_with_retries() {
    local prof="$1"
    echo "Switching Instagram and Vayyari to profile: $prof"
    local switch_ok=0
    for attempt in 1 2; do
        MAESTRO_CLI_NO_ANALYTICS=true maestro test -e PROFILE_NAME="$prof" maestro/switch_profile.yaml
        local sw_exit=$?
        # Propagate Ctrl+C immediately
        [ $sw_exit -eq 130 ] && exit 130
        if [ $sw_exit -eq 0 ]; then
            switch_ok=1
            break
        fi
        if [ $attempt -eq 1 ]; then
            echo "Switch attempt $attempt failed (possible ADB drop). Restarting ADB and retrying..."
            adb kill-server && sleep 3 && adb start-server && sleep 3
        fi
    done

    if [ $switch_ok -eq 0 ]; then
        return 1
    fi
    return 0
}

# Ensure AVD is started initially
start_avd

echo "Fetching active profiles with pending queues from database..."
# Run postgres query inside the container, fetch unique usernames with pending items
PROFILES_OUTPUT=$(docker exec krikanpg psql -U postgres -d deeplens_platform -t -c "
SELECT cw.username 
FROM story_posting_history sph
JOIN competitor_watchlist cw ON cw.id = sph.target_watchlist_id
WHERE sph.posted_at IS NULL AND cw.profile_category = 'My Business'
GROUP BY cw.username, cw.is_pinned
ORDER BY cw.is_pinned DESC NULLS LAST, cw.username ASC;")

# Convert the multiline output into an array, trimming whitespace
readarray -t PROFILES <<< "$(echo "$PROFILES_OUTPUT" | sed '/^\s*$/d' | awk '{$1=$1};1')"

if [ ${#PROFILES[@]} -eq 0 ] || [ -z "${PROFILES[0]}" ]; then
    echo "No profiles have active queues. Exiting."
    exit 0
fi

echo "Found ${#PROFILES[@]} active profiles to process."

total_shares=0
RESTART_THRESHOLD=20

for profile in "${PROFILES[@]}"; do
    echo "=================================================="
    echo "Starting automation for profile: $profile"
    echo "=================================================="

    if ! switch_profile_with_retries "$profile"; then
        echo "Failed to switch Instagram to profile $profile after 2 attempts. Skipping..."
        continue
    fi

    echo "Switch successful. Starting queue processing..."
    MAX_POSTS=50
    post_count=0

    while [ $post_count -lt $MAX_POSTS ]; do
        echo "--------------------------------------------------"
        echo "Processing item $((post_count + 1)) in the queue for $profile..."
        echo "--------------------------------------------------"
        
        # Generate random delays for this run (in milliseconds)
        DELAY_SHARE=$((RANDOM % 1500 + 500))     # 500ms - 2000ms
        DELAY_SHEET=$((RANDOM % 1500 + 500))     # 500ms - 2000ms
        DELAY_DRAFT=$((RANDOM % 1500 + 500))     # 500ms - 2000ms
        DELAY_CONFIRM=$((RANDOM % 1500 + 500))   # 500ms - 2000ms
        DELAY_POST=$((RANDOM % 1500 + 1000))     # 1000ms - 2500ms

        # Run the test – retry on ADB/gRPC failures AND transient UI failures (e.g. timeout waiting for Close Friends)
        run_ok=0
        consecutive_failures=0
        for attempt in 1 2 3; do
            MAESTRO_CLI_NO_ANALYTICS=true maestro test \
                -e PROFILE_NAME="$profile" \
                -e DELAY_SHARE=$DELAY_SHARE \
                -e DELAY_SHEET=$DELAY_SHEET \
                -e DELAY_DRAFT=$DELAY_DRAFT \
                -e DELAY_CONFIRM=$DELAY_CONFIRM \
                -e DELAY_POST=$DELAY_POST \
                maestro/story_automation.yaml
            exit_code=$?
            # Propagate Ctrl+C immediately
            [ $exit_code -eq 130 ] && exit 130
            if [ $exit_code -eq 0 ]; then
                run_ok=1
                break
            fi
            # Wait 1 second to ensure Maestro JVM has fully flushed the log to disk
            sleep 1
            last_log=$(ls -t ~/.maestro/tests/*/maestro.log 2>/dev/null | head -1)
            
            # Check if the queue was genuinely empty (indicated by execution of SIGNAL_QUEUE_IS_EMPTY
            # which Maestro only attempts to tap when 'Queue is empty.' is explicitly visible on screen).
            if [ -n "$last_log" ] && grep -q "SIGNAL_QUEUE_IS_EMPTY FAILED\|Id matching regex: SIGNAL_QUEUE_IS_EMPTY" "$last_log" 2>/dev/null; then
                echo "Queue is genuinely empty for $profile."
                run_ok=2
                break
            fi
            if [ -n "$last_log" ] && grep -q "UNAVAILABLE\|Command failed.*closed" "$last_log" 2>/dev/null; then
                echo "ADB connection drop detected on attempt $attempt. Restarting ADB and retrying..."
                adb kill-server && sleep 3 && adb start-server && sleep 3
            else
                # Transient UI failure or slow app load (e.g. Expo bundle compiling, Close Friends timeout)
                # Give it sufficient wait time and retry up to 3 times before giving up
                consecutive_failures=$((consecutive_failures + 1))
                echo "Flow failure or slow loading on attempt $attempt for $profile. Waiting 5 seconds before retry..."
                sleep 5
            fi
        done

        if [ $run_ok -ne 1 ]; then
            if [ $run_ok -eq 2 ]; then
                echo "Finished active queue for $profile. Moving to next profile."
                break
            else
                echo "Maestro script failed to load or process story for $profile after 3 attempts."
                echo "Since the app or automation is encountering persistent errors/loading delays, halting execution instead of skipping to the next profile."
                exit 1
            fi
        fi
        
        post_count=$((post_count + 1))
        total_shares=$((total_shares + 1))
        # Random sleep between 1 to 2 seconds
        BASH_SLEEP=$((RANDOM % 2 + 1))
        echo "Item $((post_count)) marked as shared (Total shares in session: $total_shares). Cooling down for $BASH_SLEEP seconds..."
        sleep $BASH_SLEEP

        # Restart AVD every 20 shared stories to keep RAM usage in check
        if [ $((total_shares % RESTART_THRESHOLD)) -eq 0 ]; then
            echo ""
            echo "[RAM Preservation] Reached $total_shares story shares in this session."
            restart_avd
            
            # If we still have items remaining in the queue limit for this profile, switch back to it
            if [ $post_count -lt $MAX_POSTS ]; then
                echo "Re-switching Instagram to $profile after AVD restart..."
                if ! switch_profile_with_retries "$profile"; then
                    echo "Failed to switch Instagram to profile $profile after AVD restart. Halting execution."
                    exit 1
                fi
            fi
        fi
    done

    echo "Finished processing $profile. Processed $post_count items."
    # Random sleep between 1 to 3 seconds
    PROFILE_SLEEP=$((RANDOM % 3 + 1))
    echo "Cooling down for $PROFILE_SLEEP seconds before switching to the next profile..."
    sleep $PROFILE_SLEEP
done

echo "Automation completely finished."
