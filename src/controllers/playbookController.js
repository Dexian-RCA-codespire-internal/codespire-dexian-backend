// new file servicenow
const playbookService = require('../services/playbookService');

class PlaybookController {
  /**
   * @swagger
   * /api/v1/playbooks:
   *   get:
   *     summary: Get all playbooks
   *     tags: [Playbooks]
   *     responses:
   *       200:
   *         description: List of all playbooks
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   type: array
   *                   items:
   *                     $ref: '#/components/schemas/Playbook'
   *                 count:
   *                   type: number
   */
  async getAllPlaybooks(req, res) {
    try {
      const result = await playbookService.getAllPlaybooks();
      
      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('Error in getAllPlaybooks controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        details: error.message
      });
    }
  }

  /**
   * @swagger
   * /api/v1/playbooks/{id}:
   *   get:
   *     summary: Get playbook by ID
   *     tags: [Playbooks]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Playbook ID
   *     responses:
   *       200:
   *         description: Playbook details
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   $ref: '#/components/schemas/Playbook'
   *       404:
   *         description: Playbook not found
   */
  async getPlaybookById(req, res) {
    try {
      const { id } = req.params;
      const result = await playbookService.getPlaybookById(id);
      
      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(404).json(result);
      }
    } catch (error) {
      console.error('Error in getPlaybookById controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        details: error.message
      });
    }
  }

  /**
   * @swagger
   * /api/v1/playbooks:
   *   post:
   *     summary: Create new playbook
   *     tags: [Playbooks]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/PlaybookInput'
   *     responses:
   *       201:
   *         description: Playbook created successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   $ref: '#/components/schemas/Playbook'
   *                 message:
   *                   type: string
   *       400:
   *         description: Bad request
   */
  async createPlaybook(req, res) {
    try {
      const playbookData = req.body;
      const result = await playbookService.createPlaybook(playbookData);
      
      if (result.success) {
        res.status(201).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('Error in createPlaybook controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        details: error.message
      });
    }
  }

  /**
   * @swagger
   * /api/v1/playbooks/{id}:
   *   put:
   *     summary: Update playbook
   *     tags: [Playbooks]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Playbook ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/PlaybookInput'
   *     responses:
   *       200:
   *         description: Playbook updated successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   $ref: '#/components/schemas/Playbook'
   *                 message:
   *                   type: string
   *       404:
   *         description: Playbook not found
   */
  async updatePlaybook(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;
      const result = await playbookService.updatePlaybook(id, updateData);
      
      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(404).json(result);
      }
    } catch (error) {
      console.error('Error in updatePlaybook controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        details: error.message
      });
    }
  }

  /**
   * @swagger
   * /api/v1/playbooks/{id}:
   *   delete:
   *     summary: Delete playbook
   *     tags: [Playbooks]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Playbook ID
   *     responses:
   *       200:
   *         description: Playbook deleted successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 message:
   *                   type: string
   *       404:
   *         description: Playbook not found
   */
  async deletePlaybook(req, res) {
    try {
      const { id } = req.params;
      const result = await playbookService.deletePlaybook(id);
      
      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(404).json(result);
      }
    } catch (error) {
      console.error('Error in deletePlaybook controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        details: error.message
      });
    }
  }

  /**
   * @swagger
   * /api/v1/playbooks/search:
   *   get:
   *     summary: Search playbooks
   *     tags: [Playbooks]
   *     parameters:
   *       - in: query
   *         name: search
   *         schema:
   *           type: string
   *         description: Text search term
   *       - in: query
   *         name: tags
   *         schema:
   *           type: string
   *         description: Comma-separated list of tags
   *       - in: query
   *         name: priority
   *         schema:
   *           type: string
   *           enum: [Low, Medium, High, Critical]
   *         description: Priority level
   *     responses:
   *       200:
   *         description: Search results
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   type: array
   *                   items:
   *                     $ref: '#/components/schemas/Playbook'
   *                 count:
   *                   type: number
   */
  async searchPlaybooks(req, res) {
    try {
      const { search, tags, priority } = req.query;
      
      // If only search term is provided, use text search
      if (search && !tags && !priority) {
        const result = await playbookService.searchPlaybooks(search);
        return res.status(200).json(result);
      }
      
      // If only tags are provided
      if (tags && !search && !priority) {
        const tagArray = tags.split(',').map(tag => tag.trim());
        const result = await playbookService.searchPlaybooksByTags(tagArray);
        return res.status(200).json(result);
      }
      
      // If only priority is provided
      if (priority && !search && !tags) {
        const result = await playbookService.searchPlaybooksByPriority(priority);
        return res.status(200).json(result);
      }
      
      // Advanced search with multiple filters
      const filters = {};
      if (search) filters.search = search;
      if (tags) filters.tags = tags.split(',').map(tag => tag.trim());
      if (priority) filters.priority = priority;
      
      const result = await playbookService.advancedSearch(filters);
      res.status(200).json(result);
    } catch (error) {
      console.error('Error in searchPlaybooks controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        details: error.message
      });
    }
  }

  /**
   * @swagger
   * /api/v1/playbooks/stats:
   *   get:
   *     summary: Get playbook statistics
   *     tags: [Playbooks]
   *     responses:
   *       200:
   *         description: Playbook statistics
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   type: object
   *                   properties:
   *                     total:
   *                       type: number
   *                     byPriority:
   *                       type: array
   *                     topTags:
   *                       type: array
   */
  async getPlaybookStats(req, res) {
    try {
      const result = await playbookService.getPlaybookStats();
      
      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('Error in getPlaybookStats controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        details: error.message
      });
    }
  }

  /**
   * @swagger
   * /api/v1/playbooks/{playbookId}/increment-usage:
   *   post:
   *     summary: Increment usage count for a playbook
   *     tags: [Playbooks]
   *     parameters:
   *       - in: path
   *         name: playbookId
   *         required: true
   *         schema:
   *           type: string
   *         description: Playbook ID
   *     responses:
   *       200:
   *         description: Usage count incremented successfully
   *       404:
   *         description: Playbook not found
   */
  async incrementUsage(req, res) {
    try {
      const { playbookId } = req.params;
      const result = await playbookService.incrementUsage(playbookId);
      
      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(404).json(result);
      }
    } catch (error) {
      console.error('Error in incrementUsage controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        details: error.message
      });
    }
  }
}

module.exports = new PlaybookController();

