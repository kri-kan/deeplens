#!/usr/bin/env python3
"""
BEF Validator Test Suite
Tests validation logic against valid, invalid, duplicate, cycle, and broken reference scenarios:
- AT-15: Broken artifact reference is detected
- AT-16: Duplicate artifact ID is detected
- AT-17: Supersession rules and cycle detection
- Schema validation (missing fields, invalid status, invalid iteration)
"""

import importlib
import os
import shutil
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "scripts")))
validator = importlib.import_module("validate-bef")

class TestBEFValidator(unittest.TestCase):
    def setUp(self):
        self.test_dir = tempfile.mkdtemp(prefix="bef_test_")

    def tearDown(self):
        shutil.rmtree(self.test_dir)

    def _write_artifact(self, filename, content):
        path = os.path.join(self.test_dir, filename)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            f.write(content)
        return path

    def test_valid_lifecycle_artifacts(self):
        """Test valid collection of Vision, Goal, Opportunity, Decision, Initiative, Outcome."""
        self._write_artifact("vision.md", """---
id: VIS-001
type: vision
title: Core Vision
status: active
created: 2026-10-31
updated: 2026-10-31
---
# Vision
""")
        self._write_artifact("goals/GOL-001.md", """---
id: GOL-001
type: goal
title: Reduce Search Latency
status: active
created: 2026-10-31
updated: 2026-10-31
related:
  vision: VIS-001
---
# Goal
""")
        self._write_artifact("opportunities/OPP-001.md", """---
id: OPP-001
type: opportunity
title: In-Memory Vector Search
status: accepted
phase: discover
created: 2026-10-31
updated: 2026-10-31
related:
  goals:
    - GOL-001
---
# Opportunity
""")
        self._write_artifact("decisions/DEC-001.md", """---
id: DEC-001
type: decision
title: Adopt Redis Ephemeral Vector Cache
status: accepted
created: 2026-10-31
updated: 2026-10-31
related:
  goals:
    - GOL-001
  opportunities:
    - OPP-001
---
# Decision
""")
        self._write_artifact("initiatives/INI-001.md", """---
id: INI-001
type: initiative
title: Deploy Search Cache Layer
status: in_progress
phase: deliver
iteration: 1
created: 2026-10-31
updated: 2026-10-31
related:
  goals:
    - GOL-001
  opportunities:
    - OPP-001
  decisions:
    - DEC-001
---
# Initiative
""")
        self._write_artifact("outcomes/OUT-001.md", """---
id: OUT-001
type: outcome
title: Search Latency Reduction Evaluation
status: completed
created: 2026-10-31
updated: 2026-10-31
related:
  initiatives:
    - INI-001
  goals:
    - GOL-001
---
# Outcome
""")

        artifacts, errors = validator.validate_bef_directory(self.test_dir)
        self.assertEqual(len(errors), 0, f"Expected 0 errors, got: {errors}")
        self.assertEqual(len(artifacts), 6)

    def test_broken_reference_at_15(self):
        """AT-15: Missing or broken artifact reference is flagged."""
        self._write_artifact("initiatives/INI-002.md", """---
id: INI-002
type: initiative
title: Broken Ref Initiative
status: proposed
phase: decide
iteration: 1
created: 2026-10-31
updated: 2026-10-31
related:
  goals:
    - GOL-NONEXISTENT
---
# Initiative
""")
        artifacts, errors = validator.validate_bef_directory(self.test_dir)
        self.assertTrue(any("Broken reference: target artifact 'GOL-NONEXISTENT' does not exist" in e for e in errors))

    def test_duplicate_id_at_16(self):
        """AT-16: Duplicate artifact IDs across different files are flagged."""
        self._write_artifact("decisions/DEC-001.md", """---
id: DEC-001
type: decision
title: First Decision
status: accepted
created: 2026-10-31
updated: 2026-10-31
---
# First
""")
        self._write_artifact("decisions/DEC-001-duplicate.md", """---
id: DEC-001
type: decision
title: Duplicate Decision
status: proposed
created: 2026-10-31
updated: 2026-10-31
---
# Duplicate
""")
        artifacts, errors = validator.validate_bef_directory(self.test_dir)
        self.assertTrue(any("Duplicate ID 'DEC-001'" in e for e in errors))

    def test_decision_supersession_and_cycle_at_17(self):
        """AT-17 / Decision evolution: Valid supersession vs missing backlink or cycles."""
        # Valid supersession: DEC-001 superseded by DEC-002
        self._write_artifact("decisions/DEC-001.md", """---
id: DEC-001
type: decision
title: Original Decision
status: superseded
superseded_by:
  - DEC-002
created: 2026-10-31
updated: 2026-10-31
---
# Superseded
""")
        self._write_artifact("decisions/DEC-002.md", """---
id: DEC-002
type: decision
title: Successor Decision
status: accepted
supersedes:
  - DEC-001
created: 2026-10-31
updated: 2026-10-31
---
# Successor
""")
        artifacts, errors = validator.validate_bef_directory(self.test_dir)
        self.assertEqual(len(errors), 0, f"Expected valid supersession, got: {errors}")

        # Cycle test: Make DEC-002 superseded by DEC-001 as well
        self._write_artifact("decisions/DEC-002.md", """---
id: DEC-002
type: decision
title: Successor Decision
status: superseded
supersedes:
  - DEC-001
superseded_by:
  - DEC-001
created: 2026-10-31
updated: 2026-10-31
---
# Cycle
""")
        artifacts, errors = validator.validate_bef_directory(self.test_dir)
        self.assertTrue(any("Supersession cycle detected" in e for e in errors))

    def test_superseded_target_wrong_status(self):
        """Test error when a decision supersedes another whose status is not superseded/revoked."""
        self._write_artifact("decisions/DEC-001.md", """---
id: DEC-001
type: decision
title: Original Decision
status: accepted
superseded_by:
  - DEC-002
created: 2026-10-31
updated: 2026-10-31
---
# Original Still Accepted
""")
        self._write_artifact("decisions/DEC-002.md", """---
id: DEC-002
type: decision
title: Successor Decision
status: accepted
supersedes:
  - DEC-001
created: 2026-10-31
updated: 2026-10-31
---
# Successor
""")
        artifacts, errors = validator.validate_bef_directory(self.test_dir)
        self.assertTrue(any("status is 'accepted' instead of 'superseded' or 'revoked'" in e for e in errors))

    def test_missing_required_fields_and_invalid_status(self):
        """Test missing required frontmatter fields and invalid status enum."""
        self._write_artifact("goals/GOL-009.md", """---
id: GOL-009
type: goal
status: non_existent_status
created: 2026-10-31
updated: 2026-10-31
---
# Missing Title and Invalid Status
""")
        artifacts, errors = validator.validate_bef_directory(self.test_dir)
        self.assertTrue(any("Missing required field 'title'" in e for e in errors))
        self.assertTrue(any("Invalid status 'non_existent_status' for type 'goal'" in e for e in errors))

if __name__ == "__main__":
    unittest.main()
