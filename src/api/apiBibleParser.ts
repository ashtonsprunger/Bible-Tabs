import {
  BOOKS,
  PSALMS_BOOK_INDEX,
  getChapterBookName,
} from "../constants/books";
import {
  BLOCK_FLAG_BOOK_START,
  BLOCK_FLAG_CHAPTER_FIRST_CONTENT,
  BLOCK_FLAG_STANZA_BREAK,
} from "../db/queries";
import type {
  BlockKind,
  HeaderPayload,
  ParsedBlockRow,
  VerseRow,
  VerseSegment,
} from "../types";

export interface ApiBibleAstNode {
  name?: string;
  type?: string;
  text?: string;
  attrs?: Record<string, unknown>;
  items?: ApiBibleAstNode[];
}

export interface ChapterFootnoteEntry {
  verse: number;
  text: string;
}

export interface ParsedApiChapter {
  book: number;
  chapter: number;
  blocks: ParsedBlockRow[];
  versesByNumber: Record<number, VerseRow>;
  footnotes: ChapterFootnoteEntry[];
  copyright: string;
  fumsToken: string | null;
}

function normalizeSpaces(str: string): string {
  return str.replace(/\s+/g, " ").trim();
}

function cleanPunctuationSpacing(str: string): string {
  return normalizeSpaces(str)
    .replace(/\s+([.,;:!?])/g, "$1")
    .replace(/“\s+/g, "“")
    .replace(/\s+”/g, "”")
    .replace(/\(\s+/g, "(")
    .replace(/\s+\)/g, ")");
}

function extractPlainText(nodes: ApiBibleAstNode[] | undefined, uppercase = false): string {
  if (!nodes || nodes.length === 0) return "";
  let out = "";
  for (const node of nodes) {
    if (!node || typeof node !== "object") continue;
    if (node.type === "text" && typeof node.text === "string") {
      out += uppercase ? node.text.toUpperCase() : node.text;
      continue;
    }
    if (node.name === "note") {
      continue;
    }
    const style = typeof node.attrs?.style === "string" ? node.attrs.style : "";
    const isSmallCaps =
      uppercase ||
      (node.name === "char" && (style === "nd" || style === "sc"));
    if (Array.isArray(node.items)) {
      out += extractPlainText(node.items, isSmallCaps);
    }
  }
  return out;
}

function extractFootnoteText(noteNode: ApiBibleAstNode): string {
  const parts: string[] = [];

  const walk = (items: ApiBibleAstNode[] | undefined, uppercase = false) => {
    if (!items) return;
    for (const child of items) {
      if (!child || typeof child !== "object") continue;
      if (child.type === "text" && typeof child.text === "string") {
        parts.push(uppercase ? child.text.toUpperCase() : child.text);
        continue;
      }
      const style = typeof child.attrs?.style === "string" ? child.attrs.style : "";
      if (child.name === "char" && style === "fr") {
        // Skip redundant chapter:verse prefix since we label footnotes with verse numbers
        continue;
      }
      if (child.name === "char" && (style === "fq" || style === "fqa")) {
        const quoted = normalizeSpaces(extractPlainText(child.items, uppercase));
        if (quoted) {
          parts.push(` “${quoted}” `);
        }
        continue;
      }
      const isSmallCaps =
        uppercase ||
        (child.name === "char" && (style === "nd" || style === "sc"));
      if (Array.isArray(child.items)) {
        walk(child.items, isSmallCaps);
      }
    }
  };

  walk(noteNode.items);
  return cleanPunctuationSpacing(parts.join("")).replace(/”\s+“/g, " ");
}

function parseVerseNumberFromAttrs(attrs?: Record<string, unknown>): number | null {
  if (!attrs) return null;
  if (typeof attrs.number === "string" || typeof attrs.number === "number") {
    const match = String(attrs.number).match(/^(\d+)/);
    if (match) {
      const n = Number.parseInt(match[1], 10);
      if (Number.isFinite(n) && n >= 1) return n;
    }
  }
  if (typeof attrs.verseId === "string") {
    const parts = attrs.verseId.split(".");
    const n = Number.parseInt(parts[2] ?? "", 10);
    if (Number.isFinite(n) && n >= 1) return n;
  }
  if (typeof attrs.vid === "string") {
    const m = attrs.vid.match(/:(\d+)/);
    if (m) {
      const n = Number.parseInt(m[1], 10);
      if (Number.isFinite(n) && n >= 1) return n;
    }
  }
  return null;
}

