#!/usr/bin/env python3
"""Remove auto-generated broken questions from lessons.json.

Background: a large share of the shipped questions were produced by naive
templates that glued the last word of a vocabulary phrase into a sentence,
e.g. vocab "excuse me" -> "I want to ___ excuse me." with options
me/mes/meing. Those questions are unanswerable nonsense. The app already
knows how to top a lesson up to 5 questions at runtime with sensible
vocabulary questions (see ensureQuestionCount/vocabularyQuestion in
app.js), so deleting the broken ones loses nothing.

A question is removed when any of these holds:
  1. Two options are identical (ignoring case/punctuation).
  2. A distractor is just another option plus a trailing label such as
     " not" or " incorrect" ("The bus is coming. not").
  3. It uses the broken "I want to ___ <rest of phrase>." template, whose
     options are morphological variants (word / word+s / word+ing) of the
     phrase's last word instead of a real verb.
  4. The correct answer and a distractor differ only by a/an/the, so both
     are actually correct ("Sign the contract." vs "Sign a contract.").

Also repairs stray \\x1a control characters that replaced quote marks in
three questions.

Usage: python3 scripts/clean_lessons.py [--dry-run]
Idempotent: running it again removes nothing.
"""

import json
import re
import sys
from pathlib import Path

PATH = Path(__file__).resolve().parent.parent / "lessons.json"


def normalize_option(text: str) -> str:
    return re.sub(r"[^a-z0-9 ]", "", text.lower()).strip()


def broken_reason(question: dict) -> str | None:
    opts = [str(o).strip() for o in question.get("opts", [])]
    lowered = [o.lower() for o in opts]
    normalized = [normalize_option(o) for o in opts]

    if len(set(normalized)) < len(normalized):
        return "duplicate options"

    for option in lowered:
        stripped = re.sub(r"\s+(not|incorrect)\.?$", "", option)
        if stripped != option and normalize_option(stripped) in normalized:
            return "labelled distractor ('... not' / '... incorrect')"

    if question.get("q", "").startswith("I want to ___"):
        return "broken 'I want to ___ <last word of phrase>' template"

    without_articles = [
        re.sub(r"\s+", " ", re.sub(r"\b(a|an|the)\b", "", o)).strip()
        for o in normalized
    ]
    if len(set(without_articles)) < len(without_articles):
        return "options differ only by a/an/the (more than one correct)"

    return None


def fix_quotes(text: str) -> str:
    if "\x1a" not in text:
        return text
    text = text.replace("\x1a\x1a", "“")
    if text.startswith("\x1a"):
        text = "“" + text[1:]
    return text.replace("\x1a", "”")


def main() -> None:
    dry_run = "--dry-run" in sys.argv
    lessons = json.loads(PATH.read_text(encoding="utf-8"))
    removed = 0
    reasons: dict[str, int] = {}

    for lesson in lessons:
        kept = []
        for question in lesson.get("qs", []):
            reason = broken_reason(question)
            if reason:
                removed += 1
                reasons[reason] = reasons.get(reason, 0) + 1
                continue
            question["q"] = fix_quotes(str(question.get("q", "")))
            kept.append(question)
        lesson["qs"] = kept

    print(f"removed {removed} broken questions")
    for reason, count in sorted(reasons.items(), key=lambda kv: -kv[1]):
        print(f"  {count:4d}  {reason}")
    empty = sum(1 for lesson in lessons if not lesson["qs"])
    print(f"lessons left with 0 stored questions: {empty} "
          "(the app generates vocabulary questions for these at runtime)")

    if dry_run:
        print("dry run: lessons.json not written")
        return
    PATH.write_text(
        json.dumps(lessons, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"wrote {PATH}")


if __name__ == "__main__":
    main()
