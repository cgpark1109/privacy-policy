"""The History Timeline browser game (called from build.py).

The game pages are ordinary site pages, built by build.py with the shared header and footer:
  /play/history-timeline/ and /ko/play/history-timeline/                the game
  /play/history-timeline/events/ and /ko/play/history-timeline/events/  every event in order
This module writes the game's own files into play/history-timeline/ (app.js and timeline.css copied from
_src/timeline/, data.js from _src/timeline.py, and the icon) and returns the page bodies. og-image.png and
apple-touch-icon.png come from _src/timeline/make_images.js (committed outputs).
"""
import hashlib
import html
import json
import os

from timeline import EVENTS

e = html.escape
SLUG = "history-timeline"
BASE = f"/play/{SLUG}/"
ERA_NAMES = {"ancient": ("고대", "Ancient"), "medieval": ("중세", "Medieval"), "early-modern": ("근대", "Early modern"),
             "modern-1": ("현대 1", "1800–1945"), "modern-2": ("현대 2", "Since 1945")}

TEXT = {
    "en": {
        "title": "History Timeline",
        "lead": "Put world history in order, one event card at a time.",
        "description": "Play History Timeline free in your browser: place {n} events from world and Korean history in "
                       "order, from the Great Pyramid to the 2002 World Cup. Three decks, three hearts, and a short "
                       "reading (in Korean) for every event.",
        "crumb_play": "Browser games",
        "noscript": "This game needs JavaScript. You can still browse all {n} events.",
        "how": "How to play",
        "how_steps": ["One event is already on the timeline. Each new card shows another event, without its date.",
                      "Tap the gap where you think it belongs: before, after or between the events already placed.",
                      "A wrong guess costs a heart, and the card moves to its correct place. The game ends when you "
                      "run out of hearts or place every card."],
        "browse": "All events",
        "browse_desc": "See the whole timeline, with a reading for every event",
        "about": "About History Timeline",
        "about_body": [
            "History Timeline is a free browser game for getting a feel for when things happened. One event starts on "
            "the timeline; for each new card, you choose where it goes: before, after or between the events already "
            "placed. Every correct card adds a point, and the timeline grows as you play.",
            "The {n} events come from our Korean world history reading series, from the Great Pyramid of Giza and the "
            "first Olympic Games to the fall of the Berlin Wall and the 2002 World Cup. After each card, you can open "
            "the article about that event."],
        "about_list": ["Three decks: all of history, world history and Korean history",
                       "Three hearts: a wrong guess costs one, and the card moves to its correct place",
                       "Events from the same year, or whose uncertain dates overlap, can go either way round",
                       "Review your mistakes and your finished timeline at the end",
                       "In English and Korean, and playable with a keyboard"],
        "list_title": "All events – History Timeline",
        "list_h1": "All events",
        "list_lead": "The {n} events of History Timeline, in order.",
        "list_desc": "The {n} events of the History Timeline game in order, from the Great Pyramid of Giza to the 2002 "
                     "World Cup, each with a link to a Korean reading.",
        "list_intro": "Each event links to an article in our Korean world history reading series. Events from the same "
                      "year are listed in the order the series covers them; in the game, they can go either way round.",
        "list_play": "Play History Timeline",
        "list_reading": "World history reading (Korean)",
    },
    "ko": {
        "title": "연표 맞추기",
        "lead": "세계사 사건 카드를 한 장씩, 일어난 순서대로 연표에 놓아 보세요.",
        "description": "브라우저에서 무료로 즐기는 연표 맞추기: 기자의 대피라미드부터 2002년 한일 월드컵까지, 세계사와 "
                       "한국사 사건 {n}개를 순서대로 놓아 보세요. 카드 묶음 세 가지, 하트 3개, 사건마다 읽을거리가 있어요.",
        "crumb_play": "브라우저 게임",
        "noscript": "이 게임은 자바스크립트가 필요해요. 전체 사건 {n}개는 따로 볼 수 있어요.",
        "how": "하는 방법",
        "how_steps": ["연표에 사건 하나가 먼저 놓여 있어요. 새 카드에는 연도 없이 다른 사건이 나와요.",
                      "그 사건이 들어갈 자리를 누르세요. 이미 놓인 사건의 앞, 뒤, 사이 어디든 고를 수 있어요.",
                      "틀리면 하트가 하나 줄고, 카드는 맞는 자리로 옮겨져요. 하트가 다 떨어지거나 카드를 모두 놓으면 "
                      "게임이 끝나요."],
        "browse": "전체 사건 보기",
        "browse_desc": "연표 전체와 사건마다 읽을거리를 볼 수 있어요",
        "about": "연표 맞추기 소개",
        "about_body": [
            "연표 맞추기는 역사 속 사건의 순서를 감으로 익히는 무료 브라우저 게임이에요. 연표에 사건 하나가 먼저 놓이고, "
            "새 카드가 나올 때마다 그 사건이 들어갈 자리를 골라요. 이미 놓인 사건의 앞, 뒤, 사이 어디든 놓을 수 있어요. "
            "맞힐 때마다 1점을 얻고, 연표는 점점 길어져요.",
            "사건 {n}개는 세계사 읽을거리 연재에서 골랐어요. 기자의 대피라미드와 첫 고대 올림픽부터 베를린 장벽 붕괴와 "
            "2002년 한일 월드컵까지 담았어요. 카드를 놓은 뒤에는 그 사건을 다룬 글을 바로 읽을 수 있어요."],
        "about_list": ["세 가지 카드 묶음: 역사 전체, 세계사, 한국사",
                       "하트 3개: 틀리면 하나가 줄고, 카드는 맞는 자리로 옮겨져요",
                       "같은 해에 일어났거나 연도가 정확하지 않아 시기가 겹치는 사건끼리는 어느 순서로 놓아도 맞아요",
                       "게임이 끝나면 틀린 카드와 완성한 연표를 다시 볼 수 있어요",
                       "한국어와 영어 지원, 키보드로도 플레이 가능"],
        "list_title": "전체 사건 – 연표 맞추기",
        "list_h1": "전체 사건",
        "list_lead": "연표 맞추기에 나오는 사건 {n}개를 시대순으로 정리했어요.",
        "list_desc": "연표 맞추기 게임에 나오는 사건 {n}개를 기자의 대피라미드부터 2002년 한일 월드컵까지 시대순으로 "
                     "정리했어요. 사건마다 세계사 읽을거리로 연결돼요.",
        "list_intro": "사건 이름을 누르면 세계사 읽을거리의 해당 글로 이동해요. 같은 해에 일어난 사건은 연재에서 다룬 "
                      "순서로 적었고, 게임에서는 어느 순서로 놓아도 맞아요.",
        "list_play": "게임 하러 가기",
        "list_reading": "세계사 읽을거리",
    },
}
BOOK = ('<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 '
        '2-.9 2-2V4c0-1.1-.9-2-2-2zM6 4h5v8l-2.5-1.5L6 12V4z"/></svg>')


