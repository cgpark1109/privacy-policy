# Builds the studio site (English at /, Korean at /ko/) from content.py.
# Run from the repository root: python _src/build.py
# Jekyll on GitHub Pages skips folders starting with "_", so _src stays private.
import hashlib
import html
import json
import os
import re
import sys
from datetime import date, datetime, timedelta, timezone
from email.utils import format_datetime
from urllib.parse import quote

sys.path.insert(0, os.path.dirname(__file__))
import timeline_build  # noqa: E402
from content import ABOUT, FAQ, GAMES, GUIDES, NEWS, PLAY_DETAILS, PLAY_REFERENCE, STUDIO, TERMS, TERMS_DATE, UI, WEB_GAMES  # noqa: E402
from qr import qr_svg  # noqa: E402

# Scheduled publishing: a guide, article or news item dated after today is left out of the build until that
# day comes. The scheduled GitHub Actions workflow rebuilds the site every day just after midnight Korean time.
TODAY = os.environ.get("BUILD_DATE") or date.today().isoformat()

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CSS_VERSION = hashlib.sha1(open(os.path.join(ROOT, "assets", "site.css"), "rb").read()).hexdigest()[:10]
SHOTS = json.load(open(os.path.join(os.path.dirname(__file__), "screenshots.json"), encoding="utf-8"))
LANGS = ["en", "ko"]
PREFIX = {"en": "", "ko": "/ko"}
e = html.escape

ICON_YT = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8zM9.6 15.6V8.4l6.3 3.6-6.3 3.6z"/></svg>'
ICON_IG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.2c3.2 0 3.6 0 4.8.1 1.2.1 1.8.2 2.2.4.6.2 1 .5 1.4.9.4.4.7.8.9 1.4.2.4.4 1 .4 2.2.1 1.3.1 1.6.1 4.8s0 3.6-.1 4.8c-.1 1.2-.2 1.8-.4 2.2-.2.6-.5 1-.9 1.4-.4.4-.8.7-1.4.9-.4.2-1 .4-2.2.4-1.3.1-1.6.1-4.8.1s-3.6 0-4.8-.1c-1.2-.1-1.8-.2-2.2-.4-.6-.2-1-.5-1.4-.9-.4-.4-.7-.8-.9-1.4-.2-.4-.4-1-.4-2.2C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.8c.1-1.2.2-1.8.4-2.2.2-.6.5-1 .9-1.4.4-.4.8-.7 1.4-.9.4-.2 1-.4 2.2-.4C8.4 2.2 8.8 2.2 12 2.2zm0 4.7a5.1 5.1 0 1 0 0 10.2 5.1 5.1 0 0 0 0-10.2zm0 8.4a3.3 3.3 0 1 1 0-6.6 3.3 3.3 0 0 1 0 6.6zm5.3-9.8a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4z"/></svg>'
ICON_PLAY = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.6 1.8 14 12 3.6 22.2c-.4-.2-.6-.6-.6-1.1V2.9c0-.5.2-.9.6-1.1zm11.5 11.3 2.6 2.6-12 6.9 9.4-9.5zm3.6-3.6 3 1.7c.8.5.8 1.6 0 2.1l-3 1.7-2.8-2.9 2.8-2.6zM5.7 1.4l12 6.9-2.6 2.6-9.4-9.5z"/></svg>'
ICON_WEB = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm6.9 6h-2.9a15.7 15.7 0 0 0-1.4-3.6A8 8 0 0 1 18.9 8zM12 4c.8 1.2 1.5 2.5 1.9 4h-3.8c.4-1.5 1.1-2.8 1.9-4zM4.3 14a8.2 8.2 0 0 1 0-4h3.4a16.5 16.5 0 0 0 0 4H4.3zm.8 2h2.9c.3 1.3.8 2.5 1.4 3.6A8 8 0 0 1 5.1 16zM8 8H5.1a8 8 0 0 1 4.3-3.6C8.8 5.5 8.3 6.7 8 8zm4 12c-.8-1.2-1.5-2.5-1.9-4h3.8c-.4 1.5-1.1 2.8-1.9 4zm2.3-6H9.7a14.7 14.7 0 0 1 0-4h4.6a14.7 14.7 0 0 1 0 4zm.3 5.6c.6-1.1 1.1-2.3 1.4-3.6h2.9a8 8 0 0 1-4.3 3.6zm1.7-5.6a16.5 16.5 0 0 0 0-4h3.4a8.2 8.2 0 0 1 0 4h-3.4z"/></svg>'
ICON_CALC = ('<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 2h10a3 3 0 0 1 3 3v14a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V5a3 3 0 0 1 3-3zm0 2a1 1 0 0 0-1 1v3h12V5a1 1 0 0 0-1-1H7zm-1 6v9a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-9H6z'
             'm2 2h2v2H8v-2zm3 0h2v2h-2v-2zm3 0h2v2h-2v-2zm-6 3h2v2H8v-2zm3 0h2v2h-2v-2zm3 0h2v2h-2v-2z"/></svg>')
ICON_MENU ='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'


def url(lang, path=""):
    return f"{PREFIX[lang]}/{path}" if path else f"{PREFIX[lang]}/"


def play_url(game, medium=None, content=None):
    """Google Play link. With a medium, it carries UTM tags in the install referrer, so Play Console
    (Store listing acquisition > tracked channels) shows installs that came from this site."""
    link = f"https://play.google.com/store/apps/details?id={game['package']}"
    if medium:
        utm = f"utm_source=kysystemstudio&utm_medium={medium}&utm_campaign=game_page"
        if content:
            utm += f"&utm_content={content}"
        link += "&referrer=" + quote(utm, safe="")
    return link


def go_url(game):
    """Short link on this site for the QR code; it forwards to Google Play (see build_go)."""
    return f"{STUDIO['domain']}/go/{game['slug']}/"


def ld_json(data):
    """A JSON-LD <script> block (structured data for search engines)."""
    text = json.dumps(data, ensure_ascii=False).replace("</", "<\\/")
    return f'<script type="application/ld+json">{text}</script>'


ICON_SPEAK = ('<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 8v8a4.5 4.5 0 0 0 2.5-4z'
              'M14 3.2v2.1a7 7 0 0 1 0 13.4v2.1a9 9 0 0 0 0-17.6z"/></svg>')
# Plays {{say:...}} words with the browser's Korean voice; buttons are hidden where speech isn't available.
SAY_SCRIPT = """<script>(function(){var d=document.documentElement;
if(!('speechSynthesis' in window)){d.classList.add('no-tts');return;}
document.addEventListener('click',function(ev){var b=ev.target.closest('.say');if(!b)return;
var u=new SpeechSynthesisUtterance(b.getAttribute('data-say'));u.lang='ko-KR';u.rate=0.8;
speechSynthesis.cancel();speechSynthesis.speak(u);});})();</script>"""


# Eras of the World History Quiz, used to group the history reading list: (anchor, name, range, last year).
ERAS = [("ancient", "고대", "476년까지", 476), ("medieval", "중세", "476~1453년", 1453),
        ("early-modern", "근대", "1453~1800년", 1800), ("modern-1", "현대 1", "1800~1945년", 1945),
        ("modern-2", "현대 2", "1945년 이후", float("inf"))]
LEARN_TOPICS = ["hangul", "grammar", "situations", "words"]
NEWS_PER_PAGE = 20


def era_of(a):
    """The quiz era of a history article, from its order (the year it is about)."""
    return next(era for era in ERAS if a["order"] <= era[3])


def breadcrumbs(lang, trail):
    """A visible breadcrumb trail plus its BreadcrumbList JSON-LD. trail: [(label, path or None for the current page)]."""
    t = UI[lang]
    links = [f'<a href="{url(lang)}">{e(t["home"])}</a>'] + [f'<a href="{p}">{e(label)}</a>' for label, p in trail if p]
    nav = (f'<nav class="crumbs" aria-label="{e(t["breadcrumb"])}">'
           + '<span aria-hidden="true">›</span>'.join(links) + "</nav>")
    items = [(t["home"], url(lang))] + [(label, p) for label, p in trail]
    ld = {"@context": "https://schema.org", "@type": "BreadcrumbList",
          "itemListElement": [{"@type": "ListItem", "position": i + 1, "name": label,
                               **({"item": STUDIO["domain"] + p} if p else {})}
                              for i, (label, p) in enumerate(items)]}
    return nav, ld_json(ld)


def related(items, a, n=3):
    """Up to n other articles from items, nearest to a in reading order."""
    others = [x for x in items if x is not a]
    return sorted(others, key=lambda x: (abs(x["order"] - a["order"]), x["order"]))[:n]


def related_section(title, cards):
    return f"""<section class="section container">
  <div class="section-head"><h2>{e(title)}</h2></div>
  <div class="guide-list">
{cards}
  </div>
</section>"""


def list_search(placeholder, empty):
    """A search box that filters the article cards on a list page (hidden until the script runs)."""
    return f"""<div class="list-search" id="list-search-box" hidden><input type="search" id="list-search" placeholder="{e(placeholder)}" aria-label="{e(placeholder)}" autocomplete="off"></div>
<p class="list-empty" id="list-empty" hidden>{e(empty)}</p>
<script>(function(){{var b=document.getElementById('list-search-box'),q=document.getElementById('list-search'),m=document.getElementById('list-empty');
b.hidden=false;
q.addEventListener('input',function(){{var cards=[].slice.call(document.querySelectorAll('[data-group] .guide-card')),groups=[].slice.call(document.querySelectorAll('[data-group]'));
var v=q.value.trim().toLowerCase(),any=false;cards.forEach(function(c){{var hit=!v||c.textContent.toLowerCase().indexOf(v)>-1;c.hidden=!hit;if(hit)any=true;}});
groups.forEach(function(g){{g.hidden=!g.querySelector('.guide-card:not([hidden])');}});m.hidden=any;}});}})();</script>"""


def build_feed(path, title, description, link, items, lang):
    """RSS 2.0 feed of articles, newest first. items: [(title, absolute url, description, yyyy-mm-dd)]."""
    kst = timezone(timedelta(hours=9))
    stamp = lambda d: format_datetime(datetime.strptime(d, "%Y-%m-%d").replace(hour=9, tzinfo=kst))
    entries = "".join(f"""
  <item><title>{e(t)}</title><link>{u}</link><guid isPermaLink="true">{u}</guid><pubDate>{stamp(d)}</pubDate><description>{e(desc)}</description></item>"""
                      for t, u, desc, d in items)
    last = stamp(max(d for *_, d in items)) if items else stamp(TODAY)
    xml = f"""<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>{e(title)}</title>
  <link>{link}</link>
  <description>{e(description)}</description>
  <language>{lang}</language>
  <lastBuildDate>{last}</lastBuildDate>
  <atom:link href="{STUDIO['domain']}{path}" rel="self" type="application/rss+xml"/>{entries}
</channel>
</rss>
"""
    with open(os.path.join(ROOT, path.lstrip("/")), "w", encoding="utf-8", newline="\n") as f:
        f.write(xml)


