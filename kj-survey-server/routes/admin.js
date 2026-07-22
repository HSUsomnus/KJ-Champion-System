const express = require('express');
const router = express.Router();
const formService = require('../services/formService');
const attendanceService = require('../services/attendanceService');
const exportService = require('../services/exportService');
const { requireAdminSession } = require('../middleware/requireAdminSession');
const { asyncHandler } = require('../middleware/asyncHandler');

router.use(requireAdminSession);

router.get('/forms', asyncHandler(async (req, res) => {
  const forms = await formService.listForms();
  res.json({ success: true, data: forms });
}));

router.get('/forms/:id/submissions', asyncHandler(async (req, res) => {
  const submissions = await formService.listSubmissionsByFormId(req.params.id);
  res.json({ success: true, data: submissions });
}));

router.get('/forms/:id/attendance', asyncHandler(async (req, res) => {
  const [members, submissions] = await Promise.all([
    attendanceService.listConfirmedMembersWithRecommender(),
    formService.listSubmissionsByFormId(req.params.id),
  ]);
  const attendance = attendanceService.computeAttendance(members, submissions);
  res.json({ success: true, data: attendance });
}));

router.get('/forms/:id/export.csv', asyncHandler(async (req, res) => {
  const forms = await formService.listForms();
  const form = forms.find(({ id }) => String(id) === req.params.id);
  if (!form) {
    return res.status(404).json({ success: false, message: '找不到此表單' });
  }

  const submissions = await formService.listSubmissionsByFormId(req.params.id);
  const csv = exportService.toCsv(form, submissions);
  res.set('Content-Type', 'text/csv; charset=utf-8');
  res.set('Content-Disposition', `attachment; filename="export.csv"; filename*=UTF-8''${encodeURIComponent(form.title)}.csv`);
  return res.send(csv);
}));

router.get('/forms/:id/export.xlsx', asyncHandler(async (req, res) => {
  const forms = await formService.listForms();
  const form = forms.find(({ id }) => String(id) === req.params.id);
  if (!form) {
    return res.status(404).json({ success: false, message: '找不到此表單' });
  }

  const submissions = await formService.listSubmissionsByFormId(req.params.id);
  const buffer = await exportService.toXlsxBuffer(form, submissions);
  res.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.set('Content-Disposition', `attachment; filename="export.xlsx"; filename*=UTF-8''${encodeURIComponent(form.title)}.xlsx`);
  return res.send(buffer);
}));

module.exports = router;