function mapParaStyleToBlockKind(style: string): BlockKind | null {
  switch (style) {
    case "p":
    case "m":
    case "mi":
    case "nb":
    case "cls":
    case "po":
      return "p";
    case "pmo":
    case "pm":
    case "pmc":
    case "pi":
    case "pi1":
    case "pi2":
    case "pi3":
      return "pmo";
    case "pc":
      return "pc";
    case "li":
    case "li1":
      return "li1";
    case "li2":
    case "li3":
    case "li4":
      return "li2";
    case "q":
    case "q1":
    case "qm":
    case "qm1":
      return "q1";
    case "q2":
    case "q3":
    case "q4":
    case "qm2":
    case "qm3":
      return "q2";
    case "qr":
    case "pmr":
    case "qs":
      return "qr";
    case "mr":
      return "mr";
    default:
      return null;
  }
}

export function parseApiBibleChapterContent(params: {
  book: number;
  chapter: number;
  content: ApiBibleAstNode[];
  copyright: string;
  fumsToken: string | null;
}): ParsedApiChapter {
  const { book, chapter, content, copyright, fumsToken } = params;
  const bookInfo = BOOKS[book];
  const bookName = bookInfo?.book ?? "Genesis";
  const isPsalms = book === PSALMS_BOOK_INDEX;
  const isBookStart = chapter === 1;

  const blocks: ParsedBlockRow[] = [];
  const verseTextParts = new Map<number, string[]>();
  const verseFootnotes = new Map<number, string[]>();
  const verseBlockIds = new Map<number, number>();
  const chapterFootnotes: ChapterFootnoteEntry[] = [];
  let chapterSuperscription: string | null = null;

  let nextBlockId = 1;
  let pendingHeader: HeaderPayload = {
    isBookStart,
    isChapterStart: true,
    ...(isBookStart ? { bookTitle: bookName } : {}),
    ...(isPsalms ? { psalmTitle: `${getChapterBookName(book)} ${chapter}` } : {}),
  };
  let hasEmittedChapterStartHeader = false;
  let hasEmittedFirstContent = false;
  let pendingStanzaBreak = false;
  let currentVerse = 1;
  let hasSeenVerseOne = false;
  const shownVerseNums = new Set<number>();

  const hasHeaderFields = (h: HeaderPayload): boolean =>
    Boolean(
      h.bookTitle ||
        h.majorSection ||
        h.psalmTitle ||
        h.s1 ||
        h.refs ||
        h.s2 ||
        h.acrostic ||
        h.superscription
    );

  const flushHeader = (anchorVerse: number) => {
    if (!hasHeaderFields(pendingHeader)) {
      return;
    }
    const flags =
      (pendingHeader.isBookStart ? BLOCK_FLAG_BOOK_START : 0) |
      (pendingHeader.isChapterStart ? BLOCK_FLAG_CHAPTER_FIRST_CONTENT : 0);

    blocks.push({
      id: nextBlockId++,
      book,
      chapter,
      verse: anchorVerse,
      kind: "header",
      flags,
      header: pendingHeader,
    });
    if (pendingHeader.isChapterStart) {
      hasEmittedChapterStartHeader = true;
    }
    pendingHeader = {};
  };

  const addFootnote = (verseNum: number, rawText: string) => {
    if (!rawText) return;
    const list = verseFootnotes.get(verseNum) ?? [];
    if (!list.includes(rawText)) {
      list.push(rawText);
      verseFootnotes.set(verseNum, list);
      chapterFootnotes.push({ verse: verseNum, text: rawText });
    }
  };

  const addVersePlainText = (verseNum: number, text: string) => {
    if (!text) return;
    const list = verseTextParts.get(verseNum) ?? [];
    list.push(text);
    verseTextParts.set(verseNum, list);
  };

  for (const para of content) {
    if (!para || typeof para !== "object" || para.name !== "para") {
      continue;
    }
    const style = typeof para.attrs?.style === "string" ? para.attrs.style : "";
    if (!style) continue;

    // Blank stanza separator line
    if (style === "b") {
      if (hasEmittedFirstContent) {
        pendingStanzaBreak = true;
      }
      continue;
    }

    // Ignore metadata / redundant chapter label
    if (
      style === "cl" ||
      style === "id" ||
      style === "ide" ||
      style === "h" ||
      style.startsWith("toc") ||
      style.startsWith("mt") ||
      style.startsWith("is") ||
      style === "ip" ||
      style === "ili" ||
      style === "ib"
    ) {
      continue;
    }

    // Header-type paragraphs
    if (
      style === "ms" ||
      style === "ms1" ||
      style === "ms2" ||
      style === "s" ||
      style === "s1" ||
      style === "s2" ||
      style === "s3" ||
      style === "sp" ||
      style === "r" ||
      style === "qa" ||
      style === "d"
    ) {
      const text = cleanPunctuationSpacing(extractPlainText(para.items));
      if (!text) continue;

      // Skip redundant "PSALM 23" label when we already render psalmTitle
      if (isPsalms && /^psalm\s+\d+$/i.test(text)) {
        continue;
      }

      if (style === "d") {
        pendingHeader.superscription = pendingHeader.superscription
          ? `${pendingHeader.superscription} ${text}`
          : text;
        pendingHeader.superscriptionVerse = 1;
        chapterSuperscription = pendingHeader.superscription;
      } else if (style === "ms" || style === "ms1" || style === "ms2") {
        if (/^book\b/i.test(text)) {
          pendingHeader.majorSection = text;
        } else if (isPsalms && !hasEmittedFirstContent && (pendingHeader.s1 || /psalm|maskil|miktam|song|prayer|choir/i.test(text))) {
          // NASB encodes Psalm superscriptions as para:ms
          pendingHeader.superscription = pendingHeader.superscription
            ? `${pendingHeader.superscription} ${text}`
            : text;
          pendingHeader.superscriptionVerse = 1;
          chapterSuperscription = pendingHeader.superscription;
        } else if (!pendingHeader.s1) {
          pendingHeader.s1 = text;
        } else {
          pendingHeader.s2 = text;
        }
      } else if (style === "s" || style === "s1") {
        if (pendingHeader.s1 && hasEmittedFirstContent) {
          flushHeader(currentVerse);
        }
        pendingHeader.s1 = text;
      } else if (style === "s2" || style === "s3" || style === "sp") {
        pendingHeader.s2 = pendingHeader.s2 ? `${pendingHeader.s2} · ${text}` : text;
      } else if (style === "r") {
        pendingHeader.refs = pendingHeader.refs ? `${pendingHeader.refs} ${text}` : text;
      } else if (style === "qa") {
        pendingHeader.acrostic = text;
      }
      continue;
    }

    const kind = mapParaStyleToBlockKind(style) ?? "p";

    // Parse inline AST nodes within this paragraph into VerseSegments
    const paraVidVerse = parseVerseNumberFromAttrs(para.attrs);
    if (paraVidVerse !== null) {
      currentVerse = paraVidVerse;
    }

    const rawPieces: Array<{ verse: number; isNewVerse: boolean; text: string }> = [];

    const appendText = (verseNum: number, chunk: string, markNewVerse: boolean) => {
      if (!chunk) return;
      const last = rawPieces[rawPieces.length - 1];
      if (last && last.verse === verseNum && !markNewVerse) {
        last.text += chunk;
      } else {
        rawPieces.push({ verse: verseNum, isNewVerse: markNewVerse, text: chunk });
      }
    };

    const walkInline = (
      items: ApiBibleAstNode[] | undefined,
      inheritedVerse: number,
      uppercase = false
    ) => {
      if (!items) return;
      let activeVerse = inheritedVerse;
      let pendingNewVerse = false;

      for (const child of items) {
        if (!child || typeof child !== "object") continue;

        if (child.name === "verse") {
          const parsedV = parseVerseNumberFromAttrs(child.attrs);
          if (parsedV !== null) {
            activeVerse = parsedV;
            currentVerse = parsedV;
            if (parsedV === 1) hasSeenVerseOne = true;
            pendingNewVerse = true;
          }
          continue;
        }

        if (child.name === "note") {
          const noteStyle =
            typeof child.attrs?.style === "string" ? child.attrs.style : "f";
          // Include translator footnotes (f, fe); skip cross-reference markers (x)
          if (noteStyle !== "x") {
            const noteVerse = parseVerseNumberFromAttrs(child.attrs) ?? activeVerse;
            const fnText = extractFootnoteText(child);
            if (fnText) {
              addFootnote(noteVerse, fnText);
            }
          }
          continue;
        }

        if (child.type === "text" && typeof child.text === "string") {
          const nodeVerse = parseVerseNumberFromAttrs(child.attrs) ?? activeVerse;
          activeVerse = nodeVerse;
          currentVerse = nodeVerse;
          const t = uppercase ? child.text.toUpperCase() : child.text;
          appendText(nodeVerse, t, pendingNewVerse);
          pendingNewVerse = false;
          continue;
        }

        const nodeVerse = parseVerseNumberFromAttrs(child.attrs) ?? activeVerse;
        activeVerse = nodeVerse;
        currentVerse = nodeVerse;

        const charStyle = typeof child.attrs?.style === "string" ? child.attrs.style : "";
        // Skip inline cross-reference blocks if any
        if (child.name === "char" && charStyle === "xt") {
          continue;
        }

        const isSmallCaps =
          uppercase ||
          (child.name === "char" && (charStyle === "nd" || charStyle === "sc"));

        if (Array.isArray(child.items)) {
          // If a verse-span wraps a <verse> marker, propagate the verse switch to sibling spans
          const beforeVerse = currentVerse;
          const hadVerseTag = child.items.some((it) => it?.name === "verse");
          walkInline(child.items, activeVerse, isSmallCaps);
          activeVerse = currentVerse;
          if (hadVerseTag && currentVerse !== beforeVerse) {
            pendingNewVerse = false;
          }
        }
      }
    };

    walkInline(para.items, currentVerse, false);

    // Collapse into clean VerseSegments
    const segments: VerseSegment[] = [];
    for (const piece of rawPieces) {
      const cleaned = piece.text.replace(/\s+/g, " ");
      const trimmed = cleaned.trim();
      if (!trimmed) continue;

      const lastSeg = segments[segments.length - 1];
      if (lastSeg && lastSeg.v === piece.verse) {
        lastSeg.t = normalizeSpaces(`${lastSeg.t} ${trimmed}`)
          .replace(/\s+([.,;:!?’”)\]])/g, "$1")
          .replace(/([‘“(\[])\s+/g, "$1");
      } else {
        const isFirstAppearance = !shownVerseNums.has(piece.verse);
        const showDropCap =
          !isPsalms &&
          !hasEmittedFirstContent &&
          segments.length === 0 &&
          piece.verse === 1 &&
          isFirstAppearance;

        const seg: VerseSegment = {
          v: piece.verse,
          t: trimmed,
        };
        if (showDropCap) {
          seg.c = chapter;
          shownVerseNums.add(piece.verse);
        } else if (isFirstAppearance && (piece.isNewVerse || piece.verse > 1 || (isPsalms && piece.verse === 1))) {
          seg.n = 1;
          shownVerseNums.add(piece.verse);
        } else if (isFirstAppearance && piece.verse === 1 && hasSeenVerseOne) {
          seg.n = 1;
          shownVerseNums.add(piece.verse);
        }
        segments.push(seg);
      }

      addVersePlainText(piece.verse, trimmed);
    }

    if (segments.length === 0) {
      continue;
    }

    const firstVerseInBlock = segments[0].v;
    flushHeader(firstVerseInBlock);

    const blockId = nextBlockId++;
    let flags = 0;
    if (pendingStanzaBreak) {
      flags |= BLOCK_FLAG_STANZA_BREAK;
      pendingStanzaBreak = false;
    }
    if (!hasEmittedFirstContent) {
      flags |= BLOCK_FLAG_CHAPTER_FIRST_CONTENT;
      if (isBookStart && !hasEmittedChapterStartHeader) {
        flags |= BLOCK_FLAG_BOOK_START;
      }
      hasEmittedFirstContent = true;
    }

    blocks.push({
      id: blockId,
      book,
      chapter,
      verse: firstVerseInBlock,
      kind,
      flags,
      segments,
    });

    for (const seg of segments) {
      if (!verseBlockIds.has(seg.v)) {
        verseBlockIds.set(seg.v, blockId);
      }
    }
  }

  // Ensure any trailing header is flushed
  if (hasHeaderFields(pendingHeader)) {
    flushHeader(currentVerse);
  }

  const chapterStartBlockId = blocks[0]?.id ?? 1;
  const versesByNumber: Record<number, VerseRow> = {};
  const allVerseNums = new Set<number>([
    ...verseTextParts.keys(),
    ...verseBlockIds.keys(),
  ]);

  for (const vNum of allVerseNums) {
    const joinedText = cleanPunctuationSpacing(
      (verseTextParts.get(vNum) ?? []).join(" ")
    );
    const fns = verseFootnotes.get(vNum);
    versesByNumber[vNum] = {
      id: book * 1000000 + chapter * 1000 + vNum,
      book,
      chapter,
      verse: vNum,
      chapter_block_id: chapterStartBlockId,
      verse_block_id: verseBlockIds.get(vNum) ?? chapterStartBlockId,
      text: joinedText,
      superscription: vNum === 1 ? chapterSuperscription : null,
      footnotes: fns && fns.length > 0 ? fns.join(" · ") : null,
    };
  }

  return {
    book,
    chapter,
    blocks,
    versesByNumber,
    footnotes: chapterFootnotes,
    copyright,
    fumsToken,
  };
}
