import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const rootDir = process.cwd();

const TRANSLATION_SPECS = [
  {
    id: "bsb",
    code: "BSB",
    format: "usj",
    zipPath: path.join(rootDir, "data", "bsb_usj.zip"),
    outPath: path.join(rootDir, "assets", "bible_bsb.db"),
  },
  {
    id: "kjv",
    code: "KJV",
    format: "usfm",
    zipPath: path.join(rootDir, "data", "kjv_usfm.zip"),
    outPath: path.join(rootDir, "assets", "bible_kjv.db"),
  },
  {
    id: "web",
    code: "WEB",
    format: "usfm",
    zipPath: path.join(rootDir, "data", "web_usfm.zip"),
    outPath: path.join(rootDir, "assets", "bible_web.db"),
  },
  {
    id: "asv",
    code: "ASV",
    format: "usfm",
    zipPath: path.join(rootDir, "data", "asv_usfm.zip"),
    outPath: path.join(rootDir, "assets", "bible_asv.db"),
  },
];

const BOOK_SPECS = [
  { code: "GEN", name: "Genesis" },
  { code: "EXO", name: "Exodus" },
  { code: "LEV", name: "Leviticus" },
  { code: "NUM", name: "Numbers" },
  { code: "DEU", name: "Deuteronomy" },
  { code: "JOS", name: "Joshua" },
  { code: "JDG", name: "Judges" },
  { code: "RUT", name: "Ruth" },
  { code: "1SA", name: "1 Samuel" },
  { code: "2SA", name: "2 Samuel" },
  { code: "1KI", name: "1 Kings" },
  { code: "2KI", name: "2 Kings" },
  { code: "1CH", name: "1 Chronicles" },
  { code: "2CH", name: "2 Chronicles" },
  { code: "EZR", name: "Ezra" },
  { code: "NEH", name: "Nehemiah" },
  { code: "EST", name: "Esther" },
  { code: "JOB", name: "Job" },
  { code: "PSA", name: "Psalms" },
  { code: "PRO", name: "Proverbs" },
  { code: "ECC", name: "Ecclesiastes" },
  { code: "SNG", name: "Song of Solomon" },
  { code: "ISA", name: "Isaiah" },
  { code: "JER", name: "Jeremiah" },
  { code: "LAM", name: "Lamentations" },
  { code: "EZK", name: "Ezekiel" },
  { code: "DAN", name: "Daniel" },
  { code: "HOS", name: "Hosea" },
  { code: "JOL", name: "Joel" },
  { code: "AMO", name: "Amos" },
  { code: "OBA", name: "Obadiah" },
  { code: "JON", name: "Jonah" },
  { code: "MIC", name: "Micah" },
  { code: "NAM", name: "Nahum" },
  { code: "HAB", name: "Habakkuk" },
  { code: "ZEP", name: "Zephaniah" },
  { code: "HAG", name: "Haggai" },
  { code: "ZEC", name: "Zechariah" },
  { code: "MAL", name: "Malachi" },
  { code: "MAT", name: "Matthew" },
  { code: "MRK", name: "Mark" },
  { code: "LUK", name: "Luke" },
  { code: "JHN", name: "John" },
  { code: "ACT", name: "Acts" },
  { code: "ROM", name: "Romans" },
  { code: "1CO", name: "1 Corinthians" },
  { code: "2CO", name: "2 Corinthians" },
  { code: "GAL", name: "Galatians" },
  { code: "EPH", name: "Ephesians" },
  { code: "PHP", name: "Philippians" },
  { code: "COL", name: "Colossians" },
  { code: "1TH", name: "1 Thessalonians" },
  { code: "2TH", name: "2 Thessalonians" },
  { code: "1TI", name: "1 Timothy" },
  { code: "2TI", name: "2 Timothy" },
  { code: "TIT", name: "Titus" },
  { code: "PHM", name: "Philemon" },
  { code: "HEB", name: "Hebrews" },
  { code: "JAS", name: "James" },
  { code: "1PE", name: "1 Peter" },
  { code: "2PE", name: "2 Peter" },
  { code: "1JN", name: "1 John" },
  { code: "2JN", name: "2 John" },
  { code: "3JN", name: "3 John" },
  { code: "JUD", name: "Jude" },
  { code: "REV", name: "Revelation" },
];

