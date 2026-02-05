/**
 * Google Sheets 服務層
 * 處理所有與 Google Sheets 相關的業務邏輯
 */

const { getSheetsClient, getSheetConfig } = require('../config/googleAuth');

/**
 * 取得所有成員資料
 * @returns {Promise<Array>} 成員陣列
 */
const getAllMembers = async () => {
  try {
    const sheets = await getSheetsClient();
    const { sheetId, sheetName } = getSheetConfig();

    // 讀取 Google Sheets 的資料（G 頭像URL；H 特斯拉加盟主；I 團隊負責事項；J 課程志工紀錄 JSON）
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `${sheetName}!A2:J`,
    });

    const rows = response.data.values || [];
    
    // 轉換成物件陣列（A~G 基本資料，H~J 進階資訊）
    const members = rows
      .filter(row => row[0]) // 過濾掉空行（至少要有 LINE ID）
      .map((row, index) => ({
        rowIndex: index + 2,
        lineId: row[0] || '',
        name: row[1] || '',
        email: row[2] || '',
        phone: row[3] || '',
        starLevel: row[4] || '白星',
        courseRecord: row[5] || '',
        pictureUrl: row[6] || '',
        teslaFranchisee: row[7] || '',           // H：是否為特斯拉出行加盟主（是／否）
        teamResponsibilities: row[8] || '',     // I：團隊負責事項
        volunteerRecords: row[9] || '',        // J：課程志工紀錄（JSON 字串）
      }));

    return members;
  } catch (error) {
    console.error('❌ 取得成員資料失敗:', error.message);
    throw new Error(`取得成員資料失敗: ${error.message}`);
  }
};

/**
 * 根據 LINE ID 取得成員資料
 * @param {string} lineId - LINE User ID
 * @returns {Promise<Object|null>} 成員物件，找不到則回傳 null
 */
const getMemberByLineId = async (lineId) => {
  try {
    const members = await getAllMembers();
    return members.find(member => member.lineId === lineId) || null;
  } catch (error) {
    console.error('❌ 查詢成員資料失敗:', error.message);
    throw error;
  }
};

/**
 * 檢查成員是否已註冊
 * @param {string} lineId - LINE User ID
 * @returns {Promise<boolean>} 是否已註冊
 */
const isMemberRegistered = async (lineId) => {
  const member = await getMemberByLineId(lineId);
  return member !== null;
};

/**
 * 新增成員資料
 * @param {Object} memberData - 成員資料
 * @param {string} memberData.lineId - LINE User ID
 * @param {string} memberData.name - 真實姓名
 * @param {string} memberData.email - Email
 * @param {string} memberData.phone - 電話號碼
 * @param {string} memberData.starLevel - 星等（白星、綠星、橙星、紅星、紫星）
 * @param {string} memberData.courseRecord - 課程紀錄
 * @param {string} [memberData.teslaFranchisee] - 是否為特斯拉出行加盟主（是／否）
 * @param {string} [memberData.teamResponsibilities] - 團隊負責事項
 * @param {string} [memberData.volunteerRecords] - 課程志工紀錄（JSON 字串）
 * @returns {Promise<Object>} 新增的成員物件
 */
const createMember = async (memberData) => {
  try {
    const sheets = await getSheetsClient();
    const { sheetId, sheetName } = getSheetConfig();

    // 準備要新增的資料列（含進階資訊 H、I、J）
    const values = [[
      memberData.lineId || '',
      memberData.name || '',
      memberData.email || '',
      memberData.phone || '',
      memberData.starLevel || '白星',
      memberData.courseRecord || '',
      memberData.pictureUrl || '',
      memberData.teslaFranchisee || '',
      memberData.teamResponsibilities || '',
      memberData.volunteerRecords || '',
    ]];

    // 新增資料到 Google Sheets
    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: `${sheetName}!A:J`,
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: values,
      },
    });

    // 回傳新增的成員資料（含進階資訊）
    return {
      lineId: memberData.lineId,
      name: memberData.name,
      email: memberData.email,
      phone: memberData.phone,
      starLevel: memberData.starLevel || '白星',
      courseRecord: memberData.courseRecord || '',
      pictureUrl: memberData.pictureUrl || '',
      teslaFranchisee: memberData.teslaFranchisee || '',
      teamResponsibilities: memberData.teamResponsibilities || '',
      volunteerRecords: memberData.volunteerRecords || '',
    };
  } catch (error) {
    console.error('❌ 新增成員資料失敗:', error.message);
    throw new Error(`新增成員資料失敗: ${error.message}`);
  }
};

/**
 * 更新成員資料
 * @param {string} lineId - LINE User ID
 * @param {Object} memberData - 要更新的成員資料
 * @returns {Promise<Object>} 更新後的成員物件
 */
const updateMember = async (lineId, memberData) => {
  try {
    // 先找到該成員的資料
    const member = await getMemberByLineId(lineId);
    if (!member) {
      throw new Error('找不到該成員資料');
    }

    const sheets = await getSheetsClient();
    const { sheetId, sheetName } = getSheetConfig();

    // 準備更新的資料（含進階資訊 H、I、J）
    const values = [[
      lineId,
      memberData.name !== undefined ? memberData.name : member.name,
      memberData.email !== undefined ? memberData.email : member.email,
      memberData.phone !== undefined ? memberData.phone : member.phone,
      memberData.starLevel !== undefined ? memberData.starLevel : member.starLevel,
      memberData.courseRecord !== undefined ? memberData.courseRecord : member.courseRecord,
      memberData.pictureUrl !== undefined ? memberData.pictureUrl : (member.pictureUrl || ''),
      memberData.teslaFranchisee !== undefined ? memberData.teslaFranchisee : (member.teslaFranchisee || ''),
      memberData.teamResponsibilities !== undefined ? memberData.teamResponsibilities : (member.teamResponsibilities || ''),
      memberData.volunteerRecords !== undefined ? memberData.volunteerRecords : (member.volunteerRecords || ''),
    ]];

    // 更新 Google Sheets 中的資料
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `${sheetName}!A${member.rowIndex}:J${member.rowIndex}`,
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: values,
      },
    });

    // 回傳更新後的成員資料（含進階資訊）
    return {
      lineId: lineId,
      name: memberData.name !== undefined ? memberData.name : member.name,
      email: memberData.email !== undefined ? memberData.email : member.email,
      phone: memberData.phone !== undefined ? memberData.phone : member.phone,
      starLevel: memberData.starLevel !== undefined ? memberData.starLevel : member.starLevel,
      courseRecord: memberData.courseRecord !== undefined ? memberData.courseRecord : member.courseRecord,
      pictureUrl: memberData.pictureUrl !== undefined ? memberData.pictureUrl : (member.pictureUrl || ''),
      teslaFranchisee: memberData.teslaFranchisee !== undefined ? memberData.teslaFranchisee : (member.teslaFranchisee || ''),
      teamResponsibilities: memberData.teamResponsibilities !== undefined ? memberData.teamResponsibilities : (member.teamResponsibilities || ''),
      volunteerRecords: memberData.volunteerRecords !== undefined ? memberData.volunteerRecords : (member.volunteerRecords || ''),
    };
  } catch (error) {
    console.error('❌ 更新成員資料失敗:', error.message);
    throw new Error(`更新成員資料失敗: ${error.message}`);
  }
};

module.exports = {
  getAllMembers,
  getMemberByLineId,
  isMemberRegistered,
  createMember,
  updateMember,
};
