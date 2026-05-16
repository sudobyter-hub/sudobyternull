// =============================================================================
// Blog posts — markdown bodies embedded as template literals.
// No fetch, no CSP issues, works from file:// and https:// alike.
// =============================================================================

window.BLOG_POSTS = [
    {
        id: 'thm-crackme1',
        title: 'crackme1 — my first ELF reversed',
        date: '2026-05-16',
        category: 'Writeup',
        tags: ['tryhackme', 'reverse-engineering', 'binary-ninja', 'elf'],
        excerpt: 'TryHackMe / Reverse Elf Files. From `file crackme1` to the flag: stack-resident constants, a single-byte XOR-like check, and reading x86 instead of running it.',
        readMin: 6,
        link: 'writeups/reverse-elf-files/crackme1.html'
    },
    {
        id: 'nmap-advanced',
        title: 'Beyond -sV: Advanced Nmap for Real Engagements',
        date: '2026-04-10',
        category: 'Recon',
        tags: ['nmap', 'recon', 'pentesting'],
        excerpt: 'The difference between a junior and a senior on nmap isn\'t which flags they know — it\'s which they actually use, and in what order. Here\'s my playbook.',
        readMin: 7,
        body: String.raw`
## The problem with \`nmap -sV target\`

Every writeup on the internet opens with the same command. It's fine for a CTF, terrible for a real engagement. On a flat /24 you'll miss hosts behind ICMP filtering, flag yourself to every EDR in the building, and still have no idea what version of OpenSSH they're actually running.

This post is the order I scan things in on a real pentest, and why.

> **Try it live.** Scroll to the terminal at the top of this page and run \`nmap -sV -sC -A scanme.nmap.org\` — it's a full simulated scan with phased output, NSE scripts, and an OS fingerprint.

## Phase 1 — Host discovery that actually finds hosts

ICMP echo is blocked everywhere. Default nmap host discovery sends ICMP echo + TCP ACK to 80 + TCP SYN to 443 + ICMP timestamp. On a hardened network, that's a coin flip.

What I actually run:

\`\`\`bash
# Shotgun host discovery — TCP SYN to common ports, UDP to common services
nmap -sn -PE -PP -PS21,22,25,53,80,135,139,443,445,3389,8080 \
     -PA80,443,3389 -PU53,161 --source-port 53 10.10.14.0/24 -oA discovery
\`\`\`

Source port 53 sneaks past misconfigured firewalls that trust DNS replies. Combining SYN + ACK + UDP probes to multiple ports means if **any** one gets through, we see the host.

## Phase 2 — Fast port triage

Never do \`-p-\` first. Do a top-ports sweep, find services, **then** full-range only on interesting hosts.

\`\`\`bash
# Fast: top 1000 ports, aggressive timing, open ports only
nmap -sS --top-ports 1000 -T4 --open -v -iL live_hosts.txt -oA quick

# Then full range on the juicy boxes
nmap -sS -p- -T4 --min-rate 1000 -oA full 10.10.14.10
\`\`\`

\`--min-rate\` is the single best flag nobody uses. It tells nmap "send at least N packets/sec" and beats \`-T5\` for consistent speed without the packet loss.

## Phase 3 — Service + NSE the targeted way

Once you know what's open, be surgical:

\`\`\`bash
# Web
nmap -sV -sC --script "http-title,http-methods,http-headers,http-robots.txt,http-enum,http-vuln*" \
     -p 80,443,8080,8443 10.10.14.10

# SMB / AD — where the domain falls
nmap -sV --script "smb-os-discovery,smb-enum-shares,smb-enum-users,smb-vuln*,smb2-security-mode" \
     -p 139,445 10.10.14.10

# SSH — host key, auth methods, algorithms
nmap -sV --script "ssh-auth-methods,ssh2-enum-algos,ssh-hostkey" -p 22 10.10.14.10
\`\`\`

Run targeted NSE categories, not \`--script vuln\` blindly — you'll DoS someone's test environment and get the engagement paused.

## Phase 4 — Stealth when you need it

Default scans are loud. On a red team:

\`\`\`bash
# T1 timing + fragmentation + decoys + random order
nmap -sS -T1 -f --scan-delay 1s \
     -D RND:10 --randomize-hosts \
     --data-length 24 --source-port 53 \
     -p 445,3389 10.10.14.0/24
\`\`\`

Not magic — modern IDS will still catch you — but it buys time against lazy rule sets. Fragmentation (\`-f\`) + source port 53 + random data length breaks simple signature matches.

## Phase 5 — Output you can pipe

Never rely on \`-oN\` alone. Always \`-oA\` (all formats):

\`\`\`bash
nmap -sV -sC -oA engagement_scan 10.10.14.10
# Produces: engagement_scan.nmap, .gnmap, .xml
\`\`\`

Grep the \`.gnmap\`, parse the \`.xml\` into your report. The \`.nmap\` is for humans.

Quick grep tricks on the \`.gnmap\`:

\`\`\`bash
# All hosts with SSH
grep "22/open" *.gnmap | cut -d: -f1

# All hosts with port 445 and an SMB version
grep -E "445/open.*microsoft-ds" *.gnmap
\`\`\`

## The cheatsheet I actually have taped to my second monitor

| Flag | What it does | When I use it |
|---|---|---|
| \`-sS\` | SYN (half-open) | Default. Always. |
| \`-sV\` | Version detection | Every scan after discovery |
| \`-sC\` | Default NSE scripts | Combined with \`-sV\` |
| \`-A\` | \`-sV -sC -O\` + traceroute | First look at a box |
| \`-O\` | OS fingerprint | When I need the OS for exploit selection |
| \`-Pn\` | Skip host discovery | When ping is blocked |
| \`-n\` | No DNS | Speed + OPSEC |
| \`--min-rate 1000\` | Min packets/sec | Every fast scan |
| \`-p-\` | All 65535 ports | Only on confirmed live hosts |
| \`--reason\` | Why port is marked as it is | Debugging weird results |
| \`-v\` / \`-vv\` | Verbose | Always \`-v\`. \`-vv\` when debugging. |

## TL;DR

1. Discover with TCP + UDP probes, not just ICMP.
2. Top-ports fast. Full-range only where it matters.
3. Targeted NSE by service, never \`--script vuln\` blind.
4. \`-oA\` every scan.
5. If you need stealth, slow down first. Fancy flags are secondary.

Go run the live emulator above and try the full chain:

\`\`\`bash
nmap -sS --top-ports 1000 -T4 --open -v scanme.nmap.org
nmap -sV -sC -A -p- scanme.nmap.org
nmap --script=vuln -p 80,443 testphp.vulnweb.com
\`\`\`
`
    },

    {
        id: 'bb-recon',
        title: 'My Bug Bounty Recon Workflow',
        date: '2026-03-22',
        category: 'Bug Bounty',
        tags: ['bugbounty', 'recon', 'automation'],
        excerpt: 'The recon pipeline I run for every new scope. Six stages, mostly automated, one shell script away from bugs.',
        readMin: 6,
        body: String.raw`
## Why recon matters more than exploitation

Most "exploit" skills are Googleable. What separates hunters who close bugs monthly from those who grind without results is the same thing that separates senior SOC analysts from juniors: **coverage**. You can't exploit what you don't know exists.

Here's the pipeline I run the moment a new program drops.

## Stage 1 — Scope parsing

Most scopes come as wildcard \`*.target.com\`. I turn them into a working list:

\`\`\`bash
echo "target.com" > roots.txt
# Add any explicitly mentioned roots
echo "target-internal.com" >> roots.txt
\`\`\`

Then I cross-reference with:

- **crt.sh** — \`curl -s "https://crt.sh/?q=%25.target.com&output=json" | jq -r '.[].name_value' | sort -u\`
- **chaos.projectdiscovery.io** — curated subdomain data
- **Amass** (passive mode) — \`amass enum -passive -d target.com\`
- **subfinder** — \`subfinder -d target.com -all -silent\`

## Stage 2 — Resolve + probe

\`\`\`bash
cat all_subs.txt | dnsx -silent -a -resp | tee resolved.txt
cat resolved.txt | cut -d' ' -f1 | httpx -silent -status-code -title -tech-detect \
    -location -cname -ip -csv -o httpx.csv
\`\`\`

\`httpx\` with \`-tech-detect\` is the real unlock — you get the stack on every host in one pass. Wappalyzer fingerprints, status codes, titles, redirects. Sort by status 401/403 first — those are often misconfigured behind auth.

## Stage 3 — Content discovery

For every interesting host:

\`\`\`bash
ffuf -w /opt/seclists/Discovery/Web-Content/raft-large-directories.txt \
     -u https://host.target.com/FUZZ \
     -mc 200,204,301,302,307,401,403 \
     -fc 404 -ac -t 50 -o ffuf.json
\`\`\`

\`-ac\` (autocalibration) filters soft-404s automatically. Without it, every \`FUZZ\` that hits a catch-all will pollute your results.

For APIs specifically:

\`\`\`bash
ffuf -w api-endpoints.txt -u https://api.target.com/v1/FUZZ \
     -H "Authorization: Bearer $TOKEN" -mc all -fc 404
\`\`\`

## Stage 4 — JS parsing

Every JS file is a free source code audit. I download all JS and grep for:

\`\`\`bash
# Endpoints
grep -oE '"(https?://[^"]+|/[a-zA-Z0-9/_-]+)"' *.js | sort -u

# Secrets (partial patterns — you'll refine)
grep -E "(api[_-]?key|secret|token|aws_)" *.js | grep -v "api_key_name"

# Hidden parameters
grep -oE '(\?|&)[a-z_]+=' *.js | sort -u
\`\`\`

\`LinkFinder\` automates most of this. \`SecretFinder\` finds token patterns. But grep and a notebook beat both for anything interesting.

## Stage 5 — Parameter mining

Hidden parameters are where IDORs, SQLi, and SSRF hide. Tools:

- **Arjun** — brute-forces parameter names
- **ParamSpider** — harvests from historical sources
- **x8** — fast param discovery

\`\`\`bash
arjun -u "https://host.target.com/api/users?id=1" -m GET -oJ arjun.json
\`\`\`

Read the JSON. Params like \`debug\`, \`admin\`, \`role\`, \`test\` are bug magnets.

## Stage 6 — Nuclei + manual

\`\`\`bash
cat live_hosts.txt | nuclei -silent -severity medium,high,critical \
    -t ~/nuclei-templates -tags cve,exposure,misconfig -o nuclei_results.txt
\`\`\`

Run with \`-severity medium+\` to skip the noise. **Then stop automating.** The last 80% of bugs are found by hand — inspecting responses, mutating parameters, chaining behaviors.

## The meta-lesson

Every stage above outputs to a file. Every file feeds the next stage. One \`recon.sh\` ties them together. When a new scope drops at 2am, I run \`./recon.sh target.com\` and wake up to a sorted queue of leads.

Automate the boring. Stay sharp for the manual.
`
    },

    {
        id: 'idor-writeup',
        title: 'Finding a Critical IDOR in 20 Minutes',
        date: '2026-02-14',
        category: 'Writeup',
        tags: ['idor', 'bugbounty', 'writeup'],
        excerpt: 'A sanitized writeup of a P1 IDOR that paid out well. The bug was dumb. The methodology is not.',
        readMin: 5,
        body: String.raw`
## The setup

Medium-size SaaS company, public bug bounty. Scope: \`*.redacted.com\`. No source code access. The program had been open for three years — plenty of hunters before me. When that's the case, assume the easy bugs are gone and look at workflows, not endpoints.

## Minute 0–5: map the role model

I signed up for two accounts on two different organizations — \`acme-corp\` and \`beta-labs\`. Different emails, different orgs, no relationship.

\`\`\`
Account A: alice@acme-corp.example  → org_id=1337
Account B: bob@beta-labs.example    → org_id=4242
\`\`\`

Then I clicked every button in Account A's dashboard while Burp was recording. Twenty or so endpoints. Nothing obviously vulnerable.

## Minute 5–10: the invitation flow

Account A had an "Invite Team Member" flow. I invited \`test@example.com\` to \`acme-corp\`. The API call was:

\`\`\`http
POST /api/v2/organizations/1337/invitations HTTP/2
Host: app.redacted.com
Authorization: Bearer <alice-jwt>
Content-Type: application/json

{"email":"test@example.com","role":"member"}
\`\`\`

Response:

\`\`\`json
{"invitation_id":"inv_8f3b","org_id":1337,"email":"test@example.com"}
\`\`\`

Standard. But here's what caught my eye: there was a separate endpoint for **revoking** an invitation:

\`\`\`http
DELETE /api/v2/invitations/inv_8f3b HTTP/2
Authorization: Bearer <alice-jwt>
\`\`\`

Notice what's missing? The \`org_id\` is not in the path. The server has to look up which org the invitation belongs to and check the token's org.

## Minute 10–15: the test

Account B (Bob, different org) sent the same revoke request with his own token but Alice's invitation_id:

\`\`\`http
DELETE /api/v2/invitations/inv_8f3b HTTP/2
Authorization: Bearer <bob-jwt>
\`\`\`

\`\`\`
HTTP/2 204 No Content
\`\`\`

Bob — a user in an entirely different organization — had just revoked Alice's invitation.

## Minute 15–20: impact escalation

Revoking one invitation is low impact on its own. I went hunting for what else used the same pattern:

\`\`\`
/api/v2/invitations/{id}           — revoke another org's invitation
/api/v2/memberships/{id}           — remove another org's member!
/api/v2/api-keys/{id}              — revoke another org's API key!!
/api/v2/webhooks/{id}              — delete another org's webhooks!!!
\`\`\`

All four endpoints shared the same authorization bug. The last one was the killer — deleting a webhook for a payment-processing integration would silently drop incoming payment notifications. Combine them and a malicious tenant could nuke a competitor's production integration and kick out their admins.

## The report

The program accepted it as **Critical (P1)**. The fix landed in 36 hours — they added an \`org_context\` check in middleware for all \`*/invitations\`, \`*/memberships\`, \`*/api-keys\`, and \`*/webhooks\` routes. I got a nice bounty and a swag package.

## Why this bug existed

Classic **BOLA / IDOR via opaque ID**. The devs assumed: "the ID is opaque (\`inv_8f3b\`), so it's unguessable, so checking the token's org isn't needed." Two flaws with that:

1. **IDs leak.** Screenshots, support tickets, HAR files, JIRA attachments. Opaque ≠ secret.
2. **Authorization ≠ authentication.** A valid JWT proves who you are. It doesn't prove you should be allowed to touch that resource.

## Takeaways

- Enumerate every \`DELETE\`, \`PATCH\`, and \`POST\` endpoint. For each one, ask: "does the server verify the tenant, or just the ID?"
- **Multi-tenancy bugs are almost always gold.** Test across orgs, across users, across roles.
- The first IDOR you find on a target is rarely the last. Same middleware = same bug pattern = scan everything.
- Keep two accounts logged in at all times. Swap tokens between requests. That one trick finds more bugs than any scanner will.

The bug above was literally six Burp requests. The methodology is what finds the bug — not the requests themselves.
`
    }
];
