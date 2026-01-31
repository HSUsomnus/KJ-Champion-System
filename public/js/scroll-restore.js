/**
 * 記住使用者離開頁面時的捲動位置與分頁層級，按上一頁時還原
 * 與現代瀏覽器一致：支援多步上一頁、記住捲動與分頁，關閉瀏覽器／分頁才清掉（sessionStorage）
 * 套用專案所有操作：點連結與程式化導向離開前都會儲存
 */

(function () {
  var KEY_PREFIX = 'pageState_';

  /**
   * 取得目前頁面路徑（用於 sessionStorage 的 key）
   */
  function getPath() {
    var path = (window.location.pathname || '/').replace(/\/$/, '') || '/';
    return path === '' ? '/' : path;
  }

  /**
   * 儲存目前頁面狀態（捲動、分頁索引）
   * 使用 sessionStorage：關閉瀏覽器／分頁才會清掉
   */
  function saveState() {
    var path = getPath();
    var tabIndex = typeof window.__currentTabIndex === 'number' ? window.__currentTabIndex : null;
    var listScrollTop = null;
    if (path.indexOf('list') !== -1 && typeof window.__getListScrollTop === 'function') {
      listScrollTop = window.__getListScrollTop();
    }
    try {
      sessionStorage.setItem(KEY_PREFIX + path, JSON.stringify({
        scrollY: window.scrollY || document.documentElement.scrollTop || 0,
        tabIndex: tabIndex,
        listScrollTop: listScrollTop
      }));
    } catch (e) {}
  }

  /** 供專案內程式化導向（location.href）前呼叫，離開前儲存本頁狀態 */
  window.__savePageState = saveState;

  /**
   * 還原頁面狀態（僅在「上一頁」回到本頁時執行）
   */
  function restoreState() {
    var path = getPath();
    var stateStr;
    try {
      stateStr = sessionStorage.getItem(KEY_PREFIX + path);
    } catch (e) {
      return;
    }
    if (!stateStr) return;
    var state;
    try {
      state = JSON.parse(stateStr);
    } catch (e) {
      return;
    }
    if (!state) return;

    // 列表頁：先還原分頁
    if (typeof window.__restoreListTab === 'function' && state.tabIndex != null) {
      window.__restoreListTab(state.tabIndex);
    }

    // 還原捲動：列表頁需還原「分頁內」捲動位置，其餘頁面還原 window 捲動
    var scrollDelay = (path.indexOf('list') !== -1) ? 700 : 150;
    setTimeout(function () {
      if (path.indexOf('list') !== -1 && typeof state.listScrollTop === 'number' && state.listScrollTop >= 0 && typeof window.__setListScrollTop === 'function') {
        window.__setListScrollTop(state.listScrollTop);
      }
      var y = state.scrollY;
      if (typeof y === 'number' && y >= 0) {
        window.scrollTo(0, y);
      }
    }, scrollDelay);
  }

  /**
   * 是否為「上一頁／下一頁」回到本頁（bfcache 或 back_forward）
   */
  function isBackForward() {
    try {
      var nav = performance.getEntriesByType && performance.getEntriesByType('navigation')[0];
      if (nav && nav.type === 'back_forward') return true;
    } catch (e) {}
    try {
      if (performance.navigation && performance.navigation.type === 2) return true;
    } catch (e) {}
    return false;
  }

  // 點擊站內連結離開前儲存狀態（僅站內同源連結）
  document.addEventListener('click', function (e) {
    var a = e.target && (e.target.closest ? e.target.closest('a') : e.target);
    if (!a || !a.href) return;
    var href = a.getAttribute('href');
    if (!href || href === '#' || href.startsWith('javascript:')) return;
    try {
      var url = new URL(a.href, window.location.origin);
      if (url.origin !== window.location.origin) return;
    } catch (err) {
      return;
    }
    saveState();
  }, true);

  /**
   * 若網址帶 restore=1（例如從新增行程儲存後導回），也還原狀態
   */
  function shouldRestoreFromUrl() {
    try {
      return window.location.search.indexOf('restore=1') !== -1;
    } catch (e) {
      return false;
    }
  }

  /**
   * 移除網址中的 restore=1
   */
  function removeRestoreParam() {
    try {
      var u = new URL(window.location.href);
      u.searchParams.delete('restore');
      window.history.replaceState({}, '', u.pathname + u.search || '');
    } catch (e) {}
  }

  // 上一頁回到本頁時還原狀態；或網址帶 restore=1 時還原（例如儲存後導回）
  window.addEventListener('pageshow', function (e) {
    if (e.persisted || isBackForward()) {
      restoreState();
      return;
    }
    if (shouldRestoreFromUrl()) {
      removeRestoreParam();
      restoreState();
    }
  });
})();
