/**
 * 行程資料庫服務層 (Supabase PostgreSQL)
 * 處理行程的讀取與同步邏輯
 */

const db = require('../config/db');

/**
 * 將資料庫 row 轉換成行程物件
 */
const rowToEvent = (row) => ({
  id: row.id,
  title: row.title || '無標題',
  description: row.description || '',
  start: row.start_at,  // TIMESTAMPTZ 會自動轉成 ISO string
  end: row.end_at,
  location: row.location || '',
  type: row.type || '活動',
  creator: row.creator_email || '',
  allDay: row.all_day || false,
  isBirthdayEvent: row.is_birthday_event || false,
});

/**
 * 取得指定日期範圍的行程
 * @param {string} timeMin - 開始時間 (ISO 8601 格式)
 * @param {string} timeMax - 結束時間 (ISO 8601 格式)
 * @returns {Promise<Array>} 行程陣列
 */
const getEventsByRange = async (timeMin, timeMax) => {
  try {
    const result = await db.query(`
      SELECT * FROM events
      WHERE start_at >= $1 AND start_at <= $2
      ORDER BY start_at ASC
    `, [timeMin, timeMax]);
    
    return result.rows.map(rowToEvent);
  } catch (error) {
    console.error('❌ 取得行程列表失敗:', error.message);
    throw new Error(`取得行程列表失敗: ${error.message}`);
  }
};

/**
 * 取得單一行程
 * @param {string} eventId - 行程 ID (Google Calendar event ID)
 * @returns {Promise<Object|null>} 行程物件，找不到則回傳 null
 */
const getEventById = async (eventId) => {
  try {
    const result = await db.query(
      `SELECT * FROM events WHERE id = $1`,
      [eventId]
    );
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return rowToEvent(result.rows[0]);
  } catch (error) {
    console.error('❌ 取得行程詳情失敗:', error.message);
    throw error;
  }
};

/**
 * Upsert 行程（同步用）
 * @param {Array} events - 從 Google Calendar 取得的行程陣列
 * @returns {Promise<number>} 受影響的行程數量
 */
const _upsertEventsToPool = async (getClientFn, events) => {
  const client = await getClientFn();
  try {
    await client.query('BEGIN');
    let count = 0;
    for (const event of events) {
      await client.query(`
        INSERT INTO events (
          id, title, description, start_at, end_at, all_day,
          location, type, is_birthday_event, creator_email, synced_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          description = EXCLUDED.description,
          start_at = EXCLUDED.start_at,
          end_at = EXCLUDED.end_at,
          all_day = EXCLUDED.all_day,
          location = EXCLUDED.location,
          type = EXCLUDED.type,
          is_birthday_event = EXCLUDED.is_birthday_event,
          creator_email = EXCLUDED.creator_email,
          synced_at = NOW(),
          updated_at = NOW()
      `, [
        event.id,
        event.title,
        event.description || '',
        event.start,
        event.end,
        event.allDay || false,
        event.location || '',
        event.type || '活動',
        event.isBirthdayEvent || false,
        event.creator || '',
      ]);
      count++;
    }
    await client.query('COMMIT');
    return count;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const upsertEvents = async (events) => {
  if (events.length === 0) return 0;
  try {
    return await _upsertEventsToPool(db.getClient, events);
  } catch (error) {
    console.error('❌ Upsert 行程失敗:', error.message);
    throw error;
  }
};

/**
 * 刪除不在指定 ID 列表中的行程（同步用，清除已從 Calendar 刪除的行程）
 * @param {Array<string>} googleEventIds - Google Calendar event ID 陣列
 * @param {string} timeMin - 同步範圍開始時間
 * @param {string} timeMax - 同步範圍結束時間
 * @returns {Promise<number>} 刪除的行程數量
 */
const deleteEventsNotIn = async (googleEventIds, timeMin, timeMax) => {
  try {
    const runDelete = (queryFn) => {
      if (googleEventIds.length === 0) {
        return queryFn(`
          DELETE FROM events
          WHERE start_at >= $1 AND start_at <= $2
          AND is_birthday_event = FALSE
          RETURNING id
        `, [timeMin, timeMax]);
      }
      const placeholders = googleEventIds.map((_, i) => `$${i + 3}`).join(',');
      return queryFn(`
        DELETE FROM events
        WHERE start_at >= $1 AND start_at <= $2
        AND id NOT IN (${placeholders})
        AND is_birthday_event = FALSE
        RETURNING id
      `, [timeMin, timeMax, ...googleEventIds]);
    };

    const result = await runDelete(db.query.bind(db));
    return result.rowCount;
  } catch (error) {
    console.error('❌ 刪除過期行程失敗:', error.message);
    throw error;
  }
};

/**
 * 刪除單一行程（立即同步用）
 * @param {string} eventId - 行程 ID (Google Calendar event ID)
 * @returns {Promise<boolean>} 是否刪除成功
 */
const deleteEventById = async (eventId) => {
  try {
    const result = await db.query(`DELETE FROM events WHERE id = $1 RETURNING id`, [eventId]);
    return result.rowCount > 0;
  } catch (error) {
    console.error('❌ 刪除行程失敗:', error.message);
    throw error;
  }
};

/**
 * 取得指定月份的行程
 * @param {number} year - 年份
 * @param {number} month - 月份 (1-12)
 * @param {string} type - 行程類型（選填）
 * @returns {Promise<Array>} 行程陣列
 */
const getEventsByMonth = async (year, month, type = null) => {
  try {
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    
    const timeMin = `${year}-${String(month).padStart(2, '0')}-01T00:00:00+08:00`;
    const timeMax = `${year}-${String(month).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}T23:59:59+08:00`;
    
    let query = `
      SELECT * FROM events
      WHERE start_at >= $1 AND end_at <= $2
    `;
    const params = [timeMin, timeMax];
    
    if (type) {
      query += ` AND type = $3`;
      params.push(type);
    }
    
    query += ` ORDER BY start_at ASC`;
    
    const result = await db.query(query, params);
    return result.rows.map(rowToEvent);
  } catch (error) {
    console.error('❌ 取得月份行程失敗:', error.message);
    throw error;
  }
};

module.exports = {
  getEventsByRange,
  getEventById,
  upsertEvents,
  deleteEventsNotIn,
  deleteEventById,
  getEventsByMonth,
};
