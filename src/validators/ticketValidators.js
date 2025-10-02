/**
 * Ticket Validators
 * Validation rules for ticket CRUD operations
 */

const { body, param, query } = require('express-validator');

/**
 * Validation rules for updating a ticket
 */
const validateTicketUpdate = [
    // Ticket ID parameter validation (accepts MongoDB ObjectId or ticket_id)
    param('ticketId')
        .notEmpty()
        .withMessage('Ticket ID (MongoDB _id) is required')
        .isString()
        .withMessage('Ticket ID must be a string')
        .isLength({ min: 1, max: 100 })
        .withMessage('Ticket ID must be between 1 and 100 characters')
        .trim(),

    // Optional source query parameter
    query('source')
        .optional()
        .isString()
        .withMessage('Source must be a string')
        .isIn(['ServiceNow', 'Jira', 'Remedy', 'Other'])
        .withMessage('Source must be one of: ServiceNow, Jira, Remedy, Other')
        .trim(),

    // Short description validation
    body('short_description')
        .optional()
        .isString()
        .withMessage('Short description must be a string')
        .isLength({ min: 5, max: 500 })
        .withMessage('Short description must be between 5 and 500 characters')
        .trim(),

    // Category validation
    body('category')
        .optional()
        .isString()
        .withMessage('Category must be a string')
        .isLength({ min: 1, max: 200 })
        .withMessage('Category must be between 1 and 200 characters')
        .trim(),

    // Subcategory validation
    body('subcategory')
        .optional()
        .isString()
        .withMessage('Subcategory must be a string')
        .isLength({ min: 1, max: 200 })
        .withMessage('Subcategory must be between 1 and 200 characters')
        .trim(),

    // Status validation
    body('status')
        .optional()
        .isString()
        .withMessage('Status must be a string')
        .isLength({ min: 1, max: 100 })
        .withMessage('Status must be between 1 and 100 characters')
        .trim(),

    // Priority validation
    body('priority')
        .optional()
        .isString()
        .withMessage('Priority must be a string')
        .isLength({ min: 1, max: 50 })
        .withMessage('Priority must be between 1 and 50 characters')
        .trim(),

    // Impact validation
    body('impact')
        .optional()
        .isString()
        .withMessage('Impact must be a string')
        .isLength({ min: 1, max: 50 })
        .withMessage('Impact must be between 1 and 50 characters')
        .trim(),

    // Urgency validation
    body('urgency')
        .optional()
        .isString()
        .withMessage('Urgency must be a string')
        .isLength({ min: 1, max: 50 })
        .withMessage('Urgency must be between 1 and 50 characters')
        .trim(),

    // Date validations
    body('opened_time')
        .optional()
        .isISO8601()
        .withMessage('Opened time must be a valid ISO 8601 date')
        .toDate(),

    body('closed_time')
        .optional()
        .isISO8601()
        .withMessage('Closed time must be a valid ISO 8601 date')
        .toDate(),

    body('resolved_time')
        .optional()
        .isISO8601()
        .withMessage('Resolved time must be a valid ISO 8601 date')
        .toDate(),

    // Requester validation
    body('requester')
        .optional()
        .isObject()
        .withMessage('Requester must be an object'),

    body('requester.id')
        .optional()
        .isString()
        .withMessage('Requester ID must be a string')
        .isLength({ min: 1, max: 100 })
        .withMessage('Requester ID must be between 1 and 100 characters')
        .trim(),

    // Assigned to validation
    body('assigned_to')
        .optional()
        .isObject()
        .withMessage('Assigned to must be an object'),

    body('assigned_to.id')
        .optional()
        .isString()
        .withMessage('Assigned to ID must be a string')
        .isLength({ min: 1, max: 100 })
        .withMessage('Assigned to ID must be between 1 and 100 characters')
        .trim(),

    // Assignment group validation
    body('assignment_group')
        .optional()
        .isObject()
        .withMessage('Assignment group must be an object'),

    body('assignment_group.id')
        .optional()
        .isString()
        .withMessage('Assignment group ID must be a string')
        .isLength({ min: 1, max: 100 })
        .withMessage('Assignment group ID must be between 1 and 100 characters')
        .trim(),

    // Company validation
    body('company')
        .optional()
        .isObject()
        .withMessage('Company must be an object'),

    body('company.id')
        .optional()
        .isString()
        .withMessage('Company ID must be a string')
        .isLength({ min: 1, max: 100 })
        .withMessage('Company ID must be between 1 and 100 characters')
        .trim(),

    // Location validation
    body('location')
        .optional()
        .isObject()
        .withMessage('Location must be an object'),

    body('location.id')
        .optional()
        .isString()
        .withMessage('Location ID must be a string')
        .isLength({ min: 1, max: 100 })
        .withMessage('Location ID must be between 1 and 100 characters')
        .trim(),

    // Tags validation
    body('tags')
        .optional()
        .isArray()
        .withMessage('Tags must be an array')
        .custom((tags) => {
            if (tags && tags.length > 0) {
                const invalidTags = tags.filter(tag => typeof tag !== 'string' || tag.length === 0 || tag.length > 100);
                if (invalidTags.length > 0) {
                    throw new Error('All tags must be non-empty strings with maximum 100 characters');
                }
            }
            return true;
        }),

    // Raw data validation
    body('raw')
        .optional()
        .isObject()
        .withMessage('Raw data must be an object'),

    // Resolution analysis fields validation
    body('problem_step1')
        .optional()
        .isString()
        .withMessage('Problem step 1 must be a string')
        .isLength({ min: 0, max: 2000 })
        .withMessage('Problem step 1 must not exceed 2000 characters')
        .trim(),

    body('timeline_step2')
        .optional()
        .isString()
        .withMessage('Timeline step 2 must be a string')
        .isLength({ min: 0, max: 2000 })
        .withMessage('Timeline step 2 must not exceed 2000 characters')
        .trim(),

    body('impact_step3')
        .optional()
        .isString()
        .withMessage('Impact step 3 must be a string')
        .isLength({ min: 0, max: 2000 })
        .withMessage('Impact step 3 must not exceed 2000 characters')
        .trim(),

    body('findings_step4')
        .optional()
        .isString()
        .withMessage('Findings step 4 must be a string')
        .isLength({ min: 0, max: 2000 })
        .withMessage('Findings step 4 must not exceed 2000 characters')
        .trim(),

    body('root_cause_step5')
        .optional()
        .isString()
        .withMessage('Root cause step 5 must be a string')
        .isLength({ min: 0, max: 2000 })
        .withMessage('Root cause step 5 must not exceed 2000 characters')
        .trim()
];

/**
 * Custom validation to ensure at least one field is provided for update
 */
const validateUpdateData = (req, res, next) => {
    const updateData = req.body;
    
    // Remove fields that shouldn't be updated
    const { _id, ticket_id, source, createdAt, updatedAt, ...allowedFields } = updateData;
    
    if (Object.keys(allowedFields).length === 0) {
        return res.status(400).json({
            success: false,
            message: 'At least one field must be provided for update',
            allowedFields: [
                'short_description',
                'description', 
                'category',
                'subcategory',
                'status',
                'priority',
                'impact',
                'urgency',
                'opened_time',
                'closed_time',
                'resolved_time',
                'requester',
                'assigned_to',
                'assignment_group',
                'company',
                'location',
                'tags',
                'raw',
                'problem_step1',
                'timeline_step2',
                'impact_step3',
                'root_cause_step4',
                'corrective_actions_step5'
            ]
        });
    }
    
    next();
};

module.exports = {
    validateTicketUpdate,
    validateUpdateData
};
