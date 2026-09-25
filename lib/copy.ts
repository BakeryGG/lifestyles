/** Exact "TODO", or a curator note that starts with "TODO:". Not "Todo Wool Tee". */
export function isUnfinishedCopy(value: string | null | undefined): boolean {
  if (value == null) return false;
  const trimmed = value.trim();
  if (trimmed.length === 0) return false;
  const upper = trimmed.toUpperCase();
  return upper === "TODO" || upper.startsWith("TODO:");
}

/**
 * Blank, the exact word TODO, or a TODO: note.
 * "Todo Wool Tee" and "Todoist" are real brands.
 */
export function isPlaceholderBrand(value: string | null | undefined): boolean {
  if (value == null) return true;
  const trimmed = value.trim();
  if (trimmed.length === 0) return true;
  return isUnfinishedCopy(trimmed);
}

export function isHttpUrl(value: string | null | undefined): boolean {
  if (!value) return false;
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/** http(s) URL whose hostname is not the placeholder "todo". */
export function isBuyableUrl(url: string | null | undefined): boolean {
  if (!isHttpUrl(url) || !url) return false;
  try {
    return new URL(url.trim()).hostname.toLowerCase() !== "todo";
  } catch {
    return false;
  }
}
