'use strict';

const exportService = require('../exportService');

const DATA = {
  form: {
    id: 1,
    title: '康九冠軍調查',
    fields: [
      { key: 'name', label: '姓名', type: 'searchable_select' },
      { key: 'join_master', label: '天驥加盟主', type: 'yesno' },
    ],
  },
  submissions: [
    { id: 1, answers: { name: '徐毓紘', join_master: 'yes' }, created_at: '2026-07-08T00:00:00Z' },
    { id: 2, answers: { name: '曹, 琦', join_master: 'no' }, created_at: '2026-07-08T01:00:00Z' },
  ],
};

describe('exportService.formatCell', () => {
  const yesno = { key: 'x', label: 'x', type: 'yesno' };
  test('yesno yes→是 / no→否 / 空→空', () => {
    expect(exportService.formatCell(yesno, 'yes')).toBe('是');
    expect(exportService.formatCell(yesno, 'no')).toBe('否');
    expect(exportService.formatCell(yesno, undefined)).toBe('');
  });
  test('文字欄原樣', () => {
    expect(exportService.formatCell({ type: 'text' }, '哈囉')).toBe('哈囉');
  });
});

describe('exportService.buildCsv', () => {
  test('含 BOM + 標題列（欄位 label + 填寫時間）', () => {
    const csv = exportService.buildCsv(DATA);
    expect(csv.charCodeAt(0)).toBe(0xfeff); // BOM
    const firstLine = csv.slice(1).split('\r\n')[0];
    expect(firstLine).toBe('姓名,天驥加盟主,填寫時間');
  });

  test('yesno 轉是/否，含逗號的值被引號包起', () => {
    const csv = exportService.buildCsv(DATA);
    const lines = csv.slice(1).split('\r\n');
    expect(lines[1]).toContain('徐毓紘,是,');
    expect(lines[2]).toContain('"曹, 琦",否,'); // 逗號值被包引號
  });
});

describe('exportService.buildXlsx', () => {
  test('回傳非空 Buffer', async () => {
    const buf = await exportService.buildXlsx(DATA);
    expect(buf.byteLength || buf.length).toBeGreaterThan(0);
  });
});

describe('exportService.safeFileName', () => {
  test('去除不安全字元、保留中文', () => {
    expect(exportService.safeFileName('康九冠軍調查', 'csv')).toBe('康九冠軍調查.csv');
  });
});
