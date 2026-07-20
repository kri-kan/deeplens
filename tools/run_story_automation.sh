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

# Make sure ADB is running and emulator is connected
echo "Checking adb status and emulator..."
adb start-server

if ! adb devices | grep -q "emulator"; then
    echo "No emulator running. Starting Pixel8a AVD..."
    # Run emulator in headless mode so it works over SSH without a display
    nohup emulator -avd Pixel8a -no-window -no-audio > /dev/null 2>&1 &
    
    echo "Waiting for emulator to boot..."
    adb wait-for-device
    
    while [ "$(adb shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" != "1" ]; do
        sleep 2
    done
    echo "Emulator booted successfully."
else
    echo "Emulator is already running."
fi

adb devices

echo "Ensuring device is awake and screen stays on..."
adb shell input keyevent KEYCODE_WAKEUP
adb shell input keyevent 82 # Unlock screen if swipable
adb shell svc power stayon true

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

for profile in "${PROFILES[@]}"; do
    echo "=================================================="
    echo "Starting automation for profile: $profile"
    echo "=================================================="

    echo "Switching Instagram and Vayyari to profile: $profile"
    # Switch profile in Instagram – retry once if ADB/gRPC drops
    switch_ok=0
    for attempt in 1 2; do
        MAESTRO_CLI_NO_ANALYTICS=true maestro test -e PROFILE_NAME="$profile" maestro/switch_profile.yaml
        sw_exit=$?
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
            
            # If the queue is genuinely empty (no share-queue-item-0 ever found at
            # the start of the run), stop processing this profile. We check for the
            # specific failure of the tapOn command rather than just 'Queue is empty'
            # because Maestro logs every evaluated runFlow condition.
            if [ -n "$last_log" ] && grep -q "Element not found.*share-queue-item-0" "$last_log" 2>/dev/null; then
                echo "Queue is empty for $profile. Moving to next profile."
                run_ok=0
                break
            fi
            if [ -n "$last_log" ] && grep -q "UNAVAILABLE\|Command failed.*closed" "$last_log" 2>/dev/null; then
                echo "ADB connection drop detected on attempt $attempt. Restarting ADB and retrying..."
                adb kill-server && sleep 3 && adb start-server && sleep 3
            else
                # Transient UI failure (e.g. Close Friends timeout, animation race)
                # Retry up to 3 times before giving up
                consecutive_failures=$((consecutive_failures + 1))
                echo "Transient flow failure on attempt $attempt for $profile. Retrying..."
                sleep 3
            fi
        done

        if [ $run_ok -eq 0 ]; then
            echo "Maestro script failed or queue is empty for $profile."
            break
        fi
        
        post_count=$((post_count + 1))
        # Random sleep between 1 to 2 seconds
        BASH_SLEEP=$((RANDOM % 2 + 1))
        echo "Item $((post_count)) marked as shared. Cooling down for $BASH_SLEEP seconds..."
        sleep $BASH_SLEEP
    done

    echo "Finished processing $profile. Processed $post_count items."
    # Random sleep between 1 to 3 seconds
    PROFILE_SLEEP=$((RANDOM % 3 + 1))
    echo "Cooling down for $PROFILE_SLEEP seconds before switching to the next profile..."
    sleep $PROFILE_SLEEP
done

echo "Automation completely finished."
