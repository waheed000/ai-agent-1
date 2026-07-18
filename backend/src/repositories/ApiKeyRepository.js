/**
 * ApiKeyRepository
 * Data access for the ApiKey model.
 * Raw keys are never stored — only hashes.
 */
import ApiKey from '../models/ApiKey.js';
import { DatabaseError, NotFoundError } from '../utils/errors.js';

class ApiKeyRepository {
  async create(userId, data) {
    try {
      return await ApiKey.create({ user: userId, ...data });
    } catch (err) {
      throw new DatabaseError(`ApiKeyRepository.create failed: ${err.message}`);
    }
  }

  async findById(apiKeyId, userId) {
    try {
      const doc = await ApiKey.findOne({ _id: apiKeyId, user: userId, isDeleted: false }).lean();
      if (!doc) throw new NotFoundError('ApiKey');
      return doc;
    } catch (err) {
      if (err.isOperational) throw err;
      throw new DatabaseError(`ApiKeyRepository.findById failed: ${err.message}`);
    }
  }

  async findByHash(keyHash) {
    try {
      return await ApiKey.findOne({ keyHash, revoked: false, isDeleted: false }).lean();
    } catch (err) {
      throw new DatabaseError(`ApiKeyRepository.findByHash failed: ${err.message}`);
    }
  }

  async findAllByUser(userId) {
    try {
      return await ApiKey.find({ user: userId, isDeleted: false })
        .select('-keyHash')   // never expose the raw hash to callers
        .sort({ createdAt: -1 })
        .lean();
    } catch (err) {
      throw new DatabaseError(`ApiKeyRepository.findAllByUser failed: ${err.message}`);
    }
  }

  async update(apiKeyId, userId, data) {
    try {
      const doc = await ApiKey.findOneAndUpdate(
        { _id: apiKeyId, user: userId, isDeleted: false },
        data,
        { new: true }
      ).lean();
      if (!doc) throw new NotFoundError('ApiKey');
      return doc;
    } catch (err) {
      if (err.isOperational) throw err;
      throw new DatabaseError(`ApiKeyRepository.update failed: ${err.message}`);
    }
  }

  async revoke(apiKeyId, userId) {
    try {
      const doc = await ApiKey.findOneAndUpdate(
        { _id: apiKeyId, user: userId, isDeleted: false, revoked: false },
        { revoked: true, revokedAt: new Date() },
        { new: true }
      ).lean();
      if (!doc) throw new NotFoundError('ApiKey');
      return doc;
    } catch (err) {
      if (err.isOperational) throw err;
      throw new DatabaseError(`ApiKeyRepository.revoke failed: ${err.message}`);
    }
  }

  async softDelete(apiKeyId, userId) {
    try {
      const doc = await ApiKey.findOne({ _id: apiKeyId, user: userId, isDeleted: false });
      if (!doc) throw new NotFoundError('ApiKey');
      doc.isDeleted = true;
      doc.deletedAt = new Date();
      await doc.save();
      return doc;
    } catch (err) {
      if (err.isOperational) throw err;
      throw new DatabaseError(`ApiKeyRepository.softDelete failed: ${err.message}`);
    }
  }

  async touchLastUsed(apiKeyId) {
    try {
      await ApiKey.findByIdAndUpdate(apiKeyId, { lastUsedAt: new Date() });
    } catch {
      // non-fatal
    }
  }
}

export default new ApiKeyRepository();
