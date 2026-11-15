import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const rootDir = process.cwd();
const dataPath = path.join(rootDir, "data.json");
const booksPath = path.join(rootDir, "books.json");
const outPath = path.join(rootDir, "assets", "bible.db");

function loadJson(localPath, relFile) {
  if (fs.existsSync(localPath)) {
    return JSON.parse(fs.readFileSync(localPath, "utf8"));
  }
  for (const branch of ["master", "main"]) {
    try {
      const fromGit = execFileSync("git", ["show", `${branch}:${relFile}`], {
        cwd: rootDir,
        encoding: "utf8",
        maxBuffer: 25 * 1024 * 1024,
        stdio: ["ignore", "pipe", "ignore"],
      });
      return JSON.parse(fromGit);
    } catch {
      // try next branch
    }
  }
  throw new Error(`Could not find ${relFile} locally or in master/main git history.`);
}

const rawVerses = loadJson(dataPath, "data.json");
const rawBooks = loadJson(booksPath, "books.json");

if (fs.existsSync(outPath)) {
  fs.unlinkSync(outPath);
}

const db = new DatabaseSync(outPath);

db.exec(`
  PRAGMA journal_mode = OFF;
  PRAGMA synchronous = OFF;
  PRAGMA page_size = 4096;

  CREATE TABLE books (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    chapters INTEGER NOT NULL,
    verses INTEGER NOT NULL
  );

  CREATE TABLE verses (
    id INTEGER PRIMARY KEY,
    book INTEGER NOT NULL,
    chapter INTEGER NOT NULL,
    verse INTEGER NOT NULL,
    text TEXT NOT NULL
  );
`);

const insertBook = db.prepare(
  "INSERT INTO books (id, name, chapters, verses) VALUES (?, ?, ?, ?)"
);
const insertVerse = db.prepare(
  "INSERT INTO verses (book, chapter, verse, text) VALUES (?, ?, ?, ?)"
);

db.exec("BEGIN TRANSACTION");
for (const b of rawBooks) {
  insertBook.run(
    Number(b.index),
    String(b.book),
    Number(b.chapters),
    Number(b.verses)
  );
}
for (const v of rawVerses) {
  insertVerse.run(Number(v[0]), Number(v[1]), Number(v[2]), String(v[3]));
}
db.exec("COMMIT");

db.exec(`
  CREATE UNIQUE INDEX idx_verses_book_chapter ON verses(book, chapter, verse);
  VACUUM;
`);

const verseCount = db.prepare("SELECT COUNT(*) as count FROM verses").get();
const bookCount = db.prepare("SELECT COUNT(*) as count FROM books").get();
db.close();

const stats = fs.statSync(outPath);
console.log(
  `Built assets/bible.db (${(stats.size / 1024 / 1024).toFixed(2)} MB) with ${bookCount.count} books and ${verseCount.count} verses.`
);