const PSALMS_BOOK_INDEX = 18;

const FLAG_STANZA_BREAK = 1;
const FLAG_CHAPTER_FIRST_CONTENT = 2;
const FLAG_BOOK_START = 4;

const USFM_IGNORED_PARAS = new Set([
  "id",
  "ide",
  "h",
  "toc1",
  "toc2",
  "toc3",
  "mt1",
  "mt2",
  "mt3",
  "mt4",
  "is1",
  "ip",
  "ili",
  "ib",
  "cl",
]);

function normalizeSpaces(str) {
  return str.replace(/\s+/g, " ").trim();
}

function cleanUsfmInlineText(raw) {
  let s = raw;
  // Remove cross-reference blocks \x ... \x*
  s = s.replace(/\\x\b[\s\S]*?\\x\*/g, "");
  // Unwrap \w word|strong="..."\w* and \+w word|...\+w*
  s = s.replace(/\\\+?w\s+([^\\|]*?)(?:\|[^\\]*)?\\\+?w\*/g, "$1");
  // Unwrap all other inline character markers (\add, \nd, \wj, \qs, \it, \bd, \sc, \tl, \bk, \k, \+add, \+nd, \+wh)
  s = s.replace(/\\\+?[a-z]+[0-9]*\*/g, "");
  s = s.replace(/\\\+?[a-z]+[0-9]*\s?/g, "");
  // Strip pilcrow signs used in KJV print editions since paragraphs are rendered structurally
  s = s.replace(/¶\s*/g, "");
  return s;
}

function parseUsfmFootnoteBody(body) {
  // Remove caller token (e.g. "+ ")
  let s = body.replace(/^\S+\s+/, "");
  // Remove \fr ... up to next marker
  s = s.replace(/\\fr\s+[^\\]*/g, "");
  // Convert \fqa ... / \fq ... into quoted text
  s = s.replace(/\\fqa?\s+([^\\]+)/g, (_, inner) => ` “${inner.trim()}” `);
  // Strip remaining markers (\ft, \w, etc.)
  s = cleanUsfmInlineText(s);
  return normalizeSpaces(s)
    .replace(/\s+([.,;:!?])/g, "$1")
    .replace(/“\s+/g, "“")
    .replace(/\s+”/g, "”");
}

function parseUsfmInlineToNodes(text) {
  const nodes = [];
  // Split out \f ... \f* footnotes while preserving order
  const fnRegex = /\\f\s+([\s\S]*?)\\f\*/g;
  let lastIndex = 0;
  let match;

  const pushPlain = (segment) => {
    const cleaned = cleanUsfmInlineText(segment);
    if (cleaned) {
      nodes.push(cleaned);
    }
  };

  while ((match = fnRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      pushPlain(text.slice(lastIndex, match.index));
    }
    const fnText = parseUsfmFootnoteBody(match[1]);
    if (fnText) {
      nodes.push({ type: "note", content: [fnText] });
    }
    lastIndex = fnRegex.lastIndex;
  }

  if (lastIndex < text.length) {
    pushPlain(text.slice(lastIndex));
  }

  return nodes;
}

function mapUsfmParaMarker(marker) {
  switch (marker) {
    case "b":
      return "b";
    case "ms":
    case "ms1":
      return "ms";
    case "s1":
      return "s1";
    case "s2":
    case "sp":
      return "s2";
    case "r":
      return "r";
    case "qa":
      return "qa";
    case "d":
      return "d";
    case "p":
    case "m":
    case "nb":
      return "p";
    case "pmo":
    case "pi":
    case "pi1":
    case "mi":
      return "pmo";
    case "pc":
    case "qc":
      return "pc";
    case "li1":
      return "li1";
    case "li2":
      return "li2";
    case "q":
    case "q1":
      return "q1";
    case "q2":
    case "q3":
      return "q2";
    case "qr":
      return "qr";
    case "mr":
      return "mr";
    default:
      return "p";
  }
}

