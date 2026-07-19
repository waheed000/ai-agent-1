/**
 * AuditRepository
 * Data access for the AuditLog model.
 * Audit logs are immutable — no updates or deletes.
 */
import AuditLog from '../../models/AuditLog.js';
import { DatabaseError } from '../../utils/errors.js';

class AuditRepository {
  async create(data) {
    try {
      return await AuditLog.create(data);
    } catch (err) {
      throw new DatabaseError(`AuditRepository.create failed: ${err.message}`);
    }
  }

  async findByUser(userId, { action, limit = 50, skip = 0 } = {}) {
    try {
      const filter = { user: userId };
      if (action) filter.action = action;
      return await AuditLog.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();
    } catch (err) {
      throw new DatabaseError(`AuditRepository.findByUser failed: ${err.message}`);
    }
  }

  async findByWorkspace(workspaceId, { action, limit = 50, skip = 0 } = {}) {
    try {
      const filter = { workspace: workspaceId };
      if (action) filter.action = action;
      return await AuditLog.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();
    } catch (err) {
      throw new DatabaseError(`AuditRepository.findByWorkspace failed: ${err.message}`);
    }
  }

  async countByUser(userId) {
    try {
      return await AuditLog.countDocuments({ user: userId });
    } catch (err) {
      throw new DatabaseError(`AuditRepository.countByUser failed: ${err.message}`);
    }
  }
}

export default new AuditRepository();
