# Local Voice-to-Text Containers (OpenWhispr, Handy, whisper.cpp)

This setup provides three lightweight local voice-to-text containers tailored for Linux environments with 4GB VRAM and Vulkan/GPU hardware acceleration.

---

## Technical Specifications & Upgraded Models (`small` / 244M Params)

| Feature | OpenWhispr | Handy | whisper.cpp |
| :--- | :--- | :--- | :--- |
| **Allocated Port** | `8090` | `8091` | `8092` |
| **Default Model** | OpenAI Whisper `small` (244M) | `openai/whisper-small` / Parakeet | `ggml-small.bin` (INT8 quantized) |
| **Control Panel** | Web UI Dashboard (`http://localhost:8090`) | REST API (`http://localhost:8091`) | HTTP API (`http://localhost:8092`) |
| **Hardware Accel** | Vulkan / PyTorch CTranslate2 | ONNX Runtime / Vulkan | GGML Vulkan (`-DGGML_VULKAN=ON`) |
| **RAM/VRAM Footprint** | ~1.1 GB | ~1.3 GB | ~480 MB - 500 MB |
| **VRAM Headroom** | **~2.9 GB Free** | **~2.7 GB Free** | **~3.5 GB Free** |
| **Accuracy Level** | High (Major boost over `base`) | High | High |

---

## 1. Prerequisites (Host Machine)

### Linux Host Driver & Tools Setup
Ensure Vulkan drivers, `notify-send`, and text injection utilities are installed on your Linux host:
```bash
sudo apt-get update
sudo apt-get install -y vulkan-tools libvulkan1 ydotool ffmpeg jq libnotify-bin
```

---

## 2. Central Port Map Verification (`docs/infrastructure/port-allocation.md`)

Ports are assigned to prevent conflicts with central project services:
- **Port 8090**: OpenWhispr Web Control Panel & API (`small` model)
- **Port 8091**: Handy Voice Service API (`whisper-small` / Parakeet)
- **Port 8092**: whisper.cpp Vulkan HTTP Server (`ggml-small.bin`)

---

## 3. Host Shortcuts & Voice Typing CLI (`v2t`)

The unified CLI `v2t` is installed to `~/.local/bin/v2t` for instant voice typing at your cursor.

```bash
# Voice Type (Auto-starts container, transcribes speech with upgraded 'small' model, and types at cursor)
v2t type 5

# Stop containers & release 100% of RAM/VRAM
v2t pause

# Check live container health & memory footprint
v2t status

# Switch Active Engine (OpenWhispr, Handy, or whispercpp)
v2t switch whispercpp
v2t switch openwhispr
v2t switch handy
```

---

## 4. Model Persistence & Volume Management

Models are cached in `./models/` to avoid re-downloading weights if containers are restarted or recreated:
- `./models/openwhispr` -> Mounted to `/models/openwhispr`
- `./models/handy` -> Mounted to `/models/handy`
- `./models/whispercpp` -> Mounted to `/models/whispercpp`
