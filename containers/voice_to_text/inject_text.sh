#!/bin/bash
# ==============================================================================
# Linux Host System-Wide Voice-to-Text Cursor Injection Script
# Uses ydotool (Wayland/X11) or xdotool (X11) to inject transcribed text
# ==============================================================================

TARGET_SERVICE=${1:-"openwhispr"} # openwhispr (8080), handy (8000), whispercpp (8081)
DURATION=${2:-4}                 # Recording duration in seconds

case $TARGET_SERVICE in
    openwhispr)
        PORT=8080
        ENDPOINT="http://localhost:${PORT}/v1/audio/transcriptions"
        ;;
    handy)
        PORT=8000
        ENDPOINT="http://localhost:${PORT}/v1/audio/transcriptions"
        ;;
    whispercpp)
        PORT=8081
        ENDPOINT="http://localhost:${PORT}/inference"
        ;;
    *)
        echo "Usage: $0 [openwhispr|handy|whispercpp] [recording_duration_sec]"
        exit 1
        ;;
esac

TMP_WAV=$(mktemp /tmp/v2t_recording_XXXXXX.wav)

echo "🎙️ Recording audio for ${DURATION} seconds (Target: ${TARGET_SERVICE})..."
if command -v ffmpeg &> /dev/null; then
    ffmpeg -y -f pulse -i default -t "$DURATION" -ac 1 -ar 16000 "$TMP_WAV" -loglevel quiet
elif command -v arecord &> /dev/null; then
    arecord -d "$DURATION" -r 16000 -f S16_LE -c 1 "$TMP_WAV"
else
    echo "❌ Error: Neither ffmpeg nor arecord found on host system."
    rm -f "$TMP_WAV"
    exit 1
fi

echo "🚀 Sending audio to ${TARGET_SERVICE} server..."
RESPONSE=$(curl -s -F "file=@${TMP_WAV}" "$ENDPOINT")
rm -f "$TMP_WAV"

# Extract text field from JSON
if command -v jq &> /dev/null; then
    TRANSCRIBED_TEXT=$(echo "$RESPONSE" | jq -r '.text // .transcription[0].text // empty')
else
    TRANSCRIBED_TEXT=$(echo "$RESPONSE" | grep -o '"text":"[^"]*"' | cut -d'"' -f4)
fi

if [ -z "$TRANSCRIBED_TEXT" ]; then
    echo "⚠️ Warning: No transcribed text returned or error response: $RESPONSE"
    exit 1
fi

echo "✍️ Transcribed Text: \"${TRANSCRIBED_TEXT}\""
echo "Injecting at current cursor..."

if command -v ydotool &> /dev/null; then
    ydotool type "$TRANSCRIBED_TEXT"
elif command -v xdotool &> /dev/null; then
    xdotool type --clearmodifiers "$TRANSCRIBED_TEXT"
elif command -v wtype &> /dev/null; then
    wtype "$TRANSCRIBED_TEXT"
else
    echo "❌ Error: No text injection tool found. Install ydotool, xdotool, or wtype."
    echo "Text output: $TRANSCRIBED_TEXT"
fi
