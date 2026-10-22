/* Приложение на Mac: совместимость со старым движком Safari (macOS 11–13) и понятная ошибка вместо белого
   экрана. Подключается первым скриптом в index.html сборки для Mac (workflow «Сборка для Mac»).
   Сам файл — только ES5: он должен выполниться в любом движке. */
(function () {
  function def(o, k, v) {
    if (o && !o[k]) {
      try { Object.defineProperty(o, k, { value: v, writable: true, configurable: true }); } catch (e) { o[k] = v; }
    }
  }
  var AP = Array.prototype;
  def(AP, 'findLast', function (f, t) {
    for (var i = this.length - 1; i >= 0; i--) if (f.call(t, this[i], i, this)) return this[i];
    return undefined;
  });
  def(AP, 'findLastIndex', function (f, t) {
    for (var i = this.length - 1; i >= 0; i--) if (f.call(t, this[i], i, this)) return i;
    return -1;
  });
  function at(n) {
    n = Math.trunc(n) || 0;
    if (n < 0) n += this.length;
    return n < 0 || n >= this.length ? undefined : this[n];
  }
  def(AP, 'at', at);
  def(String.prototype, 'at', at);
  def(Object, 'hasOwn', function (o, k) { return Object.prototype.hasOwnProperty.call(o, k); });
  def(String.prototype, 'replaceAll', function (a, b) {
    if (a instanceof RegExp) return this.replace(a, b);
    return this.replace(new RegExp(String(a).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), b);
  });
  if (window.crypto && !window.crypto.randomUUID && window.crypto.getRandomValues) {
    window.crypto.randomUUID = function () {
      var b = window.crypto.getRandomValues(new Uint8Array(16)), h = [], i;
      b[6] = (b[6] & 15) | 64; b[8] = (b[8] & 63) | 128;
      for (i = 0; i < 16; i++) h.push((b[i] + 256).toString(16).slice(1));
      return h.slice(0, 4).join('') + '-' + h.slice(4, 6).join('') + '-' + h.slice(6, 8).join('') + '-' +
        h.slice(8, 10).join('') + '-' + h.slice(10).join('');
    };
  }
  if (!window.structuredClone) window.structuredClone = function (v) { return v === undefined ? v : JSON.parse(JSON.stringify(v)); };
  if (!window.requestIdleCallback) {
    window.requestIdleCallback = function (cb) {
      return setTimeout(function () { cb({ didTimeout: false, timeRemaining: function () { return 15; } }); }, 1);
    };
    window.cancelIdleCallback = function (id) { clearTimeout(id); };
  }

  // Ошибки запуска — в журнал приложения (сервер окна, /__log) и на экран, а не белое окно
  var errs = [];
  function report(msg) {
    try {
      var x = new XMLHttpRequest();
      x.open('POST', '/__log', true);
      x.setRequestHeader('Content-Type', 'text/plain;charset=UTF-8');
      x.send(String(msg).slice(0, 4000));
    } catch (e) { /* без сервера окна (сайт) — только экран */ }
  }
  report('старт · ' + navigator.userAgent + ' · ' + location.href);
  window.addEventListener('error', function (e) {
    var t = e.target, m;
    if (t && t !== window && (t.src || t.href)) m = 'Не загрузился файл: ' + (t.src || t.href);
    else m = (e.message || 'Ошибка') + (e.filename ? ' — ' + e.filename.split('/').pop() + ':' + e.lineno + ':' + e.colno : '') +
      (e.error && e.error.stack ? '\n' + String(e.error.stack).slice(0, 600) : '');
    errs.push(m);
    report('ошибка · ' + m);
  }, true);
  window.addEventListener('unhandledrejection', function (e) {
    var r = e.reason, m = 'Promise: ' + (r && (r.stack || r.message || r));
    errs.push(m);
    report('ошибка · ' + m);
  });
  setTimeout(function () {
    var root = document.getElementById('root');
    var n = root ? root.children.length : -1;
    var txt = (document.body.innerText || '').replace(/\s+/g, ' ').slice(0, 120);
    report('через 12 с · элементов в #root: ' + n + ' · текст: ' + txt + ' · ошибок: ' + errs.length);
    if (n > 0 && txt) return;
    var box = document.createElement('div');
    box.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;width:100%;height:100%;box-sizing:border-box;' +
      'padding:32px;font:15px/1.5 -apple-system,Helvetica,Arial,sans-serif;color:#1c2333;background:#f4f6fa;' +
      'overflow:auto;white-space:pre-wrap;z-index:99999';
    box.textContent = 'Приложение не запустилось в этом окне.\n\n' +
      'Пришлите снимок этого окна — по нему видно, что исправить.\n\n' +
      'Ошибки:\n' + (errs.length ? errs.slice(0, 8).join('\n') : '(нет сообщений)') + '\n\n' +
      'Браузерный движок: ' + navigator.userAgent + '\n' + 'Адрес: ' + location.href;
    document.documentElement.appendChild(box);
  }, 12000);
})();
