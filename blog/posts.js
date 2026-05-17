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
        excerpt: "TryHackMe / Reverse Elf Files. From `file crackme1` to the flag — a wall of `mov` instructions, a single-byte offset check, and the satisfying click of \"ohhhh, that's it.\"",
        readMin: 6,
        body: `
**Platform:** TryHackMe · **Room:** Reverse Elf Files · **Tools:** Binary Ninja, \`objdump\`, \`xxd\`, a Python REPL · **Arch:** ELF x86-64

I spend most of my time on Active Directory, web, and network. Reverse engineering felt like a totally different sport — the kind where you actually *open* the thing instead of poking it from the outside. So I queued up the easiest possible challenge and went in cold. This is what that looked like.

## step 0 — what am I even holding?

First thing always: \`file\`. You don't disassemble what you don't understand yet.

![file crackme1 output — ELF 64-bit LSB executable, not stripped](img/blog/crackme1/01_file.png "file crackme1 — the binary tells us most of what we need on the first command.")

Two words mattered:

- **\`not stripped\`** — symbol names are still in the binary. That's a gift on a first challenge. Functions will have human-readable names like \`main\` and \`memset\` instead of \`sub_400546\`.
- **\`x86-64\`** — Linux ELF, so I'll be reading Intel syntax assembly.

Next, \`strings\` to see what literals and library calls it pulls in:

![strings | grep — shows babys_first_elf.c, puts, memset, no scanf, no strcmp](img/blog/crackme1/02_strings.png "Source filename in the binary, and only puts + memset from libc. The author is winking.")

![pov: it's not stripped — the binary literally tells you what it is](img/blog/crackme1/meme_01_not_stripped.png)

Three things jumped out:

- The original C source file was literally **\`babys_first_elf.c\`**. I felt seen.
- The only libc calls are \`puts\` and \`memset\`. No \`scanf\`, no \`strcmp\`, no \`strncmp\`. That means the check happens in raw C — characters compared one at a time, in a loop. No library call to set a breakpoint on.
- All the GLIBC versions are 2.2.5 — ancient. This was compiled for an old system, nothing fancy.

I already had a rough model of the binary in my head before opening a disassembler: it'll \`puts\` a banner, build an expected answer somewhere in memory, then loop over my input doing a byte-by-byte compare. Let's see if I'm right.

## step 1 — opening it up

Loaded into Binary Ninja, jumped to \`main\`. The function opens with \`puts\` (the banner), then \`memset\` (zero out a buffer), then a wall of \`mov\` instructions. I dropped to the Linear / Disassembly view to read the raw bytes — and there it was, the expected answer being hand-rolled onto the stack one byte at a time:

![objdump disassembly of main — 26 mov dword instructions filling the stack with bytes](img/blog/crackme1/03_disasm.png "main + 0x18 onwards. Each mov writes one byte of the 'expected' buffer at rbp-0x70, -0x6c, -0x68, ... 4 bytes apart.")

This is a classic compiler pattern. When you write \`char expected[26] = { 0x25, 0x2b, ... };\` in C, gcc with no optimisation just lays it down on the stack as a sequence of \`mov dword [rbp-X], imm\` instructions. Binary Ninja's HLIL collapses all of that into a clean array initialiser, but the linear view shows you what's actually happening: **26 entries, each stored 4 bytes apart, from \`rbp-0x70\` down to \`rbp-0x0c\`**. So the expected answer is 26 bytes long.

I didn't want to copy-paste 26 immediates by hand from the disassembler. I selected the byte range — addresses \`0x40055e → 0x400614\`, which is exactly \`0xb6\` bytes of code — and dumped it to a file:

![xxd of the extracted bytes — the immediates 25, 2b, 20, 26, 3a, 2d... visible in the hex dump](img/blog/crackme1/04_xxd.png "Each entry is c7 45 XX YY 00 00 00 — that's \`mov dword [rbp+XX], YY\`. The 'YY' bytes (highlighted) are the expected buffer.")

Each \`c7 45 XX YY 00 00 00\` is one of those \`mov dword [rbp+disp8], imm32\` instructions. The \`YY\` byte is the immediate value — the byte of the expected answer. Pulling them out gives me the array directly.

## step 2 — the check

After the buffer is populated, there's the loop. Binary Ninja's HLIL boiled it down to something I could read in C:

\`\`\`c
char  expected[26] = { 0x25, 0x2b, 0x20, 0x26, 0x3a,
                       0x2d, 0x2e, 0x33, 0x1e, 0x33,
                       0x27, 0x20, 0x33, 0x1e, 0x2a,
                       0x28, 0x2d, 0x23, 0x1e, 0x2e,
                       0x25, 0x1e, 0x24, 0x2b, 0x25,
                       0x3c };

char* input = argv[1];

for (int i = 0; i < 26; i++) {
    if ((input[i] - 0x41) != expected[i]) goto bad;
}

puts("correct!");
return 0;

bad:
    puts("nope.");
    return 1;
\`\`\`

And there's the trick. The check isn't \`input[i] == expected[i]\`. It's \`input[i] − 0x41 == expected[i]\`. \`0x41\` is \`'A'\` in ASCII. The author subtracts \`'A'\` from each input character before comparing.

![galaxy brain meme — input minus 0x41 equals expected — so the flag is just expected plus 0x41](img/blog/crackme1/meme_02_galaxy_brain.png)

That's the whole challenge. To recover the input, add \`0x41\` back to every byte in the expected buffer.

## step 3 — decode

Fired up a Python REPL. Three lines:

![python REPL — chr(b + 0x41) for b in expected — outputs flag{not_that_kind_of_elf}](img/blog/crackme1/05_decode.png "★ the flag")

### trace, byte by byte

For the curious, here's every offset getting its \`+ 0x41\` and resolving to a character:

| i | offset | expected | + 0x41 | char |
|---|---|---|---|---|
| 0 | rbp-0x70 | 0x25 | 0x66 | f |
| 1 | rbp-0x6c | 0x2b | 0x6c | l |
| 2 | rbp-0x68 | 0x20 | 0x61 | a |
| 3 | rbp-0x64 | 0x26 | 0x67 | g |
| 4 | rbp-0x60 | 0x3a | 0x7b | { |
| 5 | rbp-0x5c | 0x2d | 0x6e | n |
| 6 | rbp-0x58 | 0x2e | 0x6f | o |
| 7 | rbp-0x54 | 0x33 | 0x74 | t |
| 8 | rbp-0x50 | 0x1e | 0x5f | _ |
| 9 | rbp-0x4c | 0x33 | 0x74 | t |
| 10 | rbp-0x48 | 0x27 | 0x68 | h |
| 11 | rbp-0x44 | 0x20 | 0x61 | a |
| 12 | rbp-0x40 | 0x33 | 0x74 | t |
| 13 | rbp-0x3c | 0x1e | 0x5f | _ |
| 14 | rbp-0x38 | 0x2a | 0x6b | k |
| 15 | rbp-0x34 | 0x28 | 0x69 | i |
| 16 | rbp-0x30 | 0x2d | 0x6e | n |
| 17 | rbp-0x2c | 0x23 | 0x64 | d |
| 18 | rbp-0x28 | 0x1e | 0x5f | _ |
| 19 | rbp-0x24 | 0x2e | 0x6f | o |
| 20 | rbp-0x20 | 0x25 | 0x66 | f |
| 21 | rbp-0x1c | 0x1e | 0x5f | _ |
| 22 | rbp-0x18 | 0x24 | 0x65 | e |
| 23 | rbp-0x14 | 0x2b | 0x6c | l |
| 24 | rbp-0x10 | 0x25 | 0x66 | f |
| 25 | rbp-0x0c | 0x3c | 0x7d | } |

## step 4 — sanity check

Sanity check by actually running the thing:

![./crackme1 'flag{not_that_kind_of_elf}' → correct! · ./crackme1 'flag{guess}' → nope.](img/blog/crackme1/06_run.png "Correct on the recovered string. Anything else returns nope.")

**Flag:** \`flag{not_that_kind_of_elf}\`

> **Sidenote.** There's a much faster path: run the binary under \`ltrace\` or \`strace\` and the comparison falls out at runtime, no disassembler required. Or set a breakpoint in \`gdb\` right before the loop and dump the buffer. I chose the slow path on purpose. The point wasn't to speedrun the flag — it was to actually read the x86 and learn to move around the disassembler.

## what stuck with me

![hot take — i never actually executed the binary. reading > running. trust the static analysis.](img/blog/crackme1/meme_03_static.png)

- **Disassembler navigation matters more than instruction memorisation.** Most of my time was just learning to move around — switching between linear, graph, and HLIL views, jumping to XREFs, following data flow into \`main\`'s stack frame. The actual x86 was the easy part.
- **Stack-resident "constants" are still constants.** A wall of \`mov [rbp-X], imm\` is just an array literal in disguise. Once you see the pattern, the rest of the function shrinks to a couple of lines.
- **RE feels different from web/AD/network in a way that surprised me.** On the web you're talking *to* the program. Here you're inside it, watching the CPU's intent unfold one instruction at a time. It feels less like attacking and more like dissecting.
- **Don't run what you don't have to.** The check was static and self-contained. Reading it was enough. That habit gets a lot more important when the binary you're holding is sketchy.

Next up: a crackme with actual XOR. Stay tuned.
`
    }
];
