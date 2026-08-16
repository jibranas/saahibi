# Lesson loading performance

How the examples screen went from ~80 seconds to ~20 milliseconds, and the
invariants that keep it there.

---

## 1. The problem

The app fetches a lesson with no `limit`, so the request it actually makes is
the unbounded one. Measured against the running server before any changes:

| Request | Time | Response |
| --- | --- | --- |
| `/api/queries/single-word-ism` | 82.7 s | 612 KB |
| `/api/queries/idafa-male-sing` | 70.7 s | 690 KB |
| `/api/queries/marifa-nakira` | 24.1 s | 502 KB |
| `/api/queries/mawsuf-sifah?limit=40` | 22.2 s | 19 KB |
| `/api/queries/mawsuf-sifah?surah=1` | 0.25 s | 1.4 KB |
| corpus build at boot | ~19 s | — |

Three compounding causes:

**Every rule route re-downloaded the whole corpus.** All ~85 routes call
`fetchMorphologyOrdered({ SurahId: DEFAULT_SURAH_FILTER })`, which looped
surah by surah with `await` inside the loop — 114 sequential round trips to
Atlas pulling all 130,030 segment documents with all 33 fields, on every
request, to produce a few dozen cards.

**Neither collection had an index.** `morphology` and `translations` each had
only `_id_`, so all 114 of those queries were full collection scans plus an
in-memory sort. That is the ~21 s floor every rule paid; the `?surah=1` case
returned in 0.25 s because it was one query instead of 114.

**Translations were fetched with a `$or` clause per word.** An unbounded lesson
is ~2,000 words, so `fetchTranslationsForWords` built a 2,000-clause `$or` and
fired it at an unindexed collection. That is the difference between 21 s and
82 s.

A fourth, smaller cost: each `ExampleCard` independently fetches
`/api/word-grammar` (~130 ms), so ~20 visible cards added ~20 round trips after
the main response landed.

## 2. Where it stands now

| | Before | After (cold) | After (cached) |
| --- | --- | --- | --- |
| Median lesson | ~21 s | 18 ms | 1 ms |
| p95 lesson | — | 95 ms | 6 ms |
| Worst lesson | 82.7 s | 2.3 s | 9 ms |
| Wire payload | 612 KB | 96 KB | 96 KB |

Boot cost, paid once:

```
[translations] loaded 83665 words in 3514ms
[morphology]   loaded 130030 segments across 114 surahs in 6923ms (heap 243MB)
[corpus]       indexed 77429 words across 6236 ayahs (14695 distinct forms) in 62ms
[warmup]       caches ready in 6986ms
[warmup]       precomputed 99/99 lessons in 5742ms      # production only
```

All 99 available rule endpoints return 200, and `mawsuf-sifah?limit=40` is
byte-identical to the response captured before any of this — the speedup
changed no behaviour.

## 3. Architecture

```
boot ──▶ morphologyStore   130,030 segments, 20 fields, mushaf order
         translations      83,665 word translations
              │
              ├──▶ quranCorpus      words + phrase index (built from the store)
              │
request ──▶ /api/queries/* ──▶ queryCache ──▶ visibility ──▶ occurrences ──▶ route
                                   │                                          │
                                   └── serialized JSON, LRU 64MB ◀────────────┘
```

### Server

| File | Role |
| --- | --- |
| `lib/morphologyStore.js` | **new** — loads the whole corpus into memory once |
| `lib/morphologyScope.js` | `fetchMorphologyOrdered` now slices the store |
| `lib/quranCorpus.js` | folds the store into words instead of querying |
| `lib/translations.js` | whole translations collection held in memory |
| `lib/queryCache.js` | **new** — LRU of serialized lesson payloads |
| `middleware/queryCache.js` | **new** — serves hits, records misses |
| `lib/contentVisibility.js` | `invalidateVisibilityCache()` also clears the query cache |
| `models/Morphology.js` | compound index `{SurahId, AyahNo, WordNo, SegmentNo}` |
| `models/Translation.js` | compound index `{surah, ayah, word}` |
| `app.js` | gzip, cache mount order, DB-readiness gate, `/health` |
| `index.js` | long-running entry point: `listen` plus boot warm-up |

### App

| File | Role |
| --- | --- |
| `utils/ruleExamples.js` | **new** — session cache (4 entries) + prefetch |
| `screens/LessonIntroScreen.js` | prefetches its own examples on mount |
| `screens/RuleExamplesScreen.js` | cache-aware; intro renders on frame 1 |
| `screens/MawsufSifahScreen.js` | same treatment |
| `App.js` | passes `nextEndpoint`, keys screens by rule, clears cache on visibility change |

