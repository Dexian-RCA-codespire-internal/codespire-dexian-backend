const supertokens = require('supertokens-node');
const EmailPassword = require('supertokens-node/recipe/emailpassword');
const Session = require('supertokens-node/recipe/session');
const UserMetadata = require('supertokens-node/recipe/usermetadata');
const EmailVerification = require('supertokens-node/recipe/emailverification');
const Passwordless = require('supertokens-node/recipe/passwordless');
const Dashboard = require('supertokens-node/recipe/dashboard');
const UserRoles = require('supertokens-node/recipe/userroles');
const config = require('./index');
const emailService = require('../services/emailService');

// Initialize SuperTokens
const initSuperTokens = () => {
  console.log('🔧 Initializing SuperTokens...');
  supertokens.init({
    framework: 'express',
    supertokens: {
      connectionURI: config.supertokens.connectionURI,
      apiKey: config.supertokens.apiKey,
    },
    appInfo: {
      appName: config.supertokens.appName,
      apiDomain: config.supertokens.apiDomain,      // http://localhost:8081 (backend)
      websiteDomain: config.supertokens.appDomain,  // http://localhost:3001 (frontend)
      // Use standard SuperTokens paths - these must match exactly
      apiBasePath: '/auth',
      websiteBasePath: '/auth',
    },
    recipeList: [
      // Passwordless recipe for OTP functionality
      Passwordless.init({
        contactMethod: 'EMAIL',
        flowType: 'USER_INPUT_CODE_AND_MAGIC_LINK', // Enables both OTP and magic link
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
                  const result = await emailService.sendOTPEmail(email, email, userInputCode);
                  
                  if (!result.success) {
                    console.error('❌ OTP email failed:', result.error);
                    throw new Error(`Failed to send OTP email: ${result.error}`);
                  }
                  
                  console.log('✅ SuperTokens OTP email sent successfully');
                } else if (urlWithLinkCode) {
                  console.log('📧 Sending magic link email to:', email);
                  console.log('📧 Magic link URL:', urlWithLinkCode);
                  const result = await emailService.sendMagicLinkEmail(email, email, urlWithLinkCode);
                  
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
                  const result = await emailService.sendMagicLinkEmail(email, email, urlWithLinkCode);
                  
                  if (!result.success) {
                    console.error('❌ Magic link email failed:', result.error);
                    throw new Error(`Failed to send magic link email: ${result.error}`);
                  }
                  
                  console.log('✅ SuperTokens magic link email sent successfully');
                } else if (userInputCode) {
                  console.log('📧 Sending OTP email to:', email, 'OTP:', userInputCode);
                  const result = await emailService.sendOTPEmail(email, email, userInputCode);
                  
                  if (!result.success) {
                    console.error('❌ OTP email failed:', result.error);
                    throw new Error(`Failed to send OTP email: ${result.error}`);
                  }
                  
                  console.log('✅ SuperTokens OTP email sent successfully');
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
                          const magicLinkUrl = `${process.env.BACKEND_URL || 'http://localhost:8081'}/verify-email?token=${tokenRes.token}`;
                          console.log('📧 Generated magic link URL from user object:', magicLinkUrl);
                          
                          const result = await emailService.sendMagicLinkEmail(userEmail, userEmail, magicLinkUrl);
                          
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
        override: {
          apis: (originalImplementation) => {
            return {
              ...originalImplementation,
              signUpPOST: async function (input) {
                // Call the original signup
                const response = await originalImplementation.signUpPOST(input);
                console.log(response)
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
                    
                    // Create minimal user record in MongoDB
                    await User.createUser(response.user.id);
                    
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
                    
                    // Send OTP verification automatically after signup
                    try {
                      const Passwordless = require('supertokens-node/recipe/passwordless');
                      
                      // Send OTP using Passwordless recipe
                      const otpResponse = await Passwordless.createCode({
                        tenantId: "public",
                        email: email
                      });
                      
                      if (otpResponse.status === "OK") {
                        console.log('✅ OTP sent automatically after signup');
                      } else {
                        console.error('❌ Failed to send OTP after signup:', otpResponse.status);
                      }
                    } catch (verificationError) {
                      console.error('❌ Error sending OTP after signup:', verificationError.message);
                    }
                  } catch (error) {
                    console.error('❌ Error creating user in database via SuperTokens signup:', error);
                    // Don't fail the signup if database creation fails
                  }
                }
                
                return response;
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
        // Enable single session per user
        useDynamicAccessTokenSigningKey: true,
        override: {
          functions: (originalImplementation) => {
            return {
              ...originalImplementation,
              createNewSession: async function (input) {
                console.log('🔐 Creating session for user:', input.userId);
                
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
                
                // Create new session with user role
                const session = await originalImplementation.createNewSession(input);
                
                // Add user role and data to session from SuperTokens
                try {
                  const UserMetadata = require('supertokens-node/recipe/usermetadata');
                  const UserRoles = require('supertokens-node/recipe/userroles');
                  
                  // Get user metadata from SuperTokens
                  const metadata = await UserMetadata.getUserMetadata(input.userId);
                  
                  // Get user roles from SuperTokens
                  const rolesResponse = await UserRoles.getRolesForUser("public", input.userId);
                  const userRoles = rolesResponse.roles || ['admin']; // Default to admin
                  const primaryRole = userRoles[0] || 'admin';
                  
                  await session.mergeIntoAccessTokenPayload({
                    role: primaryRole,
                    email: metadata.metadata.email || '',
                    name: metadata.metadata.name || ''
                  });
                  
                  console.log('✅ Added role to session from SuperTokens:', primaryRole);
                } catch (error) {
                  console.log('⚠️ Error adding role to session:', error.message);
                  // If metadata not found, set default values
                  try {
                    await session.mergeIntoAccessTokenPayload({
                      role: 'admin', // Default role
                      email: '',
                      name: ''
                    });
                    console.log('✅ Added default role to session: admin');
                  } catch (payloadError) {
                    console.log('⚠️ Error setting default role:', payloadError.message);
                  }
                }
                
                return session;
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