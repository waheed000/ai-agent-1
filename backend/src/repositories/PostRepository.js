/**
 * PostRepository
 * All Post database operations isolated here.
 * Uses upsert on platformPostId + platform to prevent duplicates.
 */

import Post from '../models/Post.js';
import { DatabaseError } from '../utils/errors.js';

class PostRepository {
  /**
   * Upsert a post by its platform-level ID.
   * Prevents duplicate posts on repeated syncs.
   */
  async upsert(userId, connectedAccountId, platform, postData) {
    try {
      return await Post.findOneAndUpdate(
        { platformPostId: postData.platformPostId, platform },
        {
          $set: {
            user: userId,
            connectedAccount: connectedAccountId,
            platform,
            ...postData,
            lastFetchedAt: new Date(),
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      ).lean();
    } catch (err) {
      throw new DatabaseError(`Post.upsert failed: ${err.message}`);
    }
  }

  /**
   * Bulk upsert an array of posts.
   * Returns { upsertedCount, modifiedCount }.
   */
  async bulkUpsert(userId, connectedAccountId, platform, posts) {
    try {
      const ops = posts.map((postData) => ({
        updateOne: {
          filter: { platformPostId: postData.platformPostId, platform },
          update: {
            $set: {
              user: userId,
              connectedAccount: connectedAccountId,
              platform,
              ...postData,
              lastFetchedAt: new Date(),
            },
          },
          upsert: true,
        },
      }));

      if (ops.length === 0) return { upsertedCount: 0, modifiedCount: 0 };
      const result = await Post.bulkWrite(ops, { ordered: false });
      return {
        upsertedCount: result.upsertedCount,
        modifiedCount: result.modifiedCount,
      };
    } catch (err) {
      throw new DatabaseError(`Post.bulkUpsert failed: ${err.message}`);
    }
  }

  /**
   * Find all posts for a user on a platform.
   */
  async findByUserAndPlatform(userId, platform, { limit = 50, skip = 0 } = {}) {
    try {
      return await Post.notDeleted()
        .find({ user: userId, platform })
        .sort({ publishedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();
    } catch (err) {
      throw new DatabaseError(`Post.findByUserAndPlatform failed: ${err.message}`);
    }
  }

  /**
   * Find a post by its platform post ID.
   */
  async findByPlatformPostId(platformPostId, platform) {
    try {
      return await Post.findOne({ platformPostId, platform }).lean();
    } catch (err) {
      throw new DatabaseError(`Post.findByPlatformPostId failed: ${err.message}`);
    }
  }
}

export default new PostRepository();