function parseUsfmFileToUsj(rawText) {
  const content = [];
  let currentPara = null;
  let seenChapter = false;

  const flushPara = () => {
    if (currentPara) {
      content.push(currentPara);
      currentPara = null;
    }
  };

  const ensurePara = (marker = "p") => {
    if (!currentPara) {
      currentPara = { type: "para", marker, content: [] };
    }
    return currentPara;
  };

  const lines = rawText.split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    // Chapter marker
    const chapMatch = line.match(/^\\c\s+(\d+)/);
    if (chapMatch) {
      flushPara();
      seenChapter = true;
      content.push({ type: "chapter", number: chapMatch[1] });
      continue;
    }

    // Verse marker line (possibly containing inline text)
    const verseMatch = line.match(/^\\v\s+(\d+)\s*([\s\S]*)$/);
    if (verseMatch) {
      if (!seenChapter) continue;
      const para = ensurePara("p");
      para.content.push({ type: "verse", number: verseMatch[1] });
      if (verseMatch[2]) {
        para.content.push(...parseUsfmInlineToNodes(verseMatch[2]));
      }
      continue;
    }

    // Other line-start USFM marker
    const markerMatch = line.match(/^\\([a-z]+[0-9]*)(?:\s+([\s\S]*))?$/i);
    if (markerMatch) {
      const rawMarker = markerMatch[1].toLowerCase();
      const rest = markerMatch[2] ?? "";

      if (USFM_IGNORED_PARAS.has(rawMarker)) {
        continue;
      }

      if (!seenChapter && rawMarker !== "ms" && rawMarker !== "ms1") {
        continue;
      }

      flushPara();
      const mapped = mapUsfmParaMarker(rawMarker);
      if (mapped === "b") {
        content.push({ type: "para", marker: "b", content: [] });
        continue;
      }

      currentPara = { type: "para", marker: mapped, content: [] };
      if (rest) {
        // Handle inline \v inside the same line if present
        const parts = rest.split(/(?=\\v\s+\d+)/g);
        for (const part of parts) {
          const inlineV = part.match(/^\\v\s+(\d+)\s*([\s\S]*)$/);
          if (inlineV) {
            currentPara.content.push({ type: "verse", number: inlineV[1] });
            if (inlineV[2]) {
              currentPara.content.push(...parseUsfmInlineToNodes(inlineV[2]));
            }
          } else {
            currentPara.content.push(...parseUsfmInlineToNodes(part));
          }
        }
      }
      continue;
    }

    // Continuation line belonging to the current paragraph
    if (seenChapter && currentPara) {
      currentPara.content.push(" ");
      currentPara.content.push(...parseUsfmInlineToNodes(line));
    }
  }

  flushPara();
  return { content };
}

function collectPlainString(nodes) {
  if (!Array.isArray(nodes)) return "";
  let out = "";
  for (const child of nodes) {
    if (typeof child === "string") {
      out += child;
    } else if (child && typeof child === "object") {
      if (child.type === "note" || child.type === "verse") {
        continue;
      }
      if (Array.isArray(child.content)) {
        out += collectPlainString(child.content);
      }
    }
  }
  return normalizeSpaces(out);
}

function collectFootnoteText(nodes) {
  if (!Array.isArray(nodes)) return "";
  let out = "";
  for (const child of nodes) {
    if (typeof child === "string") {
      out += child;
    } else if (child && typeof child === "object") {
      if (child.marker === "fr") {
        continue;
      }
      if (Array.isArray(child.content)) {
        if (child.marker === "fqa") {
          const inner = collectFootnoteText(child.content);
          out += ` “${inner.trim()}” `;
        } else {
          out += collectFootnoteText(child.content);
        }
      }
    }
  }
  return normalizeSpaces(out)
    .replace(/\s+([.,;:!?])/g, "$1")
    .replace(/“\s+/g, "“")
    .replace(/\s+”/g, "”");
}

