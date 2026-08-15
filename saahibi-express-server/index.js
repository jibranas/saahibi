import 'dotenv/config';
import { fileURLToPath } from 'node:url';

import compression from 'compression';
import cors from 'cors';
import express from 'express';

import { connectDb, isDbConnected } from './db.js';
import {
  ensureMorphologyStore,
  isMorphologyStoreReady,
} from './lib/morphologyStore.js';
import { ensureCorpus, isCorpusReady } from './lib/quranCorpus.js';
import { RULES } from './lib/ruleCatalog.js';
import {
  ensureTranslationStore,
  isTranslationStoreReady,
} from './lib/translations.js';
import exampleOccurrences from './middleware/exampleOccurrences.js';
import exampleVisibility from './middleware/exampleVisibility.js';
import queryCache from './middleware/queryCache.js';
import adminRoutes from './routes/admin.js';
import morphologyRoutes from './routes/morphology.js';
import phraseOccurrencesRoutes from './routes/phraseOccurrences.js';
import visibilityRoutes from './routes/visibility.js';
import alNomIndefRoutes from './routes/queries/alNomIndef.js';
import anaIndefRoutes from './routes/queries/anaIndef.js';
import antaIndefRoutes from './routes/queries/antaIndef.js';
import antumActpcplRoutes from './routes/queries/antumActpcpl.js';
import ayahsWithVpnRoutes from './routes/queries/ayahsWithVpn.js';
import brokenPluralsRoutes from './routes/queries/brokenPlurals.js';
import dhalikaIndefRoutes from './routes/queries/dhalikaIndef.js';
import dhanikaNomRoutes from './routes/queries/dhanikaNom.js';
import dualNounsIntroRoutes from './routes/queries/dualNounsIntro.js';
import fathaHamzaDammaRoutes from './routes/queries/fathaHamzaDamma.js';
import fathaHamzaIndefRoutes from './routes/queries/fathaHamzaIndef.js';
import fathaYaaFemininesRoutes from './routes/queries/fathaYaaFeminines.js';
import feminineByMeaningRoutes from './routes/queries/feminineByMeaning.js';
import femalePluralIntroRoutes from './routes/queries/femalePluralIntro.js';
import feminineIrabRoutes from './routes/queries/feminineIrab.js';
import feminineNounsRoutes from './routes/queries/feminineNouns.js';
import ghairMunsarifRoutes from './routes/queries/ghairMunsarif.js';
import hathaIndefRoutes from './routes/queries/hathaIndef.js';
import hathaniNomRoutes from './routes/queries/hathaniNom.js';
import hathihiIndefRoutes from './routes/queries/hathihiIndef.js';
import hathihiPluralRoutes from './routes/queries/hathihiPlural.js';
import hathihiPluralGhayrAaqilRoutes from './routes/queries/hathihiPluralGhayrAaqil.js';
import haulaiIndefRoutes from './routes/queries/haulaiIndef.js';
import hiyaIndefRoutes from './routes/queries/hiyaIndef.js';
import huwaIndefRoutes from './routes/queries/huwaIndef.js';
import idafaAsmaAbRoutes from './routes/queries/idafaAsmaAb.js';
import idafaAsmaAkhRoutes from './routes/queries/idafaAsmaAkh.js';
import idafaAsmaDhuRoutes from './routes/queries/idafaAsmaDhu.js';
import idafaAsmaFamRoutes from './routes/queries/idafaAsmaFam.js';
import idafaAsmaHamRoutes from './routes/queries/idafaAsmaHam.js';
import idafaComplexRoutes from './routes/queries/idafaComplex.js';
import idafaDualFemaleRoutes from './routes/queries/idafaDualFemale.js';
import idafaDualMaleRoutes from './routes/queries/idafaDualMale.js';
import idafaDualMubtadaKhabarRoutes from './routes/queries/idafaDualMubtadaKhabar.js';
import idafaFemaleSingRoutes from './routes/queries/idafaFemaleSing.js';
import idafaIsharaMudafRoutes from './routes/queries/idafaIsharaMudaf.js';
import idafaIsharaMudafIlayhiRoutes from './routes/queries/idafaIsharaMudafIlayhi.js';
import idafaMaleSingRoutes from './routes/queries/idafaMaleSing.js';
import idafaMubtadaKhabarRoutes from './routes/queries/idafaMubtadaKhabar.js';
import idafaMudafIlayhiSifahRoutes from './routes/queries/idafaMudafIlayhiSifah.js';
import idafaMudafSifahRoutes from './routes/queries/idafaMudafSifah.js';
import idafaMuzafDualFemaleRoutes from './routes/queries/idafaMuzafDualFemale.js';
import idafaMuzafDualMaleRoutes from './routes/queries/idafaMuzafDualMale.js';
import idafaMuzafPluralFemaleRoutes from './routes/queries/idafaMuzafPluralFemale.js';
import idafaMuzafPluralFemaleSaalimRoutes from './routes/queries/idafaMuzafPluralFemaleSaalim.js';
import idafaMuzafPluralMaleRoutes from './routes/queries/idafaMuzafPluralMale.js';
import idafaMuzafPluralMaleSaalimRoutes from './routes/queries/idafaMuzafPluralMaleSaalim.js';
import idafaPluralFemaleRoutes from './routes/queries/idafaPluralFemale.js';
import idafaPluralMaleRoutes from './routes/queries/idafaPluralMale.js';
import idafaPronounRoutes from './routes/queries/idafaPronoun.js';
import idafaPronounHimRoutes from './routes/queries/idafaPronounHim.js';
import idafaPronounHimaRoutes from './routes/queries/idafaPronounHima.js';
import idafaPronounHinnaRoutes from './routes/queries/idafaPronounHinna.js';
import idafaYaFathaAfterAlifRoutes from './routes/queries/idafaYaFathaAfterAlif.js';
import idafaYaFathaJoiningNextRoutes from './routes/queries/idafaYaFathaJoiningNext.js';
import idafaYaShaddaTwoYasRoutes from './routes/queries/idafaYaShaddaTwoYas.js';
import idafaZameerKhabarRoutes from './routes/queries/idafaZameerKhabar.js';
import jarTaRoutes from './routes/queries/jarTa.js';
import jarWaRoutes from './routes/queries/jarWa.js';
import kulluDefRoutes from './routes/queries/kulluDef.js';
import kulluIndefRoutes from './routes/queries/kulluIndef.js';
import mabniAsmaRoutes from './routes/queries/mabniAsma.js';
import malePluralIntroRoutes from './routes/queries/malePluralIntro.js';
import marifaNakiraRoutes from './routes/queries/marifaNakira.js';
import mawsufSifahRoutes from './routes/queries/mawsufSifah.js';
import mawsufSifahPluralRoutes from './routes/queries/mawsufSifahPlural.js';
import mubtadaKhabarIdafaRoutes from './routes/queries/mubtadaKhabarIdafa.js';
import mubtadaKhabarIdafaZameerRoutes from './routes/queries/mubtadaKhabarIdafaZameer.js';
import mubtadaKhabarSifahRoutes from './routes/queries/mubtadaKhabarSifah.js';
import mubtadaSifahKhabarRoutes from './routes/queries/mubtadaSifahKhabar.js';
import murakkabIsharaRoutes from './routes/queries/murakkabIshara.js';
import murakkabIsharaMubtadaKhabarRoutes from './routes/queries/murakkabIsharaMubtadaKhabar.js';
import murakkabIsharaSifatRoutes from './routes/queries/murakkabIsharaSifat.js';
import murrakkabJaariBiRoutes from './routes/queries/murrakkabJaariBi.js';
import murrakkabJaariBiIdafaRoutes from './routes/queries/murrakkabJaariBiIdafa.js';
import murrakkabJaariBiTwoRoutes from './routes/queries/murrakkabJaariBiTwo.js';
import nahnuActpcplRoutes from './routes/queries/nahnuActpcpl.js';
import singleWordFilRoutes from './routes/queries/singleWordFil.js';
import singleWordHarfRoutes from './routes/queries/singleWordHarf.js';
import singleWordIsmRoutes from './routes/queries/singleWordIsm.js';
import tanweenIrabRoutes from './routes/queries/tanweenIrab.js';
import tilkaPluralIndefRoutes from './routes/queries/tilkaPluralIndef.js';
import tilkaSingIndefRoutes from './routes/queries/tilkaSingIndef.js';
import ulaaikaIndefRoutes from './routes/queries/ulaaikaIndef.js';
import rootMeaningRoutes from './routes/rootMeaning.js';
import ruleTtsRoutes from './routes/ruleTts.js';
import translationsRoutes from './routes/translations.js';
import wordAudioRoutes from './routes/wordAudio.js';
import wordGrammarRoutes from './routes/wordGrammar.js';

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const WORD_AUDIO_ROOT = fileURLToPath(
  new URL('./public/quran-word-audio/', import.meta.url)
);
const ADMIN_ROOT = fileURLToPath(new URL('./public/admin/', import.meta.url));

