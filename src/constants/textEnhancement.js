/**
 * Text Enhancement Constants
 * Defines enhancement types and quality levels for text improvement
 */

/**
 * Text enhancement types
 */
const ENHANCEMENT_TYPES = {
  GRAMMAR: 'grammar',
  CLARITY: 'clarity',
  PROFESSIONAL: 'professional',
  CONCISE: 'concise',
  ENGAGING: 'engaging',
  TECHNICAL: 'technical',
  CREATIVE: 'creative'
};

/**
 * Array of all enhancement types
 */
const ENHANCEMENT_TYPE_LIST = Object.values(ENHANCEMENT_TYPES);

/**
 * Enhancement type descriptions
 */
const ENHANCEMENT_DESCRIPTIONS = {
  [ENHANCEMENT_TYPES.GRAMMAR]: 'Fix grammar, spelling, and punctuation errors',
  [ENHANCEMENT_TYPES.CLARITY]: 'Improve clarity and readability',
  [ENHANCEMENT_TYPES.PROFESSIONAL]: 'Make text more professional and formal',
  [ENHANCEMENT_TYPES.CONCISE]: 'Make text more concise and to the point',
  [ENHANCEMENT_TYPES.ENGAGING]: 'Make text more engaging and interesting',
  [ENHANCEMENT_TYPES.TECHNICAL]: 'Enhance technical accuracy and precision',
  [ENHANCEMENT_TYPES.CREATIVE]: 'Add creative flair and style'
};

/**
 * Quality levels for enhancement
 */
const QUALITY_LEVELS = {
  BASIC: 'basic',
  STANDARD: 'standard',
  PREMIUM: 'premium'
};

/**
 * Array of all quality levels
 */
const QUALITY_LEVEL_LIST = Object.values(QUALITY_LEVELS);

/**
 * Quality level descriptions
 */
const QUALITY_DESCRIPTIONS = {
  [QUALITY_LEVELS.BASIC]: 'Basic improvements with minimal changes',
  [QUALITY_LEVELS.STANDARD]: 'Standard improvements with moderate changes',
  [QUALITY_LEVELS.PREMIUM]: 'Premium improvements with comprehensive changes'
};

/**
 * Text length constraints
 */
const LENGTH_CONSTRAINTS = {
  MIN_LENGTH: 10,
  MAX_LENGTH: 2000,
  ENHANCEMENT_RATIO: 1.3, // Enhanced text should not exceed 130% of original
  MAX_ENHANCEMENT_LENGTH: 2600 // Absolute maximum length
};

/**
 * Enhancement focus areas
 */
const FOCUS_AREAS = {
  GRAMMAR_AND_SPELLING: 'grammar_and_spelling',
  SENTENCE_STRUCTURE: 'sentence_structure',
  WORD_CHOICE: 'word_choice',
  TONE_AND_STYLE: 'tone_and_style',
  CLARITY_AND_READABILITY: 'clarity_and_readability',
  CONCISENESS: 'conciseness',
  PROFESSIONALISM: 'professionalism'
};

/**
 * Array of all focus areas
 */
const FOCUS_AREA_LIST = Object.values(FOCUS_AREAS);

/**
 * Validation function to check if an enhancement type is valid
 * @param {string} enhancementType - The enhancement type to validate
 * @returns {boolean} - True if valid, false otherwise
 */
const isValidEnhancementType = (enhancementType) => {
  return ENHANCEMENT_TYPE_LIST.includes(enhancementType);
};

/**
 * Validation function to check if a quality level is valid
 * @param {string} qualityLevel - The quality level to validate
 * @returns {boolean} - True if valid, false otherwise
 */
const isValidQualityLevel = (qualityLevel) => {
  return QUALITY_LEVEL_LIST.includes(qualityLevel);
};

/**
 * Validation function to check if a focus area is valid
 * @param {string} focusArea - The focus area to validate
 * @returns {boolean} - True if valid, false otherwise
 */
const isValidFocusArea = (focusArea) => {
  return FOCUS_AREA_LIST.includes(focusArea);
};

/**
 * Get all enhancement types with their descriptions
 * @returns {Array} - Array of objects with type and description
 */
const getAllEnhancementTypes = () => {
  return ENHANCEMENT_TYPE_LIST.map(type => ({
    type: type,
    description: ENHANCEMENT_DESCRIPTIONS[type]
  }));
};

/**
 * Get all quality levels with their descriptions
 * @returns {Array} - Array of objects with level and description
 */
const getAllQualityLevels = () => {
  return QUALITY_LEVEL_LIST.map(level => ({
    level: level,
    description: QUALITY_DESCRIPTIONS[level]
  }));
};

/**
 * Get all focus areas
 * @returns {Array} - Array of focus areas
 */
const getAllFocusAreas = () => {
  return FOCUS_AREA_LIST;
};

/**
 * Calculate text enhancement ratio
 * @param {string} originalText - Original text
 * @param {string} enhancedText - Enhanced text
 * @returns {number} - Enhancement ratio
 */
const calculateEnhancementRatio = (originalText, enhancedText) => {
  if (!originalText || !enhancedText) return 0;
  return enhancedText.length / originalText.length;
};

/**
 * Check if enhancement ratio is within acceptable limits
 * @param {string} originalText - Original text
 * @param {string} enhancedText - Enhanced text
 * @returns {boolean} - True if within limits, false otherwise
 */
const isEnhancementRatioAcceptable = (originalText, enhancedText) => {
  const ratio = calculateEnhancementRatio(originalText, enhancedText);
  return ratio <= LENGTH_CONSTRAINTS.ENHANCEMENT_RATIO;
};

module.exports = {
  ENHANCEMENT_TYPES,
  ENHANCEMENT_TYPE_LIST,
  ENHANCEMENT_DESCRIPTIONS,
  QUALITY_LEVELS,
  QUALITY_LEVEL_LIST,
  QUALITY_DESCRIPTIONS,
  LENGTH_CONSTRAINTS,
  FOCUS_AREAS,
  FOCUS_AREA_LIST,
  isValidEnhancementType,
  isValidQualityLevel,
  isValidFocusArea,
  getAllEnhancementTypes,
  getAllQualityLevels,
  getAllFocusAreas,
  calculateEnhancementRatio,
  isEnhancementRatioAcceptable
};
