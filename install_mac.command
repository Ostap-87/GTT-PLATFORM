#!/bin/bash
# ============================================================
#  Приложения GTT для Mac (macOS 11+, Intel или Apple Silicon): окно приложения с иконкой
#  в «Программах» и на рабочем столе. Веб-сборку делает GitHub Actions («Сборка для Mac») и кладёт
#  в ветку mac-dist вместе с этим установщиком — Node.js на Mac не нужен. Скачивание — через
#  codeload.github.com (как «Download ZIP»): raw.githubusercontent.com в части сетей России закрыт.
#  Установка и обновление — одна команда в Терминале:
#    D=$(mktemp -d) && curl -fL https://codeload.github.com/Ostap-87/GTT-APP/tar.gz/refs/heads/mac-dist | tar -xzf - -C "$D" --strip-components=1 && bash "$D/install_mac.command"
#    (GTT Platform — то же с Ostap-87/GTT-PLATFORM)
#  Данные приложения (демо-поездки, кабинет организатора) при обновлении сохраняются.
# ============================================================
set -e
REPO="${1:-Ostap-87/GTT-APP}"
SUPPORT="$HOME/Library/Application Support/GTT-Mac"
VENV="$SUPPORT/venv"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
echo "=== $REPO: установка на Mac ==="

HERE="$(cd "$(dirname "${BASH_SOURCE[0]:-.}")" && pwd)"
if [ -f "$HERE/app.conf" ] && [ -d "$HERE/web" ]; then
    PACK="$HERE"                                   # установщик запущен из скачанной сборки mac-dist
else
    echo "[1/4] Скачиваю приложение (свежая сборка с GitHub)…"
    curl -fL --retry 5 --connect-timeout 20 --progress-bar -o "$TMP/app.tgz" \
        "https://codeload.github.com/$REPO/tar.gz/refs/heads/mac-dist"
    mkdir -p "$TMP/pack"
    tar -xzf "$TMP/app.tgz" -C "$TMP/pack" --strip-components=1
    PACK="$TMP/pack"
fi
echo "[1/4] Сборка: $PACK"
. "$PACK/app.conf"
[ -n "$NAME" ] || { echo "В архиве нет app.conf — сборка повреждена, повторите позже."; exit 1; }

echo "[2/4] Окно приложения (Python + pywebview)"
PY=""
for c in python3.13 python3.12 python3.11 python3.10 /opt/homebrew/bin/python3 /usr/local/bin/python3 \
         /Library/Frameworks/Python.framework/Versions/Current/bin/python3 python3; do
    if command -v "$c" >/dev/null 2>&1; then
        ok=$("$c" -c 'import sys; print(sys.version_info >= (3, 9))' 2>/dev/null || echo False)
        if [ "$ok" = "True" ]; then PY="$(command -v "$c")"; break; fi
    fi
done
if [ -z "$PY" ]; then
    echo "Нужен Python 3.9 или новее: скачайте «macOS 64-bit universal2 installer» на python.org,"
    echo "установите и выполните эту команду ещё раз."
    open "https://www.python.org/downloads/macos/"
    exit 1
fi
mkdir -p "$SUPPORT"
[ -x "$VENV/bin/python" ] || "$PY" -m venv "$VENV"
if ! "$VENV/bin/python" -c "import webview" 2>/dev/null; then
    # медленный pypi.org (Китай, часть сетей в России) — зеркало
    if [ -z "$PIP_INDEX_URL" ] && ! curl -s -m 8 -o /dev/null https://pypi.org/simple/pip/; then
        for m in https://pypi.tuna.tsinghua.edu.cn/simple https://mirrors.aliyun.com/pypi/simple/; do
            if curl -s -m 8 -o /dev/null "$m/pip/"; then export PIP_INDEX_URL="$m"; break; fi
        done
    fi
    "$VENV/bin/python" -m pip install -q --timeout 60 --retries 10 pywebview \
        || echo "      pywebview не установился — приложение откроется в браузере."
fi

echo "[3/4] Приложение «$NAME» в ~/Applications"
APP="$HOME/Applications/$NAME.app"
pkill -f "$APP/Contents/Resources/gtt_window.py" 2>/dev/null || true     # открыто — закрываем старую версию
# и старое окно этого приложения (Chrome с его профилем): без сервера оно показывает «не удаётся получить доступ к сайту»
PORT_NOW=$(sed -n 's/^PORT=\([0-9]*\).*/\1/p' "$PACK/app.conf" 2>/dev/null | head -1)
[ -n "$PORT_NOW" ] && pkill -f "user-data-dir=$SUPPORT/browser-$PORT_NOW" 2>/dev/null || true
rm -rf "$APP"
mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources" "$HOME/Library/Logs"
cp -R "$PACK/." "$APP/Contents/Resources/"
cat > "$APP/Contents/Info.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>CFBundleName</key><string>$NAME</string>
  <key>CFBundleDisplayName</key><string>$NAME</string>
  <key>CFBundleIdentifier</key><string>$BUNDLE_ID</string>
  <key>CFBundleVersion</key><string>1.0</string>
  <key>CFBundleShortVersionString</key><string>1.0</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>CFBundleExecutable</key><string>launcher</string>
  <key>CFBundleIconFile</key><string>AppIcon</string>
  <key>LSMinimumSystemVersion</key><string>11.0</string>
  <key>NSHighResolutionCapable</key><true/>
</dict></plist>
PLIST
cat > "$APP/Contents/MacOS/launcher" <<LAUNCH
#!/bin/bash
R="\$(cd "\$(dirname "\$0")/../Resources" && pwd)"
P="$VENV/bin/python"
[ -x "\$P" ] || P="$PY"
exec "\$P" "\$R/gtt_window.py" "\$R/app.conf" >> "\$HOME/Library/Logs/$NAME.log" 2>&1
LAUNCH
chmod +x "$APP/Contents/MacOS/launcher"
touch "$APP"
/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister -f "$APP" \
    2>/dev/null || true

echo "[4/4] Значок на рабочем столе"
ln -sfn "$APP" "$HOME/Desktop/$NAME"

echo
echo "ГОТОВО. «$NAME» — значок на рабочем столе и в папке «Программы» (~/Applications)."
echo "Обновить до свежей версии — эта же команда. Журнал: ~/Library/Logs/$NAME.log"
open "$APP"
