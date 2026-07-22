'use strict';

const request = require('supertest');
const express = require('express');

jest.mock('../../middleware/requireAdminSession', () => ({
  requireAdminSession: jest.fn((req, res, next) => {
    const authorization = req.headers.authorization;
    if (!authorization?.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: '請先登入' });
    }
    if (authorization === 'Bearer insufficient-role') {
      return res.status(403).json({ success: false, message: '此帳號沒有後台權限' });
    }
    return next();
  }),
}));

jest.mock('../../services/formService', () => ({
  listForms: jest.fn(),
  listSubmissionsByFormId: jest.fn(),
}));

jest.mock('../../services/attendanceService', () => ({
  listConfirmedMembersWithRecommender: jest.fn(),
  computeAttendance: jest.fn(),
}));

const formService = require('../../services/formService');
const attendanceService = require('../../services/attendanceService');

const buildApp = () => {
  const app = express();
  app.use('/admin', require('../admin'));
  return app;
};

describe('admin routes', () => {
  beforeEach(() => jest.clearAllMocks());

  test('無 Authorization header → 401，不查資料', async () => {
    const res = await request(buildApp()).get('/admin/forms');

    expect(res.status).toBe(401);
    expect(formService.listForms).not.toHaveBeenCalled();
    expect(formService.listSubmissionsByFormId).not.toHaveBeenCalled();
  });

  test('角色不足 → 403，不查資料', async () => {
    const res = await request(buildApp())
      .get('/admin/forms')
      .set('Authorization', 'Bearer insufficient-role');

    expect(res.status).toBe(403);
    expect(formService.listForms).not.toHaveBeenCalled();
    expect(formService.listSubmissionsByFormId).not.toHaveBeenCalled();
  });

  test('角色足夠 → GET /forms 回傳 mock 資料筆數', async () => {
    const forms = [{ id: 1 }, { id: 2 }];
    formService.listForms.mockResolvedValue(forms);

    const res = await request(buildApp())
      .get('/admin/forms')
      .set('Authorization', 'Bearer admin-token');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(forms.length);
  });

  test('角色足夠 → GET /forms/:id/submissions 回傳 mock 資料筆數', async () => {
    const submissions = [{ id: 10 }, { id: 11 }, { id: 12 }];
    formService.listSubmissionsByFormId.mockResolvedValue(submissions);

    const res = await request(buildApp())
      .get('/admin/forms/7/submissions')
      .set('Authorization', 'Bearer admin-token');

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(submissions.length);
    expect(formService.listSubmissionsByFormId).toHaveBeenCalledWith('7');
  });

  test('未通過 requireAdminSession → GET attendance 回傳 401 且不查資料', async () => {
    const res = await request(buildApp()).get('/admin/forms/7/attendance');

    expect(res.status).toBe(401);
    expect(attendanceService.listConfirmedMembersWithRecommender).not.toHaveBeenCalled();
    expect(formService.listSubmissionsByFormId).not.toHaveBeenCalled();
    expect(attendanceService.computeAttendance).not.toHaveBeenCalled();
  });

  test('角色不足 → GET attendance 回傳 403 且不查資料', async () => {
    const res = await request(buildApp())
      .get('/admin/forms/7/attendance')
      .set('Authorization', 'Bearer insufficient-role');

    expect(res.status).toBe(403);
    expect(attendanceService.listConfirmedMembersWithRecommender).not.toHaveBeenCalled();
    expect(formService.listSubmissionsByFormId).not.toHaveBeenCalled();
    expect(attendanceService.computeAttendance).not.toHaveBeenCalled();
  });

  test('角色足夠 → GET attendance 回傳 computeAttendance 結果', async () => {
    const members = [{ name: '王小明', recommender_name: '推薦人' }];
    const submissions = [{ answers: { name: '王小明' } }];
    const attendance = { totalMembers: 1, totalFilled: 1, groups: [] };
    attendanceService.listConfirmedMembersWithRecommender.mockResolvedValue(members);
    formService.listSubmissionsByFormId.mockResolvedValue(submissions);
    attendanceService.computeAttendance.mockReturnValue(attendance);

    const res = await request(buildApp())
      .get('/admin/forms/7/attendance')
      .set('Authorization', 'Bearer admin-token');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, data: attendance });
    expect(formService.listSubmissionsByFormId).toHaveBeenCalledWith('7');
    expect(attendanceService.computeAttendance).toHaveBeenCalledWith(members, submissions);
  });
});
