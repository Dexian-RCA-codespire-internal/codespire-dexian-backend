#!/usr/bin/env node

/**
 * Complete Setup Script
 * Generates tickets and vectorizes them with multiple API key failover
 */

const { spawn } = require('child_process');
const path = require('path');

class CompleteSetup {
    constructor() {
        this.steps = [
            { name: 'Clear existing data', command: 'npm run clear:tickets' },
            { name: 'Generate tickets (fast)', command: 'npm run generate:fast' },
            { name: 'Vectorize tickets', command: 'npm run vectorize:tickets' },
            { name: 'Verify results', command: 'npm run verify:tickets' }
        ];
        this.currentStep = 0;
    }

    async runStep(step) {
        return new Promise((resolve, reject) => {
            console.log(`\n🚀 Step ${this.currentStep + 1}: ${step.name}`);
            console.log(`📝 Running: ${step.command}`);
            
            const [cmd, ...args] = step.command.split(' ');
            const process = spawn(cmd, args, { 
                stdio: 'inherit',
                shell: true,
                cwd: path.join(__dirname, '..')
            });
            
            process.on('close', (code) => {
                if (code === 0) {
                    console.log(`✅ Step ${this.currentStep + 1} completed successfully`);
                    resolve();
                } else {
                    console.error(`❌ Step ${this.currentStep + 1} failed with code ${code}`);
                    reject(new Error(`Step failed: ${step.name}`));
                }
            });
            
            process.on('error', (error) => {
                console.error(`❌ Step ${this.currentStep + 1} error:`, error);
                reject(error);
            });
        });
    }

    async run() {
        try {
            console.log('🎯 Starting Complete Setup Process');
            console.log('='.repeat(50));
            
            for (const step of this.steps) {
                try {
                    await this.runStep(step);
                    this.currentStep++;
                } catch (error) {
                    console.error(`💥 Setup failed at step ${this.currentStep + 1}: ${step.name}`);
                    console.log('\n🔄 You can resume manually:');
                    console.log(`   npm run ${step.command.split(' ')[1]}`);
                    throw error;
                }
            }
            
            console.log('\n🎉 Complete setup finished successfully!');
            console.log('✅ 10,000 tickets generated with vector embeddings');
            console.log('✅ All data ready for your AI features');
            
        } catch (error) {
            console.error('💥 Setup failed:', error.message);
            process.exit(1);
        }
    }
}

// Run the complete setup
if (require.main === module) {
    const setup = new CompleteSetup();
    setup.run();
}

module.exports = CompleteSetup;
