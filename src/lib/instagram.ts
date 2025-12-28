export const normalizeInstagramHandle = (
  value?: string | null
): string | null => {
  if (value == null) return null;

  const trimmed = String(value).trim();
  if (!trimmed) return null;

  const noAt = trimmed.startsWith("@") ? trimmed.slice(1) : trimmed;
  const cleaned = noAt.trim();

  if (!cleaned) return null;
  const lowered = cleaned.toLowerCase();
  if (lowered === "null" || lowered === "undefined") return null;

  return cleaned;
};

export const getInstagramProfileUrl = (value?: string | null): string | null => {
  const handle = normalizeInstagramHandle(value);
  return handle ? `https://instagram.com/${handle}` : null;
};
