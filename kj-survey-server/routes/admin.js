const express = require('express');
const router = express.Router();
const formService = require('../services/formService');
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

module.exports = router;
