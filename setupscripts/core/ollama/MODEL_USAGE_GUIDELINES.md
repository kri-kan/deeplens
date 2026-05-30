# Ollama Model Usage & Performance Guidelines

This guide outlines performance recommendations, parameter configurations, and use cases for the models loaded in the `ollama-gpu` stack: **Gemma 3 (4B)**, **Phi-4 Mini (3.8B)**, and **Qwen 3.5 (4B)**.

---

## 1. Scenario-Based Model Selection

| Model | Best For | Key Strengths | Considerations |
| :--- | :--- | :--- | :--- |
| **Phi-4 Mini (3.8B)** | **Structured Tool Calling & Autocomplete** | Highly logical, strict syntax adherence, fast generation, low memory overhead. | Reasoning over extremely large context windows (>32k) is slightly weaker. |
| **Qwen 3.5 (4B)** | **Complex Algorithms & Multi-step logic** | Massive native context (256K), strong algorithmic generation, great with complex control flows. | High latency if it triggers recursive internal "thinking" loops during simple tool calls. |
| **Gemma 3 (4B)** | **Multimodal Tasks & Code Explanations** | Visual code reasoning (mockups/UI analysis), high-quality natural language explanations. | Slightly slower raw token generation speed compared to Phi-4. |

---

## 2. Parameter Tuning per Scenario

For optimal performance and reliability, customize Ollama parameters via your application's API requests:

### Scenario A: Tool Calling & Function Execution (Strict Outputs)
Use these settings when the model must output syntactically valid JSON or execute functions:
*   `temperature: 0.0` — Disables token selection randomness to enforce strict grammar/format correctness.
*   `top_p: 0.9` — Filters out low-probability tail tokens.
*   `num_ctx: 8192` — Cap context at 8K to minimize time-to-first-token (TTFT) and VRAM usage.
*   **System Prompt Tip**: Instruct the model: *"You are an API assistant. Output ONLY the JSON block. Do not write markdown blocks, explanations, or preambles."*
*   **Ollama Parameter**: Set `"format": "json"` in the API request payload to enforce valid JSON output structure.

### Scenario B: Code Generation, Refactoring & Debugging
Use these settings for writing code or refactoring where architectural exploration is helpful:
*   `temperature: 0.2` to `0.3` — Allows the model to explore slightly different code structures without losing syntax coherence.
*   `num_ctx: 16384` (or up to 32768) — Gives the model enough context to read surrounding files, imports, and interface definitions.
*   `num_predict: 2048` — Sets a high enough generation limit to prevent code outputs from truncating mid-file.

---

## 3. Model-Specific Optimization

### Qwen 3.5 (4B)
*   **Controlling the Thinking Budget**: Qwen 3.5 models run chain-of-thought (reasoning) tokens by default. This is excellent for deep reasoning but adds high latency for simple code edits or tool calls.
*   **Tuning**: To bypass thinking latency, add this to the System Prompt: *"Skip chain-of-thought reasoning. Provide the direct answer/JSON code blocks immediately."*

### Phi-4 Mini (3.8B)
*   **System Prompt Structure**: Phi-4 is highly sensitive to the structure of the system prompt. Ensure you define inputs and outputs explicitly.
*   **Tuning**: Define stop tokens explicitly if using custom API integrations: `stop: ["<|im_end|>", "<|endoftext|>"]`.

---

## 4. Host/Container VRAM Optimization

Running multiple local models on consumer GPU hardware requires careful environment configuration:

1.  **VRAM Swapping Control (`OLLAMA_MAX_LOADED_MODELS`)**:
    By default, Ollama unloads the current model from VRAM to load another if it gets queried, which adds a 5–10 second delay.
    *   **Low VRAM (e.g., 8GB Card)**: Keep `OLLAMA_MAX_LOADED_MODELS=1` in your container environment to ensure the active model has the full GPU resources.
    *   **High VRAM (e.g., >=16GB Card)**: Increase `OLLAMA_MAX_LOADED_MODELS=3` to keep Gemma, Phi, and Qwen all loaded in memory for instant model-switching.
2.  **Parallel Requests (`OLLAMA_NUM_PARALLEL`)**:
    *   Set `OLLAMA_NUM_PARALLEL=1` on an 8GB VRAM card to avoid splitting GPU cores and memory across concurrent requests, which causes massive context processing slowdowns.
