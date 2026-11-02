#!/usr/bin/env python3
"""
BEF Repository Validator
Validates Business Evolution Framework (BEF) artifacts:
- Required YAML frontmatter (id, type, title, status, created, updated)
- Unique and consistent artifact IDs
- Valid artifact types and statuses
- Valid phase and iteration metadata
- Reference integrity (broken links to non-existent artifacts)
- Decision supersession consistency and cycle detection
"""

import os
import re
import sys
import yaml
from pathlib import Path

VALID_TYPES = {"vision", "goal", "opportunity", "decision", "initiative", "outcome"}

VALID_STATUSES = {
    "vision": {"active", "archived", "draft"},
    "goal": {"active", "achieved", "abandoned", "paused"},
    "opportunity": {"identified", "evaluating", "accepted", "deferred", "rejected"},
    "decision": {"proposed", "under_review", "accepted", "rejected", "deferred", "superseded", "revoked"},
    "initiative": {"proposed", "approved", "in_progress", "paused", "completed", "cancelled"},
    "outcome": {"draft", "completed"}
}

VALID_PHASES = {"discover", "decide", "deliver", "learn"}

ID_PREFIXES = {
    "vision": "VIS",
    "goal": "GOL",
    "opportunity": "OPP",
    "decision": "DEC",
    "initiative": "INI",
    "outcome": "OUT"
}

def parse_frontmatter(file_path):
    """Extract frontmatter and body from a markdown file."""
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    match = re.match(r"^---\s*\n(.*?)\n---\s*\n(.*)$", content, re.DOTALL)
    if not match:
        return None, "Missing YAML frontmatter (must start and close with ---)"

    yaml_text = match.group(1)
    body = match.group(2)
    try:
        data = yaml.safe_load(yaml_text)
        if not isinstance(data, dict):
            return None, "Frontmatter is not a valid YAML dictionary"
        return data, None
    except yaml.YAMLError as e:
        return None, f"YAML parsing error: {e}"

def collect_artifacts(base_dir, ignore_templates=True):
    """Collect all markdown files in the business directory except templates and brief."""
    artifacts = {}
    errors = []

    IGNORE_DIRS = {"templates", "integrations"}
    IGNORE_FILES = {
        "BEF-IMPLEMENTATION-BRIEF.md",
        "BEF_ACCEPTANCE_VERIFICATION.md",
        "INSTRUCTIONS.md",
        "index.md",
        "README.md",
        "framework adoption prompt.md"
    }

    for root, dirs, files in os.walk(base_dir):
        # Exclude ignored subdirectories
        dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]

        for f in files:
            if not f.endswith(".md"):
                continue
            if f in IGNORE_FILES:
                continue

            full_path = Path(root) / f
            fm, err = parse_frontmatter(full_path)
            if err:
                errors.append(f"[{full_path}] {err}")
                continue

            art_id = fm.get("id")
            if not art_id:
                errors.append(f"[{full_path}] Missing required 'id' in frontmatter")
                continue

            if art_id in artifacts:
                existing_file = artifacts[art_id]["path"]
                errors.append(f"Duplicate ID '{art_id}' found in '{full_path}' (already defined in '{existing_file}')")
            else:
                artifacts[art_id] = {
                    "path": full_path,
                    "frontmatter": fm
                }

    return artifacts, errors

def validate_artifact_schema(art_id, item):
    """Validate individual artifact fields."""
    fm = item["frontmatter"]
    path = item["path"]
    errors = []

    # Required fields
    required_fields = ["id", "type", "title", "status", "created", "updated"]
    for field in required_fields:
        if field not in fm:
            errors.append(f"[{path}] Missing required field '{field}'")

    art_type = fm.get("type")
    if art_type not in VALID_TYPES:
        errors.append(f"[{path}] Invalid artifact type '{art_type}'. Expected one of: {sorted(VALID_TYPES)}")
        return errors

    # Check ID prefix consistency
    expected_prefix = ID_PREFIXES.get(art_type)
    if expected_prefix and not str(art_id).startswith(expected_prefix):
        errors.append(f"[{path}] ID '{art_id}' does not match expected prefix '{expected_prefix}' for type '{art_type}'")

    status = fm.get("status")
    allowed_statuses = VALID_STATUSES.get(art_type, set())
    if status not in allowed_statuses:
        errors.append(f"[{path}] Invalid status '{status}' for type '{art_type}'. Allowed: {sorted(allowed_statuses)}")

    # Initiative-specific validation
    if art_type == "initiative":
        phase = fm.get("phase")
        if phase and phase not in VALID_PHASES:
            errors.append(f"[{path}] Invalid phase '{phase}'. Expected one of: {sorted(VALID_PHASES)}")
        iteration = fm.get("iteration")
        if iteration is not None and (not isinstance(iteration, int) or iteration < 1):
            errors.append(f"[{path}] 'iteration' must be a positive integer, got: {iteration}")

    # Opportunity-specific validation
    if art_type == "opportunity":
        phase = fm.get("phase")
        if phase and phase not in VALID_PHASES:
            errors.append(f"[{path}] Invalid phase '{phase}'. Expected one of: {sorted(VALID_PHASES)}")

    return errors