def load_articles(section="learn", lang="en"):
    """Hangul guides: _src/learn/<slug>.html, each starting with an HTML comment holding JSON metadata
    (title, description, date, updated, order). {{say:한글}} becomes a listen button."""
    folder = os.path.join(os.path.dirname(__file__), section)
    articles = []
    for name in sorted(os.listdir(folder)):
        if not name.endswith(".html"):
            continue
        text = open(os.path.join(folder, name), encoding="utf-8").read()
        m = re.match(r"\s*<!--(.*?)-->(.*)", text, re.S)
        if not m:
            sys.exit(f"_src/learn/{name} has no metadata comment")
        meta = json.loads(m.group(1))
        if meta["date"] > TODAY:
            continue
        body = re.sub(r"\{\{say:([^}]+)\}\}",
                      lambda k: f'<button type="button" class="say" data-say="{e(k.group(1))}" aria-label="Listen: {e(k.group(1))}">{ICON_SPEAK}</button>',
                      m.group(2))
        text = re.sub(r"<[^>]+>", " ", body)
        # Reading time: about 200 words a minute in English, about 500 characters a minute in Korean.
        size = len(re.sub(r"\s", "", text)) / 500 if lang == "ko" else len(text.split()) / 200
        articles.append({**meta, "slug": name[:-5], "body": body, "minutes": max(1, round(size))})
    return sorted(articles, key=lambda a: a["order"])


ARTICLES = load_articles()          # Hangul guides, English, /learn/
HISTORY = load_articles("history", "ko")  # world history reading, Korean, /ko/history/


def published_news():
    return [n for n in NEWS if not n.get("draft") and n["date"] <= TODAY]


def privacy_url(lang):
    """The English policy stays at /privacy.html (linked from Google Play); the Korean one is /ko/privacy/."""
    return "/privacy.html" if lang == "en" else url(lang, "privacy/")


def web_href(w, lang):
    """Link to a browser-only game: site-page games have a page per language (unless English only), the others one
    page at /play/<slug>/."""
    localized = (w.get("site_page") and not w.get("en_only")) or w.get("ko_page")
    return url(lang, f"play/{w['slug']}/") if localized else f"/play/{w['slug']}/"


def game_by_slug(slug):
    return next(g for g in GAMES if g["slug"] == slug)


def page(lang, path, title, description, body, active=None, head_extra="", og_image=None, translated=True,
         show_updated=True):
    """Wraps a page body in the shared head, header and footer and writes it.
    translated=False is for pages that exist in one language only: the language switch goes to the other home.
    show_updated=False leaves out the footer's "Last updated" line (the privacy policies carry their own date)."""
    t = UI[lang]
    other = "ko" if lang == "en" else "en"
    full_title = f"{title} – {STUDIO['name']}" if title else f"{STUDIO['name']} – {t['tagline']}"
    alt = ""
    if translated:
        alt = "".join(f'<link rel="alternate" hreflang="{l}" href="{STUDIO["domain"]}{url(l, path)}">' for l in LANGS)
        alt += f'<link rel="alternate" hreflang="x-default" href="{STUDIO["domain"]}{url("en", path)}">'
    image = og_image or "/assets/logo.png"
    image = image if image.startswith("http") else STUDIO["domain"] + image
    card = "summary_large_image" if "/assets/og-" in image or image.endswith("/og-image.png") else "summary"  # wide images
    feed = (f'<link rel="alternate" type="application/rss+xml" title="{e(t["feed_learn"] if lang == "en" else t["feed_history"])}" '
            f'href="{"/learn/feed.xml" if lang == "en" else url("ko", "history/feed.xml")}">')
    nav_items = [("play", t["nav_play"], url(lang, "play/")), ("games", t["nav_games"], url(lang) + "#games"),
                 ("learn", t["nav_learn"], "/learn/"),
                 *([("history", t["nav_history"], url(lang, "history/"))] if lang == "ko" else []),
                 ("calc", t["nav_calc"], STUDIO["calc"]),
                 ("news", t["nav_news"], url(lang, "news/")),
                 ("about", t["nav_about"], url(lang, "about/")), ("support", t["nav_support"], url(lang, "support/"))]
    nav = "".join(f'<a href="{href}"{" aria-current=\"page\"" if key == active else ""}>{e(label)}</a>'
                  for key, label, href in nav_items)
    updated = (f'    <p class="updated">{e(t["last_updated"])}: '
               f'<time datetime="{STUDIO["updated"]}">{STUDIO["updated"]}</time></p>\n') if show_updated else ""
    nav += f'<a class="lang" href="{url(other, path) if translated else url(other)}" hreflang="{other}" lang="{other}">{UI[other]["lang_name"]}</a>'
    doc = f"""<!DOCTYPE html>
<html lang="{lang}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{e(full_title)}</title>
<meta name="description" content="{e(description)}">
<meta name="google-adsense-account" content="{STUDIO['adsense']}">
<link rel="canonical" href="{STUDIO['domain']}{url(lang, path)}">
{alt}
<meta property="og:type" content="website">
<meta property="og:site_name" content="{e(STUDIO['name'])}">
<meta property="og:title" content="{e(full_title)}">
<meta property="og:description" content="{e(description)}">
<meta property="og:url" content="{STUDIO['domain']}{url(lang, path)}">
<meta property="og:image" content="{image}">
<meta name="twitter:card" content="{card}">
{feed}
<link rel="icon" type="image/png" href="/assets/favicon.png">
<link rel="apple-touch-icon" href="/assets/apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@500;600;700&family=Noto+Sans+KR:wght@500;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/site.css?v={CSS_VERSION}">
{head_extra}
</head>
<body>
<header class="site-header">
  <div class="container">
    <a class="brand" href="{url(lang)}"><img src="/assets/logo-256.png" alt="" width="34" height="34">{e(STUDIO['name'])}</a>
    <button class="menu-toggle" aria-label="Menu" aria-expanded="false" onclick="var n=document.getElementById('nav');n.classList.toggle('open');this.setAttribute('aria-expanded',n.classList.contains('open'))">{ICON_MENU}</button>
    <nav class="nav" id="nav">{nav}</nav>
  </div>
</header>
<main>
{body}
</main>
<footer class="site-footer">
  <div class="container">
    <nav>
      <a href="{privacy_url(lang)}">{e(t['privacy'])}</a>
      <a href="{url(lang, 'terms/')}">{e(t['terms'])}</a>
      <a href="{url(lang, 'play/')}">{e(t['play_title'])}</a>
      <a href="{STUDIO['calc']}" hreflang="ko">{e(t['calc_link'])}</a>
      <a href="{url(lang, 'support/')}">{e(t['support'])}</a>
      <a href="mailto:{STUDIO['email']}">{e(t['contact'])}</a>
      <a href="{"/learn/feed.xml" if lang == "en" else url("ko", "history/feed.xml")}">RSS</a>
      <a href="{STUDIO['youtube']}" target="_blank" rel="noopener">YouTube</a>
      <a href="{STUDIO['instagram']}" target="_blank" rel="noopener">Instagram</a>
    </nav>
    <p>© 2026 {e(STUDIO['name'])}. {e(t['rights'])}</p>
{updated}  </div>
</footer>
</body>
</html>
"""
    out = os.path.join(ROOT, url(lang, path).lstrip("/"), "index.html") if not path.endswith(".html") \
        else os.path.join(ROOT, path)
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, "w", encoding="utf-8", newline="\n") as f:
        f.write(doc)
    return url(lang, path)


def game_card(lang, g):
    t, c = UI[lang], g[lang]
    badge = f' <span class="badge">{t["new"]}</span>' if g["new"] else ""
    kind = t["kind_game"] if g["kind"] == "game" else t["kind_learning"]
    return f"""<a class="card game-card" href="{url(lang, f'games/{g["slug"]}/')}">
  <img src="{g['icon']}=s192" alt="" width="76" height="76" loading="lazy">
  <div><div class="title">{e(c['name'])}{badge}</div><div class="desc">{e(c['short'])}</div>
  <div class="tags"><span class="tag">{e(kind)}</span><span class="tag">Android</span></div></div>
</a>"""


def news_item(lang, n, link_game=True):
    t, c = UI[lang], n[lang]
    more = ""
    if n.get("link"):
        more = f'<a class="more" href="{n["link"]["href"]}">{e(n["link"][lang])} →</a>'
    elif link_game and n.get("game"):
        web = next((w for w in WEB_GAMES if w["slug"] == n["game"]), None)
        if web and (n.get("web") or not any(g["slug"] == n["game"] for g in GAMES)):  # browser game: link straight to it
            more = f'<a class="more" href="{web_href(web, lang)}">{e(web[lang]["name"])} →</a>'
        else:
            g = game_by_slug(n["game"])
            more = f'<a class="more" href="{url(lang, f"games/{g["slug"]}/")}">{e(g[lang]["name"])} →</a>'
    return f"""<article class="card news-item"><time datetime="{n['date']}">{n['date']}</time>
  <h3>{e(c['title'])}</h3><p>{e(c['body'])}</p>{more}</article>"""


