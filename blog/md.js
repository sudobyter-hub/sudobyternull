// =============================================================================
// md.js — tiny, safe markdown renderer (no deps, ~2KB)
// Features: # headings, **bold**, *italic*, `inline code`, ```fenced code```,
// - lists, 1. ordered lists, [text](url), > quotes, --- hr, tables (basic), paragraphs.
// All HTML is escaped first; markdown structure re-inserts trusted tags.
// =============================================================================

window.renderMarkdown = function renderMarkdown(src) {
    if (!src) return '';

    // 1) Normalize line endings
    src = src.replace(/\r\n?/g, '\n');

    // 2) Extract fenced code blocks FIRST (so nothing inside gets processed)
    const codeBlocks = [];
    src = src.replace(/```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g, (_, lang, code) => {
        codeBlocks.push({ lang, code: escapeHtml(code.replace(/\n$/, '')) });
        return `\x00CODEBLOCK${codeBlocks.length - 1}\x00`;
    });

    // 2b) Extract images BEFORE escapeHtml so caption quotes survive
    const images = [];
    src = src.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g, (m, alt, srcUrl, cap) => {
        if (!/^(\/|\.\.?\/|[a-z0-9_-]+\/|[a-z0-9_-]+\.(png|jpe?g|gif|svg|webp))/i.test(srcUrl)) return m;
        images.push({
            src: srcUrl,
            alt: escapeHtml(alt),
            cap: cap ? escapeHtml(cap) : ''
        });
        return `\x00IMAGE${images.length - 1}\x00`;
    });

    // 3) Escape remaining HTML
    src = escapeHtml(src);

    // 4) Tables (GFM-ish, simple)
    src = src.replace(/(^\|[^\n]+\|\n\|[-:| ]+\|\n(?:\|[^\n]+\|\n?)+)/gm, (block) => {
        const lines = block.trim().split('\n');
        const headers = splitRow(lines[0]);
        const rows = lines.slice(2).map(splitRow);
        let html = '<table class="md-table"><thead><tr>';
        headers.forEach(h => html += `<th>${inline(h)}</th>`);
        html += '</tr></thead><tbody>';
        rows.forEach(r => {
            html += '<tr>';
            r.forEach(c => html += `<td>${inline(c)}</td>`);
            html += '</tr>';
        });
        html += '</tbody></table>';
        return html;
    });

    // 5) Blockquotes
    src = src.replace(/(^> .+(\n> .+)*)/gm, (block) => {
        const inner = block.replace(/^> /gm, '').trim();
        return `<blockquote>${inline(inner)}</blockquote>`;
    });

    // 6) Headings
    src = src.replace(/^###### (.+)$/gm, '<h6>$1</h6>');
    src = src.replace(/^##### (.+)$/gm, '<h5>$1</h5>');
    src = src.replace(/^#### (.+)$/gm, '<h4>$1</h4>');
    src = src.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    src = src.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    src = src.replace(/^# (.+)$/gm, '<h1>$1</h1>');

    // 7) Horizontal rule
    src = src.replace(/^-{3,}$/gm, '<hr>');

    // 8) Unordered lists (consecutive - lines)
    src = src.replace(/((?:^- .+(?:\n|$))+)/gm, (block) => {
        const items = block.trim().split('\n').map(l => l.replace(/^- /, ''));
        return '<ul>' + items.map(i => `<li>${inline(i)}</li>`).join('') + '</ul>';
    });

    // 9) Ordered lists
    src = src.replace(/((?:^\d+\. .+(?:\n|$))+)/gm, (block) => {
        const items = block.trim().split('\n').map(l => l.replace(/^\d+\. /, ''));
        return '<ol>' + items.map(i => `<li>${inline(i)}</li>`).join('') + '</ol>';
    });

    // 10) Paragraphs — any remaining non-block line-group becomes a <p>
    src = src.split(/\n{2,}/).map(chunk => {
        const trimmed = chunk.trim();
        if (!trimmed) return '';
        // already a block element?
        if (/^<(h\d|ul|ol|pre|blockquote|table|hr)/.test(trimmed)) return trimmed;
        // code-block-only paragraph → leave placeholder; restored to <pre> in step 11
        if (/^(\x00CODEBLOCK\d+\x00\s*)+$/.test(trimmed)) return trimmed;
        // image-only paragraph → render figures directly (block-level)
        if (/^(\x00IMAGE\d+\x00\s*)+$/.test(trimmed)) {
            return trimmed.replace(/\x00IMAGE(\d+)\x00/g, (_, i) => imgFigure(images[+i]));
        }
        return `<p>${inline(trimmed.replace(/\n/g, ' '))}</p>`;
    }).join('\n');

    // 11) Restore code blocks (escaped content, trusted <pre><code>)
    src = src.replace(/\x00CODEBLOCK(\d+)\x00/g, (_, i) => {
        const { lang, code } = codeBlocks[+i];
        const langClass = lang ? ` class="lang-${escapeHtml(lang)}"` : '';
        return `<pre><code${langClass}>${code}</code></pre>`;
    });

    // 12) Restore any images left inline inside text paragraphs → bare <img>
    src = src.replace(/\x00IMAGE(\d+)\x00/g, (_, i) => imgInline(images[+i]));

    return src;
};

function imgFigure({ src, alt, cap }) {
    return `<figure class="md-figure"><img src="${src}" alt="${alt}" loading="lazy">` +
           (cap ? `<figcaption>${cap}</figcaption>` : '') +
           `</figure>`;
}

function imgInline({ src, alt }) {
    return `<img src="${src}" alt="${alt}" loading="lazy" class="md-img-inline">`;
}

function escapeHtml(s) {
    return s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// Inline formatting — runs on already-escaped content
function inline(s) {
    // inline code — must come first so ** inside code isn't bolded
    s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
    // bold
    s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    // italic (avoid eating bold markers — simple heuristic)
    s = s.replace(/(^|\s)\*([^*\s][^*]*?)\*(?=\s|[.,!?;:)]|$)/g, '$1<em>$2</em>');
    // links [text](url) — only http(s) or mailto, rejects javascript:
    s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, text, url) => {
        if (!/^(https?:\/\/|mailto:|#|\/)/i.test(url)) return _;
        const external = /^https?:/i.test(url);
        const attrs = external ? ' target="_blank" rel="noopener noreferrer"' : '';
        return `<a href="${url}"${attrs}>${text}</a>`;
    });
    return s;
}

function splitRow(line) {
    return line.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim());
}
