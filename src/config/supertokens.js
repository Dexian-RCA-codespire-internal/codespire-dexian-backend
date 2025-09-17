const supertokens = require('supertokens-node');
const EmailPassword = require('supertokens-node/recipe/emailpassword');
const Session = require('supertokens-node/recipe/session');
const UserMetadata = require('supertokens-node/recipe/usermetadata');
const EmailVerification = require('supertokens-node/recipe/emailverification');
const config = require('./index');
const emailService = require('../services/emailService');
const logger = require('../utils/logger');

// Initialize SuperTokens
const initSuperTokens = () => {
  logger.info('🔧 Initializing SuperTokens...');
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
                logger.info('📧 SuperTokens email delivery called');
                logger.info('📧 Full input object keys:', Object.keys(input));
                logger.info('📧 Input details:', {
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
                  logger.info('📧 Sending magic link email to:', email);
                  logger.info('📧 Magic link URL:', urlWithLinkCode);
                  // Send magic link email
                  const result = await emailService.sendMagicLinkEmail(email, email, urlWithLinkCode);
                  
                  if (!result.success) {
                    console.error('❌ Magic link email failed:', result.error);
                    throw new Error(`Failed to send magic link email: ${result.error}`);
                  }
                  
                  logger.info('✅ SuperTokens magic link email sent successfully');
                } else if (userInputCode) {
                  logger.info('📧 OTP received but we want magic links. Generating magic link for:', email);
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
                        const magicLinkUrl = `${process.env.BACKEND_URL || 'http://localhost:8081'}/auth/verify-email?token=${tokenRes.token}`;
                        logger.info('📧 Generated proper magic link URL:', magicLinkUrl);
                        
                        const result = await emailService.sendMagicLinkEmail(email, email, magicLinkUrl);
                        
                        if (!result.success) {
                          console.error('❌ Magic link email failed:', result.error);
                          throw new Error(`Failed to send magic link email: ${result.error}`);
                        }
                        
                        logger.info('✅ SuperTokens magic link email sent successfully (generated from OTP)');
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
                  logger.info('⚠️ No userInputCode or urlWithLinkCode provided');
                  logger.info('📧 Attempting to extract email from user object or other fields');
                  
                  // Try to get email from user object or other fields
                  const userEmail = input.user?.email || input.email || input.user?.id;
                  if (userEmail) {
                    logger.info('📧 Found email in user object:', userEmail);
                    // Generate a magic link for this user
                    try {
                      const EmailVerification = require('supertokens-node/recipe/emailverification');
                      const supertokens = require('supertokens-node');
                      
                      const userId = input.user?.id;
                      if (userId) {
                        const recipeUserId = new supertokens.RecipeUserId(userId);
                        const tokenRes = await EmailVerification.createEmailVerificationToken("public", recipeUserId, userEmail);
                        
                        if (tokenRes.status === "OK") {
                          const magicLinkUrl = `${process.env.BACKEND_URL || 'http://localhost:8081'}/auth/verify-email?token=${tokenRes.token}`;
                          logger.info('📧 Generated magic link URL from user object:', magicLinkUrl);
                          
                          const result = await emailService.sendMagicLinkEmail(userEmail, userEmail, magicLinkUrl);
                          
                          if (!result.success) {
                            console.error('❌ Magic link email failed:', result.error);
                            throw new Error(`Failed to send magic link email: ${result.error}`);
                          }
                          
                          logger.info('✅ SuperTokens magic link email sent successfully (from user object)');
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
                    
                    // Create user in our database
                    await User.createUser(
                      response.user.id,
                      email,
                      fullName,
                      firstName,
                      lastName,
                      phone
                    );
                    
                    // Send OTP email for verification
                    try {
                      const otpResult = await SuperTokensOTPService.sendOTP(email);
                      if (otpResult.success) {
                        logger.info('✅ OTP sent during SuperTokens signup');
                      } else {
                        console.error('Failed to send OTP during SuperTokens signup:', otpResult.error);
                      }
                    } catch (otpError) {
                      console.error('Error sending OTP during SuperTokens signup:', otpError);
                    }
                    
                    logger.info('✅ User created in database via SuperTokens signup');
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
      }),
      UserMetadata.init(),
    ],
  });
  logger.info('✅ SuperTokens configuration completed');
};

module.exports = {
  initSuperTokens,
  supertokens,
};