def build_home(lang):
    t = UI[lang]
    cards = "\n".join(game_card(lang, g) for g in GAMES)
    # game news first: the home page shows the latest updates about games and apps
    news = "\n".join(news_item(lang, n) for n in [n for n in published_news() if n.get("game")][:2])
    # Teaser card under the game list: the 계산만물상 calculators site.
    teasers = []
    teasers.append(f"""<div class="card play-teaser">
  <p>{ICON_CALC} {e(t['calc_teaser'])}</p>
  <a class="btn light" href="{STUDIO['calc']}" hreflang="ko">{e(t['calc_teaser_cta'])} →</a>
</div>""")
    teaser_section = f'<section class="section container teasers">\n{chr(10).join(teasers)}\n</section>'
    # What the site offers, with live counts, then the most recent guides.
    counts = {"games": len(GAMES), "guides": len(ARTICLES), "history": len(HISTORY),
              "web": sum(1 for g in GAMES if g.get("web")) + len(WEB_GAMES)}
    links = {"games": "#games", "guides": "/learn/", "history": url("ko", "history/"), "web": url(lang, "play/")}
    points = "".join(f'<li><a href="{links[key]}"><strong>{e(label)}</strong></a>: {e(text.format(**counts))}</li>'
                     for key, label, text in t["home_points"])
    intro = f"""<section class="section container"><div class="card prose home-intro">
  <h2>{e(t['home_intro_title'])}</h2><p>{e(t['home_intro'])}</p><ul>{points}</ul>
</div></section>"""
    # Learning content is secondary on the home page: one card each, under the games
    more = [f'''<a class="card guide-card" href="/learn/" hreflang="en"><span class="title">{e(t['nav_learn'])}</span>
    <span class="desc">{e(t['home_more_learn'])}</span></a>''']
    if HISTORY:
        more.append(f'''<a class="card guide-card" href="{url('ko', 'history/')}" hreflang="ko"><span class="title">{e(UI['ko']['history_title'])}</span>
    <span class="desc">{e(t['home_more_history'])}</span></a>''')
    body = f"""<section class="hero container">
  <img class="logo" src="/assets/logo-256.png" alt="{e(STUDIO['name'])} logo" width="116" height="116">
  <h1>{e(STUDIO['name'])}</h1>
  <p class="tagline">{e(t['tagline'])}</p>
  <p class="lead">{e(t['hero_text'])}</p>
  <div class="hero-cta"><a class="btn" href="{url(lang, 'play/')}">{ICON_WEB} {e(t['hero_play'])}</a>
  <a class="btn light" href="#games">{e(t['hero_apps'])}</a></div>
  <div class="social">
    <a href="{STUDIO['youtube']}" target="_blank" rel="noopener">{ICON_YT} YouTube</a>
    <a href="{STUDIO['instagram']}" target="_blank" rel="noopener">{ICON_IG} Instagram</a>
  </div>
</section>
<section class="section container" id="play">
  <div class="section-head"><h2>{e(t['nav_play'])}</h2><a href="{url(lang, 'play/')}">{e(t['play_all'])} →</a></div>
  <div class="games">
{web_game_cards(lang, details=False)}
  </div>
</section>
<section class="section container" id="games">
  <div class="section-head"><h2>{e(t['games_title'])}</h2><p>{e(t['games_lead'])}</p></div>
  <div class="games">
{cards}
  </div>
</section>
<section class="section container">
  <div class="section-head"><h2>{e(t['news_latest'])}</h2><a href="{url(lang, 'news/')}">{e(t['news_all'])} →</a></div>
  <div class="news-list">
{news}
  </div>
</section>
{intro}
<section class="section container">
  <div class="section-head"><h2>{e(t['home_more_title'])}</h2></div>
  <div class="guide-list">
{chr(10).join(more)}
  </div>
</section>
{teaser_section}"""
    org = {"@context": "https://schema.org", "@type": "Organization", "name": STUDIO["name"],
           "url": STUDIO["domain"] + "/", "logo": f"{STUDIO['domain']}/assets/logo-256.png",
           "email": STUDIO["email"], "sameAs": [STUDIO["youtube"], STUDIO["instagram"]]}
    site = {"@context": "https://schema.org", "@type": "WebSite", "name": STUDIO["name"],
            "url": STUDIO["domain"] + url(lang), "inLanguage": lang}
    page(lang, "", None, t["home_desc"], body, active=None, head_extra=ld_json(org) + ld_json(site))


def build_game(lang, g):
    t, c = UI[lang], {**g[lang], **GUIDES.get(g["slug"], {}).get(lang, {})}
    path = f"games/{g['slug']}/"
    shots = "".join(f'<img src="{s}=h720" alt="" loading="lazy" height="360">' for s in SHOTS.get(g["shots_key"], []))
    paras = "".join(f"<p>{e(p)}</p>" for p in c["body"])
    feats = "".join(f"<li>{e(f)}</li>" for f in c["features"])
    video = ""
    if g.get("youtube"):
        video = f"""<section class="section container">
  <div class="section-head"><h2>{e(t['trailer'])}</h2></div>
  <div class="video{" wide" if g.get("video_wide") else ""}"><iframe src="https://www.youtube-nocookie.com/embed/{g['youtube']}" title="{e(c['name'])}" loading="lazy" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>
</section>"""
    others = "\n".join(game_card(lang, o) for o in GAMES if o is not g)
    web_game = next((w for w in WEB_GAMES if w.get("app") == g["slug"]), None)  # a browser version of this app
    web_link = g.get("web") or (web_href(web_game, lang) if web_game else None)
    web_btn = (f' <a class="btn light" href="{web_link}">{ICON_WEB} {e(t["play_now_web"])}</a>'
               if web_link else "")
    guide = ""
    if c.get("howto") or c.get("tips"):
        steps = "".join(f"<li>{e(s)}</li>" for s in c.get("howto", []))
        tips = "".join(f"<li>{e(s)}</li>" for s in c.get("tips", []))
        guide = f"""<section class="section container">
  <div class="two-col">
    <div class="card prose guide"><h2>{e(t['how_to_play'])}</h2><ol class="steps">{steps}</ol></div>
    <div class="card prose guide"><h2>{e(t['tips'])}</h2><ul class="tips">{tips}</ul></div>
  </div>
</section>"""
    faq_ld = ""
    if c.get("faq"):
        faq_ld = ld_json({"@context": "https://schema.org", "@type": "FAQPage",
                          "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}}
                                         for q, a in c["faq"]]})
        faq = "".join(f"<details><summary>{e(q)}</summary><p>{e(a)}</p></details>" for q, a in c["faq"])
        guide += f"""
<section class="section container"><div class="card faq"><h2>{e(t['faq_title'])}</h2>{faq}</div></section>"""
    body = f"""<section class="container">
  <div class="game-hero">
    <img src="{g['icon']}=s256" alt="{e(c['name'])} icon" width="120" height="120">
    <div><h1>{e(c['name'])}</h1><p>{e(c['short'])}</p>
    <div class="hero-actions"><a class="btn" href="{e(play_url(g, "website", lang))}" target="_blank" rel="noopener">{ICON_PLAY} {e(t['get_play'])}</a>{web_btn}</div></div>
    <div class="qr">{qr_svg(go_url(g), e(t['qr_label']))}<span>{e(t['scan_qr'])}</span></div>
  </div>
</section>
<section class="section container">
  <div class="section-head"><h2>{e(t['screenshots'])}</h2></div>
  <div class="shots">{shots}</div>
</section>
{video}
<section class="section container">
  <div class="two-col">
    <div class="card prose"><h2>{e(t['about_game'])}</h2>{paras}</div>
    <div class="card"><h2>{e(t['features'])}</h2><ul class="features">{feats}</ul>
      <h2 style="margin-top:20px">{e(t['game_links'])}</h2>
      <ul class="link-list"><li><a href="{privacy_url(lang)}">{e(t['privacy'])}</a></li><li><a href="{url(lang, 'support/')}">{e(t['support'])}</a></li></ul>
    </div>
  </div>
</section>
{guide}
<section class="section container">
  <div class="section-head"><h2>{e(t['more_games'])}</h2></div>
  <div class="games">
{others}
  </div>
</section>"""
    app = {"@context": "https://schema.org", "@type": "MobileApplication", "name": c["name"],
           "description": c["short"], "url": STUDIO["domain"] + url(lang, path), "inLanguage": lang,
           "operatingSystem": "Android",
           "applicationCategory": "GameApplication" if g["kind"] == "game" else "EducationalApplication",
           "image": f"{g['icon']}=s512", "screenshot": [f"{s}=h720" for s in SHOTS.get(g["shots_key"], [])],
           "installUrl": play_url(g), "offers": {"@type": "Offer", "price": "0", "priceCurrency": "USD"},
           "publisher": {"@type": "Organization", "name": STUDIO["name"], "url": STUDIO["domain"] + "/"}}
    # Title: the Korean page gets "앱 소개" so it differs from the English one; description: the short line plus
    # the start of the description, about 150 characters
    title = c["name"] if lang == "en" else f"{c['name']} – {t['app_page']}"
    desc = c["short"]
    for sentence in re.split(r"(?<=[.!?다요])\s+", " ".join(c["body"])):
        if len(desc) + len(sentence) + 1 > 160:
            break
        desc += " " + sentence
    page(lang, path, title, desc, body, active="games", head_extra=ld_json(app) + faq_ld,
         og_image=f"{g['icon']}=s512")


def web_game_cards(lang, exclude=None, details=True):
    """Cards for the browser games (the /play/ page, the home page and "more games" under each game)."""
    t = UI[lang]

    def detail(g):
        if not details:
            return ""
        d = PLAY_DETAILS.get(g["slug"], {}).get(lang)
        return f'<p class="detail">{e(d)}</p>' if d else ""

    cards = ""
    for g in (g for g in GAMES if g.get("web")):  # app games with a browser version (none at the moment)
        c = g[lang]
        cards += f"""<div class="card play-card">
  <img src="{g['icon']}=s192" alt="" width="76" height="76" loading="lazy">
  <div><a class="title" href="{url(lang, f'games/{g["slug"]}/')}">{e(c['name'])}</a><div class="desc">{e(c['short'])}</div>{detail(g)}
  <div class="play-actions"><a class="btn" href="{e(g['web'])}">{ICON_WEB} {e(t['play_now'])}</a>
  <a class="text-link" href="{e(play_url(g, "website", lang))}" target="_blank" rel="noopener">{ICON_PLAY} {e(t['play_get_app'])}</a></div></div>
</div>
"""
    for g in (w for w in WEB_GAMES if w["slug"] != exclude):
        c = g[lang]
        cards += f"""<div class="card play-card">
  <img src="{g['icon']}" alt="" width="76" height="76" loading="lazy">
  <div><a class="title" href="{web_href(g, lang)}">{e(c['name'])}</a><div class="desc">{e(c['short'])}</div>{detail(g)}
  <div class="play-actions"><a class="btn" href="{web_href(g, lang)}">{ICON_WEB} {e(t['play_now'])}</a></div></div>
</div>
"""
    return cards


def build_play(lang):
    """The browser games."""
    t = UI[lang]
    cards = web_game_cards(lang)
    intro = "".join(f"<p>{e(p)}</p>" for p in t["play_intro"])
    refs = "".join(f'<li><a href="{r.get("href_" + lang, r["href"])}">{e(r[lang])}</a></li>' for r in PLAY_REFERENCE)
    faq = "".join(f"<details><summary>{e(q)}</summary><p>{e(a)}</p></details>" for q, a in t["play_faq"])
    body = f"""<section class="container"><h1 class="page-title">{e(t['play_title'])}</h1><p class="page-lead">{e(t['play_lead'])}</p></section>
<section class="section container"><div class="card prose">{intro}</div></section>
<section class="section container"><div class="games">
{cards}</div>
<p class="play-note">{e(t['play_note'])}</p></section>
<section class="section container"><div class="card prose guide"><h2>{e(t['play_reference'])}</h2><p>{e(t['play_reference_lead'])}</p><ul>{refs}</ul></div></section>
<section class="section container"><div class="card faq"><h2>{e(t['faq_title'])}</h2>{faq}</div></section>"""
    faq_ld = {"@context": "https://schema.org", "@type": "FAQPage",
              "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}}
                             for q, a in t["play_faq"]]}
    page(lang, "play/", t["play_title"], t["play_desc"], body, active="play",
         head_extra=ld_json(faq_ld) + breadcrumbs(lang, [(t["play_title"], None)])[1])


