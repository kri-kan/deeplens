# Ollama: Model Metrics & Context Window Management Guide

This guide provides deep technical instructions for monitoring LLM runtime metrics in Ollama and configuring context windows (`num_ctx`) to prevent memory overflows. It is specifically optimized for hardware environments with constrained GPU memory (e.g., **8GB VRAM** setups like AMD RX 580/590).

---

## 1. Native Ollama Performance Metrics

When you invoke Ollama's endpoints (`/api/generate` or `/api/chat`) with `"stream": false`, or receive the final chunk of a streamed response, Ollama includes a detailed breakdown of the execution duration and token counts.

### Key JSON Metrics Fields
All durations are returned in **nanoseconds (ns)**. To convert to seconds, divide by $1,000,000,000$ ($10^9$).

| Metric Key | Description | Conversion to Seconds |
| :--- | :--- | :--- |
| `total_duration` | The entire time elapsed from receiving the request to returning the response. | `total_duration / 1e9` |
| `load_duration` | Time spent loading the model from disk/system memory into the GPU VRAM. | `load_duration / 1e9` |
| `prompt_eval_count` | Number of tokens in the input prompt (system prompt + user input). | *Raw token count* |
| `prompt_eval_duration` | Time spent evaluating the prompt (prefill phase). | `prompt_eval_duration / 1e9` |
| `eval_count` | Number of tokens generated in the model's output response. | *Raw token count* |
| `eval_duration` | Time spent generating the output tokens (generation phase). | `eval_duration / 1e9` |

### How to Calculate Throughput Metrics

Using these raw metrics, you can calculate key performance indicators (KPIs) to analyze bottlenecks:

#### A. Prompt Processing Speed (Prefill Throughput)
Prefill is heavily parallelized on the GPU. It indicates how fast the model reads your prompt context:
$$\text{Prompt Tokens/Sec} = \frac{\text{prompt\_eval\_count}}{\text{prompt\_eval\_duration}} \times 1,000,000,000$$

#### B. Generation Speed (Output Throughput)
Generation is autoregressive (token-by-token) and is memory-bandwidth bound. This is the speed of reading/writing weights:
$$\text{Generation Tokens/Sec} = \frac{\text{eval\_count}}{\text{eval\_duration}} \times 1,000,000,000$$

#### C. Model Load Cost
If this value is high on every request, the model is not staying resident in memory (check `OLLAMA_KEEP_ALIVE` setting):
$$\text{Load Time (sec)} = \frac{\text{load\_duration}}{10^9}$$

---

## 2. Resource & Memory Monitoring

To ensure Ollama does not overflow physical boundaries (GPU VRAM or Docker container RAM), use these active monitoring commands.

### A. Ollama CLI & API Inspections
Ollama provides built-in tools to inspect what is loaded in memory at any point.

*   **CLI Command:**
    ```bash
    docker exec -it ollama-gpu ollama ps
    ```
    *Output details:* Shows the name of the active model, size in memory, and the processor split (e.g., `100% GPU` vs. `70% GPU, 30% CPU`).
*   **REST Endpoint:**
    ```bash
    curl -s http://localhost:11434/api/ps | jq
    ```
    *Useful fields:* `models[].size`, `models[].size_vram`, and `models[].details.parent_model`.

### B. Host & Container Resource Limits
Since the `ollama-gpu` container has resource limits (defined in `docker-compose.yaml` as `memory: 16G` and `cpus: '10.0'`), monitor container stats using:
```bash
docker stats ollama-gpu
```
Watch the **MEM USAGE / LIMIT** and **CPU %**. If memory nears 16GB, the Linux OOM-killer may terminate the Ollama server.

### C. AMD GPU VRAM Monitoring (Linux / Vulkan)
Because this setup utilizes AMD Vulkan (`OLLAMA_VULKAN=1` and `gfx803`), standard Nvidia tools (`nvidia-smi`) are unavailable. Use these alternatives on the host machine:

