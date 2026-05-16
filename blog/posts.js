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
        excerpt: 'TryHackMe / Reverse Elf Files. From `file crackme1` to the flag: stack-resident constants, a single-byte offset check, and reading x86 instead of running it.',
        readMin: 6,
        body: String.raw`
**Platform:** TryHackMe · **Room:** Reverse Elf Files · **Tools:** Binary Ninja · **Arch:** ELF x86-64

This was my very first reverse engineering challenge. After spending most of my time on Active Directory, network, and web, popping open a disassembler felt like an entirely different sport — the kind where it actually *feels* like you're tearing something open instead of poking at it from the outside. This is the writeup of how I went from \`file crackme1\` to the flag.

## recon — what am I looking at?

\`\`\`bash
$ file crackme1
crackme1: ELF 64-bit LSB executable, x86-64, version 1 (SYSV),
          dynamically linked, interpreter /lib64/ld-linux-x86-64.so.2,
          for GNU/Linux 2.6.32, not stripped

$ strings crackme1 | grep -E '\.c$|puts|memset'
babys_first_elf.c
puts@@GLIBC_2.2.5
memset@@GLIBC_2.2.5
__libc_start_main@@GLIBC_2.2.5
\`\`\`

Two things jump out before I even open the binary in a disassembler:

- It's **not stripped** — symbol names are still there, which is a gift on a first challenge.
- The original source file is literally called \`babys_first_elf.c\`. The author is winking at me.
- The only libc calls are \`puts\` and \`memset\`. No \`scanf\`, no \`strcmp\`. That means the check happens in raw C — characters compared one at a time, in a loop.

## opening it in Binary Ninja

I loaded the binary into Binary Ninja and jumped to \`main\`. The first thing it does is print a banner with \`puts\`, then zero out a buffer with \`memset\`, then run a comparison loop. What's interesting is the function body before the loop — it's just a wall of \`mov dword ptr [rbp-X], imm32\`. Binary Ninja's HLIL collapses those into a single array initializer, but in the raw disassembly view it looks like this:

\`\`\`asm
; -------- the "expected" buffer is built byte-by-byte on the stack --------
0040055e  mov  dword [rbp-0x70], 0x25   ; '%'
00400565  mov  dword [rbp-0x6c], 0x2b   ; '+'
0040056c  mov  dword [rbp-0x68], 0x20   ; ' '
00400573  mov  dword [rbp-0x64], 0x26   ; '&'
0040057a  mov  dword [rbp-0x60], 0x3a   ; ':'
00400581  mov  dword [rbp-0x5c], 0x2d   ; '-'
00400588  mov  dword [rbp-0x58], 0x2e   ; '.'
0040058f  mov  dword [rbp-0x54], 0x33   ; '3'
00400596  mov  dword [rbp-0x50], 0x1e
0040059d  mov  dword [rbp-0x4c], 0x33   ; '3'
         ; ... 16 more entries, each 4 bytes apart ...
00400611  mov  dword [rbp-0x14], 0x3c   ; '<'
\`\`\`

> The program literally hand-rolls its expected answer into the stack frame, one dword at a time, at addresses \`0x40055e → 0x400614\`.

That's 26 entries, each a single byte stored as a dword. So the "expected answer" is 26 bytes long. The whole region — addresses \`0x40055e\` through \`0x400614\` (\`0xb6\` bytes of code) — I dumped to a local file, \`binary_0x40055e_0xb6\`, just to have the raw immediates handy:

\`\`\`bash
$ xxd binary_0x40055e_0xb6 | head -3
00000000: c745 90 25 000000 c745 94 2b 000000 c745  .E.%....E.+....E
00000010: 98 20 000000 c745 9c 26 000000 c745 a0 3a  . ....E.&....E.:
00000020: 000000 c745 a4 2d 000000 c745 a8 2e 000000   ....E.-....E....

# the highlighted single bytes are the immediates — that's the expected buffer
\`\`\`

## the comparison loop

After the buffer is populated, the binary loops over my input and, for each character, compares it against the stack buffer. Binary Ninja's HLIL view boiled it down to this:

\`\`\`c
int main(int argc, char** argv) {
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
}
\`\`\`

> The check is just **input[i] − 0x41 == expected[i]**. So the correct input is **expected[i] + 0x41**.

Once you see that line, the rest is arithmetic. \`0x41\` is \`'A'\` in ASCII. The author is subtracting \`'A'\` from each input character and comparing it to a baked-in array. So to recover the input, I just add \`0x41\` back to every byte in the expected buffer.

## decoding

\`\`\`python
>>> expected = [0x25,0x2b,0x20,0x26,0x3a,0x2d,0x2e,0x33,0x1e,0x33,
...             0x27,0x20,0x33,0x1e,0x2a,0x28,0x2d,0x23,0x1e,0x2e,
...             0x25,0x1e,0x24,0x2b,0x25,0x3c]
>>> ''.join(chr(b + 0x41) for b in expected)
'flag{not_that_kind_of_elf}'
\`\`\`

### trace, byte by byte

| i | stack offset | expected | + 0x41 | char |
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

**Flag:** \`flag{not_that_kind_of_elf}\`

> **Sidenote.** There's a much easier way to crack this: just run the binary under \`ltrace\` (or \`strace\`) and watch the comparison happen at runtime — the expected buffer falls out for free, no disassembler required. I chose the hard way on purpose. The whole point of this challenge for me was to actually read x86 and learn Binary Ninja, not to speedrun the flag.

## what I learned

- **Disassembler navigation matters.** Most of my time was just learning to move around Binary Ninja — switching between linear, graph, and HLIL views, jumping to XREFs, and following the data flow into \`main\`'s stack frame.
- **Stack-resident "constants" are still constants.** A wall of \`mov [rbp-X], imm\` is just an array literal in disguise. Once I saw the pattern, the rest of the function was obvious.
- **RE feels different from web/AD/network.** On web you're talking *to* the program. Here, you're inside it — watching the CPU's intent unfold one instruction at a time. It feels much closer to "actually hacking the thing."
- **Don't run anything you don't have to.** I never executed the binary. The check was static and self-contained — reading was enough.
`
    }
];