def build_news(lang):
    """/news/ shows the latest items in full; everything older is listed compactly on /news/archive/."""
    t = UI[lang]
    news = published_news()
    latest, older = news[:NEWS_PER_PAGE], news[NEWS_PER_PAGE:]
    items = "\n".join(news_item(lang, n) for n in latest)
    more = (f'<p class="more-link"><a class="btn light" href="{url(lang, "news/archive/")}">{e(t["news_earlier"])} →</a></p>'
            if older else "")
    body = f"""<section class="container"><h1 class="page-title">{e(t['news_title'])}</h1></section>
<section class="section container"><div class="news-list">
{items}
</div>{more}</section>"""
    page(lang, "news/", t["news_title"], t["news_desc"], body, active="news")
    if not older:
        return []
    rows = []
    for n in older:
        title = e(n[lang]["title"])
        if n.get("link"):
            title = f'<a href="{n["link"]["href"]}">{title}</a>'
        elif n.get("game"):
            web = next((w for w in WEB_GAMES if w["slug"] == n["game"]), None)
            if web and not n.get("web") and any(g["slug"] == n["game"] for g in GAMES):
                web = None  # news about the app links to the app page
            href = web_href(web, lang) if web else url(lang, f"games/{n['game']}/")
            title = f'<a href="{href}">{title}</a>'
        rows.append(f'<li><time datetime="{n["date"]}">{n["date"]}</time> {title}</li>')
    nav, ld = breadcrumbs(lang, [(t["news_title"], url(lang, "news/")), (t["news_archive_title"], None)])
    body = f"""<section class="container article-head">
  {nav}
  <h1 class="page-title">{e(t['news_archive_title'])}</h1>
  <p class="page-lead">{e(t['news_archive_lead'])}</p>
</section>
<section class="section container"><div class="card prose"><ul class="archive">
{chr(10).join(rows)}
</ul></div></section>"""
    page(lang, "news/archive/", t["news_archive_title"], t["news_archive_desc"], body, active="news", head_extra=ld)
    return [url(lang, "news/archive/")]


def build_about(lang):
    t = UI[lang]
    sections = "".join((f"<h2>{e(h)}</h2>" if h else "") + "".join(f"<p>{e(p)}</p>" for p in paras)
                       for h, paras in ABOUT[lang])
    body = f"""<section class="container"><h1 class="page-title">{e(t['about_title'])}</h1></section>
<section class="section container"><div class="card prose about">{sections}
  <div class="actions">
    <a class="btn" href="mailto:{STUDIO['email']}">{e(t['contact'])}</a>
    <a class="btn" href="{STUDIO['youtube']}" target="_blank" rel="noopener">{ICON_YT} YouTube</a>
    <a class="btn" href="{STUDIO['instagram']}" target="_blank" rel="noopener">{ICON_IG} Instagram</a>
  </div>
</div></section>"""
    page(lang, "about/", t["about_title"], ABOUT[lang][0][1][0], body, active="about")


def build_terms(lang):
    t = UI[lang]
    sections = "\n".join(f"<section><h2>{e(h)}</h2>" + "".join(f"<p>{e(p)}</p>" for p in paras) + "</section>"
                         for h, paras in TERMS[lang])
    body = f"""<section class="container"><h1 class="page-title">{e(t['terms'])}</h1></section>
<section class="section container"><div class="card policy">
<p class="updated">{e(t['terms_date'])}: {e(TERMS_DATE[lang])}</p>
{sections}
</div></section>"""
    page(lang, "terms/", t["terms"], t["terms_desc"], body, show_updated=False)


def build_support(lang):
    t = UI[lang]
    faq = "".join(f"<details><summary>{e(q)}</summary><p>{e(a)}</p></details>" for q, a in FAQ[lang])
    body = f"""<section class="container"><h1 class="page-title">{e(t['nav_support'])}</h1></section>
<section class="section container"><div class="card faq"><h2>{e(t['faq_title'])}</h2>{faq}</div></section>
<section class="section container" id="contact"><div class="card prose"><h2>{e(t['contact_title'])}</h2>
  <p>{e(t['contact_text'])}</p>
  <p><a class="btn" href="mailto:{STUDIO['email']}">{e(STUDIO['email'])}</a></p>
  <p>{e(t['contact_tip'])}</p>
</div></section>"""
    page(lang, "support/", t["nav_support"], t["contact_text"], body, active="support")


def article_card(a, lang="en", base="/learn/", article_lang="en"):
    """An article card. On Korean pages an English guide shows its one-line Korean summary ("ko" in its metadata)."""
    desc = a.get("ko", a["description"]) if lang == "ko" and article_lang == "en" else a["description"]
    hreflang = f' hreflang="{article_lang}"' if lang != article_lang else ""
    read_time = UI[lang]["read_time"] if article_lang != lang else UI[lang]["read_time_same"]
    return f"""<a class="card guide-card" href="{base}{a['slug']}/"{hreflang}>
  <span class="title" lang="{article_lang}">{e(a['title'])}</span><span class="desc">{e(desc)}</span>
  <span class="meta">{e(read_time.format(n=a['minutes']))}</span></a>"""


# Guides that teach what a Hangul Quiz stage tests: guide slug -> stage numbers (1-based, see HQ_STAGES)
QUIZ_STAGES = {"korean-vowels": [1, 4], "korean-consonants": [2], "plain-aspirated-tense": [3],
               "how-hangul-works": [5], "batchim": [6], "two-week-plan": [7], "korean-numbers": [9],
               "days-and-dates": [10], "korean-family-terms": [11], "korean-greetings": [12]}


def quiz_cta(slug):
    """'Test yourself' card under a Hangul guide, linking straight to the matching Hangul Quiz stage(s)."""
    stages = QUIZ_STAGES.get(slug)
    if not stages:
        return ""
    t = UI["en"]
    buttons = "".join(f'<a class="btn" href="/play/hangul-quiz/#stage-{n}">{e(t["quiz_cta_stage"].format(n=n, name=HQ_STAGES[n - 1][0]))} →</a>'
                      for n in stages)
    return (f'<section class="section container"><div class="card prose guide quiz-cta"><h2>{e(t["quiz_cta_title"])}</h2>'
            f'<p>{e(t["quiz_cta_text"])}</p><div class="hero-actions" style="margin-top:14px">{buttons}</div></div></section>\n')


def learn_apps():
    """'Practice with our apps' links under the guides: the Hangul Quiz browser game and the two Korean learning apps."""
    t = UI["en"]
    hq = next((w for w in WEB_GAMES if w["slug"] == "hangul-quiz"), None)
    items = [f'<li><a href="/play/hangul-quiz/"><strong>{e(hq["en"]["name"])}</strong></a>: {e(t["learn_quiz_text"])}</li>'] if hq else []
    for slug in ("learn-korean-hangul", "korean-word-quiz"):
        g = game_by_slug(slug)
        web = f' · <a href="{g["web"]}">{e(t["play_now_web"])}</a>' if g.get("web") else ""
        items.append(f'<li><a href="{url("en", f"games/{slug}/")}"><strong>{e(g["en"]["name"])}</strong></a>: '
                     f'{e(g["en"]["short"])}{web}</li>')
    return f"""<div class="card prose guide"><h2>{e(t['learn_practice'])}</h2><ul>{''.join(items)}</ul></div>"""


def build_learn():
    t = UI["en"]
    for a in ARTICLES:
        if a.get("topic") not in LEARN_TOPICS:
            sys.exit(f"_src/learn/{a['slug']}.html needs a \"topic\": one of {', '.join(LEARN_TOPICS)}")
    groups = [(k, [a for a in ARTICLES if a["topic"] == k]) for k in LEARN_TOPICS]
    groups = [(k, items) for k, items in groups if items]
    jump = "".join(f'<a href="#topic-{k}">{e(t["learn_topic_names"][k])} <span>{len(items)}</span></a>'
                   for k, items in groups)
    sections = "".join(f"""
<section class="section container" id="topic-{k}" data-group>
  <div class="section-head"><h2>{e(t['learn_topic_names'][k])}</h2><p>{e(t['guide_count'].format(n=len(items)))}</p></div>
  <p class="group-lead">{e(t['learn_topic_leads'][k])}</p>
  <div class="guide-list">
{chr(10).join(article_card(a) for a in items)}
  </div>
</section>""" for k, items in groups)
    paras = "".join(f"<p>{e(p)}</p>" for p in t["learn_intro"])
    body = f"""<section class="container"><h1 class="page-title">{e(t['learn_title'])}</h1>
<p class="page-lead">{e(t['learn_lead'])}</p></section>
<section class="section container"><div class="card prose">{paras}</div></section>
<section class="section container"><nav class="jump" aria-label="{e(t['learn_topics'])}">{jump}</nav>
{list_search(t['search_learn'], t['search_empty'])}</section>{sections}
<section class="section container">{learn_apps()}</section>"""
    page("en", "learn/", t["learn_title"], t["learn_lead"], body, active="learn", translated=False,
         og_image="/assets/og-learn.png")
    newest = sorted(ARTICLES, key=lambda a: (a["date"], a["order"]), reverse=True)
    build_feed("/learn/feed.xml", f"{t['learn_title']} – {STUDIO['name']}", t["learn_lead"], f"{STUDIO['domain']}/learn/",
               [(a["title"], f"{STUDIO['domain']}/learn/{a['slug']}/", a["description"], a["date"]) for a in newest], "en")
    for i, a in enumerate(ARTICLES):
        prev = ARTICLES[i - 1] if i > 0 else None
        nxt = ARTICLES[i + 1] if i + 1 < len(ARTICLES) else None
        pager = ""
        if prev:
            pager += f'<a class="prev" href="/learn/{prev["slug"]}/"><span>← {e(t["learn_prev"])}</span>{e(prev["title"])}</a>'
        if nxt:
            pager += f'<a class="next" href="/learn/{nxt["slug"]}/"><span>{e(t["learn_next"])} →</span>{e(nxt["title"])}</a>'
        dates = f'<time datetime="{a["date"]}">{a["date"]}</time>'
        if a.get("updated") and a["updated"] != a["date"]:
            dates += f' · {e(t["last_updated"])} <time datetime="{a["updated"]}">{a["updated"]}</time>'
        nav, crumbs_ld = breadcrumbs("en", [(t["learn_title"], "/learn/"),
                                             (t["learn_topic_names"][a["topic"]], f"/learn/#topic-{a['topic']}"),
                                             (a["title"], None)])
        body = f"""<section class="container article-head">
  {nav}
  <h1 class="page-title">{e(a['title'])}</h1>
  <p class="article-meta">{dates} · {a['minutes']} {e(t['min_read'])} · {e(STUDIO['name'])}</p>
</section>
<section class="section container"><article class="card article" lang="en">
{a['body']}
</article></section>
<section class="section container"><nav class="pager">{pager}</nav></section>
{quiz_cta(a["slug"])}{related_section(t["related_learn"], chr(10).join(article_card(x) for x in related([x for x in ARTICLES if x["topic"] == a["topic"]], a)))}
<section class="section container">{learn_apps()}</section>"""
        ld = {"@context": "https://schema.org", "@type": "Article", "headline": a["title"],
              "description": a["description"], "inLanguage": "en",
              "datePublished": a["date"], "dateModified": a.get("updated", a["date"]),
              "mainEntityOfPage": f"{STUDIO['domain']}/learn/{a['slug']}/",
              "author": {"@type": "Organization", "name": STUDIO["name"], "url": STUDIO["domain"] + "/"},
              "publisher": {"@type": "Organization", "name": STUDIO["name"],
                            "logo": {"@type": "ImageObject", "url": f"{STUDIO['domain']}/assets/logo-256.png"}}}
        page("en", f"learn/{a['slug']}/", a["title"], a["description"], body, active="learn", translated=False,
             head_extra=ld_json(ld) + crumbs_ld + SAY_SCRIPT, og_image="/assets/og-learn.png")