1.  **Sysfs VRAM Check (Exact bytes used):**
    ```bash
    cat /sys/class/drm/card0/device/mem_info_vram_used
    ```
    Compare this against total VRAM:
    ```bash
    cat /sys/class/drm/card0/device/mem_info_vram_total
    ```
2.  **Radeontop (Visual Real-time Monitoring):**
    Install `radeontop` on the host to monitor graphics pipe usage and VRAM dynamically:
    ```bash
    sudo apt-get install radeontop
    sudo radeontop
    ```
3.  **ROCm SMI (If ROCm container tools are loaded):**
    If AMD ROCm drivers are fully exposed to the container, run:
    ```bash
    docker exec -it ollama-gpu rocm-smi
    ```

---

## 3. KV Cache & Memory Scaling

The Key-Value (KV) cache stores attention keys and values for all tokens in the context window to prevent re-computation. As your prompt and response lengths grow, the KV cache scales linearly and can consume more memory than the model weights themselves.

### The KV Cache Formula (FP16 Precision)

$$\text{KV Cache Size (Bytes)} = 2 \times \text{layers} \times \text{KV heads} \times \text{head dimension} \times \text{context length} \times 2 \text{ bytes}$$

> [!NOTE]
> Modern models use **Grouped Query Attention (GQA)**, meaning the number of KV Heads is much smaller than Query Heads (usually $4$ or $8$), which significantly reduces KV Cache size compared to older Multi-Head Attention (MHA) models.

#### Example Calculation: Llama 3.1 8B
*   **Layers (`n_layers`):** $32$
*   **KV Heads (`n_kv_heads`):** $8$
*   **Head Dimension (`n_embd / n_heads`):** $128$ (derived from $4096$ embedding size / $32$ query heads)
*   **Precision:** $2$ bytes (FP16)

$$\text{KV Cache per Token} = 2 \times 32 \times 8 \times 128 \times 2 = 131,072 \text{ Bytes} \approx 131 \text{ KB}$$

| Context Length (`num_ctx`) | Estimated KV Cache Size | Weight Footprint (Q4_K_M) | Total VRAM Required |
| :--- | :--- | :--- | :--- |
| **2,048** | ~268 MB | ~4.7 GB | **~5.0 GB** (Safe) |
| **4,096** | ~536 MB | ~4.7 GB | **~5.3 GB** (Safe) |
| **8,192** | ~1.07 GB | ~4.7 GB | **~5.8 GB** (Safe) |
| **16,384** | ~2.15 GB | ~4.7 GB | **~6.9 GB** (Borderline) |
| **32,768** (Native) | ~4.29 GB | ~4.7 GB | **~9.0 GB** (VRAM Overflow ❌) |

### The VRAM Overflow Penalty
If the combination of **Model Weights + KV Cache** exceeds the available VRAM (~7.2 GB usable on an 8GB card), Ollama will offload layers to system CPU/RAM. 
*   **GPU-only execution (100% offload):** ~15 to 25 tokens/sec.
*   **Partial CPU offload (e.g., 20/32 layers on GPU):** drops to ~2 to 5 tokens/sec.
*   **Full CPU offload:** drops below 1 token/sec.

---

## 4. Context Window Configuration Options

You can control the context window (`num_ctx`) at three levels: globally, per model definition, or dynamically at the API request level.

### Option A: Global Default Capping (docker-compose)
To prevent all pulled models from defaulting to their native limits (e.g., Qwen's 32K or Llama 3.1's 128K), define the `OLLAMA_NUM_CTX` environment variable in the `docker-compose.yaml` file:

```yaml
services:
  ollama-gpu:
    # ...
    environment:
      - OLLAMA_VULKAN=1
      - HSA_OVERRIDE_GFX_VERSION=8.0.3
      - OLLAMA_NUM_CTX=4096             # Forces default limit to 4096 tokens
      - OLLAMA_KEEP_ALIVE=10m           # Keeps model in VRAM for 10 minutes
```

