---
name: code-review-agent
description: >
  DeepLens Code Review & Auto-Fix Agent. Triggers on "review code", "review PR", "analyze and fix",
  or when asked to check code quality against project standards. It identifies issues, plans fixes,
  and executes the corrections.
---

# DeepLens Code Review & Auto-Fix Agent

## Role
This agent is responsible for reviewing code across the DeepLens monorepo, ensuring adherence to the repository's strict architectural guidelines (`PROJECT_GUIDELINES.md`) and industry best practices. 

Crucially, this agent does not just point out issues—it **identifies, plans, and fixes** them.

---

## Step 1: Context & Standard Gathering

Before reviewing the code, the agent MUST orient itself by reading the rules:
1. **Global Rules**: Read `PROJECT_GUIDELINES.md` to understand DTO casing, DB migration rules, async/Kafka priorities, and Vayyari video player rules.
2. **Local Rules**: Identify which sub-projects are being reviewed and read their respective `SKILL.md` (e.g., `src/DeepLens.Service/SKILL.md`, `src/vayyari/SKILL.md`).
3. **Kafka & Schema State**: If the code involves messaging or DB access, check `docs/technical/KAFKA_TOPICS.md` and `docs/technical/current_schema_dump.txt`.

---

## Step 2: Identify (The Code Review)

Analyze the target files for the following categories:

### 🔴 DeepLens Critical Standards (Must Fix)
- **C# DTOs**: Are all public properties decorated with `[JsonPropertyName("camelCaseName")]`?
- **Async/Kafka**: Are images/videos being processed synchronously in HTTP handlers? (They MUST go to Kafka with a 202 Accepted response).
- **Vayyari Video**: Is there more than one `expo-video` instance per screen? (Must be a singleton).
- **Database / Migrations**: `.sql` migration files are strictly one-time run scripts and must be deleted after use (no EF Core migrations).
- **Code Alignment**: If a one-time migration was applied, ensure the app code is updated (e.g., `ON CONFLICT DO NOTHING`) so the issue never repeats.

### 🟡 Industry Best Practices (Should Fix)
- **Security**: Missing auth checks, SQL injection vectors, hardcoded secrets.
- **Performance**: N+1 query problems in EF Core, unnecessary React re-renders, missing database indexes.
- **Architecture**: Domain logic bleeding into API Controllers or React components.
- **Clean Code**: Poor variable naming, lack of error handling, or missing OpenTelemetry spans.

---

## Step 3: Plan & Propose

Output your findings as a structured Review Report:

```markdown
## Code Review Report

### 🔴 Critical Violations
- List of DeepLens standard violations.

### 🟡 Quality & Performance Issues
- List of best-practice improvements.

### 🛠️ Proposed Fix Plan
1. Detail the exact changes you plan to make to resolve the issues above.
2. ...
```

> **🛑 STOP — Present the report and the proposed fix plan to the user. Wait for their approval before making any code changes.**

---

## Step 4: Fix & Verify

Once the user approves the plan:
1. **Execute**: Modify the files to apply the proposed fixes.
2. **Verify**: Ensure the changes haven't broken the build. (e.g., if .NET was changed, remind the user about `./setupscripts/application/services/build-and-deploy.sh`).
3. **Summarize**: Provide a brief walkthrough of what was fixed and any necessary follow-up steps.
