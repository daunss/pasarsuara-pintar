#!/bin/bash

# Test berbagai model Gemini untuk audio transcription
# Usage: ./test-gemini-models.sh <api_key> <audio_file_base64>

API_KEY="${1:-AIzaSyAFJ-HFaHfAhgMUScfprdJmtX4Y0__DDkU}"

# Test audio (base64 encoded "hello")
AUDIO_BASE64="T2dnUwACAAAAAAAAAABkAAAAAAAAAPr6+v4BHgF2b3JiaXMAAAAAAUSsAAAAAAAAgLsAAAAAAAC4AU9nZ1MAAAAAAAAAAAAA"

echo "Testing Gemini Models for Audio Transcription"
echo "=============================================="
echo ""

# Model 1: gemini-2.0-flash-exp
echo "1. Testing gemini-2.0-flash-exp..."
curl -s -X POST \
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=$API_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"contents\": [{
      \"parts\": [{
        \"text\": \"Transcribe this audio to text:\"
      }, {
        \"inline_data\": {
          \"mime_type\": \"audio/ogg\",
          \"data\": \"$AUDIO_BASE64\"
        }
      }]
    }]
  }" | jq -r '.error // "SUCCESS"'
echo ""

# Model 2: gemini-1.5-flash
echo "2. Testing gemini-1.5-flash..."
curl -s -X POST \
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=$API_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"contents\": [{
      \"parts\": [{
        \"text\": \"Transcribe this audio to text:\"
      }, {
        \"inline_data\": {
          \"mime_type\": \"audio/ogg\",
          \"data\": \"$AUDIO_BASE64\"
        }
      }]
    }]
  }" | jq -r '.error // "SUCCESS"'
echo ""

# Model 3: gemini-1.5-pro
echo "3. Testing gemini-1.5-pro..."
curl -s -X POST \
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=$API_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"contents\": [{
      \"parts\": [{
        \"text\": \"Transcribe this audio to text:\"
      }, {
        \"inline_data\": {
          \"mime_type\": \"audio/ogg\",
          \"data\": \"$AUDIO_BASE64\"
        }
      }]
    }]
  }" | jq -r '.error // "SUCCESS"'
echo ""

# Model 4: gemini-pro
echo "4. Testing gemini-pro..."
curl -s -X POST \
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=$API_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"contents\": [{
      \"parts\": [{
        \"text\": \"Hello, how are you?\"
      }]
    }]
  }" | jq -r '.error // "SUCCESS"'
echo ""

echo "=============================================="
echo "Test completed. Check which model works."
