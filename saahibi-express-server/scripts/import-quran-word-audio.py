#!/usr/bin/env python3
"""
Import word-level Quran audio from Hugging Face into local server storage.

This is an offline/resumable import tool. It writes audio files under
`public/quran-word-audio` and upserts metadata into MongoDB's `wordAudio`
collection. Mongo `audioPath` values point at the public CDN base
(`WORD_AUDIO_PUBLIC_BASE_URL`, default https://audio.saahibi.com).

Examples:
  python scripts/import-quran-word-audio.py --surah 1
  python scripts/import-quran-word-audio.py --limit 100
  python scripts/import-quran-word-audio.py
"""

from __future__ import annotations

import argparse
import os
import shutil
import sys
from pathlib import Path
from typing import Any

from datasets import Audio, load_dataset
from pymongo import MongoClient, UpdateOne


DATASET_NAME = "Buraaq/quran-md-words"
DEFAULT_BATCH_SIZE = 1000


SCRIPT_DIR = Path(__file__).resolve().parent
SERVER_DIR = SCRIPT_DIR.parent
ENV_PATH = SERVER_DIR / ".env"
DEFAULT_AUDIO_ROOT = SERVER_DIR / "public" / "quran-word-audio"
DEFAULT_PUBLIC_BASE_URL = "https://audio.saahibi.com"


def load_env(path: Path) -> None:
    if not path.exists():
        return

    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = value


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--surah", type=int, help="Only import one surah")
    parser.add_argument("--limit", type=int, help="Stop after importing N rows")
    parser.add_argument(
        "--audio-root",
        type=Path,
        default=DEFAULT_AUDIO_ROOT,
        help=f"Audio output root (default: {DEFAULT_AUDIO_ROOT})",
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=DEFAULT_BATCH_SIZE,
        help=f"Mongo upsert batch size (default: {DEFAULT_BATCH_SIZE})",
    )
    parser.add_argument(
        "--force-audio",
        action="store_true",
        help="Rewrite audio files even when they already exist",
    )
    parser.add_argument(
        "--public-base-url",
        default=os.environ.get("WORD_AUDIO_PUBLIC_BASE_URL", DEFAULT_PUBLIC_BASE_URL),
        help=(
            "Public CDN/base URL stored in Mongo audioPath "
            f"(default: {DEFAULT_PUBLIC_BASE_URL})"
        ),
    )
    return parser.parse_args()


def get_database() -> Any:
    mongo_uri = os.environ.get("MONGODB_URI")
    if not mongo_uri:
        raise RuntimeError("MONGODB_URI is required in .env or environment")

    client = MongoClient(mongo_uri)
    db_name = os.environ.get("MONGODB_DB")
    if db_name:
        return client[db_name]

    try:
        return client.get_default_database()
    except Exception:
        return client["SaahibiDB"]


def audio_output_path(audio_root: Path, surah: int, ayah: int, word_no: int) -> Path:
    return audio_root / f"{surah:03d}" / f"{ayah:03d}" / f"{word_no:03d}.mp3"


def get_word_no(row: dict[str, Any]) -> int:
    # `word_id` is the most reliable source because it encodes `surah:ayah:word`.
    # Some dataset docs describe `word_index` as 0-based, but the published data
    # may already align with Quran word numbering.
    word_id = row.get("word_id")
    if isinstance(word_id, str):
        parts = word_id.split(":")
        if len(parts) == 3 and parts[2].isdigit():
            return int(parts[2])

    return int(row["word_index"])


def write_audio_file(row: dict[str, Any], out_path: Path, force: bool) -> None:
    if out_path.exists() and not force:
        return

    out_path.parent.mkdir(parents=True, exist_ok=True)
    audio = row["audio"]
    source_path = audio.get("path") if isinstance(audio, dict) else None
    audio_bytes = audio.get("bytes") if isinstance(audio, dict) else None

    if source_path and Path(source_path).exists():
        shutil.copyfile(source_path, out_path)
        return

    if audio_bytes:
        out_path.write_bytes(audio_bytes)
        return

    # Fallback for environments where the HF Audio feature exposes decoded
    # samples instead of a source MP3 file.
    try:
        import soundfile as sf
    except ImportError as exc:
        raise RuntimeError(
            "soundfile is required when Hugging Face does not expose an audio path"
        ) from exc

    array = audio.get("array") if isinstance(audio, dict) else None
    sampling_rate = audio.get("sampling_rate") if isinstance(audio, dict) else None
    if array is None or sampling_rate is None:
        raise RuntimeError(f"Audio payload missing array/sampling_rate: {row.get('word_id')}")

    sf.write(out_path, array, sampling_rate, format="MP3")


def build_update(
    row: dict[str, Any],
    audio_root: Path,
    force_audio: bool,
    public_base_url: str,
) -> UpdateOne:
    surah = int(row["surah_id"])
    ayah = int(row["ayah_id"])
    word_no = get_word_no(row)
    out_path = audio_output_path(audio_root, surah, ayah, word_no)

    write_audio_file(row, out_path, force_audio)

    base = public_base_url.rstrip("/")
    audio_path = f"{base}/{surah:03d}/{ayah:03d}/{word_no:03d}.mp3"
    doc = {
        "surahId": surah,
        "ayahNo": ayah,
        "wordNo": word_no,
        "wordId": row.get("word_id"),
        "wordAr": row.get("word_ar"),
        "wordEn": row.get("word_en"),
        "wordTr": row.get("word_tr"),
        "audioPath": audio_path,
    }

    return UpdateOne(
        {"surahId": surah, "ayahNo": ayah, "wordNo": word_no},
        {"$set": doc},
        upsert=True,
    )


def flush(collection: Any, updates: list[UpdateOne]) -> None:
    if not updates:
        return
    collection.bulk_write(updates, ordered=False)
    updates.clear()


def main() -> int:
    load_env(ENV_PATH)
    args = parse_args()

    if args.batch_size <= 0:
        raise RuntimeError("--batch-size must be greater than 0")

    db = get_database()
    collection = db["wordAudio"]
    collection.create_index(
        [("surahId", 1), ("ayahNo", 1), ("wordNo", 1)],
        unique=True,
    )

    print(f"Loading {DATASET_NAME}...")
    dataset = load_dataset(DATASET_NAME, split="train")
    dataset = dataset.cast_column("audio", Audio(decode=False))
    print(f"Loaded {len(dataset):,} rows")

    updates: list[UpdateOne] = []
    imported = 0
    scanned = 0

    for row in dataset:
        scanned += 1
        surah = int(row["surah_id"])
        if args.surah is not None and surah != args.surah:
            continue

        updates.append(
            build_update(
                row,
                args.audio_root,
                args.force_audio,
                args.public_base_url,
            )
        )
        imported += 1

        if len(updates) >= args.batch_size:
            flush(collection, updates)

        if imported and imported % 1000 == 0:
            print(f"Imported {imported:,} rows (scanned {scanned:,})")

        if args.limit is not None and imported >= args.limit:
            break

    flush(collection, updates)
    print(f"Done. Imported/upserted {imported:,} rows (scanned {scanned:,}).")
    print(f"Audio root: {args.audio_root}")
    print(f"Public base URL: {args.public_base_url.rstrip('/')}")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except KeyboardInterrupt:
        print("Interrupted.", file=sys.stderr)
        raise SystemExit(130)
