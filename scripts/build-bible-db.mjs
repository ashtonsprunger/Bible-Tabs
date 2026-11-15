import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const rootDir = process.cwd();
const zipPath = path.join(rootDir, "data", "bsb_usj.zip");
const outPath = path.join(rootDir, "assets", "bible.db");

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

function normalizeSpaces(str) {
  return str.replace(/\s+/g, " ").trim();
}

function normalizeForSearch(str) {
  return str
    .replace(/[\u2018\u2019\u02BC]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
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
      // Skip leading verse reference badge inside footnote (e.g. "1:5 ") since citation is shown in UI
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

if (!fs.existsSync(zipPath)) {
  throw new Error(`Missing ${zipPath}.`);
}

const tempExtractDir = fs.mkdtempSync(path.join(os.tmpdir(), "bsb-usj-"));

try {
  // Windows 10/11, macOS, and Linux all include `tar -xf` with ZIP support
  execFileSync("tar", ["-xf", zipPath, "-C", tempExtractDir], {
    stdio: "inherit",
  });

  const usjByCode = findUsjFiles(tempExtractDir);
  if (usjByCode.size !== 66) {
    throw new Error(`Expected 66 USJ files, found ${usjByCode.size}`);
  }

  const blocks = [];
  const verseMap = new Map(); // key: `${book},${chapter},${verse}` -> record
  const bookStats = [];

  for (let bookIndex = 0; bookIndex < BOOK_SPECS.length; bookIndex++) {
    const spec = BOOK_SPECS[bookIndex];
    const filePath = usjByCode.get(spec.code);
    if (!filePath) {
      throw new Error(`Missing USJ file for ${spec.code}`);
    }
    const usj = JSON.parse(fs.readFileSync(filePath, "utf8"));

    // Count total chapters in this book first so we know if it's a 1-chapter book
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

      if (node.type === "book") {
        continue;
      }

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
          h.bookTitle = spec.name;
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

      if (node.type !== "para") {
        continue;
      }

      const marker = node.marker;

      // Skip book-level frontmatter metadata markers
      if (["h", "toc1", "toc2", "toc3", "mt1", "mt2"].includes(marker)) {
        continue;
      }

      // Poetic blank stanza break
      if (marker === "b") {
        if (!pendingHeader) {
          pendingStanzaBreak = true;
        }
        continue;
      }

      // Major section (e.g. Psalms BOOK I..V)
      if (marker === "ms") {
        const text = collectPlainString(node.content);
        if (text) {
          const h = ensureHeader();
          if (chapterFirstBlockId === null) h.isChapterStart = true;
          h.majorSection = text;
        }
        continue;
      }

      // Section heading level 1
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

      // Parallel passage references under section heading
      if (marker === "r") {
        const text = collectPlainString(node.content);
        if (text) {
          const h = ensureHeader();
          if (chapterFirstBlockId === null) h.isChapterStart = true;
          h.refs = text;
        }
        continue;
      }

      // Section heading level 2
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

      // Acrostic stanza heading (Psalm 119 Hebrew letters: "א" + "ALEPH")
      if (marker === "qa") {
        const text = collectPlainString(node.content);
        if (text) {
          const h = ensureHeader();
          if (chapterFirstBlockId === null) h.isChapterStart = true;
          h.acrostic = h.acrostic ? `${h.acrostic}  ${text}` : text;
        }
        continue;
      }

      // Descriptive title / Psalm superscription (or range under BOOK I..V)
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
          }
        }
        continue;
      }

      // Content block markers: p, pmo, pc, li1, li2, q1, q2, qr, mr
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
                pendingFootnotes.push({ ch: currentChapter, v: currentVerse, fn });
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
            // Single-chapter book verse 1 omits redundant "1"
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
      book: spec.name,
      chapters: totalChaptersInBook,
      verses: bookVerseCount,
    });
  }

  if (fs.existsSync(outPath)) {
    fs.unlinkSync(outPath);
  }

  const db = new DatabaseSync(outPath);

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

  const insertMeta = db.prepare("INSERT INTO meta (key, value) VALUES (?, ?)");
  const insertBook = db.prepare(
    "INSERT INTO books (id, name, chapters, verses) VALUES (?, ?, ?, ?)"
  );
  const insertBlock = db.prepare(
    "INSERT INTO blocks (id, book, chapter, verse, kind, flags, payload) VALUES (?, ?, ?, ?, ?, ?, ?)"
  );
  const insertVerse = db.prepare(
    "INSERT INTO verses (id, book, chapter, verse, chapter_block_id, verse_block_id, text, superscription, footnotes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
  );

  const sortedVerses = [...verseMap.values()].sort(
    (a, b) => a.book - b.book || a.chapter - b.chapter || a.verse - b.verse
  );

  db.exec("BEGIN TRANSACTION");

  insertMeta.run("translation", "BSB");
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

  const stats = fs.statSync(outPath);
  console.log(
    `Built BSB assets/bible.db (${(stats.size / 1024 / 1024).toFixed(2)} MB): ${bookStats.length} books, ${blocks.length} formatted blocks, ${sortedVerses.length} verses.`
  );
} finally {
  fs.rmSync(tempExtractDir, { recursive: true, force: true });
}
