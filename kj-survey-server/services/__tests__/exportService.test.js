'use strict';

const ExcelJS = require('exceljs');
const { toCsv, toXlsxBuffer } = require('../exportService');

describe('exportService', () => {
  test('CSV 欄序依 fields 順序，並轉換 yesno', () => {
    const form = { fields: [
      { key: 'third', label: '第三欄', type: 'text' },
      { key: 'first', label: '第一欄', type: 'yesno' },
      { key: 'second', label: '第二欄', type: 'yesno' },
    ] };
    const submissions = [{ answers: { first: 'yes', second: 'no', third: '內容' } }];

    expect(toCsv(form, submissions)).toBe('\uFEFF第三欄,第一欄,第二欄\r\n內容,是,否');
  });

  test.each([
    ['逗號', 'a,b', '"a,b"'],
    ['雙引號', 'a"b', '"a""b"'],
    ['換行', 'a\nb', '"a\nb"'],
  ])('CSV 正確 escaping：%s', (_name, input, expected) => {
    const csv = toCsv(
      { fields: [{ key: 'value', label: '欄位', type: 'text' }] },
      [{ answers: { value: input } }],
    );

    expect(csv).toBe(`\uFEFF欄位\r\n${expected}`);
  });

  test.each(['=cmd', '+1+1', '-1+1', '@SUM(1+1)'])(
    'CSV 中和公式字首：%s',
    (input) => {
      const csv = toCsv(
        { fields: [{ key: 'value', label: '欄位', type: 'text' }] },
        [{ answers: { value: input } }],
      );

      expect(csv).toBe(`\uFEFF欄位\r\n'${input}`);
    },
  );

  test('CSV 開頭包含 UTF-8 BOM', () => {
    expect(toCsv({ fields: [] }, [])).toHaveLength(1);
    expect(toCsv({ fields: [] }, []).charCodeAt(0)).toBe(0xFEFF);
  });

  test('toXlsxBuffer 回傳可讀取的非空 Buffer 與正確表頭', async () => {
    const form = { fields: [
      { key: 'b', label: '第二欄', type: 'text' },
      { key: 'a', label: '第一欄', type: 'text' },
    ] };
    const buffer = await toXlsxBuffer(form, [{ answers: { a: 'A', b: 'B' } }]);

    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.length).toBeGreaterThan(0);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    expect(workbook.worksheets).toHaveLength(1);
    expect(workbook.worksheets[0].getRow(1).values.slice(1)).toEqual(['第二欄', '第一欄']);
  });
});
