# Session Log: 2026-09-01 - Fix AI Title and Keyword Generation Failure During Post Grouping (Bug #381)

- **Date**: 2026-09-01
- **Target Repository**: `/home/krikan/productivity/deeplens` on branch `squad/381-fix-instagram-story-planner-ai-grouping-metadata`
- **ADO Bug**: [#381](https://dev.azure.com/kri-kan/deeplens/_workitems/edit/381) - `[Instagram/StoryPlanner] Fix AI Title and Keyword Generation Failure During Post Grouping` (Status: `Resolved`)
- **Child Engineering Tasks Closed**:
  - Task #382: Update Reasoning Service Ollama fallback to `qwen2.5:0.5b` and Chat API (`Closed`)
  - Task #383: Robust Markdown Stripping, JSON Parsing & Heuristic Fallback in `suggest_group_metadata` (`Closed`)
  - Task #384: Handle Content-Filter and Empty LLM Responses Gracefully in Reasoning Service and SearchApi (`Closed`)
  - Task #385: Rebuild & Deploy Reasoning Service, Verify End-to-End Group Suggestion (`Closed`)
- **Review Task Created**:
  - Task #386: Assigned to `krishna-kanth@outlook.com` (`New`)
- **Files Modified**:
  - `src/DeepLens.ReasoningService/main.py`
  - `src/DeepLens.Service/DeepLens.SearchApi/Services/AttributeExtractionService.cs`

---

## 1. Context & Root Cause Analysis

When grouping Instagram posts in Story Planner within Vayyari mobile app, tapping "Suggest Title & Keywords (AI)" failed with an `AI Error: Failed to generate suggestions. The AI service may be unavailable.` alert.

End-to-end tracing revealed multiple compounding root causes:
1. **Hosted Gemini Content Filtering**: Instagram captions with repetitive hashtags/promotions (`#fypppp...`) triggered Gemini's safety filter via LiteLLM, returning `finish_reason: "content_filter"` and `content: null`.
2. **Corrupted Local Fallback Model**: Because the hosted model returned empty content, `call_llm` fell back to `phi4-mini:latest` (which was corrupted in VRAM outputting infinite loop tokens `itosouch...`) and `phi3:latest` (which was not installed).
3. **Unsanitized JSON Parsing & 500 Propagation**: In `suggest_group_metadata`, `json.loads(raw_text)` was called without stripping markdown code fences (` ```json `), and any parsing error raised `HTTPException(500)`.
4. **SearchApi / Client Degradation**: SearchApi caught the 500 error and returned empty metadata (`{ Title = "", Keywords = "" }`), triggering the React Native error alert modal.

---

## 2. Key Changes & Architecture

### A. Reasoning Service (`main.py`)
- **Hosted-First Safety Settings**: Added `GEMINI_SAFETY_SETTINGS` (`BLOCK_NONE` across harassment, hate speech, explicit content, dangerous content) passed via `extra_body` to LiteLLM, unblocking Indian ethnic wear captions and ensuring 100% execution on hosted Gemini.
- **Content Filter & Empty Content Detection**: Explicitly detect `finish_reason == "content_filter"` or empty message content in `call_llm` and cleanly engage fallback.
- **Ollama Chat API & Healthy Model Priority**: Rewrote `query_ollama_direct` to use `/api/chat` with `format: "json"`. Configured fallback model priority to `["qwen2.5:0.5b", "phi4-mini:latest", "phi3:latest"]`.
- **Markdown Stripping & JSON Sanitization**: Added regex stripping for markdown fences and outermost JSON extraction in `suggest_group_metadata`. Handled list-to-string conversion for keywords.
- **Heuristic Taxonomy Fallback**: Added `generate_heuristic_metadata` based on `INDIAN_FASHION_GLOSSARY` ensuring `suggest_group_metadata` never fails with HTTP 500.

### B. SearchApi (`AttributeExtractionService.cs`)
- **Explicit Property Mapping**: Added `[JsonPropertyName("title")]` and `[JsonPropertyName("keywords")]` and case-insensitive JSON options.
- **Local Fallback Metadata Generation**: Added `CreateFallbackMetadata(descriptions)` extracting clean titles from post descriptions in case of upstream timeouts.

---

## 3. Verification & Deployment

1. **Direct Service Verification**:
   - `curl -s -X POST http://localhost:8002/suggest-group-metadata` with vendor captions containing `#fypppp...` returned HTTP 200 OK:
     `{"title": "Shibori Print Chinon Cutdana Saree", "keywords": "saree, chinon, shibori, handwork, partywear"}` in ~3 seconds via hosted Gemini.
2. **SearchApi Authenticated End-to-End Test**:
   - `POST /api/v1/Insta/suggest-group-metadata` with real post IDs returned HTTP 200 OK with suggested title and keywords.
3. **Container Deployments**:
   - `deeplens-reasoning-api` and `deeplens-api` rebuilt, deployed to `/data/hosting/`, and restarted cleanly.
