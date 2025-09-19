// new file servicenow
const Playbook = require('../models/Playbook');

class PlaybookService {
  /**
   * Get all active playbooks
   */
  async getAllPlaybooks() {
    try {
      const playbooks = await Playbook.findActivePlaybooks();
      return {
        success: true,
        data: playbooks,
        count: playbooks.length
      };
    } catch (error) {
      console.error('Error fetching all playbooks:', error);
      return {
        success: false,
        error: 'Failed to fetch playbooks',
        details: error.message
      };
    }
  }

  /**
   * Get playbook by ID
   */
  async getPlaybookById(id) {
    try {
      const playbook = await Playbook.findById(id);
      if (!playbook) {
        return {
          success: false,
          error: 'Playbook not found'
        };
      }
      return {
        success: true,
        data: playbook
      };
    } catch (error) {
      console.error('Error fetching playbook by ID:', error);
      return {
        success: false,
        error: 'Failed to fetch playbook',
        details: error.message
      };
    }
  }

  /**
   * Get playbook by playbook_id
   */
  async getPlaybookByPlaybookId(playbookId) {
    try {
      const playbook = await Playbook.findByPlaybookId(playbookId);
      if (!playbook) {
        return {
          success: false,
          error: 'Playbook not found'
        };
      }
      return {
        success: true,
        data: playbook
      };
    } catch (error) {
      console.error('Error fetching playbook by playbook_id:', error);
      return {
        success: false,
        error: 'Failed to fetch playbook',
        details: error.message
      };
    }
  }

  /**
   * Create new playbook
   */
  async createPlaybook(playbookData) {
    try {
      // Validate required fields
      const requiredFields = ['playbook_id', 'title', 'description', 'steps', 'outcome'];
      for (const field of requiredFields) {
        if (!playbookData[field]) {
          return {
            success: false,
            error: `Missing required field: ${field}`
          };
        }
      }

      // Validate steps
      if (!Array.isArray(playbookData.steps) || playbookData.steps.length === 0) {
        return {
          success: false,
          error: 'At least one step is required'
        };
      }

      // Validate each step
      for (const step of playbookData.steps) {
        const stepRequiredFields = ['step_id', 'title', 'action', 'expected_outcome'];
        for (const field of stepRequiredFields) {
          if (!step[field]) {
            return {
              success: false,
              error: `Missing required field in step: ${field}`
            };
          }
        }
      }

      const playbook = new Playbook(playbookData);
      const savedPlaybook = await playbook.save();
      
      return {
        success: true,
        data: savedPlaybook,
        message: 'Playbook created successfully'
      };
    } catch (error) {
      console.error('Error creating playbook:', error);
      
      if (error.code === 11000) {
        return {
          success: false,
          error: 'Playbook ID already exists'
        };
      }
      
      return {
        success: false,
        error: 'Failed to create playbook',
        details: error.message
      };
    }
  }

  /**
   * Update existing playbook
   */
  async updatePlaybook(id, updateData) {
    try {
      // Validate steps if provided
      if (updateData.steps) {
        if (!Array.isArray(updateData.steps) || updateData.steps.length === 0) {
          return {
            success: false,
            error: 'At least one step is required'
          };
        }

        // Validate each step
        for (const step of updateData.steps) {
          const stepRequiredFields = ['step_id', 'title', 'action', 'expected_outcome'];
          for (const field of stepRequiredFields) {
            if (!step[field]) {
              return {
                success: false,
                error: `Missing required field in step: ${field}`
              };
            }
          }
        }
      }

      const playbook = await Playbook.findByIdAndUpdate(
        id,
        { ...updateData, updated_at: new Date() },
        { new: true, runValidators: true }
      );

      if (!playbook) {
        return {
          success: false,
          error: 'Playbook not found'
        };
      }

      return {
        success: true,
        data: playbook,
        message: 'Playbook updated successfully'
      };
    } catch (error) {
      console.error('Error updating playbook:', error);
      
      if (error.code === 11000) {
        return {
          success: false,
          error: 'Playbook ID already exists'
        };
      }
      
      return {
        success: false,
        error: 'Failed to update playbook',
        details: error.message
      };
    }
  }

