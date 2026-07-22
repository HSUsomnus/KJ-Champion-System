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

jest.mock('../../services/exportService', () => ({
  toCsv: jest.fn(),
  toXlsxBuffer: jest.fn(),
}));

const formService = require('../../services/formService');
const attendanceService = require('../../services/attendanceService');
const exportService = require('../../services/exportService');

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

  test.each([
    ['/admin/forms/7/export.csv', 'toCsv'],
    ['/admin/forms/7/export.xlsx', 'toXlsxBuffer'],
  ])('表單 id 不存在 → %s 回傳 404 且不匯出', async (url, exportMethod) => {
    formService.listForms.mockResolvedValue([{ id: 8, title: '其他表單' }]);

    const res = await request(buildApp())
      .get(url)
      .set('Authorization', 'Bearer admin-token');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ success: false, message: '找不到此表單' });
    expect(exportService[exportMethod]).not.toHaveBeenCalled();
    expect(formService.listSubmissionsByFormId).not.toHaveBeenCalled();
  });

  test.each([
    ['/admin/forms/7/export.csv', undefined, 401],
    ['/admin/forms/7/export.xlsx', 'Bearer insufficient-role', 403],
  ])('未通過權限 → %s 回傳 %i/%i 且不匯出', async (url, authorization, expectedStatus) => {
    const pendingRequest = request(buildApp()).get(url);
    if (authorization) pendingRequest.set('Authorization', authorization);

    const res = await pendingRequest;

    expect(res.status).toBe(expectedStatus);
    expect(formService.listForms).not.toHaveBeenCalled();
    expect(exportService.toCsv).not.toHaveBeenCalled();
    expect(exportService.toXlsxBuffer).not.toHaveBeenCalled();
  });

  test('找到表單 → CSV 路由回傳匯出內容與正確 Content-Type', async () => {
    const form = { id: 7, title: '中文表單', fields: [] };
    const submissions = [{ id: 1, answers: {} }];
    formService.listForms.mockResolvedValue([form]);
    formService.listSubmissionsByFormId.mockResolvedValue(submissions);
    exportService.toCsv.mockReturnValue('mock csv');

    const res = await request(buildApp())
      .get('/admin/forms/7/export.csv')
      .set('Authorization', 'Bearer admin-token');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.text).toBe('mock csv');
    expect(exportService.toCsv).toHaveBeenCalledWith(form, submissions);
  });

  test('找到表單 → xlsx 路由回傳 Buffer 與正確 Content-Type', async () => {
    const form = { id: '7', title: '中文表單', fields: [] };
    const submissions = [{ id: 1, answers: {} }];
    const buffer = Buffer.from('mock xlsx');
    formService.listForms.mockResolvedValue([form]);
    formService.listSubmissionsByFormId.mockResolvedValue(submissions);
    exportService.toXlsxBuffer.mockResolvedValue(buffer);

    const res = await request(buildApp())
      .get('/admin/forms/7/export.xlsx')
      .set('Authorization', 'Bearer admin-token');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    expect(exportService.toXlsxBuffer).toHaveBeenCalledWith(form, submissions);
  });
});