## 4. The changes in detail

### 4.1 In-memory morphology store

`lib/morphologyStore.js` reads every segment once with a single indexed scan
and keeps it both grouped by surah and pre-flattened in mushaf order. The
corpus is static — the Quran does not change between requests — so there was
never a reason to re-read it.

`fetchMorphologyOrdered` keeps its old signature and ordering semantics but now
slices the store. Its output for the full-Quran case is exactly what the old
114-query loop produced: the store logs 130,030 segments across 114 surahs, and
the collection contains exactly 130,030 documents, so nothing is dropped.

`quranCorpus.js` derives its word view from the same store, which took its build
from 19 s to 63 ms and removed a second full read of the corpus at boot.

### 4.2 Field projection

Only the 20 fields the routes actually read are loaded. Verified by counting
every schema field name across `routes/`, `lib/` and `middleware/`; these nine
had zero references and are excluded:

`WordPart`, `RootBw`, `LemmaBwNew`, `Special`, `SpecialBw`, `VerbAspect`,
`VerbMood`, `VerbVoice`, `VerbForm`

Stored documents average 487 bytes, most of it in those unused columns.

### 4.3 Indexes

Both collections had only `_id_`. Added:

- `morphology`: `{ SurahId: 1, AyahNo: 1, WordNo: 1, SegmentNo: 1 }`
- `translations`: `{ surah: 1, ayah: 1, word: 1 }`

The morphology index also covers the per-word lookups in `/api/word-grammar`
and the direct query in `routes/queries/tanweenIrab.js`, both of which were
full scans before.

Both loaders `await Model.init()` before scanning, because mongoose builds
schema indexes lazily and the warm-up scan would otherwise still sort in memory.

> The comment in the old `morphologyScope.js` about avoiding a cross-surah sort
> to stay under Mongo's sort memory limit no longer applies. With the compound
> index in place, `find({}).sort({SurahId, AyahNo, WordNo, SegmentNo})` is a
> plain indexed scan.

### 4.4 In-memory translations

At 83,665 documents and 7.6 MB, the whole collection fits comfortably in
memory. `fetchTranslationsForWords` keeps its signature and return type (a Map
keyed by `surah-ayah-word`) but now reads from that map, so the 2,000-clause
`$or` is gone entirely.

### 4.5 Response cache

A lesson's output is a pure function of the corpus (static), the request's
`surah`/`limit` params, and the visibility denylist. `lib/queryCache.js` stores
the serialized JSON keyed on `req.originalUrl`, with LRU eviction under a 64 MB
budget (all ~85 rules come to roughly 50 MB).

**Mount order is load-bearing.** These middlewares wrap `res.json`, so the
*first* one mounted ends up *innermost* and runs *last*:

```js
app.use('/api/queries', queryCache);        // innermost — sees the final body
app.use('/api/queries', exampleVisibility); // drops hidden cards
app.use('/api/queries', exampleOccurrences);// outermost — sees the route's raw output
```

The cache must be innermost so it stores the body after occurrence decoration
*and* visibility filtering. It also short-circuits at request time, before the
route runs.

Invalidation hangs off `invalidateVisibilityCache()` in
`lib/contentVisibility.js`, which all four admin setters (`setChapterHidden`,
`setRuleHidden`, `setExampleHidden`, `setExamplesHidden`) already call.

### 4.6 Compression and HTTP caching

`compression()` is mounted first in `index.js`. Lesson JSON is highly
repetitive and compresses 6–21×: 612 KB → 96 KB, 502 KB → 24 KB.

Cached responses are sent with `ETag` and
`Cache-Control: private, max-age=300, stale-while-revalidate=86400`, so a client
that already holds a lesson revalidates with a 0-byte `304`.

### 4.7 Boot warm-up

`warmCaches()` loads the morphology and translation stores in parallel, then
builds the phrase index (which depends on the segment store, so it goes second).

`warmLessonCache()` then computes every lesson over HTTP against `127.0.0.1`,
so the payloads land in the response cache exactly as a client would receive
them, and new rules are picked up automatically from `RULES`.

Controlled by `WARM_LESSON_CACHE`: `1` forces on, `0` forces off, otherwise it
follows `NODE_ENV === 'production'`. Off in development because nodemon
restarts constantly and it adds ~6 s of background work per restart.

Both run inside the `app.listen` callback so the port is open first.

