/**
 * Eruda 載入器：僅在網址帶 ?eruda=1 時載入，方便在手機 LINE 瀏覽器看 Console
 * 使用方式：在 LIFF 網址後加 ?eruda=1（例如 .../members.html?eruda=1），重新開啟即可
 */
(function () {
  if (!/[?&]eruda=1/.test(location.search)) return;
  var s = document.createElement('script');
  s.src = 'https://cdn.jsdelivr.net/npm/eruda@2/eruda.min.js';
  s.onload = function () { eruda.init(); };
  document.body.appendChild(s);
})();
