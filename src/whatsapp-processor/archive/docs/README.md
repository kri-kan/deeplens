# Archived Documentation

This folder contains documentation that has been consolidated, superseded, or is no longer actively maintained but preserved for historical reference.

## Contents

### Outdated/Superseded Documents

#### `blueprintValidation.md`
- **Status**: Superseded by actual implementation
- **Description**: Original specification/blueprint from project inception
- **Reason for Archive**: The actual codebase has evolved beyond this initial spec

#### `INTEGRATION_STATUS.md`
- **Status**: Outdated (pre-Kafka implementation)
- **Description**: Status document for the original EventEmitter-based message queue
- **Reason for Archive**: System was refactored to use Kafka for reliable processing
- **See Instead**: `MESSAGE_GROUPING_SYSTEM.md` for current implementation

#### `INTEGRATION_GUIDE.md`
- **Status**: Redundant
- **Description**: Integration guide for message processing queue
- **Reason for Archive**: Content now covered in README.md and QUICK_REFERENCE.md

### Consolidated Documents

The following documents were merged into `MESSAGE_GROUPING_SYSTEM.md`:

#### `MESSAGE_GROUPING_FLAG.md`
- **Content**: Per-conversation grouping toggle functionality
- **Now in**: MESSAGE_GROUPING_SYSTEM.md (Section: "Enable & Configure Grouping")

#### `MANUAL_GROUPING_FEATURES.md`
- **Content**: Split group and boundary correction features
- **Now in**: MESSAGE_GROUPING_SYSTEM.md (Section: "Manual Corrections")

### Granular Technical Documents

These technical deep-dives were removed to reduce documentation overhead. Key information has been incorporated into main docs where relevant.

#### `BAILEYS_SYNC_STRATEGY.md`
- **Content**: Detailed sync strategy for Baileys library
- **Reason for Archive**: Too granular; core concepts covered in BAILEYS_API_DEEP_DIVE.md

#### `CHATS_SET_EVENT.md`
- **Content**: Specific event handler documentation
- **Reason for Archive**: Implementation-specific; covered in codebase comments

#### `EXISTING_SESSION_GUIDE.md`
- **Content**: Guide for handling existing WhatsApp sessions
- **Reason for Archive**: Covered in main README.md and QUICK_REFERENCE.md

#### `LID_MIGRATION.md`
- **Content**: Migration guide for Baileys v7 LID changes
- **Reason for Archive**: Migration complete; LID_IMPLEMENTATION.md covers current state

#### `QUESTIONS_ANSWERED.md`
- **Content**: Q&A format documentation
- **Reason for Archive**: Information distributed to relevant docs; Q&A format not ideal for reference

---

## Accessing Archived Documents

These files are preserved here for:
- Historical reference
- Understanding project evolution
- Recovering specific implementation details if needed

## Current Documentation

For up-to-date documentation, see:
- `../README.md` - Main entry point
- `../MESSAGE_GROUPING_SYSTEM.md` - Complete grouping system guide
- `../docs/` - Active technical documentation
- `../QUICK_REFERENCE.md` - Quick commands and common tasks

---

**Last Updated**: 2026-01-08  
**Archive Created**: As part of documentation consolidation (36 → 20 files)
