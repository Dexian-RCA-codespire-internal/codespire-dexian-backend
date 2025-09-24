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
      const { triggers, ...otherData } = req.body;

      // Only accept new "triggers" format - no backward compatibility
      if (!triggers || !Array.isArray(triggers) || triggers.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'triggers array is required and must not be empty'
        });
      }

      // Validate triggers structure
      for (const trigger of triggers) {
        if (!trigger.trigger_id || !trigger.title || !trigger.action || !trigger.expected_outcome) {
          return res.status(400).json({
            success: false,
            error: 'Each trigger must have trigger_id, title, action, and expected_outcome'
          });
        }
      }

      const processedData = {
        ...otherData,
        triggers: triggers
      };

      const result = await playbookService.createPlaybook(processedData);
      
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
      const { triggers, ...otherData } = req.body;

      // Only accept new "triggers" format - no backward compatibility
      if (triggers && (!Array.isArray(triggers) || triggers.length === 0)) {
        return res.status(400).json({
          success: false,
          error: 'triggers array must not be empty if provided'
        });
      }

      // Validate triggers structure if provided
      if (triggers && triggers.length > 0) {
        for (const trigger of triggers) {
          if (!trigger.trigger_id || !trigger.title || !trigger.action || !trigger.expected_outcome) {
            return res.status(400).json({
              success: false,
              error: 'Each trigger must have trigger_id, title, action, and expected_outcome'
            });
          }
        }
      }

      const processedData = {
        ...otherData,
        ...(triggers && { triggers: triggers })
      };

      const result = await playbookService.updatePlaybook(id, processedData);
      
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
   *     summary: Search playbooks (text search)
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
   * /api/v1/playbooks/search/vector:
   *   get:
   *     summary: Search playbooks using vector similarity
   *     tags: [Playbooks]
   *     parameters:
   *       - in: query
   *         name: query
   *         required: true
   *         schema:
   *           type: string
   *         description: Search query for vector similarity
   *       - in: query
   *         name: topK
   *         schema:
   *           type: integer
   *           default: 20
   *         description: Number of results to return
   *       - in: query
   *         name: minScore
   *         schema:
   *           type: number
   *           default: 0.7
   *         description: Minimum similarity score
   *       - in: query
   *         name: priority
   *         schema:
   *           type: string
   *           enum: [Low, Medium, High, Critical]
   *         description: Filter by priority
   *       - in: query
   *         name: tags
   *         schema:
   *           type: string
   *         description: Comma-separated list of tags to filter by
   *     responses:
   *       200:
   *         description: Vector search results
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
   *                     type: object
   *                     properties:
   *                       playbook_id:
   *                         type: string
   *                       title:
   *                         type: string
   *                       description:
   *                         type: string
   *                       similarity_score:
   *                         type: number
   *                 count:
   *                   type: number
   *                 search_type:
   *                   type: string
   */
  async searchPlaybooksByVector(req, res) {
    try {
      const { query, topK, minScore, priority, tags } = req.query;
      
      if (!query) {
        return res.status(400).json({
          success: false,
          error: 'Query parameter is required'
        });
      }

      const options = {};
      if (topK) options.topK = parseInt(topK);
      if (minScore) options.minScore = parseFloat(minScore);
      
      const filters = {};
      if (priority) filters.priority = priority;
      if (tags) filters.tags = tags.split(',').map(tag => tag.trim());
      
      if (Object.keys(filters).length > 0) {
        options.filters = filters;
      }

      const result = await playbookService.searchPlaybooksByVector(query, options);
      
      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('Error in searchPlaybooksByVector controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        details: error.message
      });
    }
  }

  /**
   * @swagger
   * /api/v1/playbooks/search/hybrid:
   *   get:
   *     summary: Hybrid search combining text and vector similarity
   *     tags: [Playbooks]
   *     parameters:
   *       - in: query
   *         name: query
   *         required: true
   *         schema:
   *           type: string
   *         description: Search query
   *       - in: query
   *         name: vectorWeight
   *         schema:
   *           type: number
   *           default: 0.7
   *         description: Weight for vector similarity (0-1)
   *       - in: query
   *         name: textWeight
   *         schema:
   *           type: number
   *           default: 0.3
   *         description: Weight for text search (0-1)
   *       - in: query
   *         name: maxResults
   *         schema:
   *           type: integer
   *           default: 10
   *         description: Maximum number of results
   *       - in: query
   *         name: priority
   *         schema:
   *           type: string
   *           enum: [Low, Medium, High, Critical]
   *         description: Filter by priority
   *       - in: query
   *         name: tags
   *         schema:
   *           type: string
   *         description: Comma-separated list of tags to filter by
   *     responses:
   *       200:
   *         description: Hybrid search results
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
   *                     type: object
   *                     properties:
   *                       playbook_id:
   *                         type: string
   *                       title:
   *                         type: string
   *                       description:
   *                         type: string
   *                       combined_score:
   *                         type: number
   *                       search_type:
   *                         type: string
   *                 count:
   *                   type: number
   *                 search_type:
   *                   type: string
   *                 weights:
   *                   type: object
   */
  async hybridSearchPlaybooks(req, res) {
    try {
      const { query, vectorWeight, textWeight, maxResults, priority, tags } = req.query;
      
      if (!query) {
        return res.status(400).json({
          success: false,
          error: 'Query parameter is required'
        });
      }

      const options = {};
      if (vectorWeight) options.vectorWeight = parseFloat(vectorWeight);
      if (textWeight) options.textWeight = parseFloat(textWeight);
      if (maxResults) options.maxResults = parseInt(maxResults);
      
      const filters = {};
      if (priority) filters.priority = priority;
      if (tags) filters.tags = tags.split(',').map(tag => tag.trim());
      
      if (Object.keys(filters).length > 0) {
        options.filters = filters;
      }

      const result = await playbookService.hybridSearchPlaybooks(query, options);
      
      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('Error in hybridSearchPlaybooks controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        details: error.message
      });
    }
  }

  /**
   * @swagger
   * /api/v1/playbooks/vectorization/health:
   *   get:
   *     summary: Get vectorization service health status
   *     tags: [Playbooks]
   *     responses:
   *       200:
   *         description: Vectorization service health status
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
   *                     qdrant:
   *                       type: boolean
   *                     embeddings:
   *                       type: boolean
   *                     initialized:
   *                       type: boolean
   *                     collection_name:
   *                       type: string
   *                     config:
   *                       type: object
   */
  async getVectorizationHealth(req, res) {
    try {
      const result = await playbookService.getVectorizationHealth();
      
      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('Error in getVectorizationHealth controller:', error);
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

  /**
   * Get playbooks by their IDs
   * @param {Array} playbookIds - Array of playbook IDs
   * @returns {Promise<Array>} Array of playbooks
   */
  async getPlaybooksByIds(playbookIds) {
    try {
      console.log('🔍 Getting playbooks by IDs:', playbookIds);
      
      if (!Array.isArray(playbookIds) || playbookIds.length === 0) {
        throw new Error('playbookIds must be a non-empty array');
      }

      const playbooks = await playbookService.getPlaybooksByIds(playbookIds);
      console.log(`✅ Found ${playbooks.length} playbooks`);
      
      return playbooks;
    } catch (error) {
      console.error('❌ Error getting playbooks by IDs:', error);
      throw error;
    }
  }
}

module.exports = new PlaybookController();

