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
 *         status:
 *           type: string
 *           enum: [active, inactive, suspended]
 *         isEmailVerified:
 *           type: boolean
 *         firstName:
 *           type: string
 *         lastName:
 *           type: string
 *         phone:
 *           type: string
 *         profilePicture:
 *           type: string
 *         preferences:
 *           type: object
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *         lastLoginAt:
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
 * /api/v1/users/verify-session:
 *   get:
 *     summary: Verify current session and get user info
 *     description: Verify the current session and return detailed user information including roles and permissions
 *     tags: [Users]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Session verified successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     session:
 *                       type: object
 *                       properties:
 *                         userId:
 *                           type: string
 *                         sessionHandle:
 *                           type: string
 *                         isValid:
 *                           type: boolean
 *                         accessTokenPayload:
 *                           type: object
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized - Invalid or expired session
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
router.get('/verify-session', getUserRole, userController.verifySession);

/**
 * @swagger
 * /api/v1/users/session/status:
 *   get:
 *     summary: Check session status
 *     description: Lightweight endpoint to check if the current session is valid. Returns 200 if valid, 401 if revoked/expired.
 *     tags: [Users]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Session is valid
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     isValid:
 *                       type: boolean
 *                       example: true
 *                     sessionHandle:
 *                       type: string
 *                     userId:
 *                       type: string
 *                     sessionInfo:
 *                       type: object
 *                       properties:
 *                         timeCreated:
 *                           type: number
 *                         expiry:
 *                           type: number
 *       401:
 *         description: Session is invalid, revoked, or expired
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Session not found"
 *                 message:
 *                   type: string
 *                   example: "Session has been revoked or expired"
 *                 sessionRevoked:
 *                   type: boolean
 *                   example: true
 *       500:
 *         description: Internal server error
 */
router.get('/session/status', getUserRole, userController.checkSessionStatus);

/**
 * @swagger
 * /api/v1/users:
 *   get:
 *     summary: Get all users (Admin only)
 *     description: Returns a paginated list of users in the system with filtering and search capabilities. Requires admin role.
 *     tags: [Users]
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of users per page
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [user, admin, moderator, support]
 *         description: Filter users by role
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive, suspended]
 *         description: Filter users by status
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search users by email, name, firstName, or lastName
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
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         currentPage:
 *                           type: integer
 *                         totalPages:
 *                           type: integer
 *                         totalUsers:
 *                           type: integer
 *                         usersPerPage:
 *                           type: integer
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
 * /api/v1/users:
 *   post:
 *     summary: Create new user (Admin only)
 *     description: Creates a new user in the system. Requires admin role. Can send either OTP or magic link for email verification.
 *     tags: [Users]
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User's email address
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 description: User's password
 *               firstName:
 *                 type: string
 *                 description: User's first name
 *               lastName:
 *                 type: string
 *                 description: User's last name
 *               phone:
 *                 type: string
 *                 description: User's phone number
 *               role:
 *                 type: string
 *                 enum: [user, admin, moderator, support]
 *                 default: admin
 *                 description: User's role
 *               useMagicLink:
 *                 type: boolean
 *                 default: false
 *                 description: If true, sends magic link instead of OTP for email verification
 *     responses:
 *       201:
 *         description: User created successfully
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
 *                     firstName:
 *                       type: string
 *                     lastName:
 *                       type: string
 *                     phone:
 *                       type: string
 *                     role:
 *                       type: string
 *                     isEmailVerified:
 *                       type: boolean
 *                     verificationMethod:
 *                       type: string
 *                       enum: [otp, magic_link]
 *                     createdBy:
 *                       type: string
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Bad request - Missing required fields or invalid data
 *       409:
 *         description: Conflict - User already exists
 *       403:
 *         description: Forbidden - Insufficient permissions
 *       401:
 *         description: Unauthorized - Invalid or expired session
 *       500:
 *         description: Internal server error
 */
router.post('/', requireAdmin, userController.createUser);

