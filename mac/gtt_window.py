# -*- coding: utf-8 -*-
"""Приложение для Mac: веб-сборка (папка web рядом) в окне pywebview + встроенный сервер на 127.0.0.1.

Запускается из «Программ» (см. mac/install_mac.command); настройки окна — app.conf рядом.
* Порт постоянный: данные приложения (localStorage, IndexedDB) привязаны к адресу и сохраняются
  между запусками. Порт занят этим же приложением — окно подключается к нему.
* Пути, которых нет среди файлов (/org, /join?code=…), отдают index.html — дальше маршрут
  разбирает роутер Expo.
* Без pywebview — открывается браузер по умолчанию.
"""
import functools
import http.server
import os
import socket
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


def main():
    conf = load_conf(sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "app.conf"))
    base = serve(int(conf.get("PORT", "8731")))
    url = base + conf.get("START", "/")
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
