#!/usr/bin/env python3
"""
One-off migrator: remove Juz-30-only surah bounds from routes/queries/*.js,
switch to full-Quran scope via lib/morphologyScope.js, and replace full-corpus
Mongo sorts with fetchMorphologyOrdered (per-surah chunked loads).
"""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
QUERIES = ROOT / "routes" / "queries"

MORPH_IMPORT = "import { Morphology } from '../../models/Morphology.js';\n"
SCOPE_IMPORT = (
    "import { DEFAULT_SURAH_FILTER, fetchMorphologyOrdered, QURAN_SURAH_MAX, "
    "QURAN_SURAH_MIN } from '../../lib/morphologyScope.js';\n"
)

BLOCK_MULTILINE = re.compile(
    r"const JUZ_30_SURAH_MIN = 78;\s*\n"
    r"const JUZ_30_SURAH_MAX = 114;\s*\n"
    r"const JUZ_30_SURAH_FILTER = \{\s*\n"
    r"\s*\$gte: JUZ_30_SURAH_MIN,\s*\n"
    r"\s*\$lte: JUZ_30_SURAH_MAX,\s*\n"
    r"\};\s*\n"
)

BLOCK_ONE_LINE = re.compile(
    r"const JUZ_30_SURAH_MIN = 78;\s*\n"
    r"const JUZ_30_SURAH_MAX = 114;\s*\n"
    r"const JUZ_30_SURAH_FILTER = \{ \$gte: JUZ_30_SURAH_MIN, \$lte: JUZ_30_SURAH_MAX \};\s*\n"
)

INLINE_FILTER = re.compile(
    r"const JUZ_30_SURAH_FILTER = \{ \$gte: 78, \$lte: 114 \};\s*\n"
)

FIND_SORT_LEAN = re.compile(
    r"const records = await Morphology\.find\(filter\)\s*\n"
    r"\s*\.sort\(\{ SurahId: 1, AyahNo: 1, WordNo: 1, SegmentNo: 1 \}\)\s*\n"
    r"\s*\.lean\(\);"
)


def transform(text: str) -> str:
    text = BLOCK_MULTILINE.sub("", text)
    text = BLOCK_ONE_LINE.sub("", text)
    text = INLINE_FILTER.sub("", text)

    text = text.replace("JUZ_30_SURAH_FILTER", "DEFAULT_SURAH_FILTER")
    text = text.replace("JUZ_30_SURAH_MIN", "QURAN_SURAH_MIN")
    text = text.replace("JUZ_30_SURAH_MAX", "QURAN_SURAH_MAX")

    text = text.replace(
        "Surah filter must be within Juz 30",
        "Surah filter must be between 1 and 114",
    )

    text = FIND_SORT_LEAN.sub(
        "const records = await fetchMorphologyOrdered(filter);", text
    )

    text = text.replace(
        "const records = await Morphology.find({ SurahId: DEFAULT_SURAH_FILTER })",
        "const records = await fetchMorphologyOrdered({ SurahId: DEFAULT_SURAH_FILTER });",
    )

    return text


def main() -> None:
    for path in sorted(QUERIES.glob("*.js")):
        if path.name == "morphologyScope.js":
            continue
        original = path.read_text(encoding="utf-8")
        if "JUZ_30" not in original:
            continue
        updated = transform(original)
        if "lib/morphologyScope.js" not in updated and (
            "DEFAULT_SURAH_FILTER" in updated
            or "QURAN_SURAH_MIN" in updated
            or "fetchMorphologyOrdered" in updated
        ):
            if MORPH_IMPORT not in updated:
                raise RuntimeError(
                    f"{path}: expected Morphology import marker missing"
                )
            updated = updated.replace(MORPH_IMPORT, MORPH_IMPORT + SCOPE_IMPORT)
        if updated != original:
            path.write_text(updated, encoding="utf-8")
            print("updated", path.relative_to(ROOT))


if __name__ == "__main__":
    main()
