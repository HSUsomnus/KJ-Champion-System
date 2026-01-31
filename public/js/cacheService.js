/**
 * 快取服務
 * 使用 localStorage 儲存版本號和資料，實現增量更新機制
 */

const CACHE_KEY_VERSION = 'app_data_version';
const CACHE_KEY_EVENTS = 'app_data_events';
const CACHE_KEY_MEMBERS = 'app_data_members';

/**
 * 取得快取的版本號
 */
function getCachedVersion() {
  const version = localStorage.getItem(CACHE_KEY_VERSION);
  return version ? parseInt(version) : null;
}

/**
 * 儲存版本號和資料到快取
 */
function saveCache(version, events, members) {
  try {
    localStorage.setItem(CACHE_KEY_VERSION, version.toString());
    localStorage.setItem(CACHE_KEY_EVENTS, JSON.stringify(events));
    localStorage.setItem(CACHE_KEY_MEMBERS, JSON.stringify(members));
    console.log(`✅ 資料已快取，版本號：${version}`);
  } catch (error) {
    console.error('儲存快取失敗:', error);
  }
}

/**
 * 取得快取的行程資料
 */
function getCachedEvents() {
  try {
    const data = localStorage.getItem(CACHE_KEY_EVENTS);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('讀取快取行程失敗:', error);
    return null;
  }
}

/**
 * 取得快取的成員資料
 */
function getCachedMembers() {
  try {
    const data = localStorage.getItem(CACHE_KEY_MEMBERS);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('讀取快取成員失敗:', error);
    return null;
  }
}

/**
 * 清除所有快取
 */
function clearCache() {
  localStorage.removeItem(CACHE_KEY_VERSION);
  localStorage.removeItem(CACHE_KEY_EVENTS);
  localStorage.removeItem(CACHE_KEY_MEMBERS);
  console.log('🗑️ 快取已清除');
}

/**
 * 檢查並更新資料（版本號機制）
 * @returns {Promise<Object>} 包含 events 和 members 的物件
 */
async function checkAndUpdateData() {
  const cachedVersion = getCachedVersion();
  
  try {
    // 檢查版本號
    const url = `/api/calendar/version${cachedVersion ? `?version=${cachedVersion}` : ''}`;
    const response = await fetch(url);
    const data = await response.json();

    if (!data.success) {
      throw new Error(data.message || '檢查版本號失敗');
    }

    // 如果版本號相同，使用快取資料
    if (!data.data.changed) {
      console.log('✅ 版本號相同，使用快取資料');
      return {
        events: getCachedEvents() || [],
        members: getCachedMembers() || [],
        fromCache: true,
      };
    }

    // 版本號不同，使用新資料並更新快取
    console.log('🔄 版本號已更新，載入新資料');
    const newEvents = data.data.events || [];
    const newMembers = data.data.members || [];
    
    // 更新快取
    saveCache(data.data.version, newEvents, newMembers);

    return {
      events: newEvents,
      members: newMembers,
      fromCache: false,
    };
  } catch (error) {
    console.error('檢查版本號錯誤:', error);
    
    // 如果 API 失敗，嘗試使用快取資料
    const cachedEvents = getCachedEvents();
    const cachedMembers = getCachedMembers();
    
    if (cachedEvents !== null && cachedMembers !== null) {
      console.log('⚠️ API 失敗，使用快取資料');
      return {
        events: cachedEvents,
        members: cachedMembers,
        fromCache: true,
      };
    }
    
    // 沒有快取資料，回傳空陣列
    return {
      events: [],
      members: [],
      fromCache: false,
    };
  }
}

// 匯出供其他模組使用
window.cacheService = {
  getCachedVersion,
  saveCache,
  getCachedEvents,
  getCachedMembers,
  clearCache,
  checkAndUpdateData,
};
