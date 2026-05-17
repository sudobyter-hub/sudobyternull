#!/usr/bin/env python3
"""
render_terminal.py — generate "real terminal screenshot" PNGs for the writeup.

Renders text with macOS-style window chrome, the sudobyter site palette,
JetBrains-Mono-ish monospace font, and per-segment ANSI-like coloring.

Usage:
    python3 tools/render_terminal.py
"""

from PIL import Image, ImageDraw, ImageFont
from pathlib import Path

# --- palette (matches the site's report.html aesthetic) ----------------------
BG          = (10, 14, 11)      # #0a0e0b   body / window bg
BORDER      = (31, 42, 34)      # #1f2a22
HEADER_BG   = (17, 22, 19)      # #111613
HEADER_FG   = (122, 138, 127)   # #7a8a7f
DOT_R       = (255, 95, 86)
DOT_Y       = (255, 189, 46)
DOT_G       = (39, 201, 63)
FG          = (214, 227, 216)   # default body text
MUTED       = (122, 138, 127)
GREEN       = (91, 214, 109)    # prompts, labels
GREEN_DIM   = (44, 138, 58)
AMBER       = (233, 196, 106)   # strings, hex values
RED         = (255, 107, 107)   # registers
BLUE        = (108, 182, 255)   # addresses, numbers
MAGENTA     = (192, 132, 252)   # commands / opcodes
HILITE_BG   = (91, 214, 109, 40)  # subtle green wash

# --- fonts -------------------------------------------------------------------
# Menlo.ttc index 0 = Regular, index 2 = Bold (varies by system)
FONT_PATH = "/System/Library/Fonts/Menlo.ttc"
FONT_SIZE_BODY   = 16
FONT_SIZE_HEADER = 12

font_body   = ImageFont.truetype(FONT_PATH, FONT_SIZE_BODY, index=0)
font_header = ImageFont.truetype(FONT_PATH, FONT_SIZE_HEADER, index=0)

CHAR_W = font_body.getlength("M")
LINE_H = FONT_SIZE_BODY + 6
HEADER_H = 36
PAD_X = 18
PAD_Y_TOP = 14
PAD_Y_BOT = 16

# --- core renderer -----------------------------------------------------------

