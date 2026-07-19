/**
 * CalendarService
 * Provides calendar views of content plan items.
 * Groups items by date and enriches with scheduling metadata.
 */
import PlannerRepository from './PlannerRepository.js';
import CacheService from '../../infrastructure/cache/index.js';
import logger from '../../utils/logger.js';

const CACHE_NS  = 'planner';
const CACHE_TTL = 60 * 5; // 5 min

function toDateKey(date) {
  return new Date(date).toISOString().slice(0, 10);
}

const CalendarService = {
  /**
   * Return content items for a date range, grouped by day.
   */
  async getCalendar(userId, { startDate, endDate } = {}) {
    const start = startDate ? new Date(startDate) : new Date();
    const end   = endDate   ? new Date(endDate)   : (() => { const d = new Date(); d.setDate(d.getDate() + 29); return d; })();

    const cacheKey = `calendar:${userId}:${toDateKey(start)}:${toDateKey(end)}`;

    return CacheService.getOrSet(CACHE_NS, cacheKey, async () => {
      const items = await PlannerRepository.findCalendar(userId, start, end);

      const grouped = {};
      for (const item of items) {
        if (!item.suggestedTime) continue;
        const key = toDateKey(item.suggestedTime);
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(item);
      }

      // Build sorted day-by-day calendar array
      const days = [];
      const cursor = new Date(start);
      while (cursor <= end) {
        const key = toDateKey(cursor);
        days.push({
          date:  key,
          items: grouped[key] || [],
          count: (grouped[key] || []).length,
          hasContent: !!grouped[key],
        });
        cursor.setDate(cursor.getDate() + 1);
      }

      logger.debug('CalendarService: calendar built', {
        userId: String(userId),
        days: days.length,
        totalItems: items.length,
      });

      return {
        startDate: toDateKey(start),
        endDate:   toDateKey(end),
        totalDays: days.length,
        totalItems: items.length,
        days,
      };
    }, CACHE_TTL);
  },

  /**
   * Return a weekly schedule (Mon–Sun) starting from a given date.
   */
  async getWeeklySchedule(userId, weekStart) {
    const start = weekStart ? new Date(weekStart) : (() => {
      const d = new Date();
      const day = d.getDay();
      d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
      d.setHours(0, 0, 0, 0);
      return d;
    })();
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);

    return this.getCalendar(userId, { startDate: start, endDate: end });
  },

  /**
   * Return a monthly schedule.
   */
  async getMonthlySchedule(userId, year, month) {
    const now   = new Date();
    const y = year  || now.getFullYear();
    const m = month || now.getMonth() + 1;
    const start = new Date(y, m - 1, 1);
    const end   = new Date(y, m, 0, 23, 59, 59, 999);

    return this.getCalendar(userId, { startDate: start, endDate: end });
  },
};

export default CalendarService;
