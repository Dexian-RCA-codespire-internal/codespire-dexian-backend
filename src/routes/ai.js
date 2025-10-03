/**
 * AI Routes - Auto-documented
 * API endpoints for AI-powered services including playbook recommendations and guidance
 */

const express = require('express');
const router = express.Router();

// Import AI controllers and services
const playbookController = require('../controllers/playbookController');
const playbookVectorizationService = require('../services/playbookVectorizationService');
const { authenticateToken } = require('../middleware/auth');

// Playbook Recommender Routes
router.post('/playbook-recommender/search-guidance', 
  async (req, res) => {
    try {
      const { playbookIds, guidanceQuestion } = req.body;

      // Validate required fields
      if (!playbookIds || !Array.isArray(playbookIds) || playbookIds.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'playbookIds array is required and must not be empty'
        });
      }

      if (!guidanceQuestion || typeof guidanceQuestion !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'guidanceQuestion is required and must be a string'
        });
      }

      // Try vector search first, fallback to direct database search
      let filteredResults = [];
      
      try {
        console.log(`🔍 Vector searching for guidance: "${guidanceQuestion}"`);
        
        // Initialize database and vectorization service if needed
        if (!playbookVectorizationService.initialized) {
          console.log('🔄 Initializing database and vectorization service...');
          
          // Initialize database first
          const { initializeDatabase } = require('../config/database');
          await initializeDatabase();
          console.log('✅ Database initialized');
          
          // Then initialize vectorization service
          await playbookVectorizationService.initialize();
          console.log('✅ Vectorization service initialized');
        }
        
        // Step 1: Search for triggers directly in Qdrant that match the guidance question
        console.log('🔍 Step 1: Searching for triggers in Qdrant that match guidance question...');
        const vectorResults = await playbookVectorizationService.searchSimilarPlaybooks(guidanceQuestion, {
          topK: 50, // Search more results to find matching triggers
          minScore: 0.1 // Lower threshold to catch more potential matches
        });
        
        console.log(`📊 Vector search found ${vectorResults.length} similar playbooks`);
        console.log('📋 Vector results:', vectorResults.map(r => ({ id: r.playbook_id, title: r.title, score: r.score })));
        
        // Step 2: Filter to only include the requested playbook IDs
        filteredResults = vectorResults.filter(result => 
          playbookIds.includes(result.playbook_id)
        );
        
        console.log(`📋 Filtered to ${filteredResults.length} playbooks from requested IDs`);
        
      } catch (vectorError) {
        console.log('⚠️ Vector search failed, falling back to direct database search:', vectorError.message);
        console.log('🔍 Error details:', vectorError.stack);
        
        // Fallback: Get playbooks directly from database
        const playbooks = await playbookController.getPlaybooksByIds(playbookIds);
        
        if (playbooks && playbooks.length > 0) {
          // Convert to vector search result format
          filteredResults = playbooks.map(playbook => ({
            playbook_id: playbook.playbook_id,
            title: playbook.title,
            triggers: playbook.triggers || [],
            score: 0.5 // Default score for fallback
          }));
          console.log(`📋 Fallback found ${filteredResults.length} playbooks from database`);
        }
      }
      
      // Extract matching actions from the vector search results
      const matchingActions = [];
      
      for (const result of filteredResults) {
        console.log(`\n📋 Processing playbook: ${result.playbook_id} (score: ${result.score})`);
        
        if (result.triggers && Array.isArray(result.triggers)) {
          for (const trigger of result.triggers) {
            console.log(`   🔍 Checking trigger: "${trigger.title}"`);
            
            // Use vector similarity for trigger matching
            const triggerText = `${trigger.title} ${trigger.action} ${trigger.expected_outcome}`;
            
            // Simple text matching for triggers within the vector-matched playbooks
            const triggerTitle = trigger.title?.toLowerCase() || '';
            const guidanceLower = guidanceQuestion.toLowerCase();
            
            let isMatch = false;
            
            // Exact match
            if (triggerTitle === guidanceLower) {
              isMatch = true;
              console.log(`      ✅ EXACT MATCH!`);
            }
            // Contains match
            else if (triggerTitle.includes(guidanceLower) || guidanceLower.includes(triggerTitle)) {
              isMatch = true;
              console.log(`      ✅ CONTAINS MATCH!`);
            }
            // Word-by-word match
            else {
              const guidanceWords = guidanceLower.split(/\s+/).filter(word => word.length > 2);
              const titleWords = triggerTitle.split(/\s+/).filter(word => word.length > 2);
              
              let matchingWords = 0;
              for (const word of guidanceWords) {
                if (titleWords.includes(word)) {
                  matchingWords++;
                }
              }
              
              // If more than half the words match, consider it a match
              if (matchingWords > 0 && matchingWords >= Math.ceil(guidanceWords.length / 2)) {
                isMatch = true;
                console.log(`      ✅ WORD MATCH! (${matchingWords}/${guidanceWords.length} words)`);
              }
            }
            
            if (isMatch) {
              console.log(`      ✅ MATCH FOUND!`);
              matchingActions.push({
                trigger_title: trigger.title,
                action: trigger.action,
                expected_outcome: trigger.expected_outcome,
                playbook_title: result.title,
                playbook_id: result.playbook_id,
                trigger_id: trigger.trigger_id,
                similarity_score: result.score
              });
            }
          }
        }
      }

      // Sort by vector similarity score
      matchingActions.sort((a, b) => (b.similarity_score || 0) - (a.similarity_score || 0));

      res.json({
        success: true,
        data: matchingActions,
        total: matchingActions.length,
        searchQuery: guidanceQuestion
      });

    } catch (error) {
      console.error('Error searching AI guidance:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error while searching AI guidance'
      });
    }
  }
);

// Helper function to calculate relevance score
function calculateRelevanceScore(guidanceQuestion, action) {
  const guidance = guidanceQuestion.toLowerCase();
  const title = action.trigger_title?.toLowerCase() || '';
  
  let score = 0;
  
  // Exact match gets highest score
  if (title === guidance) score += 100;
  // Contains match gets high score
  else if (title.includes(guidance) || guidance.includes(title)) score += 50;
  // Word matches
  else {
    const guidanceWords = guidance.split(/\s+/).filter(word => word.length > 2);
    const titleWords = title.split(/\s+/).filter(word => word.length > 2);
    
    let matchingWords = 0;
    for (const word of guidanceWords) {
      if (titleWords.includes(word)) {
        matchingWords++;
      }
    }
    
    score = matchingWords * 10;
  }
  
  return score;
}

module.exports = router;
