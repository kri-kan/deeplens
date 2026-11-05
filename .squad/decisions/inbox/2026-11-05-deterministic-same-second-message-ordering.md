# Decision: Deterministic Same-Second Message Ordering via Insertion ID Tie-Breaking

**Date:** 2026-11-05  
**Author:** Krishna (Squad Lead & Coordinator) & Squad Team  
**Status:** Accepted  

## Context
In WhatsApp community groups where message grouping uses delimiter stickers (e.g., JC Fashion - Surat with strategy `"sticker"`), vendors frequently send product descriptions immediately followed by a delimiter sticker within the very same UTC second.

Under timestamp-only sorting (`ORDER BY timestamp DESC`), Postgres and JavaScript sorting engines non-deterministically reorder same-second rows. When a delimiter sticker was sorted before the preceding product's text description:
1. The text description appeared visually below the delimiter sticker.
2. In the chat view, this created spurious extra zones inside a single sticker boundary.

## Decision
Enforce a secondary sorting tie-breaker on internal auto-increment primary key `id` across all layers:
1. **Repository Queries (`conversation.repository.ts`)**:
   - Explicitly include `id` in `selectFields` and all pagination/windowing/fallback SQL queries.
   - Change `ORDER BY timestamp DESC` to `ORDER BY timestamp DESC, id DESC`.
   - Change `ORDER BY timestamp ASC` to `ORDER BY timestamp ASC, id ASC`.
2. **Frontend Model & Timeline Hook (`useIntelligentChatTimeline.ts`)**:
   - Add optional `id?: number` to `Message` interface in `wa-processor.service.ts`.
   - Update `mergeMessages` in `useIntelligentChatTimeline.ts`: when `b.timestamp === a.timestamp`, break ties using `(b.id || 0) - (a.id || 0)`. If ids are absent or equal, fallback to `b.messageId.localeCompare(a.messageId)`.

## Verification
- Unit test suite passed (65/65 tests passed in `whatsapp-processor`).
- TypeScript compiler verified clean in both `whatsapp-processor` and `vayyari`.
- Deployed via `./infrastructure/deploy.sh whatsapp-processor`.
- Verified live endpoint output on `120363027749102213@g.us` around timestamp `1787800738`: message `id: 193001` (text description for previous product) is strictly ordered before `id: 193002` (delimiter sticker).
