/**
 * Impact Assessment Constants
 * Defines impact levels and departments for impact assessment
 */

/**
 * Impact levels for severity assessment
 */
const IMPACT_LEVELS = {
  SEV1_CRITICAL: 'Sev 1 - Critical Impact',
  SEV2_MAJOR: 'Sev 2 - Major Impact', 
  SEV3_NORMAL: 'Sev 3 - Normal Impact',
  SEV4_MINOR: 'Sev 4 - Minor Impact'
};

/**
 * Array of all impact levels for validation
 */
const IMPACT_LEVEL_LIST = Object.values(IMPACT_LEVELS);

/**
 * Departments that can be affected by incidents
 */
const DEPARTMENTS = {
  CUSTOMER_SUPPORT: 'Customer Support',
  IT_OPERATIONS: 'IT Operations',
  SALES: 'Sales',
  FINANCE: 'Finance',
  OTHER: 'Other',
  HUMAN_RESOURCES: 'Human Resources'
};

/**
 * Array of all departments for validation
 */
const DEPARTMENT_LIST = Object.values(DEPARTMENTS);

/**
 * Impact level descriptions for better understanding
 */
const IMPACT_LEVEL_DESCRIPTIONS = {
  [IMPACT_LEVELS.SEV1_CRITICAL]: 'System completely down, critical business functions affected, significant revenue loss',
  [IMPACT_LEVELS.SEV2_MAJOR]: 'Major functionality impacted, multiple users affected, moderate business impact',
  [IMPACT_LEVELS.SEV3_NORMAL]: 'Limited functionality affected, some users impacted, minor business disruption',
  [IMPACT_LEVELS.SEV4_MINOR]: 'Minimal impact, isolated issues, no significant business impact'
};

/**
 * Department descriptions for context
 */
const DEPARTMENT_DESCRIPTIONS = {
  [DEPARTMENTS.CUSTOMER_SUPPORT]: 'Customer-facing support and service operations',
  [DEPARTMENTS.IT_OPERATIONS]: 'IT infrastructure, systems, and technical operations',
  [DEPARTMENTS.SALES]: 'Sales processes, customer acquisition, and revenue generation',
  [DEPARTMENTS.FINANCE]: 'Financial operations, billing, and accounting processes',
  [DEPARTMENTS.OTHER]: 'Other departments not specifically categorized',
  [DEPARTMENTS.HUMAN_RESOURCES]: 'HR processes, employee services, and workforce management'
};

/**
 * Validation function to check if an impact level is valid
 * @param {string} impactLevel - The impact level to validate
 * @returns {boolean} - True if valid, false otherwise
 */
const isValidImpactLevel = (impactLevel) => {
  return IMPACT_LEVEL_LIST.includes(impactLevel);
};

/**
 * Validation function to check if a department is valid
 * @param {string} department - The department to validate
 * @returns {boolean} - True if valid, false otherwise
 */
const isValidDepartment = (department) => {
  return DEPARTMENT_LIST.includes(department);
};

/**
 * Get all impact levels with their descriptions
 * @returns {Array} - Array of objects with level and description
 */
const getAllImpactLevels = () => {
  return IMPACT_LEVEL_LIST.map(level => ({
    level: level,
    description: IMPACT_LEVEL_DESCRIPTIONS[level]
  }));
};

/**
 * Get all departments with their descriptions
 * @returns {Array} - Array of objects with department and description
 */
const getAllDepartments = () => {
  return DEPARTMENT_LIST.map(dept => ({
    department: dept,
    description: DEPARTMENT_DESCRIPTIONS[dept]
  }));
};

/**
 * Get impact level by severity number (1-4)
 * @param {number} severity - Severity number (1-4)
 * @returns {string|null} - Impact level string or null if invalid
 */
const getImpactLevelBySeverity = (severity) => {
  const severityMap = {
    1: IMPACT_LEVELS.SEV1_CRITICAL,
    2: IMPACT_LEVELS.SEV2_MAJOR,
    3: IMPACT_LEVELS.SEV3_NORMAL,
    4: IMPACT_LEVELS.SEV4_MINOR
  };
  return severityMap[severity] || null;
};

/**
 * Get severity number from impact level
 * @param {string} impactLevel - Impact level string
 * @returns {number|null} - Severity number (1-4) or null if invalid
 */
const getSeverityFromImpactLevel = (impactLevel) => {
  const levelMap = {
    [IMPACT_LEVELS.SEV1_CRITICAL]: 1,
    [IMPACT_LEVELS.SEV2_MAJOR]: 2,
    [IMPACT_LEVELS.SEV3_NORMAL]: 3,
    [IMPACT_LEVELS.SEV4_MINOR]: 4
  };
  return levelMap[impactLevel] || null;
};

module.exports = {
  IMPACT_LEVELS,
  IMPACT_LEVEL_LIST,
  DEPARTMENTS,
  DEPARTMENT_LIST,
  IMPACT_LEVEL_DESCRIPTIONS,
  DEPARTMENT_DESCRIPTIONS,
  isValidImpactLevel,
  isValidDepartment,
  getAllImpactLevels,
  getAllDepartments,
  getImpactLevelBySeverity,
  getSeverityFromImpactLevel
};