def _write(path, text):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        f.write(text)


def _ver(text):
    return hashlib.sha1(text.encode("utf-8")).hexdigest()[:10]


class Timeline:
    """Writes the game's files on creation; game_body() and list_body() give the page bodies for build.py."""

    def __init__(self, root, published_slugs):
        src = os.path.join(root, "_src")
        out = os.path.join(root, "play", SLUG)
        for ev in EVENTS:
            assert ev["lo"] <= ev["hi"], ev["slug"]
        self.events = [ev for ev in EVENTS if ev["slug"] in published_slugs]
        self.missing = sorted({ev["slug"] for ev in EVENTS} - set(published_slugs))
        self.n = len(self.events)
        css = open(os.path.join(src, "timeline", "timeline.css"), encoding="utf-8").read()
        app = open(os.path.join(src, "timeline", "app.js"), encoding="utf-8").read()
        data = ("/* Generated by _src/timeline_build.py from _src/timeline.py. Do not edit. */\nwindow.TL=" +
                json.dumps({"events": [{k: ev[k] for k in ("slug", "lo", "hi", "ko_year", "en_year", "ko", "en", "kr")}
                                       for ev in self.events]}, ensure_ascii=False, separators=(",", ":")) + ";\n")
        _write(os.path.join(out, "timeline.css"), css)
        _write(os.path.join(out, "app.js"), app)
        _write(os.path.join(out, "data.js"), data)
        _write(os.path.join(out, "favicon.svg"),
               open(os.path.join(src, "timeline", "favicon.svg"), encoding="utf-8").read())
        # The first version had a separate list page; send its visitors to the new one.
        _write(os.path.join(out, "all-events.html"),
               '<!DOCTYPE html>\n<html lang="en"><head><meta charset="UTF-8"><title>History Timeline: all events</title>'
               '<meta name="robots" content="noindex"><link rel="canonical" href="https://kysystemstudio.com/play/history-timeline/events/">'
               '<meta http-equiv="refresh" content="0; url=events/"></head>'
               '<body><p><a href="events/">All events of History Timeline</a></p></body></html>\n')
        self.head_css = f'<link rel="stylesheet" href="{BASE}timeline.css?v={_ver(css)}">'
        self.head_js = (f'<script src="{BASE}data.js?v={_ver(data)}" defer></script>'
                        f'<script src="{BASE}app.js?v={_ver(app)}" defer></script>')

    def text(self, lang, key):
        v = TEXT[lang][key]
        return v.format(n=self.n) if isinstance(v, str) else [x.format(n=self.n) for x in v]

    def crumbs(self, lang, play_url, trail):
        items = [f'<a href="{play_url}">{e(self.text(lang, "crumb_play"))}</a>']
        for label, href in trail:
            items.append(f'<a href="{href}">{e(label)}</a>' if href else f'<span aria-current="page" style="opacity:1">{e(label)}</span>')
        return '<nav class="crumbs" aria-label="Breadcrumb">' + '<span aria-hidden="true">›</span>'.join(items) + '</nav>'

    def game_body(self, lang, play_url, events_url):
        t = lambda k: self.text(lang, k)  # noqa: E731
        steps = "".join(f"<li>{e(s)}</li>" for s in t("how_steps"))
        about = "".join(f"<p>{e(p)}</p>" for p in t("about_body"))
        about_list = "".join(f"<li>{e(x)}</li>" for x in t("about_list"))
        return f"""<div class="tl">
<section class="container tl-wrap">
  {self.crumbs(lang, play_url, [(t("title"), None)])}
  <h1 class="page-title">{e(t("title"))}</h1>
  <p class="page-lead">{e(t("lead"))}</p>
  <div id="tl-app" class="tl-app"><div class="card"><noscript><p>{e(t("noscript"))} <a href="{events_url}">{e(t("browse"))} →</a></p></noscript></div></div>
  <div id="tl-static" class="tl-static">
    <div class="card tl-how"><h2>{e(t("how"))}</h2><ol>{steps}</ol></div>
    <a class="card tl-browse" href="{events_url}">{BOOK}<span><b>{e(t("browse"))}</b><small>{e(t("browse_desc"))}</small></span><span class="chev" aria-hidden="true">→</span></a>
    <section class="card tl-about"><h2>{e(t("about"))}</h2>{about}<ul>{about_list}</ul></section>
  </div>
</section>
<div id="live" class="visually-hidden" aria-live="polite" aria-atomic="true" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)"></div>
</div>"""

    def list_body(self, lang, play_url, game_url, eras, era_of_year, reading_url):
        t = lambda k: self.text(lang, k)  # noqa: E731
        other = "en" if lang == "ko" else "ko"
        groups = ""
        for era in eras:
            items = [ev for ev in self.events if era_of_year(ev["lo"]) is era]
            if not items:
                continue
            name = ERA_NAMES[era[0]][0 if lang == "ko" else 1]
            rows = "".join(
                f'<li class="tl-item"><span class="tl-year">{e(ev[lang + "_year"])}</span>'
                f'<a class="tl-label" href="/ko/history/{ev["slug"]}/">{e(ev[lang])}</a>'
                f'<span class="tl-other" lang="{other}">{e(ev[other])}</span></li>' for ev in items)
            groups += f'<h2>{e(name)} <span>· {len(items)}</span></h2><ol class="tl-list">{rows}</ol>\n'
        return f"""<div class="tl tl-events">
<section class="container tl-wrap">
  {self.crumbs(lang, play_url, [(t("title"), game_url), (t("list_h1"), None)])}
  <h1 class="page-title">{e(t("list_h1"))}</h1>
  <p class="page-lead">{e(t("list_lead"))}</p>
  <div class="card" style="margin-top:24px"><p>{e(t("list_intro"))}</p>
    <div class="tl-actions"><a class="btn" href="{game_url}">{e(t("list_play"))}</a><a class="btn ghost" href="{reading_url}" hreflang="ko">{e(t("list_reading"))}</a></div></div>
{groups}</section>
</div>"""