  /**
   * Delete playbook (soft delete by setting is_active to false)
   */
  async deletePlaybook(id) {
    try {
      const playbook = await Playbook.findByIdAndUpdate(
        id,
        { is_active: false, updated_at: new Date() },
        { new: true }
      );

      if (!playbook) {
        return {
          success: false,
          error: 'Playbook not found'
        };
      }

      return {
        success: true,
        message: 'Playbook deleted successfully'
      };
    } catch (error) {
      console.error('Error deleting playbook:', error);
      return {
        success: false,
        error: 'Failed to delete playbook',
        details: error.message
      };
    }
  }

  /**
   * Search playbooks by tags
   */
  async searchPlaybooksByTags(tags) {
    try {
      const playbooks = await Playbook.findByTags(tags);
      return {
        success: true,
        data: playbooks,
        count: playbooks.length
      };
    } catch (error) {
      console.error('Error searching playbooks by tags:', error);
      return {
        success: false,
        error: 'Failed to search playbooks',
        details: error.message
      };
    }
  }

  /**
   * Search playbooks by priority
   */
  async searchPlaybooksByPriority(priority) {
    try {
      const playbooks = await Playbook.findByPriority(priority);
      return {
        success: true,
        data: playbooks,
        count: playbooks.length
      };
    } catch (error) {
      console.error('Error searching playbooks by priority:', error);
      return {
        success: false,
        error: 'Failed to search playbooks',
        details: error.message
      };
    }
  }

  /**
   * Search playbooks by text
   */
  async searchPlaybooks(searchTerm) {
    try {
      const playbooks = await Playbook.searchPlaybooks(searchTerm);
      return {
        success: true,
        data: playbooks,
        count: playbooks.length
      };
    } catch (error) {
      console.error('Error searching playbooks:', error);
      return {
        success: false,
        error: 'Failed to search playbooks',
        details: error.message
      };
    }
  }

  /**
   * Advanced search with multiple filters
   */
  async advancedSearch(filters) {
    try {
      const query = { is_active: true };

      // Add text search
      if (filters.search) {
        query.$or = [
          { title: { $regex: filters.search, $options: 'i' } },
          { description: { $regex: filters.search, $options: 'i' } },
          { tags: { $in: [new RegExp(filters.search, 'i')] } }
        ];
      }

      // Add priority filter
      if (filters.priority) {
        query.priority = filters.priority;
      }

      // Add tags filter
      if (filters.tags && filters.tags.length > 0) {
        query.tags = { $in: filters.tags };
      }

      const playbooks = await Playbook.find(query).sort({ created_at: -1 });
      
      return {
        success: true,
        data: playbooks,
        count: playbooks.length
      };
    } catch (error) {
      console.error('Error in advanced search:', error);
      return {
        success: false,
        error: 'Failed to search playbooks',
        details: error.message
      };
    }
  }

  /**
   * Increment usage count for a playbook
   */
  async incrementUsage(playbookId) {
    try {
      const playbook = await Playbook.findByPlaybookId(playbookId);
      if (!playbook) {
        return {
          success: false,
          error: 'Playbook not found'
        };
      }

      await playbook.incrementUsage();
      
      return {
        success: true,
        message: 'Usage count incremented successfully'
      };
    } catch (error) {
      console.error('Error incrementing usage:', error);
      return {
        success: false,
        error: 'Failed to increment usage',
        details: error.message
      };
    }
  }

  /**
   * Get playbook statistics
   */
  async getPlaybookStats() {
    try {
      const totalPlaybooks = await Playbook.countDocuments({ is_active: true });
      const priorityStats = await Playbook.aggregate([
        { $match: { is_active: true } },
        { $group: { _id: '$priority', count: { $sum: 1 } } }
      ]);
      const tagStats = await Playbook.aggregate([
        { $match: { is_active: true } },
        { $unwind: '$tags' },
        { $group: { _id: '$tags', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]);

      return {
        success: true,
        data: {
          total: totalPlaybooks,
          byPriority: priorityStats,
          topTags: tagStats
        }
      };
    } catch (error) {
      console.error('Error getting playbook stats:', error);
      return {
        success: false,
        error: 'Failed to get playbook statistics',
        details: error.message
      };
    }
  }
}

module.exports = new PlaybookService();

