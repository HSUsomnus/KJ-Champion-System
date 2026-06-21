'use strict';

jest.mock('node-cron');
jest.mock('../../services/calendarSyncService');

const cron = require('node-cron');
const calendarSyncService = require('../../services/calendarSyncService');

describe('calendarSync scheduler', () => {
  let start, stop;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    // node-cron mock: schedule() returns a task-like object
    cron.schedule.mockReturnValue({ stop: jest.fn() });
    const mod = require('../calendarSync');
    start = mod.start;
    stop = mod.stop;
  });

  // ── start ──────────────────────────────────────────────────────────────────

  describe('start', () => {
    test('schedules a cron task with the every-minute expression', () => {
      start();
      expect(cron.schedule).toHaveBeenCalledTimes(1);
      const [expr] = cron.schedule.mock.calls[0];
      expect(expr).toBe('* * * * *');
    });

    test('sets timezone to Asia/Taipei', () => {
      start();
      const [, , opts] = cron.schedule.mock.calls[0];
      expect(opts.timezone).toBe('Asia/Taipei');
    });

    test('is idempotent — calling start() twice does not double-schedule', () => {
      start();
      start();
      expect(cron.schedule).toHaveBeenCalledTimes(1);
    });
  });

  // ── stop ───────────────────────────────────────────────────────────────────

  describe('stop', () => {
    test('calls task.stop() and is safe to call multiple times', () => {
      start();
      const fakeTask = cron.schedule.mock.results[0].value;
      stop();
      expect(fakeTask.stop).toHaveBeenCalledTimes(1);
      // Calling stop again should not throw even though task is already cleared
      stop();
      expect(fakeTask.stop).toHaveBeenCalledTimes(1);
    });

    test('does nothing when called before start', () => {
      expect(() => stop()).not.toThrow();
    });

    test('allows start after stop', () => {
      start();
      stop();
      start();
      expect(cron.schedule).toHaveBeenCalledTimes(2);
    });
  });

  // ── runSync (tested via the captured cron callback) ────────────────────────

  describe('runSync (via cron callback)', () => {
    let runSync;

    beforeEach(() => {
      start();
      // The second argument to cron.schedule is the callback
      runSync = cron.schedule.mock.calls[0][1];
    });

    test('calls calendarSyncService.syncRecentMonths', async () => {
      calendarSyncService.syncRecentMonths.mockResolvedValue({ synced: 3, deleted: 1 });
      await runSync();
      expect(calendarSyncService.syncRecentMonths).toHaveBeenCalledTimes(1);
    });

    test('does not throw when syncRecentMonths succeeds', async () => {
      calendarSyncService.syncRecentMonths.mockResolvedValue({ synced: 5, deleted: 0 });
      await expect(runSync()).resolves.toBeUndefined();
    });

    test('catches and swallows errors from syncRecentMonths without crashing', async () => {
      calendarSyncService.syncRecentMonths.mockRejectedValue(new Error('Google API timeout'));
      // runSync must not propagate the error (it logs and swallows)
      await expect(runSync()).resolves.toBeUndefined();
    });

    test('logs error message when syncRecentMonths fails', async () => {
      const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
      calendarSyncService.syncRecentMonths.mockRejectedValue(new Error('network error'));
      await runSync();
      expect(spy).toHaveBeenCalledWith(expect.stringContaining('[calendarSync]'), expect.stringContaining('network error'));
      spy.mockRestore();
    });
  });
});
