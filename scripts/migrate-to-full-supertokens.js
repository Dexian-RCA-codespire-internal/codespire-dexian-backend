/**
 * Migration Script: Move from Hybrid to Full SuperTokens
 * 
 * This script migrates existing user data from MongoDB to SuperTokens UserMetadata
 * and UserRoles, then cleans up redundant MongoDB fields.
 */

const mongoose = require('mongoose');
const SuperTokens = require('supertokens-node');
const EmailPassword = require('supertokens-node/recipe/emailpassword');
const Session = require('supertokens-node/recipe/session');
const UserMetadata = require('supertokens-node/recipe/usermetadata');
const UserRoles = require('supertokens-node/recipe/userroles');

// MongoDB connection
async function connectMongoDB() {
  const mongoUrls = [
    'mongodb://localhost:27017/dexian-rca-local',
    'mongodb://localhost:27017/codespire-dexian',
    'mongodb://localhost:27017/testbg'
  ];
  
  for (const url of mongoUrls) {
    try {
      await mongoose.connect(url);
      console.log(`✅ Connected to MongoDB: ${url}`);
      return true;
    } catch (error) {
      console.log(`❌ Failed to connect to ${url}`);
    }
  }
  
  throw new Error('Could not connect to any MongoDB database');
}

// Initialize SuperTokens
function initSuperTokens() {
  SuperTokens.init({
    supertokens: {
      connectionURI: process.env.SUPERTOKENS_CONNECTION_URI || "http://localhost:3567",
      apiKey: process.env.SUPERTOKENS_API_KEY
    },
    appInfo: {
      appName: "Dexian RCA",
      apiDomain: process.env.BACKEND_URL || "http://localhost:8081",
      websiteDomain: process.env.FRONTEND_URL || "http://localhost:3001",
      apiBasePath: "/auth",
      websiteBasePath: "/auth"
    },
    recipeList: [
      EmailPassword.init(),
      Session.init(),
      UserMetadata.init(),
      UserRoles.init()
    ]
  });
  console.log('✅ SuperTokens initialized');
}

// Old User model schema (for migration)
const OldUserSchema = new mongoose.Schema({
  supertokensUserId: String,
  email: String,
  name: String,
  firstName: String,
  lastName: String,
  phone: String,
  role: String,
  status: String,
  isEmailVerified: Boolean,
  preferences: {
    theme: String,
    notifications: {
      email: Boolean,
      push: Boolean
    }
  }
}, { timestamps: true });

const OldUser = mongoose.model('OldUser', OldUserSchema, 'users'); // Use existing 'users' collection

// New minimal User model
const NewUserSchema = new mongoose.Schema({
  supertokensUserId: { type: String, required: true, unique: true },
  lastLoginAt: Date,
  preferences: {
    theme: { type: String, enum: ['light', 'dark'], default: 'light' },
    notifications: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true }
    }
  }
}, { timestamps: true });

const NewUser = mongoose.model('NewUser', NewUserSchema, 'users_minimal'); // New collection