def history_quiz_card():
    """'Test yourself' card under the history articles: the World History Quiz app and browser version, and History Timeline."""
    t, g = UI["ko"], game_by_slug("world-history-quiz")
    web = f' · <a href="{g["web"]}">{e(t["play_now_web"])}</a>' if g.get("web") else ""
    tl = next((w for w in WEB_GAMES if w["slug"] == "history-timeline"), None)
    timeline = (f'<li><a href="{web_href(tl, "ko")}"><strong>{e(tl["ko"]["name"])}</strong></a>: '
                f'{e(t["history_timeline_text"])}</li>') if tl else ""
    return (f'<div class="card prose guide"><h2>{e(t["history_practice"])}</h2><ul><li>'
            f'<a href="{url("ko", "games/world-history-quiz/")}"><strong>{e(g["ko"]["name"])}</strong></a>: '
            f'{e(t["history_practice_text"])}{web}</li>{timeline}</ul></div>')


def build_history():
    """Korean world history reading at /ko/history/, from _src/history/<slug>.html (same format as the guides)."""
    if not HISTORY:
        return []
    t = UI["ko"]
    groups = [(era, [a for a in HISTORY if era_of(a) is era]) for era in ERAS]
    groups = [(era, items) for era, items in groups if items]
    jump = "".join(f'<a href="#era-{era[0]}">{e(era[1])} <span>{len(items)}</span></a>' for era, items in groups)
    sections = "".join(f"""
<section class="section container" id="era-{era[0]}" data-group>
  <div class="section-head"><h2>{e(era[1])}</h2><p>{e(era[2])} · {e(t['history_era_count'].format(n=len(items)))}</p></div>
  <div class="guide-list">
{chr(10).join(article_card(a, "ko", url("ko", "history/"), "ko") for a in items)}
  </div>
</section>""" for era, items in groups)
    paras = "".join(f"<p>{e(p)}</p>" for p in t["history_intro"])
    body = f"""<section class="container"><h1 class="page-title">{e(t['history_title'])}</h1>
<p class="page-lead">{e(t['history_lead'])}</p></section>
<section class="section container"><div class="card prose">{paras}</div></section>
<section class="section container"><nav class="jump" aria-label="{e(t['history_eras'])}">{jump}</nav>
{list_search(t['search_history'], t['search_empty'])}</section>{sections}
<section class="section container">{history_quiz_card()}</section>"""
    page("ko", "history/", t["history_title"], t["history_desc"].format(n=len(HISTORY)), body, active="history", translated=False,
         og_image="/assets/og-history.png")
    newest = sorted(HISTORY, key=lambda a: (a["date"], a["order"]), reverse=True)
    build_feed(url("ko", "history/feed.xml"), f"{t['history_title']} – {STUDIO['name']}", t["history_lead"],
               f"{STUDIO['domain']}{url('ko', 'history/')}",
               [(a["title"], f"{STUDIO['domain']}{url('ko', 'history/' + a['slug'] + '/')}", a["description"], a["date"])
                for a in newest], "ko")
    urls = [url("ko", "history/")]
    for i, a in enumerate(HISTORY):
        prev = HISTORY[i - 1] if i > 0 else None
        nxt = HISTORY[i + 1] if i + 1 < len(HISTORY) else None
        pager = ""
        if prev:
            prev_href = url("ko", "history/" + prev["slug"] + "/")
            pager += f'<a class="prev" href="{prev_href}"><span>← {e(t["prev_article"])}</span>{e(prev["title"])}</a>'
        if nxt:
            next_href = url("ko", "history/" + nxt["slug"] + "/")
            pager += f'<a class="next" href="{next_href}"><span>{e(t["next_article"])} →</span>{e(nxt["title"])}</a>'
        path = f"history/{a['slug']}/"
        era = era_of(a)
        nav, crumbs_ld = breadcrumbs("ko", [(t["history_title"], url("ko", "history/")),
                                            (era[1], url("ko", "history/") + f"#era-{era[0]}"), (a["title"], None)])
        body = f"""<section class="container article-head">
  {nav}
  <h1 class="page-title">{e(a['title'])}</h1>
  <p class="article-meta"><time datetime="{a['date']}">{a['date']}</time> · {e(t['read_time_same'].format(n=a['minutes']))} · {e(STUDIO['name'])}</p>
</section>
<section class="section container"><article class="card article">
{a['body']}
</article></section>
<section class="section container"><nav class="pager">{pager}</nav></section>
{related_section(t["related_history"], chr(10).join(article_card(x, "ko", url("ko", "history/"), "ko") for x in related([x for x in HISTORY if era_of(x) is era], a)))}
<section class="section container">{history_quiz_card()}</section>"""
        ld = {"@context": "https://schema.org", "@type": "Article", "headline": a["title"],
              "description": a["description"], "inLanguage": "ko",
              "datePublished": a["date"], "dateModified": a.get("updated", a["date"]),
              "mainEntityOfPage": f"{STUDIO['domain']}{url('ko', path)}",
              "author": {"@type": "Organization", "name": STUDIO["name"], "url": STUDIO["domain"] + "/"},
              "publisher": {"@type": "Organization", "name": STUDIO["name"],
                            "logo": {"@type": "ImageObject", "url": f"{STUDIO['domain']}/assets/logo-256.png"}}}
        page("ko", path, a["title"], a["description"], body, active="history", translated=False,
             head_extra=ld_json(ld) + crumbs_ld, og_image="/assets/og-history.png")
        urls.append(url("ko", path))
    return urls


def build_timeline():
    """The History Timeline game and its list of events, in both languages, as site pages (see timeline_build.py)."""
    tl = timeline_build.Timeline(ROOT, {a["slug"] for a in HISTORY})
    if tl.missing:
        print(f"timeline: {len(tl.missing)} events skipped (article not published): {', '.join(tl.missing)}")
    era_of_year = lambda y: next(era for era in ERAS if y <= era[3])  # noqa: E731
    urls = []
    for lang in LANGS:
        game, events = url(lang, "play/history-timeline/"), url(lang, "play/history-timeline/events/")
        name = tl.text(lang, "title")
        ld = {"@context": "https://schema.org", "@type": "WebApplication", "name": name,
              "url": STUDIO["domain"] + game, "description": tl.text(lang, "description"),
              "applicationCategory": "GameApplication", "operatingSystem": "Any", "inLanguage": lang,
              "isAccessibleForFree": True, "offers": {"@type": "Offer", "price": "0", "priceCurrency": "USD"},
              "publisher": {"@type": "Organization", "name": STUDIO["name"], "url": STUDIO["domain"] + "/"}}
        more = (f'<section class="section container tl-wrap"><div class="section-head"><h2>{e(UI[lang]["play_more"])}</h2>'
                f'<a href="{url(lang, "play/")}">{e(UI[lang]["play_all"])} →</a></div>'
                f'<div class="games">{web_game_cards(lang, exclude="history-timeline", details=False)}</div></section>')
        page(lang, "play/history-timeline/", name, tl.text(lang, "description"),
             tl.game_body(lang, url(lang, "play/"), events) + more, active="play",
             head_extra=tl.head_css + tl.head_js + ld_json(ld)
             + breadcrumbs(lang, [(UI[lang]["play_title"], url(lang, "play/")), (name, None)])[1],
             og_image="/play/history-timeline/og-image.png")
        page(lang, "play/history-timeline/events/", tl.text(lang, "list_h1") + " – " + name, tl.text(lang, "list_desc"),
             tl.list_body(lang, url(lang, "play/"), game, ERAS, era_of_year, url("ko", "history/")),
             active="play", og_image="/play/history-timeline/og-image.png",
             head_extra=tl.head_css + breadcrumbs(lang, [(UI[lang]["play_title"], url(lang, "play/")), (name, game),
                                                         (tl.text(lang, "list_h1"), None)])[1])
        urls += [game, events]
    return urls


HQ_STAGES = [("Basic vowels", "ㅏ, ㅑ, ㅓ, ㅕ, ㅗ, ㅛ, ㅜ, ㅠ, ㅡ, ㅣ", "korean-vowels", "Korean Vowels"),
             ("Basic consonants", "the 14 basic consonants, from ㄱ to ㅎ", "korean-consonants", "Korean Consonants"),
             ("Tense and aspirated", "ㄲ, ㄸ, ㅃ, ㅆ, ㅉ and ㅋ, ㅌ, ㅍ, ㅊ", "plain-aspirated-tense", "Plain, Aspirated and Tense"),
             ("Compound vowels", "ㅐ, ㅒ, ㅔ, ㅖ, ㅘ, ㅙ, ㅚ, ㅝ, ㅞ, ㅟ, ㅢ", "korean-vowels", "Korean Vowels"),
             ("First syllables", "a consonant and a vowel, like 가, 나, 도 and 휴", "how-hangul-works", "How Hangul Works"),
             ("Final consonants", "syllables with batchim, like 밥, 국, 맛 and 꽃", "batchim", "Batchim"),
             ("Reading words", "한국, 서울, 김치, 학교 and more, in romanization", "two-week-plan", "A Two-Week Plan to Learn Hangul"),
             ("Word meanings", "everyday words like 물, 집, 친구, 하늘", "", "All guides"),
             ("Numbers", "Sino-Korean 일, 이, 삼 and native 하나, 둘, 셋", "korean-numbers", "Korean Numbers"),
             ("Days and seasons", "월요일, 오늘, 내일, 주말, 봄 and more", "days-and-dates", "Days, Weeks and Dates"),
             ("Family", "엄마, 아빠, 형, 오빠, 누나, 언니 and more", "korean-family-terms", "Korean Family Terms"),
             ("Greetings", "안녕하세요, 감사합니다, 괜찮아요 and more", "korean-greetings", "Everyday Korean Greetings")]


