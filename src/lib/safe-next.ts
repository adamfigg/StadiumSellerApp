/** A `?next=` value, only if it's a same-site path, so links can't bounce people to another site. */
export const safeNext = (value: unknown): string | undefined =>
  typeof value === "string" && value.startsWith("/") && !value.startsWith("//") ? value : undefined;
