const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { requireAdmin, requireAdminOrModerator, getUserRole } = require('../middleware/roleAuth');

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         userId:
 *           type: string
 *           description: SuperTokens user ID
 *         email:
 *           type: string
 *           format: email
 *         name:
 *           type: string
 *         role:
 *           type: string
 *           enum: [user, admin, moderator, support]
 *         isEmailVerified:
 *           type: boolean
 *         createdAt:
 *           type: string
 *           format: date-time
 *         lastLogin:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/v1/users/profile:
 *   get:
 *     summary: Get current user profile
 *     description: Returns the profile information of the currently authenticated user
 *     tags: [Users]
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized - Invalid or expired session
 *       500:
 *         description: Internal server error
 */
router.get('/profile', getUserRole, userController.getUserProfile);

/**
 * @swagger
 * /api/v1/users:
 *   get:
 *     summary: Get all users (Admin only)
 *     description: Returns a list of all users in the system. Requires admin role.
 *     tags: [Users]
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Users retrieved successfully
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
 *                     users:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/User'
 *                     total:
 *                       type: number
 *       403:
 *         description: Forbidden - Insufficient permissions
 *       401:
 *         description: Unauthorized - Invalid or expired session
 *       500:
 *         description: Internal server error
 */
router.get('/', requireAdmin, userController.getAllUsers);

/**
 * @swagger
 * /api/v1/users/{userId}/role:
 *   put:
 *     summary: Update user role (Admin only)
 *     description: Updates the role of a specific user. Requires admin role.
 *     tags: [Users]
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: SuperTokens user ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - role
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [user, admin, moderator, support]
 *                 description: New role for the user
 *     responses:
 *       200:
 *         description: User role updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     userId:
 *                       type: string
 *                     email:
 *                       type: string
 *                     name:
 *                       type: string
 *                     role:
 *                       type: string
 *                     updatedBy:
 *                       type: string
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Bad request - Invalid role or cannot change own role
 *       403:
 *         description: Forbidden - Insufficient permissions
 *       404:
 *         description: User not found
 *       401:
 *         description: Unauthorized - Invalid or expired session
 *       500:
 *         description: Internal server error
 */
router.put('/:userId/role', requireAdmin, userController.updateUserRole);

module.exports = router;
