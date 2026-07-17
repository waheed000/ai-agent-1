/**
 * WorkspaceRepository
 * Data access for the Workspace model.
 */
import Workspace from '../models/Workspace.js';
import { DatabaseError, NotFoundError } from '../utils/errors.js';

class WorkspaceRepository {
  async create(ownerId, data) {
    try {
      return await Workspace.create({ owner: ownerId, ...data });
    } catch (err) {
      throw new DatabaseError(`WorkspaceRepository.create failed: ${err.message}`);
    }
  }

  async findById(workspaceId) {
    try {
      const doc = await Workspace.findOne({ _id: workspaceId, isDeleted: false }).lean();
      if (!doc) throw new NotFoundError('Workspace');
      return doc;
    } catch (err) {
      if (err.isOperational) throw err;
      throw new DatabaseError(`WorkspaceRepository.findById failed: ${err.message}`);
    }
  }

  async findByOwner(ownerId) {
    try {
      return await Workspace.find({ owner: ownerId, isDeleted: false })
        .sort({ createdAt: -1 })
        .lean();
    } catch (err) {
      throw new DatabaseError(`WorkspaceRepository.findByOwner failed: ${err.message}`);
    }
  }

  async findByMember(userId) {
    try {
      return await Workspace.find({ 'members.user': userId, isDeleted: false })
        .sort({ createdAt: -1 })
        .lean();
    } catch (err) {
      throw new DatabaseError(`WorkspaceRepository.findByMember failed: ${err.message}`);
    }
  }

  async findAllAccessible(userId) {
    try {
      return await Workspace.find({
        $or: [{ owner: userId }, { 'members.user': userId }],
        isDeleted: false,
      }).sort({ createdAt: -1 }).lean();
    } catch (err) {
      throw new DatabaseError(`WorkspaceRepository.findAllAccessible failed: ${err.message}`);
    }
  }

  async findBySlug(slug) {
    try {
      return await Workspace.findOne({ slug, isDeleted: false }).lean();
    } catch (err) {
      throw new DatabaseError(`WorkspaceRepository.findBySlug failed: ${err.message}`);
    }
  }

  async update(workspaceId, data) {
    try {
      const doc = await Workspace.findOneAndUpdate(
        { _id: workspaceId, isDeleted: false },
        data,
        { new: true }
      ).lean();
      if (!doc) throw new NotFoundError('Workspace');
      return doc;
    } catch (err) {
      if (err.isOperational) throw err;
      throw new DatabaseError(`WorkspaceRepository.update failed: ${err.message}`);
    }
  }

  async softDelete(workspaceId) {
    try {
      const doc = await Workspace.findOne({ _id: workspaceId, isDeleted: false });
      if (!doc) throw new NotFoundError('Workspace');
      doc.isDeleted = true;
      doc.deletedAt = new Date();
      await doc.save();
      return doc;
    } catch (err) {
      if (err.isOperational) throw err;
      throw new DatabaseError(`WorkspaceRepository.softDelete failed: ${err.message}`);
    }
  }

  async addMember(workspaceId, memberEntry) {
    try {
      return await Workspace.findByIdAndUpdate(
        workspaceId,
        { $push: { members: memberEntry } },
        { new: true }
      ).lean();
    } catch (err) {
      throw new DatabaseError(`WorkspaceRepository.addMember failed: ${err.message}`);
    }
  }

  async updateMember(workspaceId, userId, role) {
    try {
      return await Workspace.findOneAndUpdate(
        { _id: workspaceId, 'members.user': userId },
        { $set: { 'members.$.role': role } },
        { new: true }
      ).lean();
    } catch (err) {
      throw new DatabaseError(`WorkspaceRepository.updateMember failed: ${err.message}`);
    }
  }

  async removeMember(workspaceId, userId) {
    try {
      return await Workspace.findByIdAndUpdate(
        workspaceId,
        { $pull: { members: { user: userId } } },
        { new: true }
      ).lean();
    } catch (err) {
      throw new DatabaseError(`WorkspaceRepository.removeMember failed: ${err.message}`);
    }
  }
}

export default new WorkspaceRepository();
