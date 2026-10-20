#!/usr/bin/env python3
"""Update TeslaInvestorHub news from Google News RSS feeds."""

import html
import json
import re
import sys
import time
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "news.json"
LIMIT = 50

TOPICS = {
    "tesla": "Tesla TSLA stock earnings deliveries",
    "bitcoin": "Bitcoin Ethereum cryptocurrency markets",
    "elon": "Elon Musk latest news",
    "spacex": "SpaceX Starlink rocket launches",
    "xai": "xAI Grok artificial intelligence",
    "neuralink": "Neuralink brain computer interface",
    "ev": "electric vehicles EV batteries charging",
    "robotaxi": "Tesla robotaxi Cybercab Optimus",
    "vehicles": "Tesla Model 3 Model Y Model S Model X Cybertruck",
    "markets": "global stock markets Nasdaq S&P 500 FTSE Nikkei",
    "commodities": "gold silver oil forex USD NGN",
    "safety": "Tesla recalls vehicle safety investigations",
}


class TextExtractor(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.parts = []

    def handle_data(self, data):
        if data.strip():
            self.parts.append(data.strip())


def clean(value):
    return re.sub(r"\s+", " ", html.unescape(value or "")).strip()


def description(value):
    parser = TextExtractor()
    try:
        parser.feed(value or "")
        return " ".join(parser.parts)[:360]
    except Exception:
        return clean(re.sub(r"<[^>]*>", " ", value or ""))[:360]


def now():
    return datetime.now(timezone.utc).replace(
        microsecond=0
    ).isoformat().replace("+00:00", "Z")


def fetch(query):
    url = "https://news.google.com/rss/search?" + urllib.parse.urlencode({
        "q": query + " when:7d",
        "hl": "en-US",
        "gl": "US",
        "ceid": "US:en",
    })
    request = urllib.request.Request(
        url,
        headers={"User-Agent": "Mozilla/5.0 TeslaInvestorHubNewsBot/1.0"},
    )
    with urllib.request.urlopen(request, timeout=25) as response:
        root = ET.fromstring(response.read(5_000_000))

    channel = root.find("channel")
    if channel is None:
        raise ValueError("RSS channel missing")

    stories = []
    seen = set()

    for item in channel.findall("item"):
        title = clean(item.findtext("title"))
        link = clean(item.findtext("link"))

        if not title or not link or not link.startswith("https://"):
            continue

        key = re.sub(r"[^a-z0-9]+", " ", title.casefold()).strip()
        if key in seen:
            continue
        seen.add(key)

        source_node = item.find("source")
        stories.append({
            "title": title[:300],
            "link": link[:2000],
            "pubDate": clean(item.findtext("pubDate"))[:100],
            "source": clean(source_node.text if source_node is not None else "")[:120],
            "description": description(item.findtext("description")),
        })

        if len(stories) >= LIMIT:
            break

    if not stories:
        raise ValueError("No headlines returned")

    return stories


def main():
    try:
        old = json.loads(OUTPUT.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        old = {"categories": {}}

    previous = old.get("categories", {})
    categories = {}
    timestamp = now()
    successful = 0

    for key, query in TOPICS.items():
        try:
            stories = fetch(query)
            successful += 1
            categories[key] = {
                "updatedAt": timestamp,
                "stories": stories,
            }
            print(f"OK {key}: {len(stories)} headlines")
        except Exception as error:
            print(f"WARN {key}: {error}", file=sys.stderr)
            categories[key] = previous.get(
                key, {"updatedAt": None, "stories": []}
            )

    if successful == 0:
        print("ERROR: all news feeds failed; keeping existing news.", file=sys.stderr)
        return 1

    document = {
        "schemaVersion": 1,
        "generatedAt": timestamp,
        "categories": categories,
    }

    OUTPUT.write_text(
        json.dumps(document, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    total = sum(len(v.get("stories", [])) for v in categories.values())
    print(f"Updated news.json: {total} headlines across {len(TOPICS)} categories.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