// Lesson payloads are a few hundred KB of highly repetitive JSON.
app.use(compression());
app.use(cors());
app.use(express.json());
app.use(
  '/quran-word-audio',
  express.static(WORD_AUDIO_ROOT, {
    immutable: true,
    maxAge: '1y',
    setHeaders(res) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    },
  })
);
app.use('/admin', express.static(ADMIN_ROOT));

app.use('/api/morphology', morphologyRoutes);
app.use('/api/translations', translationsRoutes);
app.use('/api/word-audio', wordAudioRoutes);
app.use('/api/root-meaning', rootMeaningRoutes);
app.use('/api/rule-tts', ruleTtsRoutes);
app.use('/api/word-grammar', wordGrammarRoutes);
app.use('/api/phrase-occurrences', phraseOccurrencesRoutes);
app.use('/api/content-visibility', visibilityRoutes);
app.use('/api/admin', adminRoutes);

// These wrap `res.json`, so the first one mounted ends up innermost. The cache
// therefore stores the fully decorated and filtered body, visibility wraps next
// so phraseRef is attached before hidden examples are dropped, and occurrences
// wraps outermost where it sees the route's raw output.
app.use('/api/queries', queryCache);
app.use('/api/queries', exampleVisibility);
app.use('/api/queries', exampleOccurrences);