def build_hangul_quiz():
    """The Hangul Quiz browser game: one English page (like the guides), with the script and styles from _src/hangul_quiz/."""
    src, out = os.path.join(ROOT, "_src", "hangul_quiz"), os.path.join(ROOT, "play", "hangul-quiz")
    os.makedirs(out, exist_ok=True)
    ver = {}
    for f in ("app.js", "quiz.css"):
        text = open(os.path.join(src, f), encoding="utf-8").read()
        with open(os.path.join(out, f), "w", encoding="utf-8", newline="\n") as fh:
            fh.write(text)
        ver[f] = hashlib.sha1(text.encode("utf-8")).hexdigest()[:10]
    t = UI["en"]
    stages = "".join(
        f'<li><strong>{e(name)}</strong>: {e(what)}. Review: <a href="/learn/{slug + "/" if slug else ""}">{e(guide)}</a></li>'
        for name, what, slug, guide in HQ_STAGES)
    more = (f'<section class="section container hq-wrap"><div class="section-head"><h2>{e(t["play_more"])}</h2>'
            f'<a href="/play/">{e(t["play_all"])} →</a></div>'
            f'<div class="games">{web_game_cards("en", exclude="hangul-quiz", details=False)}</div></section>')
    body = f"""<div class="hq">
<section class="container hq-wrap">
  <nav class="crumbs" aria-label="Breadcrumb"><a href="/play/">{e(t['play_title'])}</a><span aria-hidden="true">›</span><span>Hangul Quiz</span></nav>
  <h1 class="page-title">Hangul Quiz</h1>
  <p class="page-lead">Learn to read Korean, from single letters to whole words and everyday vocabulary, in twelve short stages.</p>
  <div id="hq-app" class="hq-app"><div class="card"><noscript><p>This quiz needs JavaScript. You can still learn the letters with our <a href="/learn/">Learn Hangul guides</a>.</p></noscript></div></div>
  <div id="hq-static" class="hq-static">
    <div class="card"><h2>How to play</h2><ol>
      <li>Each stage has 8 questions with four choices. Read the Korean and pick its sound (or, in the last stage, its meaning), or see a sound in romanization and pick the letter.</li>
      <li>Get at least 5 right to clear a stage and open the next one. All 8 right earns 3 stars.</li>
      <li>Tap the speaker to hear the sound. Letters are read inside a syllable, so ㄱ is heard as 가 and ㅓ as 어.</li>
      <li>After every answer, a short note explains the sound. On a computer, use the keys 1 to 4 and Enter.</li></ol></div>
    <div class="card"><h2>The twelve stages</h2><ol>{stages}</ol></div>
    <section class="card"><h2>About Hangul Quiz</h2>
      <p>Hangul Quiz is a free browser game for people learning to read Korean. It follows the same path as our Learn Hangul guides: the basic vowels and consonants first, then the tense and aspirated consonants and the compound vowels, then whole syllables, final consonants and real words.</p>
      <p>Answers use the Revised Romanization of Korean, the system you see on Korean road signs, so 김치 is written gimchi. Romanization only approximates Korean sounds; use the listen button to hear them, and the guides to learn how each sound is made.</p>
      <p>Your stars are saved in this browser only. Nothing is sent to us.</p></section>
  </div>
</section>
<div id="live" aria-live="polite" aria-atomic="true" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)"></div>
</div>
{more}"""
    ld = {"@context": "https://schema.org", "@type": "WebApplication", "name": "Hangul Quiz",
          "url": f"{STUDIO['domain']}/play/hangul-quiz/", "applicationCategory": "EducationalApplication",
          "description": "A free browser quiz for learning to read Korean, from single Hangul letters to whole words and everyday vocabulary, in twelve stages.",
          "operatingSystem": "Any", "inLanguage": "en", "isAccessibleForFree": True,
          "offers": {"@type": "Offer", "price": "0", "priceCurrency": "USD"},
          "publisher": {"@type": "Organization", "name": STUDIO["name"], "url": STUDIO["domain"] + "/"}}
    head = (f'<link rel="stylesheet" href="/play/hangul-quiz/quiz.css?v={ver["quiz.css"]}">'
            f'<script src="/play/hangul-quiz/app.js?v={ver["app.js"]}" defer></script>' + ld_json(ld)
            + breadcrumbs("en", [(t["play_title"], "/play/"), ("Hangul Quiz", None)])[1])
    page("en", "play/hangul-quiz/", "Hangul Quiz",
         "Play Hangul Quiz free in your browser: learn to read Korean in twelve stages, from the vowels and consonants "
         "to syllables with final consonants and real words, with a short note after every answer.",
         body, active="play", translated=False, head_extra=head, og_image="/play/hangul-quiz/og-image.png")
    return ["/play/hangul-quiz/"]


UD_TEXT = {
    "en": {
        "title": "Updraft: Paper Plane",
        "lead": "Aim, power up and launch your paper plane. Ride the updrafts and see how far it flies.",
        "description": "Play Updraft free in your browser: set the angle, stop the power gauge and launch a paper plane through "
                       "the park, the city, the sea, the mountains and above the clouds. Ride updrafts, dodge obstacles and buy "
                       "six upgrades.",
        "noscript": "This game needs JavaScript.",
        "how": "How to play",
        "how_steps": ["The angle line swings up and down. Tap (or press Space) to set your launch angle.",
                      "The power gauge fills and empties. Tap again to stop it: a fuller gauge throws harder.",
                      "Once the plane leaves your hand, there's no steering: the camera follows it from behind. Light columns with arrows "
                      "pointing up are updrafts that lift your plane; dark ones pointing down are downdrafts that push it down.",
                      "Collect coins and earn more for every 10 m you fly, then spend them on upgrades and fly again."],
        "zones": "Five zones",
        "zones_list": ["Park (from 0 m): low trees.", "City (from 300 m): tall buildings.",
                       "Sea (from 750 m): ship masts, and nowhere to land but the water.",
                       "Mountains (from 1,250 m): rising ground and rocky peaks.",
                       "Above the Clouds (from 1,900 m): storm clouds and strong updrafts over the cloud sea."],
        "tips": "Tips",
        "tips_list": ["A medium angle (about 25 to 35 degrees) with a full gauge is a good start; on a tailwind day, a lower angle can go farther.",
                      "Wide wings and Light paper keep you in the air longer, so they help every flight.",
                      "Sturdy fold lets you bounce off a tree or building instead of crashing, which matters most in the city.",
                      "The sky is the same for everyone on the same day, and changes at midnight: today's wind and today's goal are shown under the button."],
        "about": "About this version",
        "about_body": ["This is a browser version of our Android game Updraft: Paper Plane Launch, seen from behind the plane like the app, "
                       "with the same idea: one throw, no steering, and the air decides the rest. Your coins, upgrades and best distance are saved in this "
                       "browser only.",
                       "The app has more: daily rewards and missions, pre-launch skills and its own five-zone world."],
        "app_link": "About the Android app",
    },
    "ko": {
        "title": "Updraft: 종이비행기",
        "lead": "각도를 정하고, 힘을 모아 종이비행기를 날리세요. 상승기류를 타고 얼마나 멀리 갈까요?",
        "description": "브라우저에서 무료로 즐기는 Updraft: 각도를 정하고 힘 게이지를 멈춰 종이비행기를 날려 보세요. 공원, 도시, "
                       "바다, 산, 구름 위를 지나며 상승기류를 타고 장애물을 피하고, 업그레이드 6종으로 더 멀리 날 수 있어요.",
        "noscript": "이 게임은 자바스크립트가 필요해요.",
        "how": "하는 방법",
        "how_steps": ["각도 선이 위아래로 움직여요. 화면을 누르거나 스페이스 키를 눌러 발사 각도를 정하세요.",
                      "힘 게이지가 차올랐다 줄어들어요. 한 번 더 눌러 멈추세요. 게이지가 많이 찰수록 세게 던져요.",
                      "비행기가 손을 떠나면 조종할 수 없고, 카메라가 비행기 뒤를 따라가요. 위쪽 화살표가 있는 밝은 기둥은 비행기를 띄워 주는 상승기류, 아래쪽 화살표가 있는 어두운 기둥은 끌어내리는 하강기류예요.",
                      "코인을 모으고 10m마다 코인을 더 받아요. 코인으로 업그레이드하고 다시 날려 보세요."],
        "zones": "다섯 구역",
        "zones_list": ["공원(0m부터): 낮은 나무", "도시(300m부터): 높은 건물",
                       "바다(750m부터): 배 돛대, 내려앉을 곳은 바다뿐", "산(1,250m부터): 높아지는 땅과 바위 봉우리",
                       "구름 위(1,900m부터): 구름 바다 위의 먹구름과 강한 상승기류"],
        "tips": "요령",
        "tips_list": ["중간 각도(25~35도)에 게이지를 가득 채우는 것부터 시작해 보세요. 뒷바람이 부는 날에는 낮은 각도가 더 멀리 가기도 해요.",
                      "넓은 날개와 가벼운 종이는 오래 떠 있게 해 줘서 어떤 비행에도 도움이 돼요.",
                      "튼튼한 접기가 있으면 나무나 건물에 부딪혀도 튕겨 나와 계속 날 수 있어요. 도시 구역에서 특히 쓸모 있어요.",
                      "하늘은 같은 날이면 모두에게 같고, 자정에 바뀌어요. 오늘의 바람과 목표는 버튼 아래에 나와요."],
        "about": "이 버전에 대해",
        "about_body": ["Android 게임 Updraft: Paper Plane Launch를 앱처럼 비행기 뒤에서 보는 시점으로 옮긴 브라우저 버전이에요. 한 번 던지면 조종할 수 없고 바람이 나머지를 "
                       "결정한다는 규칙은 같아요. 코인, 업그레이드, 최고 기록은 이 브라우저에만 저장돼요.",
                       "앱에는 매일 출석 보상과 일일 미션, 발사 전 스킬, 앱만의 다섯 구역 월드가 더 있어요."],
        "app_link": "Android 앱 소개 보기",
    },
}


for _u in UD_TEXT.values():
    _u["app"] = "updraft"
    _u["sections"] = [(_u["how"], _u["how_steps"], "ol"), (_u["zones"], _u["zones_list"], "ul"), (_u["tips"], _u["tips_list"], "ul")]

