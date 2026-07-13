export function getTagIdentity(value: string): string {
  return normalizeTagValue(value)
    .toLocaleLowerCase()
    .replace(/[\s_-]+/g, "");
}

export function normalizeTagValue(value: string): string {
  return value
    .trim()
    .replace(/^#+/, "")
    .replace(/\s+/g, "-")
    .replace(/[\\#[\]|:*?<>\",]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}
