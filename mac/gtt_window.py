# -*- coding: utf-8 -*-
"""Приложение для Mac: веб-сборка (папка web рядом) в окне pywebview + встроенный сервер на 127.0.0.1.

Запускается из «Программ» (см. mac/install_mac.command); настройки окна — app.conf рядом.
* Порт постоянный: данные приложения (localStorage, IndexedDB) привязаны к адресу и сохраняются
  между запусками. Порт занят этим же приложением — окно подключается к нему.
* Пути, которых нет среди файлов (/org, /join?code=…), отдают index.html — дальше маршрут
  разбирает роутер Expo.
* Окно — pywebview (движок Safari). Если Safari старше 15 (macOS 11–12 без обновлений), а на Mac есть Chrome,
  Яндекс Браузер, Edge или Chromium, — окно этого браузера в режиме приложения со своим профилем данных
  (FORCE_BROWSER=1 в app.conf — всегда так). Без pywebview — браузер по умолчанию.
"""
from __future__ import annotations

import functools
import http.server
import os
import plistlib
import subprocess
import sys
import threading
import time
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
WEB = os.path.join(HERE, "web")


def load_conf(path: str) -> dict:
    conf = {}
    with open(path, encoding="utf-8") as fh:
        for line in fh:
            line = line.split("#", 1)[0].strip()
            if "=" in line:
                k, v = line.split("=", 1)
                conf[k.strip()] = v.strip().strip('"')
    return conf


class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map,
                      ".js": "text/javascript", ".mjs": "text/javascript",       # pdf.js — модули
                      ".wasm": "application/wasm", ".json": "application/json"}

    def send_head(self):
        path = self.translate_path(self.path)
        if not os.path.exists(path) or (os.path.isdir(path) and
                                         not os.path.exists(os.path.join(path, "index.html"))):
            self.path = "/index.html"
        return super().send_head()

    def end_headers(self):
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()

    def log_message(self, *args):
        pass


def ours(url: str) -> bool:
    try:
        return b"<html" in urllib.request.urlopen(url + "/index.html", timeout=2).read(4096).lower()
    except Exception:
        return False


def serve(port: int) -> str:
    handler = functools.partial(Handler, directory=WEB)
    for p in (port, 0):
        try:
            srv = http.server.ThreadingHTTPServer(("127.0.0.1", p), handler)
        except OSError:
            if p and ours(f"http://127.0.0.1:{p}"):          # уже открыто — тот же адрес и те же данные
                return f"http://127.0.0.1:{p}"
            continue
        threading.Thread(target=srv.serve_forever, daemon=True).start()
        return f"http://127.0.0.1:{srv.server_address[1]}"
    raise SystemExit("Не удалось запустить встроенный сервер")


CHROMIUMS = ("Google Chrome.app/Contents/MacOS/Google Chrome", "Yandex.app/Contents/MacOS/Yandex",
             "Microsoft Edge.app/Contents/MacOS/Microsoft Edge", "Chromium.app/Contents/MacOS/Chromium",
             "Brave Browser.app/Contents/MacOS/Brave Browser")


def safari_major() -> int:
    try:
        with open("/Applications/Safari.app/Contents/Info.plist", "rb") as fh:
            return int(plistlib.load(fh)["CFBundleShortVersionString"].split(".")[0])
    except Exception:
        return 0


def chromium() -> str | None:
    for base in ("/Applications", os.path.expanduser("~/Applications")):
        for rel in CHROMIUMS:
            exe = os.path.join(base, rel)
            if os.access(exe, os.X_OK):
                return exe
    return None


def run_in_chromium(exe: str, url: str, conf: dict) -> None:
    """Окно браузера в режиме приложения; ждём, пока его закроют (свой профиль — свой процесс)."""
    profile = os.path.expanduser(f"~/Library/Application Support/GTT-Mac/browser-{conf.get('PORT', '0')}")
    os.makedirs(profile, exist_ok=True)
    subprocess.run([exe, f"--app={url}", f"--user-data-dir={profile}", "--no-first-run", "--no-default-browser-check",
                    f"--window-size={conf.get('WIDTH', 430)},{conf.get('HEIGHT', 900)}"])


def main():
    conf = load_conf(sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "app.conf"))
    base = serve(int(conf.get("PORT", "8731")))
    url = base + conf.get("START", "/")
    safari, exe = safari_major(), chromium()
    print(f"{time.strftime('%Y-%m-%d %H:%M:%S')} {url} Safari {safari or '?'}, Chromium: {exe or 'нет'}", flush=True)
    if exe and (conf.get("FORCE_BROWSER") == "1" or 0 < safari < 15):
        run_in_chromium(exe, url, conf)
        os._exit(0)
    try:
        import webview
    except ImportError:
        import webbrowser
        webbrowser.open(url)
        while True:
            time.sleep(3600)
    try:
        webview.settings["ALLOW_DOWNLOADS"] = True                 # баннеры, страницы тура, Excel
        webview.settings["OPEN_EXTERNAL_LINKS_IN_BROWSER"] = True
    except Exception:
        pass
    window = webview.create_window(
        conf.get("TITLE", conf.get("NAME", "GTT")), url,
        width=int(conf.get("WIDTH", 430)), height=int(conf.get("HEIGHT", 900)),
        min_size=(int(conf.get("MIN_WIDTH", 360)), int(conf.get("MIN_HEIGHT", 640))))
    window.events.closed += lambda: os._exit(0)
    webview.start(private_mode=False)                              # данные сохраняются между запусками
    os._exit(0)


if __name__ == "__main__":
    main()