function findUsjFiles(dir) {
  const map = new Map();
  function walk(d) {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.name.endsWith(".usj")) {
        const code = path.basename(entry.name, ".usj").toUpperCase();
        map.set(code, full);
      }
    }
  }
  walk(dir);
  return map;
}

function findUsfmFiles(dir) {
  const map = new Map();
  function walk(d) {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.name.endsWith(".usfm")) {
        const firstChunk = fs.readFileSync(full, "utf8").slice(0, 200);
        const idMatch = firstChunk.match(/\\id\s+([A-Z0-9]{3})\b/i);
        if (idMatch) {
          map.set(idMatch[1].toUpperCase(), full);
        }
      }
    }
  }
  walk(dir);
  return map;
}

function buildTranslationDb(spec) {
  if (!fs.existsSync(spec.zipPath)) {
    throw new Error(`Missing ${spec.zipPath}`);
  }

  const tempExtractDir = fs.mkdtempSync(
    path.join(os.tmpdir(), `bible-${spec.id}-`)
  );

  try {
    execFileSync("tar", ["-xf", spec.zipPath, "-C", tempExtractDir], {
      stdio: "inherit",
    });

    const filesByCode =
      spec.format === "usj"
        ? findUsjFiles(tempExtractDir)
        : findUsfmFiles(tempExtractDir);

    const blocks = [];
    const verseMap = new Map();
    const bookStats = [];

    for (let bookIndex = 0; bookIndex < BOOK_SPECS.length; bookIndex++) {
      const bookSpec = BOOK_SPECS[bookIndex];
      const filePath = filesByCode.get(bookSpec.code);
      if (!filePath) {
        throw new Error(
          `[${spec.code}] Missing ${spec.format.toUpperCase()} file for ${bookSpec.code}`
        );
      }

      const usj =
        spec.format === "usj"
          ? JSON.parse(fs.readFileSync(filePath, "utf8"))
          : parseUsfmFileToUsj(fs.readFileSync(filePath, "utf8"));

      const totalChaptersInBook = usj.content.filter(
        (n) => n.type === "chapter"
      ).length;
      const isSingleChapterBook = totalChaptersInBook === 1;
      const isPsalms = bookIndex === PSALMS_BOOK_INDEX;

      let currentChapter = 1;
      let currentVerse = 1;
      let chapterFirstBlockId = null;
      let hasEmittedChapterContent = false;
      let pendingStanzaBreak = false;
      let deferredVerseOneBadge = false;
      let bookVerseCount = 0;

      let pendingHeader = null;
      const ensureHeader = () => {
        if (!pendingHeader) {
          pendingHeader = {};
        }
        return pendingHeader;
      };

      const flushPendingHeader = () => {
        if (!pendingHeader) {
          return;
        }
        const blockId = blocks.length + 1;
        let flags = 0;
        if (pendingHeader.isBookStart) {
          flags |= FLAG_BOOK_START;
        }
        blocks.push({
          id: blockId,
          book: bookIndex,
          chapter: currentChapter,
          verse: pendingHeader.superscriptionVerse ?? currentVerse,
          kind: "header",
          flags,
          payload: JSON.stringify(pendingHeader),
        });
        if (chapterFirstBlockId === null) {
          chapterFirstBlockId = blockId;
        }
        pendingHeader = null;
      };

      const getOrCreateVerseRecord = (ch, v) => {
        const key = `${bookIndex},${ch},${v}`;
        let rec = verseMap.get(key);
        if (!rec) {
          rec = {
            book: bookIndex,
            chapter: ch,
            verse: v,
            chapterBlockId: chapterFirstBlockId ?? blocks.length + 1,
            verseBlockId: null,
            textParts: [],
            extraSearchParts: [],
            footnotes: [],
          };
          verseMap.set(key, rec);
          bookVerseCount++;
        }
        return rec;
      };

      for (const node of usj.content) {
        if (!node || typeof node !== "object") continue;
        if (node.type === "book") continue;

        if (node.type === "chapter") {
          flushPendingHeader();
          currentChapter = Number.parseInt(node.number, 10);
          currentVerse = 1;
          chapterFirstBlockId = null;
          hasEmittedChapterContent = false;
          pendingStanzaBreak = false;
          deferredVerseOneBadge = false;

          if (currentChapter === 1) {
            const h = ensureHeader();
            h.bookTitle = bookSpec.name;
            h.isBookStart = true;
            h.isChapterStart = true;
          }
          if (isPsalms) {
            const h = ensureHeader();
            h.psalmTitle = `Psalm ${currentChapter}`;
            h.isChapterStart = true;
          }
          continue;
        }

        if (node.type !== "para") continue;

        const marker = node.marker;

        if (["h", "toc1", "toc2", "toc3", "mt1", "mt2"].includes(marker)) {
          continue;
        }

        if (marker === "b") {
          if (!pendingHeader) {
            pendingStanzaBreak = true;
          }
          continue;
        }

        if (marker === "ms") {
          const text = collectPlainString(node.content);
          if (text) {
            const h = ensureHeader();
            if (chapterFirstBlockId === null) h.isChapterStart = true;
            h.majorSection = text;
          }
          continue;
        }

        if (marker === "s1") {
          if (pendingHeader?.s1) {
            flushPendingHeader();
          }
          const text = collectPlainString(node.content);
          if (text) {
            const h = ensureHeader();
            if (chapterFirstBlockId === null) h.isChapterStart = true;
            h.s1 = text;
          }
          continue;
        }

        if (marker === "r") {
          const text = collectPlainString(node.content);
          if (text) {
            const h = ensureHeader();
            if (chapterFirstBlockId === null) h.isChapterStart = true;
            h.refs = text;
          }
          continue;
        }

        if (marker === "s2") {
          if (pendingHeader?.s2) {
            flushPendingHeader();
          }
          const text = collectPlainString(node.content);
          if (text) {
            const h = ensureHeader();
            if (chapterFirstBlockId === null) h.isChapterStart = true;
            h.s2 = text;
          }
          continue;
        }

        if (marker === "qa") {
          const text = collectPlainString(node.content);
          if (text) {
            const h = ensureHeader();
            if (chapterFirstBlockId === null) h.isChapterStart = true;
            h.acrostic = h.acrostic ? `${h.acrostic}  ${text}` : text;
          }
          continue;
        }

        if (marker === "d") {
          let hasVerseOne = false;
          const footnotesInD = [];
          const walkD = (items) => {
            if (!Array.isArray(items)) return;
            for (const item of items) {
              if (item && typeof item === "object") {
                if (item.type === "verse" && item.number === "1") {
                  hasVerseOne = true;
                } else if (item.type === "note") {
                  const fn = collectFootnoteText(item.content);
                  if (fn) footnotesInD.push(fn);
                } else if (Array.isArray(item.content)) {
                  walkD(item.content);
                }
              }
            }
          };
          walkD(node.content);

          const text = collectPlainString(node.content);
          if (!hasVerseOne && pendingHeader?.majorSection && text) {
            pendingHeader.majorSection = `${pendingHeader.majorSection} · ${text}`;
            continue;
          }

          if (text) {
            const h = ensureHeader();
            if (chapterFirstBlockId === null) h.isChapterStart = true;
            h.superscription = h.superscription
              ? `${h.superscription} ${text}`
              : text;
            if (hasVerseOne) {
              currentVerse = 1;
              h.superscriptionVerse = 1;
              deferredVerseOneBadge = true;
              const rec = getOrCreateVerseRecord(currentChapter, 1);
              rec.extraSearchParts.push(text);
              for (const fn of footnotesInD) {
                rec.footnotes.push(fn);
              }
            } else {
              const rec = getOrCreateVerseRecord(currentChapter, 1);
              rec.extraSearchParts.push(text);
              for (const fn of footnotesInD) {
                rec.footnotes.push(fn);
              }
            }
          }
          continue;
        }

        // Content block markers
        const rawSegments = [];
        const pendingFootnotes = [];
        let currentSeg = {
          v: currentVerse,
          explicitStart: false,
          rawText: "",
        };

        const walkContent = (items) => {
          if (!Array.isArray(items)) return;
          for (const item of items) {
            if (typeof item === "string") {
              currentSeg.rawText += item;
            } else if (item && typeof item === "object") {
              if (item.type === "verse") {
                const trimmedPrev = normalizeSpaces(currentSeg.rawText);
                if (trimmedPrev || currentSeg.explicitStart) {
                  rawSegments.push(currentSeg);
                }
                const parsedV = Number.parseInt(item.number, 10);
                currentVerse = Number.isFinite(parsedV) ? parsedV : currentVerse;
                currentSeg = {
                  v: currentVerse,
                  explicitStart: true,
                  rawText: "",
                };
              } else if (item.type === "note") {
                const fn = collectFootnoteText(item.content);
                if (fn) {
                  pendingFootnotes.push({
                    ch: currentChapter,
                    v: currentVerse,
                    fn,
                  });
                }
              } else if (Array.isArray(item.content)) {
                walkContent(item.content);
              }
            }
          }
        };

        walkContent(node.content);
        if (normalizeSpaces(currentSeg.rawText) || currentSeg.explicitStart) {
          rawSegments.push(currentSeg);
        }

        const finalSegments = [];
        for (const seg of rawSegments) {
          const cleanText = normalizeSpaces(seg.rawText);
          if (!cleanText) continue;

          const outSeg = { v: seg.v, t: cleanText };
          if (seg.explicitStart || (deferredVerseOneBadge && seg.v === 1)) {
            deferredVerseOneBadge = false;
            if (seg.v === 1) {
              if (!isPsalms && !isSingleChapterBook) {
                outSeg.c = currentChapter;
              } else if (isPsalms) {
                outSeg.n = 1;
              }
            } else {
              outSeg.n = 1;
            }
          }
          finalSegments.push(outSeg);
        }

        if (finalSegments.length === 0) {
          continue;
        }

        const hadHeaderImmediatelyAbove = pendingHeader !== null;
        flushPendingHeader();
        if (hadHeaderImmediatelyAbove) {
          pendingStanzaBreak = false;
        }

        for (const item of pendingFootnotes) {
          const rec = getOrCreateVerseRecord(item.ch, item.v);
          rec.footnotes.push(item.fn);
        }

        const blockId = blocks.length + 1;
        let flags = 0;
        if (pendingStanzaBreak) {
          flags |= FLAG_STANZA_BREAK;
          pendingStanzaBreak = false;
        }
        if (!hasEmittedChapterContent) {
          flags |= FLAG_CHAPTER_FIRST_CONTENT;
          hasEmittedChapterContent = true;
        }
        if (chapterFirstBlockId === null) {
          chapterFirstBlockId = blockId;
        }

        blocks.push({
          id: blockId,
          book: bookIndex,
          chapter: currentChapter,
          verse: finalSegments[0].v,
          kind: marker,
          flags,
          payload: JSON.stringify(finalSegments),
        });

        for (const seg of finalSegments) {
          const rec = getOrCreateVerseRecord(currentChapter, seg.v);
          if (rec.chapterBlockId === null && chapterFirstBlockId !== null) {
            rec.chapterBlockId = chapterFirstBlockId;
          }
          if (rec.verseBlockId === null) {
            rec.verseBlockId = blockId;
          }
          rec.textParts.push(seg.t);
        }
      }

      flushPendingHeader();
      bookStats.push({
        index: bookIndex,
        book: bookSpec.name,
        chapters: totalChaptersInBook,
        verses: bookVerseCount,
      });
    }

    if (fs.existsSync(spec.outPath)) {
      fs.unlinkSync(spec.outPath);
    }

    const db = new DatabaseSync(spec.outPath);

    db.exec(`
      PRAGMA journal_mode = OFF;
      PRAGMA synchronous = OFF;
      PRAGMA page_size = 4096;

      CREATE TABLE meta (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      CREATE TABLE books (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        chapters INTEGER NOT NULL,
        verses INTEGER NOT NULL
      );

      CREATE TABLE blocks (
        id INTEGER PRIMARY KEY,
        book INTEGER NOT NULL,
        chapter INTEGER NOT NULL,
        verse INTEGER NOT NULL,
        kind TEXT NOT NULL,
        flags INTEGER NOT NULL,
        payload TEXT NOT NULL
      );

      CREATE TABLE verses (
        id INTEGER PRIMARY KEY,
        book INTEGER NOT NULL,
        chapter INTEGER NOT NULL,
        verse INTEGER NOT NULL,
        chapter_block_id INTEGER NOT NULL,
        verse_block_id INTEGER NOT NULL,
        text TEXT NOT NULL,
        superscription TEXT,
        footnotes TEXT
      );
    `);

    const insertMeta = db.prepare(
      "INSERT INTO meta (key, value) VALUES (?, ?)"
    );
    const insertBook = db.prepare(
      "INSERT INTO books (id, name, chapters, verses) VALUES (?, ?, ?, ?)"
    );
    const insertBlock = db.prepare(
      "INSERT INTO blocks (id, book, chapter, verse, kind, flags, payload) VALUES (?, ?, ?, ?, ?, ?, ?)"
    );
    const insertVerse = db.prepare(
      "INSERT INTO verses (id, book, chapter, verse, chapter_block_id, verse_block_id, text, superscription, footnotes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    );

    const sortedVerses = [...verseMap.values()]
      .filter((v) => v.textParts.length > 0)
      .sort(
        (a, b) => a.book - b.book || a.chapter - b.chapter || a.verse - b.verse
      );

    db.exec("BEGIN TRANSACTION");

    insertMeta.run("translation", spec.code);
    insertMeta.run("total_blocks", String(blocks.length));
    insertMeta.run("total_verses", String(sortedVerses.length));

    for (const b of bookStats) {
      insertBook.run(b.index, b.book, b.chapters, b.verses);
    }

    for (const blk of blocks) {
      insertBlock.run(
        blk.id,
        blk.book,
        blk.chapter,
        blk.verse,
        blk.kind,
        blk.flags,
        blk.payload
      );
    }

    let verseRowId = 1;
    for (const v of sortedVerses) {
      const cleanText = v.textParts.join(" ");
      const superscription =
        v.extraSearchParts.length > 0 ? v.extraSearchParts.join(" ") : null;
      const footnotes = v.footnotes.length > 0 ? v.footnotes.join("\n") : null;
      const fallbackBlock = v.chapterBlockId ?? 1;

      insertVerse.run(
        verseRowId++,
        v.book,
        v.chapter,
        v.verse,
        v.chapterBlockId ?? fallbackBlock,
        v.verseBlockId ?? fallbackBlock,
        cleanText,
        superscription,
        footnotes
      );
    }

    db.exec("COMMIT");

    db.exec(`
      CREATE UNIQUE INDEX idx_verses_ref ON verses (book, chapter, verse);
      CREATE INDEX idx_blocks_book_chapter ON blocks (book, chapter);
      VACUUM;
    `);

    db.close();

    const stats = fs.statSync(spec.outPath);
    console.log(
      `Built ${spec.code} ${path.relative(rootDir, spec.outPath)} (${(
        stats.size /
        1024 /
        1024
      ).toFixed(2)} MB): ${bookStats.length} books, ${blocks.length} blocks, ${
        sortedVerses.length
      } verses.`
    );
  } finally {
    fs.rmSync(tempExtractDir, { recursive: true, force: true });
  }
}

const requested = process.argv.slice(2).map((s) => s.toLowerCase());
const targets =
  requested.length > 0
    ? TRANSLATION_SPECS.filter((t) => requested.includes(t.id))
    : TRANSLATION_SPECS;

if (targets.length === 0) {
  throw new Error(
    `Unknown translation filter: ${requested.join(", ")}. Available: ${TRANSLATION_SPECS.map((t) => t.id).join(", ")}`
  );
}

for (const spec of targets) {
  buildTranslationDb(spec);
}
