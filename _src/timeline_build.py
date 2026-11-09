"""Builds the History Timeline browser game at /play/history-timeline/ (called from build.py).

Sources: _src/timeline.py (the events), _src/timeline/app.js, extra.css, favicon.svg, and the shared web game
stylesheet _src/webgames/shared/style.css. Writes index.html, all-events.html, data.js, app.js, style.css and
favicon.svg. og-image.png and apple-touch-icon.png come from _src/timeline/make_images.js (committed outputs).
"""
import hashlib
import html
import json
import os

from timeline import EVENTS

e = html.escape
SLUG = "history-timeline"
ERA_EN = {"ancient": "Ancient", "medieval": "Medieval", "early-modern": "Early modern", "modern-1": "1800–1945",
          "modern-2": "Since 1945"}

TITLE = {"en": "History Timeline", "ko": "연표 맞추기"}
DOC_TITLE = "History Timeline – Put world history events in order"
DESC = ("Play History Timeline free in your browser: place {n} events from world and Korean history in order, "
        "from the Great Pyramid to the 2002 World Cup. Three decks, three hearts, and a short reading for every event. "
        "In English and Korean.")
OG_DESC = "Place {n} world history events in order, from the pyramids to 2002. Free in your browser, in English and Korean."
LIST_TITLE = "All events – History Timeline"
LIST_DESC = ("The {n} events of the History Timeline game in order, in Korean and English, from the Great Pyramid of "
             "Giza to the 2002 World Cup, each with a link to a Korean reading.")

ABOUT = {
    "en": ("<h2>About History Timeline</h2>"
           "<p>History Timeline is a free browser game for getting a feel for when things happened. One event starts on "
           "the timeline; for each new card, you choose where it goes: before, after or between the events already "
           "placed. Every correct card adds a point, and the timeline grows as you play.</p>"
           "<p>The {n} events come from our Korean world history reading series, from the Great Pyramid of Giza and "
           "the first Olympic Games to the fall of the Berlin Wall and the 2002 World Cup. After each card, you can "
           "open the article about that event.</p>"
           "<ul><li>Three decks: all of history, world history and Korean history</li>"
           "<li>Three hearts: a wrong guess costs one, and the card moves to its real place</li>"
           "<li>Events from the same year, or with uncertain dates, can go either way round</li>"
           "<li>Review your mistakes and your finished timeline at the end</li>"
           "<li>English and Korean, light and dark themes, keyboard friendly</li></ul>"),
    "ko": ("<h2>연표 맞추기 소개</h2>"
           "<p>연표 맞추기는 역사 속 사건의 순서를 감으로 익히는 무료 브라우저 게임이에요. 연표에 사건 하나가 먼저 놓이고, "
           "새 카드가 나올 때마다 그 사건이 들어갈 자리를 골라요. 이미 놓인 사건의 앞, 뒤, 사이 어디든 놓을 수 있어요. "
           "맞힐 때마다 1점을 얻고, 연표는 점점 길어져요.</p>"
           "<p>사건 {n}개는 세계사 읽을거리 연재에서 골랐어요. 기자의 대피라미드와 첫 고대 올림픽부터 베를린 장벽 붕괴와 "
           "2002년 한일 월드컵까지 담았어요. 카드를 놓은 뒤에는 그 사건을 다룬 글을 바로 읽을 수 있어요.</p>"
           "<ul><li>세 가지 카드 묶음: 역사 전체, 세계사, 한국사</li>"
           "<li>하트 3개: 틀리면 하나가 줄고, 카드는 원래 자리로 옮겨져요</li>"
           "<li>같은 해에 일어났거나 연도가 정확하지 않은 사건은 어느 순서로 놓아도 맞아요</li>"
           "<li>게임이 끝나면 틀린 카드와 완성한 연표를 다시 볼 수 있어요</li>"
           "<li>영어·한국어, 라이트·다크 테마, 키보드 조작 지원</li></ul>"),
}

GLOBE = ('<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm6.9 6h-2.9a15.7 15.7 0 0 0-1.4-3.6A8 8 0 0 1 18.9 8zM12 4c.8 1.2 1.5 2.5 1.9 4h-3.8c.4-1.5 1.1-2.8 1.9-4zM4.3 14a8.2 8.2 0 0 1 0-4h3.4a16.5 16.5 0 0 0 0 4H4.3zm.8 2h2.9c.3 1.3.8 2.5 1.4 3.6A8 8 0 0 1 5.1 16zM8 8H5.1a8 8 0 0 1 4.3-3.6C8.8 5.5 8.3 6.7 8 8zm4 12c-.8-1.2-1.5-2.5-1.9-4h3.8c-.4 1.5-1.1 2.8-1.9 4zm2.3-6H9.7a14.7 14.7 0 0 1 0-4h4.6a14.7 14.7 0 0 1 0 4zm.3 5.6c.6-1.1 1.1-2.3 1.4-3.6h2.9a8 8 0 0 1-4.3 3.6zm1.7-5.6a16.5 16.5 0 0 0 0-4h3.4a8.2 8.2 0 0 1 0 4h-3.4z"/></svg>')


