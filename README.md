# sudobyter — portfolio & writeups

The source for **[aliwaleed.xyz](https://aliwaleed.xyz)** — my personal site as a
penetration tester & bug bounty hunter. Hand-rolled HTML / CSS / JavaScript, no
build step, no framework, no tracker. The whole thing is one `index.html`, one
stylesheet, two scripts, and a folder of posts.

```
┌─[sudobyter@thm] ~
└─$ whoami
   pentester · bug-bounty hunter · CTF player
   site : aliwaleed.xyz
   repo : github.com/sudobyter-hub/sudobyternull
```

---

## What's on the site

- **Hero terminal** with a boot animation and a typed banner.
- **Interactive nmap emulator** — a real-feel scan engine (`nmap-engine.js`)
  with phased output, NSE-style script chatter, OS fingerprinting, and a couple
  of safe targets baked in (`scanme.nmap.org`, `testphp.vulnweb.com`).
  Try `nmap -sV -sC -A scanme.nmap.org`.
- **About / Skills / Certifications / Projects / Contact** sections.
- **Blog & writeups** — markdown posts rendered in a modal with a tiny
  zero-dependency markdown engine (`blog/md.js`). Each post is just an entry in
  `blog/posts.js`.

---

## Project structure

```
.
├── index.html         # single-page entry point
├── style.css          # all styling (dark hacker aesthetic, JetBrains Mono)
├── script.js          # boot sequence, terminal commands, blog rendering
├── nmap-engine.js     # interactive nmap scan emulator
├── blog/
│   ├── md.js          # ~2KB markdown renderer (no deps)
│   └── posts.js       # blog posts as a JS array of objects
├── fonts/             # self-hosted JetBrains Mono (no Google Fonts)
├── img/               # cert badges, profile, etc.
└── CNAME              # GitHub Pages → aliwaleed.xyz
```

---

## Adding a blog post or CTF writeup

Open `blog/posts.js` and add an entry to the `BLOG_POSTS` array:

```js
{
    id: 'thm-something',                 // url-safe slug
    title: 'something — a short hook',
    date: '2026-05-16',                  // ISO date
    category: 'Writeup',                 // shows on the card
    tags: ['tryhackme', 'reverse-engineering'],
    excerpt: 'One-sentence pitch shown on the card.',
    readMin: 6,
    body: String.raw`
## headline

Body in markdown. Fenced code blocks, tables, blockquotes, lists,
**bold**, *italic*, \`inline code\`, [links](https://example.com) — all
supported by md.js.
`
}
```

That's it. The card grid in the Blog section is auto-populated, and clicking it
opens the post in the terminal-card modal.

### What the markdown renderer supports

Headings (`#`–`######`), paragraphs, **bold** / *italic*, `inline code`,
fenced code blocks (`` ```lang ``), `>` blockquotes, unordered + ordered lists,
GFM-ish tables, `---` horizontal rules, and `[text](url)` links (http(s),
mailto, anchor, root-relative — anything else is rejected by the parser, so
`javascript:` URLs can't sneak in).

---

## Running it locally

There's no build. Just open `index.html` in a browser:

```bash
# Option 1 — straight from disk
open index.html

# Option 2 — local server (so paths resolve like prod)
python3 -m http.server 8000
# then visit http://localhost:8000
```

---

## Deployment

GitHub Pages serves the repo as-is at the custom domain in `CNAME`
(`aliwaleed.xyz`). A push to the default branch triggers a Pages rebuild.

---

## Security posture

- **CSP** is set in `index.html`:
  `default-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none';`
- **No third-party assets.** Fonts are self-hosted; cert badges are local.
- **No tracking / analytics / cookies.**
- Email is obfuscated and links use `rel="noopener noreferrer"` for
  cross-origin targets.

Tagged releases mark hardening milestones:

- `v1.0-pre-security-hardening` — pre-CSP baseline.
- `v1.1-security-hardened` — CSP, self-hosted fonts, no external requests.

---

## License & attribution

Code and content © sudobyter. Cert badges belong to their respective issuers
(INE, eJPT, etc.) and are displayed under fair use.

Find me at **[aliwaleed.xyz](https://aliwaleed.xyz)** ·
[@aliwaleedhum](https://twitter.com/aliwaleedhum) ·
[github.com/sudobyter-hub](https://github.com/sudobyter-hub).