/**
 * @swagger
 * /api/v1/users/{userId}:
 *   get:
 *     summary: Get user by ID (Admin only)
 *     description: Returns detailed information about a specific user. Requires admin role.
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
 *     responses:
 *       200:
 *         description: User retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *       404:
 *         description: User not found
 *       403:
 *         description: Forbidden - Insufficient permissions
 *       401:
 *         description: Unauthorized - Invalid or expired session
 *       500:
 *         description: Internal server error
 *   put:
 *     summary: Update user (Admin only)
 *     description: Updates user information. Requires admin role.
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
 *             properties:
 *               firstName:
 *                 type: string
 *                 description: User's first name
 *               lastName:
 *                 type: string
 *                 description: User's last name
 *               phone:
 *                 type: string
 *                 description: User's phone number
 *               role:
 *                 type: string
 *                 enum: [user, admin, moderator, support]
 *                 description: User's role
 *               status:
 *                 type: string
 *                 enum: [active, inactive, suspended]
 *                 description: User's status
 *     responses:
 *       200:
 *         description: User updated successfully
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
 *                     firstName:
 *                       type: string
 *                     lastName:
 *                       type: string
 *                     phone:
 *                       type: string
 *                     role:
 *                       type: string
 *                     status:
 *                       type: string
 *                     isEmailVerified:
 *                       type: boolean
 *                     updatedBy:
 *                       type: string
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Bad request - Invalid data or cannot change own role
 *       403:
 *         description: Forbidden - Insufficient permissions
 *       404:
 *         description: User not found
 *       401:
 *         description: Unauthorized - Invalid or expired session
 *       500:
 *         description: Internal server error
 *   delete:
 *     summary: Delete user (Admin only)
 *     description: Deletes a user from the system. Requires admin role. Cannot delete own account.
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
 *     responses:
 *       200:
 *         description: User deleted successfully
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
 *                     deletedUserId:
 *                       type: string
 *                     deletedUserEmail:
 *                       type: string
 *                     deletedBy:
 *                       type: string
 *                     deletedAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Bad request - Cannot delete own account
 *       403:
 *         description: Forbidden - Insufficient permissions
 *       404:
 *         description: User not found
 *       401:
 *         description: Unauthorized - Invalid or expired session
 *       500:
 *         description: Internal server error
 */
router.get('/:userId', requireAdmin, userController.getUserById);
router.put('/:userId', requireAdmin, userController.updateUser);
router.delete('/:userId', requireAdmin, userController.deleteUser);

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

/**
 * @swagger
 * /api/v1/users/sessions/{sessionHandle}:
 *   delete:
 *     summary: Revoke user session
 *     description: Revoke a specific user session by session handle (Admin only)
 *     tags: [Users]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionHandle
 *         required: true
 *         schema:
 *           type: string
 *         description: Session handle to revoke
 *     responses:
 *       200:
 *         description: Session revoked successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Session revoked successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     revokedSessionHandle:
 *                       type: string
 *                     revokedAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Bad request - Session handle required or session not found
 *       401:
 *         description: Unauthorized - Invalid or missing authentication
 *       403:
 *         description: Forbidden - Insufficient permissions
 *       500:
 *         description: Internal server error
 */
router.delete('/sessions/:sessionHandle', requireAdmin, userController.revokeUserSession);

/**
 * @swagger
 * /api/v1/users/{userId}/sessions:
 *   get:
 *     summary: Get user active sessions (Admin only)
 *     description: Get all active sessions for a specific user
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
 *     responses:
 *       200:
 *         description: User sessions retrieved successfully
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
 *                     userId:
 *                       type: string
 *                     activeSessions:
 *                       type: array
 *                       items:
 *                         type: object
 *                     sessionCount:
 *                       type: integer
 *       403:
 *         description: Forbidden - Insufficient permissions
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 *   delete:
 *     summary: Revoke all user sessions (Admin only)
 *     description: Revoke all active sessions for a specific user
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
 *     responses:
 *       200:
 *         description: All user sessions revoked successfully
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
 *                     revokedSessionsCount:
 *                       type: integer
 *                     revokedAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Bad request - Cannot revoke own sessions
 *       403:
 *         description: Forbidden - Insufficient permissions
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
router.get('/:userId/sessions', requireAdmin, userController.getUserActiveSessions);
router.delete('/:userId/sessions', requireAdmin, userController.revokeAllUserSessions);

/**
 * @swagger
 * /api/v1/users/session/refresh:
 *   post:
 *     summary: Refresh current user session
 *     description: Refresh the current user's session and update user data
 *     tags: [Users]
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Session refreshed successfully
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
 *                     sessionHandle:
 *                       type: string
 *                     refreshedAt:
 *                       type: string
 *                       format: date-time
 *                     userData:
 *                       type: object
 *       400:
 *         description: Bad request - Session refresh failed
 *       401:
 *         description: Unauthorized - Invalid session
 *       500:
 *         description: Internal server error
 */
router.post('/session/refresh', getUserRole, userController.refreshUserSession);

/**
 * @swagger
 * /api/v1/users/session/info:
 *   get:
 *     summary: Get current session information
 *     description: Get detailed information about the current user's session
 *     tags: [Users]
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Session information retrieved successfully
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
 *                     session:
 *                       type: object
 *                       properties:
 *                         sessionHandle:
 *                           type: string
 *                         userId:
 *                           type: string
 *                         accessTokenPayload:
 *                           type: object
 *                     user:
 *                       type: object
 *                     mongoUser:
 *                       type: object
 *       401:
 *         description: Unauthorized - Invalid session
 *       404:
 *         description: Session not found
 *       500:
 *         description: Internal server error
 */
router.get('/session/info', getUserRole, userController.getCurrentSessionInfo);
router.get('/session/active', getUserRole, userController.getCurrentUserActiveSessions);
router.post('/session/sync', getUserRole, userController.syncUserSessions);

module.exports = router;
