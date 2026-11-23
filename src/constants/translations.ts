import type {
  ApiTranslationId,
  LocalTranslationId,
  TranslationId,
} from "../types";

interface BaseTranslationMeta {
  id: TranslationId;
  shortName: string;
  fullName: string;
  licenseNote: string;
  copyrightNotice: string;
  publisherUrl?: string;
  publisherLinkLabel?: string;
}

export interface LocalTranslationMeta extends BaseTranslationMeta {
  id: LocalTranslationId;
  source: "local";
  dbName: string;
  assetId: number;
}

export interface ApiTranslationMeta extends BaseTranslationMeta {
  id: ApiTranslationId;
  source: "api";
  apiBibleId: string;
  publisherUrl: string;
  publisherLinkLabel: string;
}

export type TranslationMeta = LocalTranslationMeta | ApiTranslationMeta;

export const LOCAL_TRANSLATION_IDS: readonly LocalTranslationId[] = [
  "bsb",
  "kjv",
  "web",
  "asv",
] as const;

export const API_TRANSLATION_IDS: readonly ApiTranslationId[] = [
  "niv",
  "nlt",
  "nasb",
] as const;

export const TRANSLATION_IDS: readonly TranslationId[] = [
  ...LOCAL_TRANSLATION_IDS,
  ...API_TRANSLATION_IDS,
] as const;

export const API_BIBLE_ATTRIBUTION_URL = "https://api.bible";

export const TRANSLATIONS: Record<TranslationId, TranslationMeta> = {
  bsb: {
    id: "bsb",
    source: "local",
    shortName: "BSB",
    fullName: "Berean Standard Bible",
    licenseNote: "Offline · Public Domain (CC0)",
    copyrightNotice:
      "The Holy Bible, Berean Standard Bible (BSB) is dedicated to the public domain worldwide (CC0 1.0).",
    publisherUrl: "https://berean.bible/licensing.htm",
    publisherLinkLabel: "berean.bible",
    dbName: "bible_bsb_v2.db",
    assetId: require("../../assets/bible_bsb.db"),
  },
  kjv: {
    id: "kjv",
    source: "local",
    shortName: "KJV",
    fullName: "King James Version",
    licenseNote: "Offline · Public Domain",
    copyrightNotice:
      "King James Version (1769 Oxford Standard text). Public Domain.",
    publisherUrl: "https://ebible.org/eng-kjv2006/",
    publisherLinkLabel: "ebible.org",
    dbName: "bible_kjv_v1.db",
    assetId: require("../../assets/bible_kjv.db"),
  },
  web: {
    id: "web",
    source: "local",
    shortName: "WEB",
    fullName: "World English Bible",
    licenseNote: "Offline · Public Domain",
    copyrightNotice:
      "World English Bible (WEB) is in the Public Domain (no copyright).",
    publisherUrl: "https://worldenglish.bible/",
    publisherLinkLabel: "worldenglish.bible",
    dbName: "bible_web_v1.db",
    assetId: require("../../assets/bible_web.db"),
  },
  asv: {
    id: "asv",
    source: "local",
    shortName: "ASV",
    fullName: "American Standard Version (1901)",
    licenseNote: "Offline · Public Domain",
    copyrightNotice:
      "American Standard Version (1901). Public Domain.",
    publisherUrl: "https://ebible.org/eng-asv/",
    publisherLinkLabel: "ebible.org",
    dbName: "bible_asv_v1.db",
    assetId: require("../../assets/bible_asv.db"),
  },
  niv: {
    id: "niv",
    source: "api",
    shortName: "NIV",
    fullName: "New International Version",
    licenseNote: "Online via API.Bible · Biblica, Inc.®",
    copyrightNotice:
      "The Holy Bible, New International Version® NIV® Copyright © 1973, 1978, 1984, 2011 by Biblica, Inc.® Used by Permission of Biblica, Inc.® All rights reserved worldwide.",
    publisherUrl: "https://www.biblica.com",
    publisherLinkLabel: "Biblica.com",
    apiBibleId: "78a9f6124f344018-01",
  },
  nlt: {
    id: "nlt",
    source: "api",
    shortName: "NLT",
    fullName: "New Living Translation",
    licenseNote: "Online via API.Bible · Tyndale House",
    copyrightNotice:
      "Holy Bible, New Living Translation, copyright © 1996, 2004, 2015 by Tyndale House Foundation. All rights reserved. Used by permission of Tyndale House Publishers, Carol Stream, Illinois 60188. All rights reserved.",
    publisherUrl: "https://www.newlivingtranslation.com",
    publisherLinkLabel: "NewLivingTranslation.com",
    apiBibleId: "d6e14a625393b4da-01",
  },
  nasb: {
    id: "nasb",
    source: "api",
    shortName: "NASB",
    fullName: "New American Standard Bible (1995)",
    licenseNote: "Online via API.Bible · Lockman Foundation",
    copyrightNotice:
      "NEW AMERICAN STANDARD BIBLE® NASB® Copyright © 1960,1962,1963,1968,1971,1972,1973,1975,1977,1995 by The Lockman Foundation A Corporation Not for Profit La Habra, CA All Rights Reserved www.lockman.org",
    publisherUrl: "https://www.lockman.org",
    publisherLinkLabel: "Lockman.org",
    apiBibleId: "b8ee27bcd1cae43a-01",
  },
};

export function isApiTranslation(id: TranslationId): id is ApiTranslationId {
  return TRANSLATIONS[id].source === "api";
}

export function isLocalTranslationMeta(
  meta: TranslationMeta
): meta is LocalTranslationMeta {
  return meta.source === "local";
}

export function parseTranslationId(
  raw: string | null | undefined
): TranslationId {
  if (
    raw === "bsb" ||
    raw === "kjv" ||
    raw === "web" ||
    raw === "asv" ||
    raw === "niv" ||
    raw === "nlt" ||
    raw === "nasb"
  ) {
    return raw;
  }
  return "bsb";
}