def extract_references(fm):
    """Extract all referenced artifact IDs from frontmatter."""
    refs = []
    related = fm.get("related", {})
    if isinstance(related, dict):
        for k, v in related.items():
            if k in ("openspec", "technical_adrs"):
                continue  # These link to external files, not BEF IDs
            if isinstance(v, list):
                refs.extend([item for item in v if isinstance(item, str)])
            elif isinstance(v, str):
                refs.append(v)

    # Decision supersession fields
    supersedes = fm.get("supersedes", [])
    if isinstance(supersedes, list):
        refs.extend(supersedes)
    superseded_by = fm.get("superseded_by", [])
    if isinstance(superseded_by, list):
        refs.extend(superseded_by)

    return refs

def validate_references(artifacts):
    """Validate that all referenced artifact IDs exist."""
    errors = []
    for art_id, item in artifacts.items():
        fm = item["frontmatter"]
        path = item["path"]
        refs = extract_references(fm)
        for ref in refs:
            if ref not in artifacts:
                errors.append(f"[{path}] Broken reference: target artifact '{ref}' does not exist")
    return errors

def validate_decisions(artifacts):
    """Validate decision evolution rules and detect cycles."""
    errors = []
    decisions = {k: v for k, v in artifacts.items() if v["frontmatter"].get("type") == "decision"}

    for dec_id, item in decisions.items():
        fm = item["frontmatter"]
        path = item["path"]
        status = fm.get("status")

        supersedes = fm.get("supersedes") or []
        superseded_by = fm.get("superseded_by") or []

        # If a decision is superseded, it should specify superseded_by
        if status == "superseded" and not superseded_by:
            errors.append(f"[{path}] Decision is marked 'superseded' but has no 'superseded_by' reference")

        # Superseded_by targets must exist and reference back in their 'supersedes'
        for repl_id in superseded_by:
            if repl_id in decisions:
                repl_fm = decisions[repl_id]["frontmatter"]
                repl_supersedes = repl_fm.get("supersedes") or []
                if dec_id not in repl_supersedes:
                    errors.append(f"[{path}] Decision {dec_id} is superseded_by {repl_id}, but {repl_id} does not list {dec_id} in its 'supersedes'")

        # Supersedes targets must exist and reference back in their 'superseded_by'
        for prev_id in supersedes:
            if prev_id in decisions:
                prev_fm = decisions[prev_id]["frontmatter"]
                prev_superseded_by = prev_fm.get("superseded_by") or []
                if dec_id not in prev_superseded_by:
                    errors.append(f"[{path}] Decision {dec_id} supersedes {prev_id}, but {prev_id} does not list {dec_id} in its 'superseded_by'")
                if prev_fm.get("status") not in ("superseded", "revoked"):
                    errors.append(f"[{path}] Decision {dec_id} supersedes {prev_id}, but {prev_id} status is '{prev_fm.get('status')}' instead of 'superseded' or 'revoked'")

        # Check for cycles in supersession chain
        visited = set()
        current = dec_id
        while current:
            if current in visited:
                errors.append(f"[{path}] Supersession cycle detected involving '{current}'")
                break
            visited.add(current)
            curr_item = decisions.get(current)
            if not curr_item:
                break
            curr_sb = curr_item["frontmatter"].get("superseded_by") or []
            current = curr_sb[0] if curr_sb else None

    return errors

def validate_bef_directory(target_dir, ignore_templates=True):
    """Run full validation against a BEF directory."""
    all_errors = []
    artifacts, collect_errors = collect_artifacts(target_dir, ignore_templates=ignore_templates)
    all_errors.extend(collect_errors)

    for art_id, item in artifacts.items():
        all_errors.extend(validate_artifact_schema(art_id, item))

    all_errors.extend(validate_references(artifacts))
    all_errors.extend(validate_decisions(artifacts))

    return artifacts, all_errors

def main():
    target_dir = sys.argv[1] if len(sys.argv) > 1 else "business"
    if not os.path.isdir(target_dir):
        print(f"Error: Target directory '{target_dir}' does not exist.")
        sys.exit(1)

    print(f"Validating BEF artifacts in: {target_dir}")
    artifacts, errors = validate_bef_directory(target_dir)

    print(f"Total valid artifacts indexed: {len(artifacts)}")
    for art_id, item in sorted(artifacts.items()):
        fm = item["frontmatter"]
        print(f"  • {art_id} [{fm.get('type')}] - {fm.get('title')} ({fm.get('status')})")

    if errors:
        print(f"\n❌ Validation FAILED with {len(errors)} error(s):")
        for err in errors:
            print(f"  - {err}")
        sys.exit(1)
    else:
        print("\n✅ All BEF artifacts valid and consistent.")
        sys.exit(0)

if __name__ == "__main__":
    main()
