const CODE_PLACEHOLDER_PREFIX = "__CODE_BLOCK__";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function sanitizeUrl(url: string): string {
  const trimmed = url.trim();
  if (/^https?:\/\//i.test(trimmed) || /^mailto:/i.test(trimmed)) {
    return trimmed;
  }

  return "#";
}

function renderInline(input: string) {
  let html = escapeHtml(input);

  html = html.replace(/`([^`]+)`/g, (_match, code) => `<code>${escapeHtml(code)}</code>`);
  html = html.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    (_match, text, url) =>
      `<a href="${escapeHtml(sanitizeUrl(url))}" target="_blank" rel="noreferrer">${escapeHtml(text)}</a>`,
  );
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*([^*]+)\*/g, "<em>$1</em>");

  return html;
}

export function renderMarkdownLite(markdown: string) {
  const normalized = markdown.replace(/\r\n/g, "\n");
  if (!normalized.trim()) {
    return "";
  }

  const codeBlocks: string[] = [];
  const withoutCodeBlocks = normalized.replace(/```([\s\S]*?)```/g, (_match, code) => {
    const codeIndex = codeBlocks.push(`<pre><code>${escapeHtml(code.trim())}</code></pre>`) - 1;
    return `${CODE_PLACEHOLDER_PREFIX}${codeIndex}__`;
  });

  const lines = withoutCodeBlocks.split("\n");
  const htmlLines: string[] = [];
  let inUnorderedList = false;
  let inOrderedList = false;

  function closeLists() {
    if (inUnorderedList) {
      htmlLines.push("</ul>");
      inUnorderedList = false;
    }
    if (inOrderedList) {
      htmlLines.push("</ol>");
      inOrderedList = false;
    }
  }

  lines.forEach((line) => {
    const trimmed = line.trim();

    if (!trimmed) {
      closeLists();
      return;
    }

    if (trimmed.startsWith(`${CODE_PLACEHOLDER_PREFIX}`)) {
      closeLists();
      htmlLines.push(trimmed);
      return;
    }

    const orderedMatch = trimmed.match(/^\d+\.\s+(.+)$/);
    if (orderedMatch) {
      if (inUnorderedList) {
        htmlLines.push("</ul>");
        inUnorderedList = false;
      }
      if (!inOrderedList) {
        htmlLines.push("<ol>");
        inOrderedList = true;
      }
      htmlLines.push(`<li>${renderInline(orderedMatch[1])}</li>`);
      return;
    }

    const unorderedMatch = trimmed.match(/^[-*]\s+(.+)$/);
    if (unorderedMatch) {
      if (inOrderedList) {
        htmlLines.push("</ol>");
        inOrderedList = false;
      }
      if (!inUnorderedList) {
        htmlLines.push("<ul>");
        inUnorderedList = true;
      }
      htmlLines.push(`<li>${renderInline(unorderedMatch[1])}</li>`);
      return;
    }

    closeLists();

    if (trimmed.startsWith("> ")) {
      htmlLines.push(`<blockquote>${renderInline(trimmed.slice(2))}</blockquote>`);
      return;
    }

    htmlLines.push(`<p>${renderInline(trimmed)}</p>`);
  });

  closeLists();

  let html = htmlLines.join("");
  codeBlocks.forEach((block, index) => {
    html = html.replace(`${CODE_PLACEHOLDER_PREFIX}${index}__`, block);
  });

  return html;
}
