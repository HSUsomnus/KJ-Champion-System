'use strict';

const ExcelJS = require('exceljs');

const FORMULA_PREFIX_PATTERN = /^[=+\-@]/;
const CSV_ESCAPE_PATTERN = /[",\r\n]/;

const normalizeValue = (field, value) => {
  if (value === undefined || value === null) return '';

  let normalized;
  if (field?.type === 'yesno') {
    normalized = value === 'yes' ? '是' : value === 'no' ? '否' : String(value);
  } else {
    normalized = String(value);
  }

  return FORMULA_PREFIX_PATTERN.test(normalized) ? `'${normalized}` : normalized;
};

const escapeCsvValue = (value) => {
  const stringValue = String(value);
  if (!CSV_ESCAPE_PATTERN.test(stringValue)) return stringValue;
  return `"${stringValue.replace(/"/g, '""')}"`;
};

const toCsv = (form, submissions) => {
  const fields = form.fields;
  const rows = [fields.map((field) => escapeCsvValue(normalizeValue(null, field.label))).join(',')];

  submissions.forEach((submission) => {
    rows.push(fields.map((field) => (
      escapeCsvValue(normalizeValue(field, submission.answers?.[field.key]))
    )).join(','));
  });

  return `\uFEFF${rows.join('\r\n')}`;
};

const toXlsxBuffer = async (form, submissions) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('匯出');
  const fields = form.fields;

  worksheet.addRow(fields.map((field) => normalizeValue(null, field.label)));
  submissions.forEach((submission) => {
    worksheet.addRow(fields.map((field) => normalizeValue(field, submission.answers?.[field.key])));
  });

  return Buffer.from(await workbook.xlsx.writeBuffer());
};

module.exports = { toCsv, toXlsxBuffer };