### 4.8 App-side

`utils/ruleExamples.js` is a 4-entry LRU with request de-duplication — small
because a parsed lesson is a few megabytes of objects.

`LessonIntroScreen` prefetches its own examples on mount, which is the whole
game: the user always arrives at the examples screen from the intro, so by the
time they tap "Examples →" the data is already local and the screen renders
with no loading state at all. The examples screen in turn prefetches
`nextEndpoint`.

`RuleExamplesScreen` and `MawsufSifahScreen` no longer replace the whole screen
with a spinner. The rule card comes from local data, so it renders immediately
and stays put while the examples arrive underneath it — only the list area
swaps between spinner, error, empty and content.

`App.js` keys both screens by `ruleKey`, which lets the cache-seeded lazy
`useState` initializer work correctly across lesson changes and incidentally
fixes a bug where moving between lessons carried over the previous lesson's
reveal position.

## 5. Invariants — do not break these

1. **Segment objects from the store are shared across every request. Never
   mutate them.** `fetchMorphologyOrdered` returns a fresh array (so callers may
   sort or splice it), but the objects inside are the stored ones. Verified at
   the time of writing that no route mutates a record field.

2. **Routes may only filter on `SurahId`.** `fetchMorphologyOrdered` ignores any
   other key in the filter object. Every current route builds
   `const filter = { SurahId: DEFAULT_SURAH_FILTER }` and at most reassigns
   `filter.SurahId`. A route that needs a different filter must narrow the
   returned array in JS instead.

3. **A route that needs a new morphology field must add it to
   `SEGMENT_PROJECTION`** in `lib/morphologyStore.js`, or it will silently read
   `undefined`.

4. **Anything that changes what a lesson contains must call
   `invalidateVisibilityCache()`** (which clears the query cache), or readers
   will keep getting the stale payload for up to a process lifetime.

5. **Do not reorder the `/api/queries` middleware mounts** without re-reading
   §4.5. First mounted = innermost = runs last.

6. On the client, anything that changes lesson content server-side must also
   reach `clearRuleExamplesCache()`; today that happens via the
   `visibilitySignature` effect in `App.js`.

## 6. Re-measuring

```bash
# health / warm-up state
curl -s localhost:3000/health

# one endpoint, wire size with gzip
curl -s -o /dev/null -H 'Accept-Encoding: gzip' \
  -w 'time=%{time_total}s wire=%{size_download}B\n' \
  localhost:3000/api/queries/single-word-ism

# cache hit or miss
curl -s -o /dev/null -D - localhost:3000/api/queries/mawsuf-sifah | grep -i x-saahibi-cache
```

Full sweep of every available rule, reporting failures and timing percentiles:

```bash
cd saahibi-express-server && node --input-type=module -e "
const { RULES } = await import('./lib/ruleCatalog.js');
const eps = RULES.filter(r => r.status === 'available' && r.endpoint).map(r => r.endpoint);
const times = []; let bad = 0;
for (const ep of eps) {
  const t = Date.now();
  const res = await fetch('http://localhost:3000' + ep);
  const d = await res.json();
  times.push(Date.now() - t);
  if (!res.ok || (d.examples ?? d.patterns ?? []).length === 0) { bad++; console.log(res.status, ep); }
}
times.sort((a, b) => a - b);
console.log(eps.length + ' endpoints, ' + bad + ' failed/empty, median=' +
  times[times.length >> 1] + 'ms max=' + times[times.length - 1] + 'ms');
"
```

## 7. Known and deferred

- **Heap sits around 240 MB** with both collections resident. Fine for a single
  Node process; it is the number to watch under a tight container limit.
- **Three endpoints return zero examples**: `tilka-plural-indef`,
  `idafa-asma-ham`, `idafa-asma-fam`. Pre-existing, not a regression — they
  report `totalMatches: 0` even with `X-Saahibi-Admin: 1`, and the store holds
  every segment the old queries returned. Their matching logic finds nothing.
- **Per-card `/api/word-grammar` round trips remain.** ~130 ms each, one per
  card. The phrase routes already hold those segments, so returning grammar
  inline would remove them; failing that, hoisting the fetch to the screen would
  batch all visible cards into one request.
- **Cache is per-process.** Multiple instances each keep their own copy and
  their own ~240 MB. A shared store (or sticky routing) would be needed before
  scaling out.
- **`limit` is still never sent by the app.** It no longer matters for latency,
  but it is the lever if payload size becomes a concern on slow connections.