def _write(path, text):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        f.write(text)


def _ver(text):
    return hashlib.sha1(text.encode("utf-8")).hexdigest()[:10]


def _head(title, desc, canonical, og_desc, domain, studio, adsense, extra=""):
    return f"""<!doctype html>
<html lang="en" data-game="timeline">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{e(title)}</title>
<meta name="description" content="{e(desc)}">
<meta name="google-adsense-account" content="{e(adsense)}">
<link rel="canonical" href="{domain}{canonical}">
<meta name="theme-color" content="#B4492A">
<meta name="color-scheme" content="light dark">
<meta property="og:type" content="website">
<meta property="og:site_name" content="{e(studio)}">
<meta property="og:title" content="{e(title)}">
<meta property="og:description" content="{e(og_desc)}">
<meta property="og:url" content="{domain}{canonical}">
<meta property="og:image" content="{domain}/play/{SLUG}/og-image.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="History Timeline: put world history events in order">
<meta property="og:locale" content="en_US">
<meta property="og:locale:alternate" content="ko_KR">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{e(title)}">
<meta name="twitter:description" content="{e(og_desc)}">
<meta name="twitter:image" content="{domain}/play/{SLUG}/og-image.png">
<link rel="icon" href="favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Poppins:wght@500;600;700&family=Noto+Sans+KR:wght@500;600;700&display=swap">
{extra}</head>"""


def _header(brand_href):
    return f"""<a class="skip-link" href="#main" data-t="skip">Skip to content</a>
<header class="top">
  <div class="wrap">
    <a class="brand" href="{brand_href}"><img src="favicon.svg" alt="" width="32" height="32"><span data-t="title">History Timeline</span></a>
    <nav class="top-links" aria-label="Game">
      <a class="top-link hide-sm" href="/play/">{GLOBE}<span data-t="games">Browser games</span></a>
      <button class="top-link lang" data-action="lang-toggle" aria-label="한국어로 보기"><span data-t="lang_switch">한국어</span></button>
    </nav>
  </div>
</header>"""


FOOTER = """<footer class="foot">
  <div class="wrap">
    <nav aria-label="Site">
      <a href="/" data-t="studio">ggook's studio</a>
      <a href="/play/" data-t="games">Browser games</a>
      <a href="/ko/history/" data-t="reading">World history reading (Korean)</a>
      <a href="/privacy.html" data-t="privacy">Privacy Policy</a>
    </nav>
    <p>© 2026 ggook's studio</p>
  </div>
</footer>"""