HR_TEXT = {
    "en": {
        "title": "Hilltop Roll",
        "app": "hilltop-roll",
        "lead": "Roll down an endless road in the sky. Hold to roll heavy, let go to fly off the hilltops, and steer through zigzags, tilted roads and forks.",
        "description": "Play Hilltop Roll free in your browser: a ball rolls down an endless floating road, seen from behind. Hold to "
                       "roll heavy down the hills, let go to fly off the tops, steer through zigzag roads, tilted roads and forks, "
                       "and land along the slope for PERFECT boosts and combos.",
        "noscript": "This game needs JavaScript.",
        "sections": [
            ("How to play", ["Press Start. The camera follows the ball from behind as it rolls down the road.",
                             "Hold the screen, the button or the Space key: the ball turns heavy and races down the hills. "
                             "Let go as you reach a hilltop: it turns light and flies off the top.",
                             "Steer to stay on the road: drag sideways while you hold the screen, or use the arrow keys (or A and D).",
                             "The road zigzags, tilts to one side and splits around holes. Follow its turns, lean against the tilt and pick a lane at each fork.",
                             "Before each gap there's a ramp with a red lip. Build speed on the way to it and fly across. "
                             "Land along the slope, not flat against it, for a PERFECT boost.",
                             "The road speeds up every few seconds. Roll off the edge or fall into a gap and the run is over."], "ol"),
            ("Tips", ["Hold on the way down, let go on the way up: that rhythm is the whole game.",
                      "Short, small moves steer best. On a tilted road the ball slides toward the low side, so keep steering against it.",
                      "In the air, holding makes you drop faster. Use it to meet a downhill slope at the right angle.",
                      "A PERFECT landing adds speed, and a longer combo adds more. A bumpy landing costs speed.",
                      "Sound effects are short tones; switch them off with the Sound button under the game."], "ul"),
        ],
        "about": "About this version",
        "about_body": ["This is a browser take on our Android game Hilltop Roll, seen from behind the ball like the app: heavy-and-light "
                       "rolling, jumps over the gaps, PERFECT landings and steering through zigzags, tilted roads and forks. "
                       "Your best distance is saved in this browser only.",
                       "The Android app is the full game, with music and its own worlds."],
        "app_link": "About the Android app",
    },
    "ko": {
        "title": "Hilltop Roll",
        "app": "hilltop-roll",
        "lead": "하늘 위 끝없는 길을 굴러가요. 누르면 무겁게 내려가고, 떼면 언덕 꼭대기에서 날아올라요. 지그재그 길, 기울어진 길, 갈림길을 조종해 나가세요.",
        "description": "브라우저에서 무료로 즐기는 Hilltop Roll: 공 뒤에서 따라가는 시점으로 하늘 위 끝없는 길을 굴러가요. 누르면 무거워져 "
                       "언덕을 빠르게 내려가고, 떼면 꼭대기에서 날아올라요. 지그재그 길, 기울어진 길, 갈림길을 조종하고 경사를 따라 착지해 "
                       "PERFECT 가속과 콤보를 쌓아 보세요.",
        "noscript": "이 게임은 자바스크립트가 필요해요.",
        "sections": [
            ("하는 방법", ["시작하기를 누르세요. 카메라가 공 뒤를 따라가며 길을 보여 줘요.",
                       "화면이나 버튼, 스페이스 키를 누르고 있으면 공이 무거워져 언덕을 빠르게 내려가요. 언덕 꼭대기에 가까워지면 손을 떼세요. "
                       "공이 가벼워져 꼭대기에서 날아올라요.",
                       "길 위에 남도록 조종하세요. 화면을 누른 채로 옆으로 드래그하거나 방향키(또는 A, D)를 쓰면 돼요.",
                       "길은 지그재그로 휘고, 한쪽으로 기울고, 구멍을 사이에 두고 갈라져요. 길을 따라가고, 기울어진 반대쪽으로 버티고, "
                       "갈림길에서는 한쪽 길을 고르세요.",
                       "낭떠러지 앞에는 끝이 빨간 점프대가 있어요. 내려가면서 속도를 모아 건너가세요. 경사를 따라 착지하면 PERFECT 가속을 받아요.",
                       "몇 초마다 길이 빨라져요. 길 밖으로 굴러떨어지거나 낭떠러지에 빠지면 게임이 끝나요."], "ol"),
            ("요령", ["내리막에서는 누르고, 오르막에서는 떼세요. 이 리듬이 핵심이에요.",
                     "짧고 작게 움직여야 잘 조종돼요. 기울어진 길에서는 공이 낮은 쪽으로 미끄러지니 반대쪽으로 계속 버티세요.",
                     "공중에서 누르면 더 빨리 떨어져요. 내리막 경사에 맞춰 착지할 때 써 보세요.",
                     "PERFECT 착지는 속도를 올려 주고, 콤보가 길수록 더 빨라져요. 덜컹 착지하면 속도가 줄어요.",
                     "효과음은 짧은 소리예요. 게임 아래 소리 버튼으로 끌 수 있어요."], "ul"),
        ],
        "about": "이 버전에 대해",
        "about_body": ["Android 게임 Hilltop Roll을 앱처럼 공 뒤에서 보는 시점으로 옮긴 브라우저 버전이에요. 무겁게·가볍게 굴리기, "
                       "낭떠러지 점프, PERFECT 착지, 지그재그 길·기울어진 길·갈림길 조종을 즐길 수 있어요. 최고 기록은 이 브라우저에만 저장돼요.",
                       "Android 앱은 음악과 앱만의 월드가 있는 완전한 게임이에요."],
        "app_link": "Android 앱 소개 보기",
    },
}


PS_TEXT = {
    "en": {
        "title": "Pass or Splash",
        "app": "pass-or-splash",
        "lead": "A wall full of holes is rushing toward you. Read the puzzle and slide in front of the right answer. Wrong hole? Splash!",
        "description": "Play Pass or Splash free in your browser: solve sums, find the biggest number, match shapes, count dots and "
                       "follow the shuffling cups, then slide your buddy in front of the right hole before the wall arrives. "
                       "30 stages in five worlds, each with its own silly splash.",
        "noscript": "This game needs JavaScript.",
        "sections": [
            ("How to play", ["Pick a stage. A wall with three or four holes starts far away and comes closer.",
                             "Read the puzzle at the top: each hole shows a possible answer.",
                             "Drag your buddy, tap a hole, or use the ← → keys (or 1 to 4) to stand in front of the right hole.",
                             "When the wall arrives, the right hole lets you pass. The wrong one pushes you in: splash!",
                             "Each stage has 6 walls and 3 tries. Pass with no mistakes for 3 stars; clearing a stage opens the next one."], "ol"),
            ("Five worlds", ["Pool: adding, taking away and counting dots.",
                             "Mud: bigger sums, and the biggest or smallest number.",
                             "Cream: times tables, matching shapes and three-digit numbers.",
                             "Ball pit: order of operations (multiply first!), shapes and counting.",
                             "Springs: follow the star as the cups shuffle, plus everything you've learned."], "ul"),
            ("Tips", ["Move early: the wall gets faster in later stages and worlds.",
                      "In order-of-operations walls, one hole always shows the answer you'd get by adding first. Don't fall for it.",
                      "For the cups, watch the cup with the star, not the star itself: it's hidden once the shuffling starts."], "ul"),
        ],
        "about": "About this version",
        "about_body": ["This is a browser take on our Android game Pass or Splash: the same rushing walls, puzzles and splashes, in 30 stages. "
                       "Your stars are saved in this browser only.",
                       "The Android app has 100 stages, more puzzle types and its own silly penalties in each world."],
        "app_link": "About the Android app",
    },
    "ko": {
        "title": "Pass or Splash",
        "app": "pass-or-splash",
        "lead": "구멍 뚫린 벽이 다가와요. 문제를 읽고 정답 구멍 앞으로 이동하세요. 틀리면 풍덩!",
        "description": "브라우저에서 무료로 즐기는 Pass or Splash: 계산하고, 가장 큰 수를 찾고, 같은 도형을 고르고, 점을 세고, "
                       "섞이는 컵을 따라간 뒤 벽이 닥치기 전에 정답 구멍 앞으로 이동하세요. 5개 월드, 30개 스테이지.",
        "noscript": "이 게임은 자바스크립트가 필요해요.",
        "sections": [
            ("하는 방법", ["스테이지를 고르세요. 구멍이 3~4개 뚫린 벽이 멀리서 다가와요.",
                       "위쪽 문제를 읽으세요. 구멍마다 답이 하나씩 적혀 있어요.",
                       "캐릭터를 드래그하거나 구멍을 누르거나 ← → 키(또는 1~4)로 정답 구멍 앞에 서세요.",
                       "벽이 도착했을 때 정답 구멍이면 통과, 틀린 구멍이면 벽에 밀려 풍덩!",
                       "스테이지마다 벽 6개, 기회 3번이에요. 실수 없이 통과하면 별 3개, 클리어하면 다음 스테이지가 열려요."], "ol"),
            ("다섯 월드", ["수영장: 덧셈, 뺄셈, 점 세기",
                        "진흙탕: 더 큰 수의 계산, 가장 큰 수·작은 수",
                        "크림: 곱셈, 같은 도형 찾기, 세 자리 수",
                        "볼풀: 혼합 계산(곱셈 먼저!), 도형, 점 세기",
                        "스프링: 섞이는 컵 따라가기와 지금까지 배운 모든 문제"], "ul"),
            ("요령", ["일찍 움직이세요. 뒤 스테이지와 월드일수록 벽이 빨라져요.",
                     "혼합 계산 벽에는 덧셈을 먼저 한 오답이 꼭 하나 있어요. 속지 마세요.",
                     "컵 문제는 별이 아니라 별이 든 컵을 눈으로 쫓으세요. 섞이기 시작하면 별이 숨어요."], "ul"),
        ],
        "about": "이 버전에 대해",
        "about_body": ["Android 게임 Pass or Splash를 브라우저로 옮긴 버전이에요. 다가오는 벽, 문제, 풍덩 벌칙은 같고 스테이지는 30개예요. "
                       "별 기록은 이 브라우저에만 저장돼요.",
                       "Android 앱에는 100개 스테이지와 더 많은 문제 유형, 월드마다 다른 웃긴 벌칙이 있어요."],
        "app_link": "Android 앱 소개 보기",
    },
}