### Option B: Per-Model Capping via Modelfile
If you want to bake a specific context constraint directly into a model variant so clients don't have to specify it, use a custom `Modelfile`.

1.  **Extract the current model's settings:**
    ```bash
    docker exec -it ollama-gpu ollama show --modelfile phi3 > /tmp/llama3.1.Modelfile
    ```
2.  **Edit the file to inject the context size parameter:**
    Open `/tmp/llama3.1.Modelfile` and append:
    ```dockerfile
    PARAMETER num_ctx 4096
    ```
3.  **Create a new model tag from the Modelfile:**
    ```bash
    docker exec -it ollama-gpu ollama create phi3-4k -f /tmp/llama3.1.Modelfile
    ```
4.  Use `phi3-4k` in your client scripts.

### Option C: Request-Level / Programmatic Control
Your agent code or API calls can dynamically adjust context window sizes depending on the complexity of the current task.

#### 1. Direct API HTTP Request
Pass the `num_ctx` parameter within the `options` object:
```bash
curl -X POST http://localhost:11434/api/chat -d '{
  "model": "phi3",
  "messages": [
    { "role": "user", "content": "Analyze this codebase..." }
  ],
  "options": {
    "num_ctx": 4096,
    "temperature": 0.2
  },
  "stream": false
}'
```

#### 2. Programmatic SDK Integration (C# / .NET)
If your backend services use Semantic Kernel, OllamaSharp, or direct HttpClient wrappers, pass the options in the payload:
```csharp
var requestPayload = new {
    model = "phi3",
    messages = new[] {
        new { role = "user", content = "Explain quantum computing." }
    },
    options = new {
        num_ctx = 4096 // Dynamic context allocation
    }
};
```

---

## 5. 8GB VRAM Context & Model Decision Matrix

Use the following guidelines to balance context requirements with generation throughput on your RX 580:

```
                  ┌─────────────────────────────────────┐
                  │ Does the task need a large context? │
                  └──────────────────┬──────────────────┘
                                     │
                  ┌──────────────────┴──────────────────┐
                  ▼                                     ▼
                [ YES ]                                [ NO ]
                  │                                     │
   ┌──────────────┴──────────────┐        ┌─────────────┴─────────────┐
   │ Need RAG or codebase files? │        │ Simple prompt or chat?    │
   └──────────────┬──────────────┘        └─────────────┬─────────────┘
                  │                                     │
         ┌────────┴────────┐                  ┌─────────┴─────────┐
         ▼                 ▼                  ▼                   ▼
     [ >16K ]           [ <8K ]            [ 8B Models ]       [ <3B Models ]
         │                 │                  │                   │
  ┌──────┴──────┐   ┌──────┴──────┐    ┌──────┴──────┐     ┌──────┴──────┐
  │   Warning   │   │ Llama 3.1   │    │ Llama 3.1   │     │ Llama 3.2   │
  │ CPU Slowdown│   │ 8B (4K-8K)  │    │ 8B (2K-4K)  │     │ 3B (2K-4K)  │
  │  Unstable   │   │  VRAM: OK   │    │  VRAM: OK   │     │  VRAM: OK   │
  └─────────────┘   └─────────────┘    └─────────────┘     └─────────────┘
```

1.  **Low Latency / High Throughput Chat:**
    *   **Model:** `phi3` or `mistral:7b-instruct`
    *   **Context:** `num_ctx 2048` or `4096`
    *   **Result:** Extremely fast, leaving ~3GB VRAM headroom for multi-tenant concurrent requests.
2.  **Complex Coding / Multi-Agent Loops:**
    *   **Model:** `phi3` or `granite3.2:8b`
    *   **Context:** `num_ctx 4096`
    *   **Result:** Native JSON schema capabilities and robust reasoning, fully accelerated on the GPU.
3.  **Extended RAG / Repository Analysis:**
    *   **Model:** `phi3`
    *   **Context:** `num_ctx 8192`
    *   **Result:** Safe limit for 8GB GPU, but prefill (prompt evaluation) time will scale up. Do not run concurrent requests.