async function migrateUsers() {
  try {
    console.log('🚀 Starting migration to Full SuperTokens...\n');
    
    // Connect to MongoDB
    await connectMongoDB();
    
    // Initialize SuperTokens
    initSuperTokens();
    
    // Get all existing users
    const oldUsers = await OldUser.find({});
    console.log(`📊 Found ${oldUsers.length} users to migrate\n`);
    
    let successCount = 0;
    let errorCount = 0;
    let skippedCount = 0;
    
    for (const oldUser of oldUsers) {
      try {
        console.log(`🔄 Migrating user: ${oldUser.email} (${oldUser.supertokensUserId})`);
        
        // Check if user exists in SuperTokens
        try {
          await UserMetadata.getUserMetadata(oldUser.supertokensUserId);
          console.log(`⚠️  User already has SuperTokens metadata, updating...`);
        } catch (error) {
          // User doesn't have metadata yet, which is expected
        }
        
        // Migrate user data to SuperTokens UserMetadata
        const metadata = {
          email: oldUser.email || '',
          first_name: oldUser.firstName || '',
          last_name: oldUser.lastName || '',
          name: oldUser.name || oldUser.email || '',
          phone: oldUser.phone || '',
          role: oldUser.role || 'admin',
          status: oldUser.status || 'active',
          isEmailVerified: oldUser.isEmailVerified || false,
          createdAt: oldUser.createdAt ? oldUser.createdAt.toISOString() : new Date().toISOString(),
          updatedAt: oldUser.updatedAt ? oldUser.updatedAt.toISOString() : new Date().toISOString()
        };
        
        await UserMetadata.updateUserMetadata(oldUser.supertokensUserId, metadata);
        console.log(`  ✅ Metadata migrated to SuperTokens`);
        
        // Migrate user role to SuperTokens UserRoles
        const role = oldUser.role || 'admin';
        
        // Remove existing roles first
        try {
          const existingRoles = await UserRoles.getRolesForUser("public", oldUser.supertokensUserId);
          for (const existingRole of existingRoles.roles || []) {
            await UserRoles.removeUserRole("public", oldUser.supertokensUserId, existingRole);
          }
        } catch (roleError) {
          // No existing roles, which is fine
        }
        
        // Add new role
        await UserRoles.addRoleToUser("public", oldUser.supertokensUserId, role);
        console.log(`  ✅ Role '${role}' assigned in SuperTokens`);
        
        // Create minimal record in new collection
        await NewUser.findOneAndUpdate(
          { supertokensUserId: oldUser.supertokensUserId },
          {
            supertokensUserId: oldUser.supertokensUserId,
            lastLoginAt: oldUser.lastLoginAt || null,
            preferences: {
              theme: oldUser.preferences?.theme || 'light',
              notifications: {
                email: oldUser.preferences?.notifications?.email !== false,
                push: oldUser.preferences?.notifications?.push !== false
              }
            }
          },
          { upsert: true, new: true }
        );
        console.log(`  ✅ Minimal record created in new collection`);
        
        console.log(`✅ Successfully migrated: ${oldUser.email}\n`);
        successCount++;
        
      } catch (error) {
        console.error(`❌ Error migrating ${oldUser.email}:`, error.message);
        errorCount++;
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 Migration Summary:');
    console.log(`✅ Successfully migrated: ${successCount} users`);
    console.log(`❌ Failed to migrate: ${errorCount} users`);
    console.log(`⏭️  Skipped: ${skippedCount} users`);
    console.log(`📝 Total processed: ${oldUsers.length} users`);
    console.log('='.repeat(60));
    
    if (successCount > 0) {
      console.log('\n🎉 Migration completed successfully!');
      console.log('\n📋 What was migrated:');
      console.log('  • User data → SuperTokens UserMetadata');
      console.log('  • User roles → SuperTokens UserRoles');
      console.log('  • Preferences → New minimal MongoDB collection');
      console.log('\n📋 What you can now do:');
      console.log('  • Remove the old MongoDB user fields');
      console.log('  • Update your User model to the minimal version');
      console.log('  • All user data is now in SuperTokens');
      console.log('  • Check SuperTokens Dashboard to see user data');
      
      console.log('\n⚠️  IMPORTANT: Backup your database before removing old fields!');
      console.log('\n🔧 Next steps:');
      console.log('  1. Test the new APIs');
      console.log('  2. Verify SuperTokens Dashboard shows user data');
      console.log('  3. Update your frontend to use new API responses');
      console.log('  4. Remove old MongoDB user collection (optional)');
    }
    
  } catch (error) {
    console.error('❌ Fatal migration error:', error);
  } finally {
    // Close MongoDB connection
    await mongoose.disconnect();
    console.log('\n👋 MongoDB connection closed');
    process.exit(0);
  }
}

// Check if user wants to proceed
console.log('⚠️  MIGRATION WARNING ⚠️');
console.log('This script will migrate your user data from MongoDB to SuperTokens.');
console.log('Make sure you have backed up your database before proceeding.');
console.log('\nStarting migration in 3 seconds...');

setTimeout(() => {
  migrateUsers();
}, 3000);
