const supertokens = require('supertokens-node');
const EmailPassword = require('supertokens-node/recipe/emailpassword');
const Session = require('supertokens-node/recipe/session');
const UserMetadata = require('supertokens-node/recipe/usermetadata');
const EmailVerification = require('supertokens-node/recipe/emailverification');
const config = require('./index');
const emailService = require('../services/emailService');

// Initialize SuperTokens
const initSuperTokens = () => {
  supertokens.init({
    framework: 'express',
    supertokens: {
      connectionURI: config.supertokens.connectionURI,
      apiKey: config.supertokens.apiKey,
    },
    appInfo: {
      appName: config.supertokens.appName,
      apiDomain: config.supertokens.apiDomain,
      websiteDomain: config.supertokens.appDomain,
    },
    recipeList: [
      EmailVerification.init({
        mode: 'OPTIONAL', // or 'REQUIRED' if you want to block APIs until verified
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
        emailVerificationFeature: {
          disableDefaultUI: false,
          mode: 'OPTIONAL', // Make email verification optional, not required
          emailDelivery: {
            service: {
              sendEmail: async (input) => {
                try {
                  const { email, userInputCode, urlWithLinkCode } = input;
                  
                  // Check if it's an OTP or magic link
                  if (userInputCode) {
                    // Send OTP email
                    const result = await emailService.sendOTPEmail(email, email, userInputCode);
                    
                    if (!result.success) {
                      throw new Error(`Failed to send OTP email: ${result.error}`);
                    }
                    
                    console.log('✅ SuperTokens OTP email sent successfully');
                  } else if (urlWithLinkCode) {
                    // Send magic link email
                    const result = await emailService.sendMagicLinkEmail(email, email, urlWithLinkCode);
                    
                    if (!result.success) {
                      throw new Error(`Failed to send magic link email: ${result.error}`);
                    }
                    
                    console.log('✅ SuperTokens magic link email sent successfully');
                  }
                } catch (error) {
                  console.error('❌ Failed to send SuperTokens email:', error);
                  throw error;
                }
              },
            },
          },
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
};

module.exports = {
  initSuperTokens,
  supertokens,
};
