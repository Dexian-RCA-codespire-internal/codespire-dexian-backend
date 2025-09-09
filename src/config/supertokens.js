const supertokens = require('supertokens-node');
const EmailPassword = require('supertokens-node/recipe/emailpassword');
const Session = require('supertokens-node/recipe/session');
const UserMetadata = require('supertokens-node/recipe/usermetadata');
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
      EmailPassword.init({
        signUpFeature: {
          formFields: [
            {
              id: 'name',
              label: 'Name',
              placeholder: 'Enter your name',
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