def build(root, published_slugs, eras, era_of_year, domain, studio, adsense):
    """Writes the game; returns its URLs for the sitemap. Events whose article isn't published yet are left out."""
    src = os.path.join(root, "_src")
    out = os.path.join(root, "play", SLUG)
    known = {ev["slug"] for ev in EVENTS}
    missing = known - set(published_slugs)
    events = [ev for ev in EVENTS if ev["slug"] in published_slugs]
    for ev in EVENTS:
        assert ev["lo"] <= ev["hi"], ev["slug"]
    n = len(events)

    css = open(os.path.join(src, "webgames", "shared", "style.css"), encoding="utf-8").read()
    css = css.replace("Shared stylesheet: copied into each game by\n   _src/webgames/build.mjs.",
                      "Shared stylesheet, copied here by\n   _src/timeline_build.py.")
    css += open(os.path.join(src, "timeline", "extra.css"), encoding="utf-8").read()
    app = open(os.path.join(src, "timeline", "app.js"), encoding="utf-8").read()
    data = ("/* Generated by _src/timeline_build.py from _src/timeline.py. Do not edit. */\nwindow.TL=" +
            json.dumps({"events": [{k: ev[k] for k in ("slug", "lo", "hi", "ko_year", "en_year", "ko", "en", "kr")}
                                   for ev in events],
                        "about": {k: v.format(n=n) for k, v in ABOUT.items()}},
                       ensure_ascii=False, separators=(",", ":")) + ";\n")
    _write(os.path.join(out, "style.css"), css)
    _write(os.path.join(out, "app.js"), app)
    _write(os.path.join(out, "data.js"), data)
    _write(os.path.join(out, "favicon.svg"), open(os.path.join(src, "timeline", "favicon.svg"), encoding="utf-8").read())

    pre = ("<script>(function(){try{var s=JSON.parse(localStorage.getItem('kys_timeline_settings')||'{}');"
           "var l=s.lang||((navigator.languages&&navigator.languages[0])||navigator.language||'');"
           "if(l==='ko'||(l!=='en'&&String(l).toLowerCase().indexOf('ko')===0))document.documentElement.lang='ko';}catch(e){}})();</script>\n")
    styles = f'<link rel="stylesheet" href="style.css?v={_ver(css)}">\n'
    ld = {"@context": "https://schema.org", "@type": "WebApplication", "name": TITLE["en"],
          "url": f"{domain}/play/{SLUG}/", "description": OG_DESC.format(n=n), "applicationCategory": "GameApplication",
          "operatingSystem": "Any", "inLanguage": ["en", "ko"], "isAccessibleForFree": True,
          "offers": {"@type": "Offer", "price": "0", "priceCurrency": "USD"},
          "publisher": {"@type": "Organization", "name": studio, "url": f"{domain}/"}}
    scripts = (f'<script src="data.js?v={_ver(data)}" defer></script>\n<script src="app.js?v={_ver(app)}" defer></script>\n'
               f'<script type="application/ld+json">{json.dumps(ld, ensure_ascii=False)}</script>\n')
    index = (_head(DOC_TITLE, DESC.format(n=n), f"/play/{SLUG}/", OG_DESC.format(n=n), domain, studio, adsense,
                   styles + pre + scripts) +
             f"""
<body data-page="game">
{_header("./")}
<main id="main">
  <div id="view" class="view" tabindex="-1">
    <div class="wrap"><div class="card" style="text-align:center">
      <h1>History Timeline</h1>
      <p class="muted">Put world history in order</p>
      <noscript><p>This game needs JavaScript. You can still <a href="all-events.html">browse all {n} events</a>.</p></noscript>
    </div></div>
  </div>
  <div class="wrap" id="about-wrap"><section id="about" class="card about">{ABOUT["en"].format(n=n)}</section></div>
</main>
{FOOTER}
<div id="live" class="visually-hidden" aria-live="polite" aria-atomic="true"></div>
</body>
</html>
""")
    _write(os.path.join(out, "index.html"), index)

    # The list page: static, in Korean and English, grouped by the eras of the history section.
    groups = ""
    for era in eras:
        items = [ev for ev in events if era_of_year(ev["lo"]) is era]
        if not items:
            continue
        rows = "".join(
            f'<li class="tl-item"><span class="tl-year">{e(ev["ko_year"])} · {e(ev["en_year"])}</span>'
            f'<a class="tl-label" href="/ko/history/{ev["slug"]}/" lang="ko">{e(ev["ko"])}</a>'
            f'<span class="tl-en">{e(ev["en"])}</span></li>' for ev in items)
        groups += f'<h2>{e(era[1])} · {e(ERA_EN[era[0]])} <span class="muted small">({len(items)})</span></h2><ol class="tl-list done">{rows}</ol>\n'
    lang_script = ('<script>(function(){var b=document.querySelector(\'[data-action="lang-toggle"]\');'
                   'if(b)b.hidden=true;})();</script>\n')
    listing = (_head(LIST_TITLE, LIST_DESC.format(n=n), f"/play/{SLUG}/all-events.html", LIST_DESC.format(n=n),
                     domain, studio, adsense, styles) +
               f"""
<body data-page="list">
{_header("./")}
<main id="main">
  <div class="wrap events-page">
    <nav class="crumbs" aria-label="Breadcrumb"><a href="/play/">Browser games</a><span aria-hidden="true">›</span><a href="./">History Timeline</a><span aria-hidden="true">›</span><span>All events</span></nav>
    <div class="card">
      <h1>All events · 전체 사건</h1>
      <p class="lead">The {n} events of History Timeline, in order. Each one links to an article in our Korean world history reading series.</p>
      <p class="lead" lang="ko">연표 맞추기에 나오는 사건 {n}개를 시대순으로 정리했어요. 사건 이름을 누르면 세계사 읽을거리의 해당 글로 이동해요.</p>
      <p class="lead small">Events from the same year are listed in the order the series covers them; in the game, they can go either way round.</p>
{groups}      <div class="btn-row back"><a class="btn primary" href="./">Play History Timeline · 게임 하기</a><a class="btn" href="/ko/history/">세계사 읽을거리</a></div>
    </div>
  </div>
</main>
{FOOTER}
{lang_script}</body>
</html>
""")
    _write(os.path.join(out, "all-events.html"), listing)
    if missing:
        print(f"timeline: {len(missing)} events skipped (article not published): {', '.join(sorted(missing))}")
    return n