def canvas_game(slug, src_name, files, text, p):
    """A canvas browser game as a site page in each language: copies its script and styles from _src/<src_name>/ to
    play/<slug>/ and wraps them in the site template. p is the CSS prefix of its elements (ud, hr)."""
    src, out = os.path.join(ROOT, "_src", src_name), os.path.join(ROOT, "play", slug)
    os.makedirs(out, exist_ok=True)
    ver = {}
    for f in files:
        content = open(os.path.join(src, f), encoding="utf-8").read()
        with open(os.path.join(out, f), "w", encoding="utf-8", newline="\n") as fh:
            fh.write(content)
        ver[f] = hashlib.sha1(content.encode("utf-8")).hexdigest()[:10]
    css = next(f for f in files if f.endswith(".css"))
    urls = []
    for lang in LANGS:
        t, u = UI[lang], text[lang]
        game_url = url(lang, f"play/{slug}/")
        li = lambda items: "".join(f"<li>{e(x)}</li>" for x in items)  # noqa: E731
        more = (f'<section class="section container {p}-wrap"><div class="section-head"><h2>{e(t["play_more"])}</h2>'
                f'<a href="{url(lang, "play/")}">{e(t["play_all"])} →</a></div>'
                f'<div class="games">{web_game_cards(lang, exclude=slug, details=False)}</div></section>')
        sections = "".join(f'<div class="card"><h2>{e(h)}</h2><{tag}>{li(items)}</{tag}></div>' for h, items, tag in u["sections"])
        body = f"""<div class="{p}">
<section class="container {p}-wrap">
  <nav class="crumbs" aria-label="Breadcrumb"><a href="{url(lang, 'play/')}">{e(t['play_title'])}</a><span aria-hidden="true">›</span><span>{e(u['title'])}</span></nav>
  <h1 class="page-title">{e(u['title'])}</h1>
  <p class="page-lead">{e(u['lead'])}</p>
  <div id="{p}-app" class="{p}-app"><div class="card"><noscript><p>{e(u['noscript'])}</p></noscript></div></div>
  <div class="{p}-static" id="{p}-static">
    {sections}
    <section class="card"><h2>{e(u['about'])}</h2>{''.join(f'<p>{e(x)}</p>' for x in u['about_body'])}
      <p><a href="{url(lang, 'games/' + u['app'] + '/')}">{e(u['app_link'])} →</a></p></section>
  </div>
</section>
<div id="live" aria-live="polite" aria-atomic="true" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)"></div>
</div>
{more}"""
        ld = {"@context": "https://schema.org", "@type": "WebApplication", "name": u["title"], "url": STUDIO["domain"] + game_url,
              "description": u["description"], "applicationCategory": "GameApplication", "operatingSystem": "Any",
              "inLanguage": lang, "isAccessibleForFree": True,
              "offers": {"@type": "Offer", "price": "0", "priceCurrency": "USD"},
              "publisher": {"@type": "Organization", "name": STUDIO["name"], "url": STUDIO["domain"] + "/"}}
        head = (f'<link rel="stylesheet" href="/play/{slug}/{css}?v={ver[css]}">'
                f'<script src="/play/{slug}/app.js?v={ver["app.js"]}" defer></script>' + ld_json(ld)
                + breadcrumbs(lang, [(t["play_title"], url(lang, "play/")), (u["title"], None)])[1])
        page(lang, f"play/{slug}/", u["title"], u["description"], body, active="play", head_extra=head)
        urls.append(game_url)
    return urls


def build_updraft():
    """The Updraft browser game (see canvas_game)."""
    return canvas_game("updraft", "updraft", ("app.js", "updraft.css"), UD_TEXT, "ud")


def build_pass_or_splash():
    """The Pass or Splash browser game (see canvas_game)."""
    return canvas_game("pass-or-splash", "pass-or-splash", ("app.js", "ps.css"), PS_TEXT, "ps")


def build_hilltop():
    """The Hilltop Roll browser game (see canvas_game)."""
    return canvas_game("hilltop-roll", "hilltop", ("app.js", "hilltop.css"), HR_TEXT, "hr")


def build_404():
    t = UI["en"]
    body = f"""<section class="container" style="text-align:center"><h1 class="page-title">{e(t['not_found_title'])}</h1>
<p class="page-lead">{e(t['not_found_text'])} / {e(UI['ko']['not_found_text'])}</p>
<p style="margin-top:22px"><a class="btn light" href="/">{e(t['back_home'])}</a> <a class="btn light" href="/ko/">{e(UI['ko']['back_home'])}</a></p></section>
<section class="section container"><div class="section-head"><h2>{e(t['not_found_try'])} · {e(UI['ko']['not_found_try'])}</h2></div>
<div class="guide-list">
  <a class="card guide-card" href="/play/"><span class="title">{e(t['play_title'])}</span><span class="desc">{e(t['not_found_play'])}</span></a>
  <a class="card guide-card" href="/learn/"><span class="title">{e(t['nav_learn'])}</span><span class="desc">{e(t['not_found_learn'])}</span></a>
  <a class="card guide-card" href="/ko/history/" lang="ko"><span class="title">{e(UI['ko']['history_title'])}</span><span class="desc">{e(UI['ko']['not_found_history'])}</span></a>
  <a class="card guide-card" href="/ko/play/" lang="ko"><span class="title">{e(UI['ko']['play_title'])}</span><span class="desc">{e(UI['ko']['not_found_play'])}</span></a>
</div></section>"""
    page("en", "404.html", t["not_found_title"], t["not_found_text"], body, translated=False)


POLICY_START, POLICY_END = "<!-- policy:start -->", "<!-- policy:end -->"


def build_privacy(lang):
    """The policy text between the policy markers is edited by hand (privacy.html for English,
    ko/privacy/index.html for Korean); everything around it (header, footer, game list) is regenerated."""
    t = UI[lang]
    out_path = "privacy.html" if lang == "en" else "privacy/"
    path = os.path.join(ROOT, privacy_url(lang).lstrip("/") + ("index.html" if lang != "en" else ""))
    m = re.search(re.escape(POLICY_START) + r"(.*?)" + re.escape(POLICY_END),
                  open(path, encoding="utf-8").read(), re.S)
    if not m:
        sys.exit(f"{path} has no {POLICY_START} ... {POLICY_END} section")
    cards = "\n".join(game_card(lang, g) for g in GAMES)
    body = f"""<section class="container"><h1 class="page-title">{e(t['privacy'])}</h1></section>
<section class="section container"><div class="card policy">{POLICY_START}{m.group(1)}{POLICY_END}</div></section>
<section class="section container">
  <div class="section-head"><h2>{e(t['games_title'])}</h2><p>{e(t['games_lead'])}</p></div>
  <div class="games">
{cards}
  </div>
</section>"""
    page(lang, out_path, t["privacy"], t["privacy_desc"], body, translated=False, show_updated=False)


def build_go(g):
    """/go/<slug>/ forwards a scanned QR code to Google Play, tagged utm_medium=qr. Not in the sitemap."""
    target = play_url(g, "qr")
    doc = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex">
<title>{e(g['en']['name'])} – Google Play</title>
<meta http-equiv="refresh" content="0; url={e(target)}">
<link rel="canonical" href="{STUDIO['domain']}{url('en', f"games/{g['slug']}/")}">
</head>
<body>
<p><a href="{e(target)}">{e(g['en']['name'])} on Google Play</a></p>
<script>location.replace({json.dumps(target)})</script>
</body>
</html>
"""
    out = os.path.join(ROOT, "go", g["slug"], "index.html")
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, "w", encoding="utf-8", newline="\n") as f:
        f.write(doc)


LASTMOD_FILE = os.path.join(os.path.dirname(__file__), "lastmod.json")


def page_fingerprint(u):
    """A hash of a built page, ignoring what changes on every page at once (the stylesheet version and the
    footer's site-wide "Last updated" date), so only real content changes give a page a new lastmod."""
    path = os.path.join(ROOT, u.lstrip("/"))
    if u.endswith("/"):
        path = os.path.join(path, "index.html")
    text = open(path, encoding="utf-8").read()
    text = re.sub(r"site\.css\?v=[0-9a-f]+", "site.css", text)
    text = re.sub(r'<p class="updated">[^<]*<time datetime="[^"]*">[^<]*</time></p>', "", text)
    return hashlib.sha1(text.encode("utf-8")).hexdigest()


def build_sitemap(urls):
    """Each URL gets a lastmod: the build date when its page content changed, otherwise the date already
    recorded in _src/lastmod.json (commit that file along with the site)."""
    old = json.load(open(LASTMOD_FILE, encoding="utf-8")) if os.path.exists(LASTMOD_FILE) else {}
    today = TODAY
    record = {}
    for u in urls:
        fp = page_fingerprint(u)
        prev = old.get(u)
        record[u] = prev if prev and prev["hash"] == fp else {"hash": fp, "date": today}
    with open(LASTMOD_FILE, "w", encoding="utf-8", newline="\n") as f:
        json.dump(record, f, indent=1, sort_keys=True)
        f.write("\n")
    entries = "".join(f"<url><loc>{STUDIO['domain']}{u}</loc><lastmod>{record[u]['date']}</lastmod></url>" for u in urls)
    with open(os.path.join(ROOT, "sitemap.xml"), "w", encoding="utf-8", newline="\n") as f:
        f.write(f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">{entries}</urlset>\n')
    with open(os.path.join(ROOT, "robots.txt"), "w", encoding="utf-8", newline="\n") as f:
        f.write(f"User-agent: *\nAllow: /\nSitemap: {STUDIO['domain']}/sitemap.xml\n")


def main():
    urls = []
    for lang in LANGS:
        build_home(lang)
        urls.append(url(lang))
        for g in GAMES:
            build_game(lang, g)
            urls.append(url(lang, f"games/{g['slug']}/"))
        for fn, path in [(build_play, "play/"), (build_news, "news/"), (build_about, "about/"), (build_support, "support/"),
                         (build_terms, "terms/")]:
            extra = fn(lang)
            urls.append(url(lang, path))
            if isinstance(extra, list):
                urls += extra
    urls += [g["web"] for g in GAMES if g.get("web", "").startswith("/play/")]
    urls += build_timeline()
    urls += build_hangul_quiz()
    urls += build_updraft()
    urls += build_hilltop()
    urls += build_pass_or_splash()
    for g in WEB_GAMES:
        if not g.get("site_page"):  # games with their own pages; site-page games are added by their builder
            urls += [f"/play/{g['slug']}/"] + [f"/play/{g['slug']}/{p}" for p in g.get("pages", [])]
            if g.get("ko_page"):  # Korean copies written by _src/webgames/build.mjs
                urls += [f"/ko/play/{g['slug']}/"] + [f"/ko/play/{g['slug']}/{p}" for p in g.get("pages", [])]
    build_learn()
    urls += build_history()
    urls += ["/learn/"] + [f"/learn/{a['slug']}/" for a in ARTICLES]
    build_404()
    for lang in LANGS:
        build_privacy(lang)
    for g in GAMES:
        build_go(g)
    urls += [privacy_url(lang) for lang in LANGS]
    build_sitemap(urls)
    print(f"built {len(urls) - 1} pages + 404, sitemap, robots")


main()
