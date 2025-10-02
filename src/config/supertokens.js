const supertokens = require('supertokens-node');
const EmailPassword = require('supertokens-node/recipe/emailpassword');
const Session = require('supertokens-node/recipe/session');
const UserMetadata = require('supertokens-node/recipe/usermetadata');
const EmailVerification = require('supertokens-node/recipe/emailverification');
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
      apiDomain: config.supertokens.apiDomain,
      websiteDomain: config.supertokens.apiDomain, // Use API domain for magic links
    },
    recipeList: [
      EmailVerification.init({
        mode: 'OPTIONAL', // or 'REQUIRED' if you want to block APIs until verified
        emailDelivery: {
          service: {
            sendEmail: async (input) => {
              try {
                console.log('📧 SuperTokens email delivery called');
                console.log('📧 Full input object keys:', Object.keys(input));
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
                
                // Force magic link instead of OTP
                if (urlWithLinkCode) {
                  console.log('📧 Sending magic link email to:', email);
                  console.log('📧 Magic link URL:', urlWithLinkCode);
                  // Send magic link email
                  const result = await emailService.sendMagicLinkEmail(email, email, urlWithLinkCode);
                  
                  if (!result.success) {
                    console.error('❌ Magic link email failed:', result.error);
                    throw new Error(`Failed to send magic link email: ${result.error}`);
                  }
                  
                  console.log('✅ SuperTokens magic link email sent successfully');
                } else if (userInputCode) {
                  console.log('📧 OTP received but we want magic links. Generating magic link for:', email);
                  // Generate a proper magic link using SuperTokens
                  try {
                    const EmailVerification = require('supertokens-node/recipe/emailverification');
                    const supertokens = require('supertokens-node');
                    
                    // Get user ID from the input (if available)
                    const userId = input.userId || input.user?.id;
                    if (userId) {
                      const recipeUserId = new supertokens.RecipeUserId(userId);
                      const tokenRes = await EmailVerification.createEmailVerificationToken("public", recipeUserId, email);
                      
                      if (tokenRes.status === "OK") {
                        const magicLinkUrl = `${process.env.BACKEND_URL || 'http://localhost:8000'}/auth/verify-email?token=${tokenRes.token}`;
                        console.log('📧 Generated proper magic link URL:', magicLinkUrl);
                        
                        const result = await emailService.sendMagicLinkEmail(email, email, magicLinkUrl);
                        
                        if (!result.success) {
                          console.error('❌ Magic link email failed:', result.error);
                          throw new Error(`Failed to send magic link email: ${result.error}`);
                        }
                        
                        console.log('✅ SuperTokens magic link email sent successfully (generated from OTP)');
                      } else {
                        console.error('❌ Failed to create email verification token');
                        throw new Error('Failed to create email verification token');
                      }
                    } else {
                      console.error('❌ No user ID available to generate magic link');
                      throw new Error('No user ID available to generate magic link');
                    }
                  } catch (error) {
                    console.error('❌ Error generating magic link:', error);
                    throw error;
                  }
                } else {
                  console.log('⚠️ No userInputCode or urlWithLinkCode provided');
                  console.log('📧 Attempting to extract email from user object or other fields');
                  
                  // Try to get email from user object or other fields
                  const userEmail = input.user?.email || input.email || input.user?.id;
                  if (userEmail) {
                    console.log('📧 Found email in user object:', userEmail);
                    // Generate a magic link for this user
                    try {
                      const EmailVerification = require('supertokens-node/recipe/emailverification');
                      const supertokens = require('supertokens-node');
                      
                      const userId = input.user?.id;
                      if (userId) {
                        const recipeUserId = new supertokens.RecipeUserId(userId);
                        const tokenRes = await EmailVerification.createEmailVerificationToken("public", recipeUserId, userEmail);
                        
                        if (tokenRes.status === "OK") {
                          const magicLinkUrl = `${process.env.BACKEND_URL || 'http://localhost:8000'}/auth/verify-email?token=${tokenRes.token}`;
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
                
                // If signup was successful, create user in our database
                if (response.status === 'OK') {
                  try {
                    const User = require('../models/User');
                    const SuperTokensOTPService = require('../services/supertokensOTPService');
                    
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
                    
                    // Assign default 'user' role to the user in SuperTokens
                    // Temporary : A flow to assign roles to users during signup, change values between existing roles [user/admin]
                    try {
                      const RBACService = require('../services/rbacService');
                      const roleResult = await RBACService.assignRoleToUser(response.user.id, 'user');
                      if (roleResult.success) {
                        console.log('✅ Default user role assigned during signup');
                      } else {
                        console.error('Failed to assign default role during signup:', roleResult.error);
                      }
                    } catch (roleError) {
                      console.error('Error assigning default role during signup:', roleError);
                    }
                    
                    // Create user in our database
                    const user = await User.createUser(
                      response.user.id,
                      email,
                      fullName,
                      firstName,
                      lastName,
                      phone,
                      ['user'], // Default role
                      [] // Permissions will be synced from SuperTokens
                    );
                    
                    // Sync roles and permissions from SuperTokens to MongoDB
                    try {
                      await user.syncRolesFromSuperTokens();
                      await user.syncPermissionsFromSuperTokens();
                      console.log('✅ Roles and permissions synced from SuperTokens');
                    } catch (syncError) {
                      console.error('❌ Error syncing roles/permissions:', syncError);
                    }
                    
                    // Send OTP email for verification
                    try {
                      const otpResult = await SuperTokensOTPService.sendOTP(email);
                      if (otpResult.success) {
                        console.log('✅ OTP sent during SuperTokens signup');
                      } else {
                        console.error('Failed to send OTP during SuperTokens signup:', otpResult.error);
                      }
                    } catch (otpError) {
                      console.error('Error sending OTP during SuperTokens signup:', otpError);
                    }
                    
                    console.log('✅ User created in database via SuperTokens signup');
                  } catch (error) {
                    console.error('❌ Error creating user in database via SuperTokens signup:', error);
                    // Don't fail the signup if database creation fails
                  }
                }
                
                return response;
              },
              // Block login for deactivated users
              signInPOST: async function (input) {
                console.log('🔍 SuperTokens: Login attempt');
                console.log('   Input email:', input.formFields?.find(f => f.id === 'email')?.value);
                
                // First, try the original sign-in
                console.log('🔄 SuperTokens: Calling original signInPOST...');
                const response = await originalImplementation.signInPOST(input);
                console.log('🔍 SuperTokens: Original signInPOST result:');
                console.log('   Status:', response.status);
                console.log('   User ID:', response.user?.id);
                
                // If login was successful, check if user is deactivated
                if (response.status === 'OK') {
                  const userId = response.user.id;
                  console.log('🔍 SuperTokens: Login successful, checking user status:');
                  console.log('   User ID:', userId);
                  
                  // Check for sessions immediately after login
                  console.log('🔍 SuperTokens: Checking sessions after login...');
                  try {
                    const Session = require('supertokens-node/recipe/session');
                    const sessionHandles = await Session.getAllSessionHandlesForUser(userId);
                    console.log('🔍 SuperTokens: Sessions found after login:', sessionHandles.length);
                    console.log('   Session handles:', sessionHandles);
                  } catch (sessionError) {
                    console.error('❌ SuperTokens: Error checking sessions after login:', sessionError);
                  }
                  
                  try {
                    console.log('🔄 SuperTokens: Fetching user metadata...');
                    const { metadata } = await UserMetadata.getUserMetadata(userId);
                    console.log('🔍 SuperTokens: User metadata retrieved:');
                    console.log('   Metadata:', metadata);
                    console.log('   isDeactivated:', metadata?.isDeactivated);
                    
                    if (metadata?.isDeactivated === true) {
                      console.log('❌ SuperTokens: User is deactivated - blocking login');
                      console.log('   Returning WRONG_CREDENTIALS_ERROR to hide deactivation');
                      return {
                        status: 'WRONG_CREDENTIALS_ERROR',
                        message: 'Account deactivated'
                      };
                    }
                    
                    console.log('✅ SuperTokens: User is active - login allowed');
                  } catch (metadataError) {
                    console.error('❌ SuperTokens: Error checking user metadata during login:');
                    console.error('   Error message:', metadataError.message);
                    console.error('   Error stack:', metadataError.stack);
                    console.error('   Full error:', metadataError);
                    // If we can't check metadata, allow the login to continue
                    // This prevents blocking users due to metadata service issues
                    console.log('⚠️ SuperTokens: Allowing login to continue due to metadata error');
                  }
                } else {
                  console.log('⚠️ SuperTokens: Login failed with status:', response.status);
                }
                
                console.log('✅ SuperTokens: Login process completed');
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
        override: {
          apis: (originalImplementation) => {
            return {
              ...originalImplementation,
              // Block session refresh for deactivated users
              refreshPOST: async function (input) {
                console.log('🔍 SuperTokens: Session refresh attempt');
                console.log('   Input:', input);
                
                // First, try to refresh the session
                console.log('🔄 SuperTokens: Calling original refreshPOST...');
                const session = await originalImplementation.refreshPOST(input);
                console.log('🔍 SuperTokens: Original refreshPOST result:', session ? 'Session created' : 'No session');
                
                if (session) {
                  const userId = session.getUserId();
                  console.log('🔍 SuperTokens: Session details:');
                  console.log('   User ID:', userId);
                  console.log('   Session handle:', session.getHandle());
                  
                  // Check if user is deactivated in SuperTokens metadata
                  console.log('🔄 SuperTokens: Checking user metadata for deactivation...');
                  try {
                    const { metadata } = await UserMetadata.getUserMetadata(userId);
                    console.log('🔍 SuperTokens: User metadata retrieved:');
                    console.log('   Metadata:', metadata);
                    console.log('   isDeactivated:', metadata?.isDeactivated);
                    
                    if (metadata?.isDeactivated === true) {
                      console.log('❌ SuperTokens: User is deactivated - revoking session');
                      console.log('   Session handle to revoke:', session.getHandle());
                      
                      await session.revokeSession();
                      console.log('✅ SuperTokens: Session revoked successfully');
                      
                      throw new Session.Error({
                        type: Session.Error.UNAUTHORISED,
                        message: "Account deactivated"
                      });
                    }
                    
                    console.log('✅ SuperTokens: User is active - session refresh allowed');
                  } catch (metadataError) {
                    console.error('❌ SuperTokens: Error checking user metadata:');
                    console.error('   Error message:', metadataError.message);
                    console.error('   Error stack:', metadataError.stack);
                    console.error('   Full error:', metadataError);
                    // If we can't check metadata, allow the session to continue
                    // This prevents blocking users due to metadata service issues
                    console.log('⚠️ SuperTokens: Allowing session to continue due to metadata error');
                  }
                } else {
                  console.log('⚠️ SuperTokens: No session returned from original refreshPOST');
                }
                
                console.log('✅ SuperTokens: Session refresh process completed');
                return session;
              }
            };
          }
        }
      }),
      UserMetadata.init(),
      UserRoles.init({
        skipAddingRolesToAccessTokenPayload: false,
        skipAddingPermissionsToAccessTokenPayload: false,
        override: {
          apis: (originalImplementation) => {
            return {
              ...originalImplementation,
              // Custom role assignment logic
              addRoleToUserPOST: async function (input) {
                console.log('🔐 Adding role to user:', input);
                const response = await originalImplementation.addRoleToUserPOST(input);
                
                // Sync with our MongoDB user model
                if (response.status === 'OK') {
                  try {
                    const User = require('../models/User');
                    const user = await User.findBySupertokensUserId(input.userId);
                    if (user) {
                      if (!user.roles.includes(input.role)) {
                        user.roles.push(input.role);
                        await user.save();
                      }
                      console.log('✅ Role synced to MongoDB for user:', input.userId);
                    }
                  } catch (error) {
                    console.error('❌ Error syncing role to MongoDB:', error);
                  }
                }
                
                return response;
              },
              removeUserRolePOST: async function (input) {
                console.log('🔐 Removing role from user:', input);
                const response = await originalImplementation.removeUserRolePOST(input);
                
                // Sync with our MongoDB user model
                if (response.status === 'OK') {
                  try {
                    const User = require('../models/User');
                    const user = await User.findBySupertokensUserId(input.userId);
                    if (user) {
                      user.roles = user.roles.filter(r => r !== input.role);
                      // Ensure user always has at least 'user' role
                      if (user.roles.length === 0) {
                        user.roles.push('user');
                      }
                      await user.save();
                      console.log('✅ Role removed and synced to MongoDB for user:', input.userId);
                    }
                  } catch (error) {
                    console.error('❌ Error syncing role removal to MongoDB:', error);
                  }
                }
                
                return response;
              }
            };
          }
        }
      }),
      Dashboard.init({
        // No API key required for local development
        // apiKey: config.supertokens.apiKey,
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
};
