import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';

const projectRoot = path.resolve(new URL('.', import.meta.url).pathname, '..');
const englishPath = path.join(projectRoot, 'src', 'i18n', 'en.json');
const outputPath = path.join(projectRoot, 'src', 'i18n', 'autoTranslations.json');

const english = JSON.parse(fs.readFileSync(englishPath, 'utf8'));
const keys = Object.keys(english);

const targetLocales = [
  { code: 'fi', target: 'fi' },
  { code: 'no', target: 'no' },
  { code: 'sv', target: 'sv' },
  { code: 'da', target: 'da' },
  { code: 'cs', target: 'cs' },
  { code: 'hu', target: 'hu' },
  { code: 'ro', target: 'ro' },
  { code: 'el', target: 'el' },
  { code: 'tr', target: 'tr' },
  { code: 'bg', target: 'bg' },
  { code: 'ar', target: 'ar' },
  { code: 'ko', target: 'ko' },
  { code: 'he', target: 'iw' },
  { code: 'lv', target: 'lv' },
  { code: 'uk', target: 'uk' },
  { code: 'hi', target: 'hi' },
  { code: 'id', target: 'id' },
  { code: 'ms', target: 'ms' },
  { code: 'th', target: 'th' },
  { code: 'et', target: 'et' },
  { code: 'hr', target: 'hr' },
  { code: 'lt', target: 'lt' },
  { code: 'sk', target: 'sk' },
  { code: 'sr', target: 'sr' },
  { code: 'sl', target: 'sl' },
  { code: 'vi', target: 'vi' },
  { code: 'tl', target: 'tl' },
  { code: 'is', target: 'is' }
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const translateText = async (text, target) => {
  const params = new URLSearchParams({ client: 'gtx', sl: 'en', tl: target, dt: 't', q: text });
  const url = `https://translate.googleapis.com/translate_a/single?${params.toString()}`;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const translated = data?.[0]?.[0]?.[0];
      if (typeof translated === 'string') {
        return translated;
      }
      throw new Error('Unexpected response');
    } catch (err) {
      console.warn(`Translate retry (${attempt + 1}) for target ${target}:`, err.message);
      if (attempt === 2) throw err;
      await sleep(500 * (attempt + 1));
    }
  }
  return text;
};

const protectPlaceholders = (value) => {
  const placeholders = [];
  const protectedText = value.replace(/\{[^}]+\}/g, (match) => {
    const token = `__VAR${placeholders.length}__`;
    placeholders.push({ token, value: match });
    return token;
  });
  return { protectedText, placeholders };
};

const restorePlaceholders = (value, placeholders) => {
  let result = value;
  for (const { token, value: original } of placeholders) {
    result = result.replace(new RegExp(token, 'g'), original);
  }
  return result;
};

const generateTranslations = async () => {
  const output = {};
  for (const { code, target } of targetLocales) {
    console.log(`Translating locale ${code} (${target})...`);
    const localeTranslations = {};
    let processed = 0;
    for (const key of keys) {
      const baseText = english[key];
      const { protectedText, placeholders } = protectPlaceholders(baseText);
      const translated = await translateText(protectedText, target);
      const restored = restorePlaceholders(translated, placeholders);
      localeTranslations[key] = restored;
      processed++;
      if (processed % 25 === 0) {
        console.log(`  ${code}: ${processed}/${keys.length}`);
        await sleep(200);
      }
    }
    output[code] = localeTranslations;
    await sleep(1000);
  }
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
  console.log(`Generated translations written to ${outputPath}`);
};

generateTranslations().catch((err) => {
  console.error('Failed to generate translations:', err);
  process.exit(1);
});
