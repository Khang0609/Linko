export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")   // bỏ dấu tiếng Việt
    .replace(/đ/g, "d").replace(/Đ/g, "D")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

// slug + hậu tố ngắn để đảm bảo @unique
export function uniqueSlug(name: string): string {
  const base = slugify(name) || "company"
  const suffix = Math.random().toString(36).slice(2, 8)
  return `${base}-${suffix}`
}