def render(lines, title="sudobyter@thm — bash", out_path=None,
           min_cols=80, annotations=None):
    """
    lines: list of either:
        - str (rendered as FG)
        - list of (text, color) segments
    annotations: optional list of dicts:
        {"row": int, "kind": "arrow"|"box", "label": str, "side": "right"|"left"}
    """
    # compute width
    def line_width(line):
        if isinstance(line, str):
            return len(line)
        return sum(len(t) for t, _ in line)

    cols = max(min_cols, max((line_width(l) for l in lines), default=min_cols))
    # leave room for right-side annotations: arrow shaft (32px) + longest label
    longest_label = 0
    if annotations:
        for a in annotations:
            if a.get("side", "right") == "right" and a.get("kind") == "arrow":
                longest_label = max(longest_label, len(a.get("label", "")))
    extra_px = 0
    if longest_label:
        extra_px = int(40 + longest_label * CHAR_W + PAD_X)

    width  = int(PAD_X * 2 + cols * CHAR_W + extra_px)
    height = int(HEADER_H + PAD_Y_TOP + len(lines) * LINE_H + PAD_Y_BOT)

    img = Image.new("RGB", (width, height), BG)
    draw = ImageDraw.Draw(img, "RGBA")

    # rounded outer border (simulated via 1px rect)
    draw.rectangle([0, 0, width - 1, height - 1], outline=BORDER, width=1)

    # header bar
    draw.rectangle([0, 0, width, HEADER_H], fill=HEADER_BG)
    draw.line([(0, HEADER_H), (width, HEADER_H)], fill=BORDER, width=1)

    # window dots
    cy = HEADER_H // 2
    for i, color in enumerate([DOT_R, DOT_Y, DOT_G]):
        cx = 16 + i * 18
        draw.ellipse([cx - 6, cy - 6, cx + 6, cy + 6], fill=color)

    # title (centered)
    tw = font_header.getlength(title)
    draw.text(((width - tw) / 2, (HEADER_H - FONT_SIZE_HEADER) / 2 - 1),
              title, font=font_header, fill=HEADER_FG)

    # body lines
    y = HEADER_H + PAD_Y_TOP
    for line in lines:
        x = PAD_X
        if isinstance(line, str):
            draw.text((x, y), line, font=font_body, fill=FG)
        else:
            for text, color in line:
                draw.text((x, y), text, font=font_body, fill=color)
                x += font_body.getlength(text)
        y += LINE_H

    # annotations (drawn on top)
    if annotations:
        for a in annotations:
            row = a["row"]
            kind = a.get("kind", "arrow")
            label = a.get("label", "")
            side = a.get("side", "right")
            color = a.get("color", AMBER)
            ay = HEADER_H + PAD_Y_TOP + row * LINE_H + LINE_H // 2

            if kind == "arrow" and side == "right":
                line_x_end = PAD_X + cols * CHAR_W + 8
                tip_x = line_x_end + 24
                # arrow shaft
                draw.line([(line_x_end, ay), (tip_x, ay)], fill=color, width=2)
                # arrowhead
                draw.polygon([(line_x_end, ay - 5),
                              (line_x_end, ay + 5),
                              (line_x_end - 8, ay)], fill=color)
                # label
                draw.text((tip_x + 8, ay - FONT_SIZE_BODY // 2),
                          label, font=font_body, fill=color)
            elif kind == "box":
                # subtle box around the line
                draw.rectangle(
                    [PAD_X - 4, ay - LINE_H // 2 + 2,
                     PAD_X + cols * CHAR_W + 4, ay + LINE_H // 2 - 2],
                    outline=color, width=1
                )

    if out_path:
        Path(out_path).parent.mkdir(parents=True, exist_ok=True)
        img.save(out_path, "PNG", optimize=True)
        print(f"wrote {out_path}  ({width}x{height})")
    return img


# --- meme panel renderer -----------------------------------------------------

def render_meme(top_text, bottom_text, out_path, accent=AMBER, tag="// pov"):
    """A terminal-vibed text 'meme' panel."""
    font_tag   = ImageFont.truetype(FONT_PATH, 13, index=0)
    font_top   = ImageFont.truetype(FONT_PATH, 22, index=0)
    font_bot   = ImageFont.truetype(FONT_PATH, 16, index=0)

    # estimate width from longest line
    longest = max(len(top_text), len(bottom_text))
    width = max(560, int(PAD_X * 2 + longest * font_top.getlength("M") * 0.95))
    height = 170

    img = Image.new("RGB", (width, height), BG)
    draw = ImageDraw.Draw(img, "RGBA")

    # border
    draw.rectangle([0, 0, width - 1, height - 1], outline=BORDER, width=1)
    # left accent stripe
    draw.rectangle([0, 0, 4, height], fill=accent)

    # tag (top-left)
    draw.text((PAD_X, 14), tag, font=font_tag, fill=MUTED)

    # top text (the punchline)
    draw.text((PAD_X, 42), top_text, font=font_top, fill=FG)

    # divider
    draw.line([(PAD_X, 92), (width - PAD_X, 92)], fill=BORDER, width=1)

    # bottom text (the kicker)
    draw.text((PAD_X, 108), bottom_text, font=font_bot, fill=accent)

    img.save(out_path, "PNG", optimize=True)
    print(f"wrote {out_path}  ({width}x{height})")


# --- the actual content for the writeup --------------------------------------

OUT = Path(__file__).resolve().parent.parent / "img" / "blog" / "crackme1"

def gen_file_cmd():
    P = ("$ ", GREEN)
    render([
        [P, ("file ", MAGENTA), ("crackme1", FG)],
        [("crackme1: ", FG), ("ELF 64-bit LSB executable", AMBER),
         (", x86-64, version 1 (SYSV),", FG)],
        [("          dynamically linked, interpreter /lib64/ld-linux-x86-64.so.2,", FG)],
        [("          for GNU/Linux 2.6.32, BuildID=672f525a..., ", FG),
         ("not stripped", GREEN)],
    ], title="sudobyter@thm — file crackme1",
       out_path=str(OUT / "01_file.png"))


def gen_strings_cmd():
    P = ("$ ", GREEN)
    render([
        [P, ("strings ", MAGENTA), ("crackme1", FG), (" | ", MUTED),
         ("grep ", MAGENTA), ("-E ", FG), ("'\\.c$|puts|memset'", AMBER)],
        [("babys_first_elf.c", GREEN)],
        [("puts", FG)],
        [("memset", FG)],
        [("puts@@GLIBC_2.2.5", FG)],
        [("memset@@GLIBC_2.2.5", FG)],
        [("__libc_start_main@@GLIBC_2.2.5", FG)],
    ], title="sudobyter@thm — strings",
       out_path=str(OUT / "02_strings.png"),
       annotations=[
           {"row": 1, "kind": "arrow", "label": "← the author is winking", "color": GREEN},
       ])


def gen_disasm():
    # the wall of mov instructions — annotate the FIRST one as "← here it starts"
    addr_col = lambda s: (s, BLUE)
    op = lambda s: (s, MAGENTA)
    reg = lambda s: (s, RED)
    num = lambda s: (s, AMBER)
    cm  = lambda s: (s, MUTED)
    plain = lambda s: (s, FG)

    rows = [
        [(";  -------- the 'expected' buffer is built byte-by-byte --------", MUTED)],
        [addr_col("0040055e  "), op("mov  "), plain("dword ["), reg("rbp"),
         plain("-"), num("0x70"), plain("], "), num("0x25"), plain("    "), cm("; '%'")],
        [addr_col("00400565  "), op("mov  "), plain("dword ["), reg("rbp"),
         plain("-"), num("0x6c"), plain("], "), num("0x2b"), plain("    "), cm("; '+'")],
        [addr_col("0040056c  "), op("mov  "), plain("dword ["), reg("rbp"),
         plain("-"), num("0x68"), plain("], "), num("0x20"), plain("    "), cm("; ' '")],
        [addr_col("00400573  "), op("mov  "), plain("dword ["), reg("rbp"),
         plain("-"), num("0x64"), plain("], "), num("0x26"), plain("    "), cm("; '&'")],
        [addr_col("0040057a  "), op("mov  "), plain("dword ["), reg("rbp"),
         plain("-"), num("0x60"), plain("], "), num("0x3a"), plain("    "), cm("; ':'")],
        [addr_col("00400581  "), op("mov  "), plain("dword ["), reg("rbp"),
         plain("-"), num("0x5c"), plain("], "), num("0x2d"), plain("    "), cm("; '-'")],
        [addr_col("00400588  "), op("mov  "), plain("dword ["), reg("rbp"),
         plain("-"), num("0x58"), plain("], "), num("0x2e"), plain("    "), cm("; '.'")],
        [addr_col("0040058f  "), op("mov  "), plain("dword ["), reg("rbp"),
         plain("-"), num("0x54"), plain("], "), num("0x33"), plain("    "), cm("; '3'")],
        [("           ", FG), (";  ... 16 more entries, each 4 bytes apart ...", MUTED)],
        [addr_col("00400611  "), op("mov  "), plain("dword ["), reg("rbp"),
         plain("-"), num("0x14"), plain("], "), num("0x3c"), plain("    "), cm("; '<'")],
    ]
    render(rows, title="objdump -d -M intel crackme1 — <main>",
           out_path=str(OUT / "03_disasm.png"),
           annotations=[
               {"row": 1, "kind": "arrow",
                "label": "← buffer[0]: the expected first byte", "color": GREEN},
           ])


def gen_xxd():
    P = ("$ ", GREEN)
    hex_byte = lambda s: (s, AMBER)
    plain = lambda s: (s, FG)

    rows = [
        [P, ("xxd ", MAGENTA), ("binary_0x40055e_0xb6 ", FG), ("| ", MUTED),
         ("head ", MAGENTA), ("-3", FG)],
        [plain("00000000: "), plain("c745 90"), hex_byte("25"),
         plain(" 0000 00c7 45"), plain("94 "), hex_byte("2b"),
         plain("00 0000 c745  .E.%....E.+....E")],
        [plain("00000010: "), plain("98"), hex_byte("20"),
         plain(" 0000 00c7 45"), plain("9c "), hex_byte("26"),
         plain("00 0000 c745 a0"), hex_byte("3a"),
         plain("  . ....E.&....E.:")],
        [plain("00000020: "), plain("0000 00c7 45"), plain("a4 "),
         hex_byte("2d"), plain("00 0000 c745 a8"), hex_byte("2e"),
         plain(" 0000  ....E.-....E....")],
        [("", FG)],
        [("# the highlighted bytes are the immediates — that's the expected buffer", MUTED)],
    ]
    render(rows, title="sudobyter@thm — xxd",
           out_path=str(OUT / "04_xxd.png"))


def gen_python_decode():
    P  = (">>> ", GREEN)
    PC = ("... ", GREEN)

    rows = [
        [P, ("expected = ", FG), ("[", FG), ("0x25,0x2b,0x20,0x26,0x3a,", AMBER),
         ("0x2d,0x2e,0x33,0x1e,0x33,", AMBER)],
        [PC, ("             ", FG), ("0x27,0x20,0x33,0x1e,0x2a,", AMBER),
         ("0x28,0x2d,0x23,0x1e,0x2e,", AMBER)],
        [PC, ("             ", FG), ("0x25,0x1e,0x24,0x2b,0x25,0x3c", AMBER),
         ("]", FG)],
        [P, ("''.", FG), ("join", MAGENTA), ("(", FG), ("chr", MAGENTA),
         ("(b + ", FG), ("0x41", AMBER), (") ", FG), ("for", MAGENTA),
         (" b ", FG), ("in", MAGENTA), (" expected)", FG)],
        [("'flag{not_that_kind_of_elf}'", GREEN)],
    ]
    render(rows, title="sudobyter@thm — python3",
           out_path=str(OUT / "05_decode.png"),
           annotations=[
               {"row": 4, "kind": "arrow", "label": "★ flag", "color": AMBER},
           ])


def gen_run_check():
    """A 'this is what it looks like when you got it right' panel."""
    P = ("$ ", GREEN)
    render([
        [P, ("./crackme1 ", MAGENTA), ("'flag{not_that_kind_of_elf}'", AMBER)],
        [("correct!", GREEN)],
        [P, ("./crackme1 ", MAGENTA), ("'flag{guess}'", AMBER)],
        [("nope.", RED)],
    ], title="sudobyter@thm — crackme1",
       out_path=str(OUT / "06_run.png"))


# --- memes -------------------------------------------------------------------

def gen_memes():
    render_meme(
        "the binary literally tells you what it is.",
        "//  babys_first_elf.c",
        str(OUT / "meme_01_not_stripped.png"),
        accent=GREEN, tag="// pov: it's not stripped"
    )
    render_meme(
        "input[i] − 0x41 == expected[i]",
        "//  so the flag is just expected[i] + 0x41. that's it. that's the post.",
        str(OUT / "meme_02_galaxy_brain.png"),
        accent=AMBER, tag="// galaxy brain"
    )
    render_meme(
        "i never actually executed the binary.",
        "//  reading > running. trust the static analysis.",
        str(OUT / "meme_03_static.png"),
        accent=BLUE, tag="// hot take"
    )


if __name__ == "__main__":
    gen_file_cmd()
    gen_strings_cmd()
    gen_disasm()
    gen_xxd()
    gen_python_decode()
    gen_run_check()
    gen_memes()
    print("\nall assets generated under img/blog/crackme1/")
