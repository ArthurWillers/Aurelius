export const escapeHtml = (value) =>
  String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[character]));

export const escapeAttribute = escapeHtml;

export const scriptSafeJson = (value) =>
  JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");

export const slugify = (value) =>
  String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/(^-|-$)/g, "");

export const roundToFour = (value) => Math.round(value / 4) * 4;

export const listValue = (value) =>
  !value
    ? []
    : (Array.isArray(value) ? value : String(value).replace(/^\[|\]$/g, "").split(","))
        .map((item) => String(item).trim().replace(/^["']|["']$/g, ""))
        .filter(Boolean);
