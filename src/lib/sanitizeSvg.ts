/**
 * Strict SVG markup sanitizer to prevent script injection via inline SVG rendering.
 * Strips script/foreignObject/iframe/object/embed tags, inline event handlers (on*),
 * and javascript:/data:text/html URIs before rendering inside the DOM.
 */
export function sanitizeSvgMarkup(rawSvg: string | null | undefined): string {
  if (!rawSvg || typeof rawSvg !== "string") return "";

  let cleaned = rawSvg.trim();
  const svgStart = cleaned.toLowerCase().indexOf("<svg");
  if (svgStart === -1) return "";
  cleaned = cleaned.slice(svgStart);

  const svgEnd = cleaned.toLowerCase().lastIndexOf("</svg>");
  if (svgEnd !== -1) {
    cleaned = cleaned.slice(0, svgEnd + 6);
  }

  // Remove dangerous elements and their contents
  const blockedTags = ["script", "foreignObject", "iframe", "object", "embed", "applet", "meta", "link"];
  for (const tag of blockedTags) {
    const pairRegex = new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?<\\/${tag}>`, "gi");
    const selfRegex = new RegExp(`<${tag}\\b[^>]*\\/?>`, "gi");
    cleaned = cleaned.replace(pairRegex, "").replace(selfRegex, "");
  }

  // Strip inline event handlers (onload=, onclick=, onerror=, etc.)
  cleaned = cleaned.replace(/\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "");

  // Strip javascript: or vbscript: or data:text/html links in href / xlink:href / src
  cleaned = cleaned.replace(
    /(href|xlink:href|src)\s*=\s*(["'])\s*(?:javascript:|vbscript:|data:text\/html)[^"']*\2/gi,
    '$1="#"'
  );

  return cleaned;
}