// Rule query routes — mounted in `data/rules.ts` order so the /api/queries
// namespace mirrors the canonical rule sequence. New rules should be inserted
// at the corresponding position in the manifest and here.
app.use('/api/queries/ayahs-with-vpn', ayahsWithVpnRoutes);
app.use('/api/queries/single-word-ism', singleWordIsmRoutes);
app.use('/api/queries/single-word-fil', singleWordFilRoutes);
app.use('/api/queries/single-word-harf', singleWordHarfRoutes);
app.use('/api/queries/tanween-irab', tanweenIrabRoutes);
app.use('/api/queries/ghair-munsarif', ghairMunsarifRoutes);
app.use('/api/queries/mabni-asma', mabniAsmaRoutes);
app.use('/api/queries/feminine-nouns', feminineNounsRoutes);
app.use('/api/queries/feminine-irab', feminineIrabRoutes);
app.use('/api/queries/fatha-hamza-damma', fathaHamzaDammaRoutes);
app.use('/api/queries/fatha-hamza-indef', fathaHamzaIndefRoutes);
app.use('/api/queries/fatha-yaa-feminines', fathaYaaFemininesRoutes);
app.use('/api/queries/feminine-by-meaning', feminineByMeaningRoutes);
app.use('/api/queries/dual-nouns-intro', dualNounsIntroRoutes);
app.use('/api/queries/male-plural-intro', malePluralIntroRoutes);
app.use('/api/queries/female-plural-intro', femalePluralIntroRoutes);
app.use('/api/queries/broken-plurals', brokenPluralsRoutes);
app.use('/api/queries/marifa-nakira', marifaNakiraRoutes);
app.use('/api/queries/huwa-indef', huwaIndefRoutes);
app.use('/api/queries/hiya-indef', hiyaIndefRoutes);
app.use('/api/queries/anta-indef', antaIndefRoutes);
app.use('/api/queries/antum-actpcpl', antumActpcplRoutes);
app.use('/api/queries/ana-indef', anaIndefRoutes);
app.use('/api/queries/nahnu-actpcpl', nahnuActpcplRoutes);
app.use('/api/queries/hatha-indef', hathaIndefRoutes);
app.use('/api/queries/hathihi-indef', hathihiIndefRoutes);
app.use('/api/queries/hathihi-plural', hathihiPluralRoutes);
app.use('/api/queries/hathani-nom', hathaniNomRoutes);
app.use('/api/queries/haulai-indef', haulaiIndefRoutes);
app.use('/api/queries/dhalika-indef', dhalikaIndefRoutes);
app.use('/api/queries/dhanika-nom', dhanikaNomRoutes);
app.use('/api/queries/tilka-sing-indef', tilkaSingIndefRoutes);
app.use('/api/queries/tilka-plural-indef', tilkaPluralIndefRoutes);
app.use('/api/queries/ulaaika-indef', ulaaikaIndefRoutes);
app.use('/api/queries/al-nom-indef', alNomIndefRoutes);
app.use('/api/queries/mawsuf-sifah', mawsufSifahRoutes);
app.use('/api/queries/mawsuf-sifah-plural', mawsufSifahPluralRoutes);
app.use('/api/queries/mubtada-khabar-sifah', mubtadaKhabarSifahRoutes);
app.use('/api/queries/mubtada-sifah-khabar', mubtadaSifahKhabarRoutes);
app.use('/api/queries/murakkab-ishara', murakkabIsharaRoutes);
app.use(
  '/api/queries/hathihi-plural-ghayr-aaqil',
  hathihiPluralGhayrAaqilRoutes
);
app.use(
  '/api/queries/murakkab-ishara-mubtada-khabar',
  murakkabIsharaMubtadaKhabarRoutes
);
app.use('/api/queries/murakkab-ishara-sifat', murakkabIsharaSifatRoutes);
app.use('/api/queries/idafa-male-sing', idafaMaleSingRoutes);
app.use('/api/queries/idafa-female-sing', idafaFemaleSingRoutes);
app.use('/api/queries/idafa-mubtada-khabar', idafaMubtadaKhabarRoutes);
app.use(
  '/api/queries/idafa-dual-mubtada-khabar',
  idafaDualMubtadaKhabarRoutes
);
app.use('/api/queries/mubtada-khabar-idafa', mubtadaKhabarIdafaRoutes);
app.use('/api/queries/kullu-indef', kulluIndefRoutes);
app.use('/api/queries/kullu-def', kulluDefRoutes);
app.use('/api/queries/idafa-dual-male', idafaDualMaleRoutes);
app.use('/api/queries/idafa-plural-male', idafaPluralMaleRoutes);
app.use('/api/queries/idafa-dual-female', idafaDualFemaleRoutes);
app.use('/api/queries/idafa-plural-female', idafaPluralFemaleRoutes);
app.use('/api/queries/idafa-muzaf-dual-male', idafaMuzafDualMaleRoutes);
app.use('/api/queries/idafa-muzaf-dual-female', idafaMuzafDualFemaleRoutes);
app.use('/api/queries/idafa-muzaf-plural-male', idafaMuzafPluralMaleRoutes);
app.use(
  '/api/queries/idafa-muzaf-plural-female',
  idafaMuzafPluralFemaleRoutes
);
app.use(
  '/api/queries/idafa-muzaf-plural-male-saalim',
  idafaMuzafPluralMaleSaalimRoutes
);
app.use(
  '/api/queries/idafa-muzaf-plural-female-saalim',
  idafaMuzafPluralFemaleSaalimRoutes
);
app.use('/api/queries/idafa-pronoun', idafaPronounRoutes);
app.use('/api/queries/idafa-zameer-khabar', idafaZameerKhabarRoutes);
app.use(
  '/api/queries/mubtada-khabar-idafa-zameer',
  mubtadaKhabarIdafaZameerRoutes
);
app.use('/api/queries/idafa-asma-ab', idafaAsmaAbRoutes);
app.use('/api/queries/idafa-asma-akh', idafaAsmaAkhRoutes);
app.use('/api/queries/idafa-asma-ham', idafaAsmaHamRoutes);
app.use('/api/queries/idafa-asma-fam', idafaAsmaFamRoutes);
app.use('/api/queries/idafa-asma-dhu', idafaAsmaDhuRoutes);
app.use('/api/queries/idafa-pronoun-hima', idafaPronounHimaRoutes);
app.use('/api/queries/idafa-pronoun-him', idafaPronounHimRoutes);
app.use('/api/queries/idafa-pronoun-hinna', idafaPronounHinnaRoutes);
app.use('/api/queries/idafa-ya-fatha-after-alif', idafaYaFathaAfterAlifRoutes);
app.use('/api/queries/idafa-ya-shadda-two-yas', idafaYaShaddaTwoYasRoutes);
app.use(
  '/api/queries/idafa-ya-fatha-joining-next',
  idafaYaFathaJoiningNextRoutes
);
app.use('/api/queries/idafa-complex', idafaComplexRoutes);
app.use('/api/queries/idafa-mudaf-sifah', idafaMudafSifahRoutes);
app.use('/api/queries/idafa-mudaf-ilayhi-sifah', idafaMudafIlayhiSifahRoutes);
app.use('/api/queries/idafa-ishara-mudaf', idafaIsharaMudafRoutes);
app.use(
  '/api/queries/idafa-ishara-mudaf-ilayhi',
  idafaIsharaMudafIlayhiRoutes
);
app.use('/api/queries/murrakkab-jaari-bi', murrakkabJaariBiRoutes);
app.use('/api/queries/murrakkab-jaari-bi-two', murrakkabJaariBiTwoRoutes);
app.use('/api/queries/murrakkab-jaari-bi-idafa', murrakkabJaariBiIdafaRoutes);
app.use('/api/queries/jar-ta', jarTaRoutes);
app.use('/api/queries/jar-wa', jarWaRoutes);

