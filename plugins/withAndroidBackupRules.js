const fs = require("fs");
const path = require("path");
const {
  withAndroidManifest,
  withDangerousMod,
} = require("expo/config-plugins");

/**
 * Configures Android Auto Backup so user data (user_data_v1.db + expo-sqlite kv-store)
 * is backed up automatically to Google Drive while large read-only Bible translation DBs
 * are excluded (preventing Android's 25 MB per-app backup limit from silently failing).
 */
const FULL_BACKUP_CONTENT_XML = `<?xml version="1.0" encoding="utf-8"?>
<full-backup-content>
    <include domain="database" path="." />
    <include domain="sharedpref" path="." />
    <include domain="file" path="." />
    <exclude domain="database" path="bible_bsb_v2.db" />
    <exclude domain="database" path="bible_bsb_v2.db-wal" />
    <exclude domain="database" path="bible_bsb_v2.db-shm" />
    <exclude domain="database" path="bible_kjv_v1.db" />
    <exclude domain="database" path="bible_kjv_v1.db-wal" />
    <exclude domain="database" path="bible_kjv_v1.db-shm" />
    <exclude domain="database" path="bible_web_v1.db" />
    <exclude domain="database" path="bible_web_v1.db-wal" />
    <exclude domain="database" path="bible_web_v1.db-shm" />
    <exclude domain="database" path="bible_asv_v1.db" />
    <exclude domain="database" path="bible_asv_v1.db-wal" />
    <exclude domain="database" path="bible_asv_v1.db-shm" />
    <exclude domain="file" path="SQLite/bible_bsb_v2.db" />
    <exclude domain="file" path="SQLite/bible_bsb_v2.db-wal" />
    <exclude domain="file" path="SQLite/bible_bsb_v2.db-shm" />
    <exclude domain="file" path="SQLite/bible_kjv_v1.db" />
    <exclude domain="file" path="SQLite/bible_kjv_v1.db-wal" />
    <exclude domain="file" path="SQLite/bible_kjv_v1.db-shm" />
    <exclude domain="file" path="SQLite/bible_web_v1.db" />
    <exclude domain="file" path="SQLite/bible_web_v1.db-wal" />
    <exclude domain="file" path="SQLite/bible_web_v1.db-shm" />
    <exclude domain="file" path="SQLite/bible_asv_v1.db" />
    <exclude domain="file" path="SQLite/bible_asv_v1.db-wal" />
    <exclude domain="file" path="SQLite/bible_asv_v1.db-shm" />
</full-backup-content>
`;

const DATA_EXTRACTION_RULES_XML = `<?xml version="1.0" encoding="utf-8"?>
<data-extraction-rules>
    <cloud-backup>
        <include domain="database" path="." />
        <include domain="sharedpref" path="." />
        <include domain="file" path="." />
        <exclude domain="database" path="bible_bsb_v2.db" />
        <exclude domain="database" path="bible_bsb_v2.db-wal" />
        <exclude domain="database" path="bible_bsb_v2.db-shm" />
        <exclude domain="database" path="bible_kjv_v1.db" />
        <exclude domain="database" path="bible_kjv_v1.db-wal" />
        <exclude domain="database" path="bible_kjv_v1.db-shm" />
        <exclude domain="database" path="bible_web_v1.db" />
        <exclude domain="database" path="bible_web_v1.db-wal" />
        <exclude domain="database" path="bible_web_v1.db-shm" />
        <exclude domain="database" path="bible_asv_v1.db" />
        <exclude domain="database" path="bible_asv_v1.db-wal" />
        <exclude domain="database" path="bible_asv_v1.db-shm" />
        <exclude domain="file" path="SQLite/bible_bsb_v2.db" />
        <exclude domain="file" path="SQLite/bible_bsb_v2.db-wal" />
        <exclude domain="file" path="SQLite/bible_bsb_v2.db-shm" />
        <exclude domain="file" path="SQLite/bible_kjv_v1.db" />
        <exclude domain="file" path="SQLite/bible_kjv_v1.db-wal" />
        <exclude domain="file" path="SQLite/bible_kjv_v1.db-shm" />
        <exclude domain="file" path="SQLite/bible_web_v1.db" />
        <exclude domain="file" path="SQLite/bible_web_v1.db-wal" />
        <exclude domain="file" path="SQLite/bible_web_v1.db-shm" />
        <exclude domain="file" path="SQLite/bible_asv_v1.db" />
        <exclude domain="file" path="SQLite/bible_asv_v1.db-wal" />
        <exclude domain="file" path="SQLite/bible_asv_v1.db-shm" />
    </cloud-backup>
    <device-transfer>
        <include domain="database" path="." />
        <include domain="sharedpref" path="." />
        <include domain="file" path="." />
        <exclude domain="database" path="bible_bsb_v2.db" />
        <exclude domain="database" path="bible_kjv_v1.db" />
        <exclude domain="database" path="bible_web_v1.db" />
        <exclude domain="database" path="bible_asv_v1.db" />
        <exclude domain="file" path="SQLite/bible_bsb_v2.db" />
        <exclude domain="file" path="SQLite/bible_kjv_v1.db" />
        <exclude domain="file" path="SQLite/bible_web_v1.db" />
        <exclude domain="file" path="SQLite/bible_asv_v1.db" />
    </device-transfer>
</data-extraction-rules>
`;

function withAndroidBackupRules(config) {
  config = withDangerousMod(config, [
    "android",
    async (modConfig) => {
      const xmlDir = path.join(
        modConfig.modRequest.platformProjectRoot,
        "app",
        "src",
        "main",
        "res",
        "xml"
      );
      fs.mkdirSync(xmlDir, { recursive: true });
      fs.writeFileSync(
        path.join(xmlDir, "bible_tabs_backup_rules.xml"),
        FULL_BACKUP_CONTENT_XML,
        "utf8"
      );
      fs.writeFileSync(
        path.join(xmlDir, "bible_tabs_data_extraction_rules.xml"),
        DATA_EXTRACTION_RULES_XML,
        "utf8"
      );
      return modConfig;
    },
  ]);

  config = withAndroidManifest(config, (modConfig) => {
    const manifest = modConfig.modResults;
    const app = manifest?.manifest?.application?.[0];
    if (app && app.$) {
      app.$["android:allowBackup"] = "true";
      app.$["android:fullBackupContent"] = "@xml/bible_tabs_backup_rules";
      app.$["android:dataExtractionRules"] =
        "@xml/bible_tabs_data_extraction_rules";
    }
    return modConfig;
  });

  return config;
}

module.exports = withAndroidBackupRules;
