/**
 * KJ Survey 匯出格式化（Change 20，Section 6）
 * 純格式化：吃 listSubmissions 的 { form, submissions }，產出 CSV 字串 / xlsx Buffer。
 * 資料抓取由呼叫端負責，方便單測。
 */

const ExcelJS = require('exceljs');

const TIME_HEADER = '填寫時間';

/**
 * 依欄位型態把 answer 值轉成人類可讀（yesno → 是/否）
 */
const formatCell = (field, value) => {
  if (field.type === 'yesno') {
    if (value === 'yes') return '是';
    if (value === 'no') return '否';
    return '';
  }
  return value == null ? '' : String(value);
};

/**
 * 攤平成 { header:[], rows:[[]] }
 */
const toTable = ({ form, submissions }) => {
  const fields = form.fields || [];
  const header = [...fields.map((f) => f.label), TIME_HEADER];
  const rows = submissions.map((s) => {
    const answers = s.answers || {};
    const cells = fields.map((f) => formatCell(f, answers[f.key]));
    cells.push(s.created_at ? new Date(s.created_at).toISOString() : '');
    return cells;
  });
  return { header, rows };
};

/**
 * CSV 逃逸：含逗號 / 引號 / 換行時用雙引號包起，內部引號成對。
 */
const escapeCsv = (value) => {
  const str = String(value ?? '');
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

/**
 * 產生 CSV 字串（含 UTF-8 BOM，讓 Excel 正確辨識中文）
 */
const buildCsv = (data) => {
  const { header, rows } = toTable(data);
  const lines = [header, ...rows].map((cols) => cols.map(escapeCsv).join(','));
  return '﻿' + lines.join('\r\n');
};

/**
 * 產生 xlsx Buffer（exceljs）
 */
const buildXlsx = async (data) => {
  const { header, rows } = toTable(data);
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet((data.form.title || '調查結果').slice(0, 28));
  sheet.addRow(header);
  sheet.getRow(1).font = { bold: true };
  rows.forEach((r) => sheet.addRow(r));
  return workbook.xlsx.writeBuffer();
};

/**
 * 檔名（去掉不利於 header 的字元）
 */
const safeFileName = (title, ext) => {
  const base = (title || 'survey').replace(/[^\w一-龥-]/g, '_').slice(0, 40);
  return `${base}.${ext}`;
};

module.exports = { toTable, formatCell, escapeCsv, buildCsv, buildXlsx, safeFileName };