app.get('/api/message', (_req, res) => {
  res.json({ message: 'Bismillah!' });
});

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    mongo: isDbConnected() ? 'connected' : 'not configured',
    morphology: isMorphologyStoreReady() ? 'ready' : 'loading',
    translations: isTranslationStoreReady() ? 'ready' : 'loading',
    corpus: isCorpusReady() ? 'ready' : 'building',
  });
});

app.get('/admin', (_req, res) => {
  res.sendFile(fileURLToPath(new URL('./public/admin/index.html', import.meta.url)));
});

async function warmCaches() {
  const startedAt = Date.now();
  await Promise.all([ensureMorphologyStore(), ensureTranslationStore()]);
  // The phrase index folds the segment store into words, so it goes second.
  await ensureCorpus();
  console.log(`[warmup] caches ready in ${Date.now() - startedAt}ms`);
}

/**
 * Compute every lesson once so no reader is the one who pays for it. Goes
 * through the HTTP stack rather than calling routes directly, so the payloads
 * land in the response cache exactly as a client would receive them.
 *
 * Off by default in development, where nodemon restarts constantly; set
 * WARM_LESSON_CACHE=1 to force it either way.
 */
async function warmLessonCache() {
  const endpoints = RULES.filter(
    (rule) => rule.status === 'available' && rule.endpoint
  ).map((rule) => rule.endpoint);

  const startedAt = Date.now();
  let warmed = 0;
  for (const endpoint of endpoints) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}${endpoint}`);
      await res.arrayBuffer();
      if (res.ok) warmed += 1;
    } catch {
      // A lesson that fails to warm is simply a cache miss for its first reader.
    }
  }

  console.log(
    `[warmup] precomputed ${warmed}/${endpoints.length} lessons in ` +
      `${Date.now() - startedAt}ms`
  );
}

function shouldWarmLessons() {
  if (process.env.WARM_LESSON_CACHE === '1') return true;
  if (process.env.WARM_LESSON_CACHE === '0') return false;
  return process.env.NODE_ENV === 'production';
}

async function main() {
  try {
    await connectDb();
  } catch (err) {
    console.error('[db] Failed to connect:', err.message);
    process.exit(1);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Saahibi API listening on http://localhost:${PORT}`);

    // Warm the in-memory corpus, translations and word/phrase index so the
    // first lesson request doesn't pay for them. Requests that arrive during
    // the load wait on the same promises.
    if (!isDbConnected()) return;
    warmCaches()
      .then(() => (shouldWarmLessons() ? warmLessonCache() : undefined))
      .catch((err) => {
        console.error('[warmup] Failed:', err.message);
      });
  });
}

main();
