# Copies the browser versions of our learning games into play/<slug>/ so they run on this domain
# (needed for site analytics and, later, ads). Each game's own repo stays the source of truth.
# Run from the repository root after a web repo changes:  python _src/sync_webapps.py
# Then run python _src/build.py, check, commit and push. The github.io copies keep working
# (the Learn Korean app reads korean_challenge_web/notice.json there).
import io
import json
import os
import shutil
import sys
import tarfile
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DOMAIN = "https://kysystemstudio.com"
OWNER = "cgpark1109"
# (slug on this site, GitHub repo, branch)
WEBAPPS = [
    ("korean-word-quiz", "korean_word_quiz_web", "main"),
    ("learn-korean-hangul", "korean_challenge_web", "master"),
    ("world-history-quiz", "world_history_quiz_web", "main"),
]
SKIP_DIRS = {"tools", "tests"}
SKIP_FILES = {"README.md", ".gitignore", ".nojekyll", "_redirects"}
TEXT_EXT = {".html", ".js", ".mjs", ".json", ".css", ".webmanifest", ".txt", ".svg", ".xml"}
SOURCES = os.path.join(os.path.dirname(__file__), "webapps.json")


def fetch(repo, branch):
    """Returns (commit sha, {relative path: bytes}) for the repo's branch, from GitHub's tarball."""
    url = f"https://codeload.github.com/{OWNER}/{repo}/tar.gz/refs/heads/{branch}"
    with urllib.request.urlopen(url, timeout=60) as r:
        data = r.read()
    files = {}
    with tarfile.open(fileobj=io.BytesIO(data), mode="r:gz") as tar:
        sha = tar.pax_headers.get("comment", "")
        for m in tar.getmembers():
            if not m.isfile():
                continue
            parts = m.name.split("/")[1:]  # drop the "<repo>-<branch>/" prefix
            if not parts or any(p in ("", ".", "..") for p in parts):
                continue
            if parts[0] in SKIP_DIRS or (len(parts) == 1 and parts[0] in SKIP_FILES):
                continue
            files["/".join(parts)] = tar.extractfile(m).read()
    return sha, files


def main():
    sources = {}
    for slug, repo, branch in WEBAPPS:
        sha, files = fetch(repo, branch)
        old_url = f"https://{OWNER}.github.io/{repo}/"
        new_url = f"{DOMAIN}/play/{slug}/"
        dest = os.path.join(ROOT, "play", slug)
        if os.path.isdir(dest):
            shutil.rmtree(dest)
        rewritten = 0
        for rel, data in files.items():
            if os.path.splitext(rel)[1].lower() in TEXT_EXT and old_url.encode() in data:
                data = data.replace(old_url.encode(), new_url.encode())
                rewritten += 1
            out = os.path.join(dest, *rel.split("/"))
            os.makedirs(os.path.dirname(out), exist_ok=True)
            with open(out, "wb") as f:
                f.write(data)
        sources[slug] = {"repo": f"{OWNER}/{repo}", "branch": branch, "commit": sha}
        print(f"{slug}: {len(files)} files from {repo}@{sha[:7]} ({rewritten} with URLs rewritten)")
    with open(SOURCES, "w", encoding="utf-8", newline="\n") as f:
        json.dump(sources, f, indent=2)
        f.write("\n")


if __name__ == "__main__":
    sys.exit(main())
