/**
 * DeepLens High-Performance Client-Side Fuzzy Search Engine
 * 
 * Provides typo-tolerant matching using a hybrid token-level Levenshtein
 * and substring/trigram scoring algorithm with zero external dependencies.
 */

export interface FuzzyMatchResult<T> {
  item: T;
  score: number; // 0.0 (no match) to 1.0 (exact match)
}

/**
 * Calculates standard Levenshtein distance between two normalized strings.
 */
export function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const row = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) {
    row[j] = j;
  }

  for (let i = 1; i <= a.length; i++) {
    let prev = i;
    for (let j = 1; j <= b.length; j++) {
      let val: number;
      if (a[i - 1] === b[j - 1]) {
        val = row[j - 1];
      } else {
        val = Math.min(row[j - 1] + 1, prev + 1, row[j] + 1);
      }
      row[j - 1] = prev;
      prev = val;
    }
    row[b.length] = prev;
  }

  return row[b.length];
}

/**
 * Computes token similarity between a query token and a target word.
 */
function tokenSimilarity(queryToken: string, targetWord: string): number {
  if (queryToken === targetWord) return 1.0;
  if (targetWord.startsWith(queryToken)) return 0.95;
  if (targetWord.includes(queryToken)) return 0.85;

  const maxLen = Math.max(queryToken.length, targetWord.length);
  if (maxLen === 0) return 1.0;

  // Maximum allowed edits based on query length
  const maxAllowedEdits = queryToken.length <= 3 ? 1 : queryToken.length <= 6 ? 2 : 3;
  const dist = levenshteinDistance(queryToken, targetWord);

  if (dist <= maxAllowedEdits) {
    return Math.max(0, 1 - dist / maxLen);
  }

  return 0;
}

/**
 * Scores how closely a target text matches a search query.
 * Returns a score between 0.0 and 1.0.
 */
export function scoreFuzzyMatch(targetText: string, query: string): number {
  if (!query || !query.trim()) return 1.0;
  if (!targetText || !targetText.trim()) return 0.0;

  const normalizedTarget = targetText.toLowerCase().trim();
  const normalizedQuery = query.toLowerCase().trim();

  // 1. Direct exact or substring matches
  if (normalizedTarget === normalizedQuery) return 1.0;
  if (normalizedTarget.startsWith(normalizedQuery)) return 0.95;
  if (normalizedTarget.includes(normalizedQuery)) return 0.9;

  // 2. Tokenize query and target into words
  const queryTokens = normalizedQuery.split(/\s+/).filter(Boolean);
  const targetWords = normalizedTarget.split(/[\s,._\-/+]+/).filter(Boolean);

  if (!queryTokens.length || !targetWords.length) return 0.0;

  // Each query token must match at least one target word reasonably well
  let totalTokenScore = 0;

  for (const qToken of queryTokens) {
    let bestWordScore = 0;
    for (const tWord of targetWords) {
      const sim = tokenSimilarity(qToken, tWord);
      if (sim > bestWordScore) {
        bestWordScore = sim;
      }
      if (bestWordScore === 1.0) break;
    }

    // If any token has no good match, penalize heavily
    if (bestWordScore < 0.45) {
      return 0.0;
    }
    totalTokenScore += bestWordScore;
  }

  return totalTokenScore / queryTokens.length;
}

/**
 * Checks whether a target text fuzzy-matches a query with a given minimum threshold.
 * Default threshold is 0.5.
 */
export function isFuzzyMatch(targetText: string, query: string, threshold = 0.5): boolean {
  if (!query || !query.trim()) return true;
  return scoreFuzzyMatch(targetText, query) >= threshold;
}

/**
 * Filters and ranks a collection of items using multi-field fuzzy search.
 * Items with higher relevance scores appear first.
 */
export function fuzzyFilter<T>(
  items: T[],
  query: string,
  getFieldValues: (item: T) => (string | null | undefined)[],
  threshold = 0.5
): T[] {
  if (!query || !query.trim()) return items;

  const scored: FuzzyMatchResult<T>[] = [];

  for (const item of items) {
    const fields = getFieldValues(item);
    let bestScore = 0;

    for (const field of fields) {
      if (!field) continue;
      const score = scoreFuzzyMatch(field, query);
      if (score > bestScore) {
        bestScore = score;
      }
      if (bestScore === 1.0) break;
    }

    if (bestScore >= threshold) {
      scored.push({ item, score: bestScore });
    }
  }

  // Sort descending by relevance score
  scored.sort((a, b) => b.score - a.score);
  return scored.map((s) => s.item);
}
