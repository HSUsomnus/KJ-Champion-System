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

router.post('/forms', asyncHandler(async (req, res) => {
  try {
    const form = await formService.createDraftForm(req.body);
    return res.status(201).json({ success: true, data: form });
  } catch (err) {
    if (err.code === 'INVALID_FORM') {
      return res.status(400).json({ error: 'invalid_form', field: err.field, reason: err.reason });
    }
    throw err;
  }
}));

router.patch('/forms/:id', asyncHandler(async (req, res) => {
  try {
    const form = await formService.patchForm(req.params.id, req.body);
    return res.status(200).json({ success: true, data: form });
  } catch (err) {
    if (err.code === 'INVALID_FORM') {
      return res.status(400).json({ error: 'invalid_form', field: err.field, reason: err.reason });
    }
    if (err.code === 'FORM_NOT_FOUND') {
      return res.status(404).json({ success: false, message: '找不到此表單' });
    }
    if (err.code === 'FORM_ALREADY_PUBLISHED') {
      return res.status(409).json({ success: false, message: '已發佈的表單無法編輯' });
    }
    throw err;
  }
}));

router.post('/forms/:id/publish', asyncHandler(async (req, res) => {
  try {
    const form = await formService.publishForm(req.params.id);
    return res.status(200).json({ success: true, data: form });
  } catch (err) {
    if (err.code === 'FORM_NOT_FOUND') {
      return res.status(404).json({ success: false, message: '找不到此表單' });
    }
    if (err.code === 'INVALID_FORM') {
      return res.status(400).json({ error: 'invalid_form', field: err.field, reason: err.reason });
    }
    throw err;
  }
}));

module.exports = router;
