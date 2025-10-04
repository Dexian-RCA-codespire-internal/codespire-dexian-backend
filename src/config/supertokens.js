const supertokens = require('supertokens-node');
const EmailPassword = require('supertokens-node/recipe/emailpassword');
const Session = require('supertokens-node/recipe/session');
const UserMetadata = require('supertokens-node/recipe/usermetadata');
const EmailVerification = require('supertokens-node/recipe/emailverification');
const Passwordless = require('supertokens-node/recipe/passwordless');
const Dashboard = require('supertokens-node/recipe/dashboard');
const UserRoles = require('supertokens-node/recipe/userroles');
const config = require('./index');
const User = require('../models/User'); // MongoDB User model
const EmailVerificationService = require('../services/emailVerificationService');

// Initialize SuperTokens
const initSuperTokens = () => {
  console.log('🔧 Initializing SuperTokens...');
  
  // Log simplified token configuration
  console.log(`🔐 Token Configuration:`);
  console.log(`   Access Token: ${config.supertokens.accessTokenMinutes} minutes`);
  console.log(`   Refresh Token: ${config.supertokens.refreshTokenMinutes} minutes`);
  
  supertokens.init({
    framework: 'express',
    supertokens: {
      connectionURI: config.supertokens.connectionURI,
      apiKey: config.supertokens.apiKey,
    },
    // Core SuperTokens configuration for token lifetimes
    accessTokenValidity: config.supertokens.accessTokenValidity,
    refreshTokenValidity: config.supertokens.refreshTokenValidity,
    appInfo: {
      appName: config.supertokens.appName,
      apiDomain: config.supertokens.apiDomain,      // http://localhost:8081 (backend)
      websiteDomain: config.supertokens.appDomain,  // http://localhost:3001 (frontend)
      // Use standard SuperTokens paths - these must match exactly
      apiBasePath: '/auth',
      websiteBasePath: '/',
    },
    recipeList: [
      // Passwordless recipe for OTP functionality
      Passwordless.init({
        contactMethod: 'EMAIL',
        flowType: 'USER_INPUT_CODE_AND_MAGIC_LINK', // Enables both OTP and magic link
        override: {
          apis: (originalImplementation) => {
            return {
              ...originalImplementation,
              consumeCodePOST: async function (input) {
                try {
                  console.log('📧 Passwordless OTP verification POST request received');
                  
                  // Call the original implementation
                  const response = await originalImplementation.consumeCodePOST(input);
                  
                  // If OTP verification was successful, update user metadata and MongoDB
                  if (response.status === 'OK') {
                    try {
                      console.log('✅ OTP verification successful, updating metadata and MongoDB...');
                      
                      const UserMetadata = require('supertokens-node/recipe/usermetadata');
                      const User = require('../models/User');
                      const userId = response.user.id;
                      
                      // Update email verification status in both MongoDB and SuperTokens metadata
                      const updateResult = await EmailVerificationService.updateEmailVerificationStatus(userId, true);
                      
                      if (!updateResult.success) {
                        console.warn('⚠️ Email verification status update had issues:', updateResult.errors);
                      }
                    } catch (metadataError) {
                      console.error('❌ Error updating metadata after OTP verification:', metadataError);
                    }
                  }
                  
                  return response;
                } catch (error) {
                  console.error('❌ Error in OTP verification POST:', error);
                  throw error;
                }
              }
            };
          }
        },
        emailDelivery: {
          service: {
            sendEmail: async (input) => {
              try {
                console.log('📧 SuperTokens Passwordless email delivery called');
                console.log('📧 Input details:', {
                  email: input.email,
                  hasUserInputCode: !!input.userInputCode,
                  hasUrlWithLinkCode: !!input.urlWithLinkCode,
                  userInputCode: input.userInputCode,
                  urlWithLinkCode: input.urlWithLinkCode,
                  type: input.type
                });
                
                const { email, userInputCode, urlWithLinkCode } = input;
                
                if (userInputCode) {
                  console.log('📧 Sending OTP email to:', email, 'OTP:', userInputCode);
                  const emailServiceInstance = require('../services/emailService');
                  const result = await emailServiceInstance.sendOTPEmail(email, email, userInputCode);
                  
                  if (!result.success) {
                    console.error('❌ OTP email failed:', result.error);
                    throw new Error(`Failed to send OTP email: ${result.error}`);
                  }
                  
                  console.log('✅ SuperTokens OTP email sent successfully');
                } else if (urlWithLinkCode) {
                  console.log('📧 Sending magic link email to:', email);
                  console.log('📧 Magic link URL:', urlWithLinkCode);
                  const emailServiceInstance = require('../services/emailService');
                  const result = await emailServiceInstance.sendMagicLinkEmail(email, email, urlWithLinkCode);
                  
                  if (!result.success) {
                    console.error('❌ Magic link email failed:', result.error);
                    throw new Error(`Failed to send magic link email: ${result.error}`);
                  }
                  
                  console.log('✅ SuperTokens magic link email sent successfully');
                } else {
                  console.error('❌ No userInputCode or urlWithLinkCode provided');
                  throw new Error('No verification code or link provided');
                }
              } catch (error) {
                console.error('❌ Failed to send SuperTokens Passwordless email:', error);
                throw error;
              }
            },
          },
        },
      }),
      // Email verification for EmailPassword recipe
      EmailVerification.init({
        mode: 'REQUIRED', // REQUIRED - user must verify email before login
        override: {
          apis: (originalImplementation) => {
            return {
              ...originalImplementation,
              verifyEmailPOST: async function (input) {
                try {
                  console.log('📧 Email verification POST request received');
                  
                  // Call the original implementation
                  const response = await originalImplementation.verifyEmailPOST(input);
                  
                  // If email verification was successful, update user metadata and MongoDB
                  if (response.status === 'OK') {
                    try {
                      console.log('✅ Email verification successful, updating metadata and MongoDB...');
                      
                      const UserMetadata = require('supertokens-node/recipe/usermetadata');
                      const User = require('../models/User');
                      const userId = response.user.id;
                      
                      // Update email verification status in both MongoDB and SuperTokens metadata
                      const updateResult = await EmailVerificationService.updateEmailVerificationStatus(userId, true);
                      
                      if (!updateResult.success) {
                        console.warn('⚠️ Email verification status update had issues:', updateResult.errors);
                      }
                    } catch (metadataError) {
                      console.error('❌ Error updating metadata after email verification:', metadataError);
                    }
                  }
                  
                  return response;
                } catch (error) {
                  console.error('❌ Error in email verification POST:', error);
                  throw error;
                }
              }
            };
          }
        },
        emailDelivery: {
          service: {
            sendEmail: async (input) => {
              try {
                console.log('📧 SuperTokens EmailVerification email delivery called');
                console.log('📧 Input details:', {
                  email: input.email,
                  hasUserInputCode: !!input.userInputCode,
                  hasUrlWithLinkCode: !!input.urlWithLinkCode,
                  userInputCode: input.userInputCode,
                  urlWithLinkCode: input.urlWithLinkCode,
                  type: input.type,
                  user: input.user
                });
                const { email, userInputCode, urlWithLinkCode } = input;
                
                if (urlWithLinkCode) {
                  console.log('📧 Sending magic link email to:', email);
                  console.log('📧 Magic link URL:', urlWithLinkCode);
                  const emailServiceInstance = require('../services/emailService');
                  const result = await emailServiceInstance.sendMagicLinkEmail(email, email, urlWithLinkCode);
                  
                  if (!result.success) {
                    console.error('❌ Magic link email failed:', result.error);
                    throw new Error(`Failed to send magic link email: ${result.error}`);
                  }
                  
                  console.log('✅ SuperTokens magic link email sent successfully');
                } else if (userInputCode) {
                  console.log('📧 ========== SUPERTOKENS OTP EMAIL DELIVERY ==========');
                  console.log('📧 Sending OTP email to:', email);
                  console.log('📧 OTP Code:', userInputCode);
                  console.log('📧 Email context: Registration flow OTP delivery');
                  console.log('📧 ================================================');
                  
                  const emailServiceInstance = require('../services/emailService');
                  const result = await emailServiceInstance.sendOTPEmail(email, email, userInputCode);
                  
                  if (!result.success) {
                    console.error('❌ OTP email failed:', result.error);
                    console.error('❌ Full error details:', result);
                    throw new Error(`Failed to send OTP email: ${result.error}`);
                  }
                  
                  console.log('✅ SuperTokens OTP email sent successfully');
                  console.log('📧 Message ID:', result.messageId);
                  console.log('📧 ================================================');
                } else {
                  console.log('⚠️ No userInputCode or urlWithLinkCode provided');
                  console.log('📧 Attempting to extract email from user object or other fields');
                  
                  const userEmail = input.user?.email || input.email || input.user?.id;
                  if (userEmail) {
                    console.log('📧 Found email in user object:', userEmail);
                    try {
                      const EmailVerification = require('supertokens-node/recipe/emailverification');
                      const supertokens = require('supertokens-node');
                      
                      const userId = input.user?.id;
                      if (userId) {
                        const recipeUserId = new supertokens.RecipeUserId(userId);
                        const tokenRes = await EmailVerification.createEmailVerificationToken("public", recipeUserId, userEmail);
                        
                        if (tokenRes.status === "OK") {
                          const magicLinkUrl = `${process.env.FRONTEND_URL || 'http://localhost:3001'}/verify-email?token=${tokenRes.token}`;
                          console.log('📧 Generated magic link URL from user object:', magicLinkUrl);
                          
                          const emailServiceInstance = require('../services/emailService');
                          const result = await emailServiceInstance.sendMagicLinkEmail(userEmail, userEmail, magicLinkUrl);
                          
                          if (!result.success) {
                            console.error('❌ Magic link email failed:', result.error);
                            throw new Error(`Failed to send magic link email: ${result.error}`);
                          }
                          
                          console.log('✅ SuperTokens magic link email sent successfully (from user object)');
                        } else {
                          console.error('❌ Failed to create email verification token from user object');
                        }
                      } else {
                        console.error('❌ No user ID found in user object');
                      }
                    } catch (error) {
                      console.error('❌ Error generating magic link from user object:', error);
                    }
                  } else {
                    console.error('❌ No email found in any field');
                  }
                }
              } catch (error) {
                console.error('❌ Failed to send SuperTokens email:', error);
                throw error;
              }
            },
          },
        },
      }),
      EmailPassword.init({
        signUpFeature: {
          formFields: [
            {
              id: 'firstName',
              label: 'First Name',
              placeholder: 'Enter your first name',
              optional: true,
            },
            {
              id: 'lastName',
              label: 'Last Name',
              placeholder: 'Enter your last name',
              optional: true,
            },
            {
              id: 'phone',
              label: 'Phone Number',
              placeholder: 'Enter your phone number',
              optional: true,
            },
          ],
        },
        signInFeature: {
          disableDefaultUI: false,
        },
        resetPasswordUsingTokenFeature: {
          disableDefaultUI: false,
        },
        emailDelivery: {
          service: {
            sendEmail: async (input) => {
              try {
                console.log('📧 SuperTokens EmailPassword email delivery called');
                console.log('📧 Input details:', {
                  email: input.email,
                  type: input.type,
                  user: input.user,
                  hasPasswordResetLink: !!input.passwordResetLink,
                  hasUrlWithLinkCode: !!input.urlWithLinkCode,
                  hasResetLink: !!input.resetLink
                });
                
                // Extract email from input or user object
                const email = input.email || input.user?.email;
                const type = input.type;
                
                if (type === 'PASSWORD_RESET') {
                  console.log('📧 Sending password reset email to:', email);
                  
                  // Check if we have a valid email
                  if (!email) {
                    console.error('❌ No email found in input');
                    console.error('❌ Input email:', input.email);
                    console.error('❌ User email:', input.user?.email);
                    console.error('❌ Available properties:', Object.keys(input));
                    throw new Error('Email address not provided');
                  }
                  
                  // Safely log input without circular references
                  const safeInput = {
                    email: input.email,
                    userEmail: input.user?.email,
                    type: input.type,
                    hasPasswordResetLink: !!input.passwordResetLink,
                    hasUrlWithLinkCode: !!input.urlWithLinkCode,
                    hasResetLink: !!input.resetLink,
                    user: input.user ? {
                      id: input.user.id,
                      email: input.user.email
                    } : null
                  };
                  console.log('📧 Password reset input (safe):', JSON.stringify(safeInput, null, 2));
                  
                  // SuperTokens provides the reset link in different possible properties
                  const resetLink = input.passwordResetLink || input.urlWithLinkCode || input.resetLink;
                  
                  if (!resetLink) {
                    console.error('❌ No password reset link found in input');
                    console.error('❌ Available properties:', Object.keys(input));
                    throw new Error('Password reset link not provided');
                  }
                  
                  console.log('📧 Using reset link:', resetLink);
                  
                  // Dynamically import email service to avoid circular dependency issues
                  let emailServiceInstance;
                  try {
                    emailServiceInstance = require('../services/emailService');
                    console.log('📧 Email service imported successfully');
                  } catch (importError) {
                    console.error('❌ Failed to import email service:', importError);
                    throw new Error('Email service import failed');
                  }
                  
                  // Check if email service is properly initialized
                  if (!emailServiceInstance || !emailServiceInstance.transporter) {
                    console.error('❌ Email service not properly initialized');
                    console.error('❌ Email service instance:', !!emailServiceInstance);
                    console.error('❌ Email service transporter:', !!emailServiceInstance?.transporter);
                    throw new Error('Email service not initialized');
                  }
                  
                  console.log('📧 Email service is ready, sending password reset email...');
                  
                  const result = await emailServiceInstance.sendPasswordResetEmail(email, email, resetLink);
                  
                  if (!result.success) {
                    console.error('❌ Password reset email failed:', result.error);
                    throw new Error(`Failed to send password reset email: ${result.error}`);
                  }
                  
                  console.log('✅ SuperTokens password reset email sent successfully');
                } else {
                  console.log('📧 Unhandled email type:', type);
                  // Safely log input without circular references
                  const safeInput = {
                    email: input.email,
                    userEmail: input.user?.email,
                    type: input.type,
                    availableProperties: Object.keys(input)
                  };
                  console.log('📧 Safe input for unhandled type:', JSON.stringify(safeInput, null, 2));
                  // For other email types, you might want to handle them differently
                }
              } catch (error) {
                console.error('❌ Failed to send SuperTokens EmailPassword email:', error);
                console.error('❌ Error stack:', error.stack);
                throw error;
              }
            },
          },
        },
        override: {
          apis: (originalImplementation) => {
            return {
              ...originalImplementation,
              signUpPOST: async function (input) {
                try {
                  console.log('📧 Starting signup process for:', input.formFields);
                  
                  // Call the original signup
                  const response = await originalImplementation.signUpPOST(input);
                  console.log('📧 Original signup response:', response);
                  
                  // If signup was successful, create user in our database
                  if (response.status === 'OK') {
                    try {
                    const User = require('../models/User');
                    // SuperTokensOTPService removed - using built-in email verification
                    
                    // Extract form fields from the request
                    const formFields = input.formFields || [];
                    const emailField = formFields.find(f => f.id === 'email');
                    const firstNameField = formFields.find(f => f.id === 'firstName');
                    const lastNameField = formFields.find(f => f.id === 'lastName');
                    const phoneField = formFields.find(f => f.id === 'phone');
                    
                    const email = emailField?.value;
                    const firstName = firstNameField?.value;
                    const lastName = lastNameField?.value;
                    const phone = phoneField?.value;
                    
                    // Generate full name
                    const fullName = (firstName && lastName) ? `${firstName.trim()} ${lastName.trim()}`.trim() :
                                    firstName ? firstName.trim() :
                                    lastName ? lastName.trim() :
                                    email;
                    
                    // Create enhanced user record in MongoDB
                    console.log('📊 Creating user record in MongoDB for ID:', response.user.id);
                    const mongoUser = await User.createUser(response.user.id, email, {
                      name: fullName,
                      firstName: firstName || '',
                      lastName: lastName || '',
                      phone: phone || '',
                      role: 'admin',
                      roles: ['admin'],
                      status: 'active',
                      isEmailVerified: false,
                      preferences: {
                        theme: 'light',
                        notifications: { email: true, push: true },
                        language: 'en'
                      }
                    });
                    console.log('✅ MongoDB user record created:', mongoUser);
                    
                    // Store user data in SuperTokens metadata
                    const UserMetadata = require('supertokens-node/recipe/usermetadata');
                    const UserRoles = require('supertokens-node/recipe/userroles');
                    
                    await UserMetadata.updateUserMetadata(response.user.id, {
                      email,
                      first_name: firstName || '',
                      last_name: lastName || '',
                      name: fullName,
                      phone: phone || '',
                      role: 'admin', // Default role
                      status: 'active',
                      isEmailVerified: false,
                      createdAt: new Date().toISOString()
                    });
                    
                    // Assign default role
                    await UserRoles.addRoleToUser("public", response.user.id, 'admin');
                    
                    console.log('✅ User created with SuperTokens metadata via signup');
                    
                    // Send both OTP and Magic Link verification automatically after signup
                    try {
                      console.log('📧 Triggering automatic email verification after signup for:', email);
                      
                      // 1. Send Email Verification Magic Link
                      try {
                        console.log('📧 Sending EmailVerification magic link for:', email);
                        const EmailVerification = require('supertokens-node/recipe/emailverification');
                        const supertokens = require('supertokens-node');
                        
                        const recipeUserId = new supertokens.RecipeUserId(response.user.id);
                        const tokenResult = await EmailVerification.createEmailVerificationToken("public", recipeUserId, email);
                        
                        if (tokenResult.status === "OK") {
                          console.log('✅ Email verification token created successfully');
                          
                          // Send the email verification email
                          await EmailVerification.sendEmailVerificationEmail("public", response.user.id, recipeUserId, email);
                          console.log('✅ Email verification magic link sent successfully');
                        } else {
                          console.error('❌ Failed to create email verification token:', tokenResult);
                        }
                      } catch (emailVerificationError) {
                        console.error('❌ Email verification error:', emailVerificationError);
                      }
                      
                      // 2. Create the Passwordless OTP code - this should trigger email automatically
                      const Passwordless = require('supertokens-node/recipe/passwordless');
                      console.log('📧 Creating SuperTokens OTP code for:', email);
                      
                      const otpResponse = await Passwordless.createCode({
                        tenantId: "public",
                        email: email
                      });
                      
                      console.log("📧 SuperTokens OTP Response:", JSON.stringify(otpResponse, null, 2));
                      
                      if (otpResponse.status === "OK") {
                        console.log('✅ SuperTokens OTP code created successfully');
                        console.log('📧 OTP should be sent automatically via configured email delivery service');
                        
                        // Log the details for debugging
                        if (otpResponse.userInputCode) {
                          console.log('📧 Generated OTP code:', otpResponse.userInputCode);
                          console.log('📧 OTP valid until:', otpResponse.codeLifetime);
                        }
                      } else {
                        console.error('❌ Failed to create SuperTokens OTP:', otpResponse.status);
                        
                        // Fallback: Use our direct email service
                        console.log('📧 Falling back to direct email service');
                        const emailServiceInstance = require('../services/emailService');
                        const otp = Math.floor(100000 + Math.random() * 900000).toString();
                        
                        const emailResult = await emailServiceInstance.sendOTPEmail(email, fullName || email, otp);
                        
                        if (emailResult.success) {
                          console.log('✅ Fallback OTP sent via direct email service');
                          console.log('📧 Fallback OTP for testing (remove in production):', otp);
                        } else {
                          console.error('❌ Fallback OTP email also failed:', emailResult.error);
                        }
                      }
                    } catch (verificationError) {
                      console.error('❌ Error in verification flow after signup:', verificationError.message);
                      console.error('📧 Full error details:', verificationError);
                    }
                  } catch (error) {
                    console.error('❌ Error creating user in database via SuperTokens signup:', error);
                    // Don't fail the signup if database creation fails
                  }
                  }
                  
                  return response;
                } catch (signupError) {
                  console.error('❌ CRITICAL ERROR in signup flow:', signupError);
                  console.error('📧 Error stack:', signupError.stack);
                  console.error('📧 Input data:', JSON.stringify(input, null, 2));
                  
                  // Return the error to SuperTokens properly
                  throw signupError;
                }
              }
            };
          }
        },
      }),
      Session.init({
        cookieDomain: process.env.NODE_ENV === 'production' ? config.supertokens.appDomain : undefined,
        cookieSecure: process.env.NODE_ENV === 'production',
        cookieSameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        sessionExpiredStatusCode: 401,
        invalidClaimStatusCode: 403,
        // Enhanced session configuration
        useDynamicAccessTokenSigningKey: true,
        // Session lifetime configuration (using correct SuperTokens parameter names)
        // Based on SuperTokens documentation: accessTokenLifetime in minutes, refreshTokenValidityPeriod in days
        accessTokenLifetime: config.supertokens.accessTokenMinutes, 
        // Convert minutes to fraction of days for SuperTokens
        refreshTokenValidityPeriod: config.supertokens.refreshTokenMinutes / (24 * 60),
        // Enable single session per user (optional - can be disabled for multi-device)
        // useDynamicAccessTokenSigningKey: true,
        override: {
          functions: (originalImplementation) => {
            return {
              ...originalImplementation,
              createNewSession: async function (input) {
                console.log('🔐 Creating enhanced session for user:', input.userId);
                
                // Import SessionService
                const SessionService = require('../services/sessionService');
                
                // Terminate existing sessions for this user (single session enforcement)
                try {
                  const Session = require('supertokens-node/recipe/session');
                  const existingSessions = await Session.getAllSessionHandlesForUser(input.userId);
                  if (existingSessions && existingSessions.length > 0) {
                    console.log(`🔄 Terminating ${existingSessions.length} existing sessions for user:`, input.userId);
                    for (const sessionHandle of existingSessions) {
                      await Session.revokeSession(sessionHandle);
                    }
                  }
                } catch (error) {
                  console.log('⚠️ Error terminating existing sessions:', error.message);
                }
                
                // Create new session
                const session = await originalImplementation.createNewSession(input);
                
                // Use SessionService to create enhanced session data
                try {
                  const sessionPayload = await SessionService.createSession(input.userId, {
                    sessionHandle: session.getHandle()
                  });
                  
                  // Add comprehensive data to session payload
                  await session.mergeIntoAccessTokenPayload(sessionPayload);
                  
                  console.log('✅ Enhanced session created successfully:', {
                    userId: input.userId,
                    role: sessionPayload.role,
                    email: sessionPayload.email,
                    sessionId: sessionPayload.sessionId
                  });
                  
                } catch (error) {
                  console.log('⚠️ Error creating enhanced session data:', error.message);
                  // Fallback to basic session data
                  try {
                    await session.mergeIntoAccessTokenPayload({
                      role: 'admin',
                      email: '',
                      name: '',
                      sessionCreatedAt: new Date().toISOString()
                    });
                    console.log('✅ Added fallback session data');
                  } catch (payloadError) {
                    console.log('⚠️ Error setting fallback session data:', payloadError.message);
                  }
                }
                
                return session;
              },
              
              // Enhanced session refresh
              refreshSession: async function (input) {
                console.log('🔄 Refreshing session:', input.sessionHandle);
                
                try {
                  // Refresh session using original implementation
                  const refreshedSession = await originalImplementation.refreshSession(input);
                  
                  // Update session with fresh user data (non-blocking)
                  try {
                    const SessionService = require('../services/sessionService');
                    const refreshResult = await SessionService.refreshSession(input.sessionHandle);
                    
                    if (refreshResult.success) {
                      console.log('✅ Session refreshed with updated user data');
                    }
                  } catch (refreshError) {
                    console.warn('⚠️ Could not update session with fresh data:', refreshError.message);
                    // Don't fail the refresh if data update fails
                  }
                  
                  return refreshedSession;
                  
                } catch (error) {
                  console.error('❌ Error during session refresh:', error);
                  throw error;
                }
              }
            };
          }
        }
      }),
      UserMetadata.init(),
      UserRoles.init(),
      Dashboard.init({
        // Protect dashboard with API key
        apiKey: process.env.SUPERTOKENS_API_KEY,
        override: {
          functions: (originalImplementation) => {
            return {
              ...originalImplementation,
              // Allow external resources for dashboard
              getCORSAllowedHeaders: () => {
                return [
                  'Content-Type',
                  'rid',
                  'api-key',
                  'Authorization',
                  'x-requested-with',
                  'x-csrf-token'
                ];
              }
            };
          }
        }
      }),
    ],
  });
  console.log('✅ SuperTokens configuration completed');
};

module.exports = {
  initSuperTokens,
  supertokens,
  config: {
    supertokens: {
      connectionURI: config.supertokens.connectionURI,
      apiKey: config.supertokens.apiKey
    },
    appName: config.supertokens.appName,
    apiDomain: config.supertokens.apiDomain,      // http://localhost:8081
    websiteDomain: config.supertokens.appDomain,  // http://localhost:3001
  }
};