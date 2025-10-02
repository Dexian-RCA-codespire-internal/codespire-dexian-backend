/**
 * RCA Root Cause Analysis Agent - Test Example
 * This file demonstrates how to use the RCA Root Cause Analysis agent
 */

const rcaRootCauseAgent = require('./index');

// Example test data based on your requirements
const testCurrentTicket = {
  category: "Network Infrastructure",
  description: "Critical network connectivity issues affecting multiple services and causing service degradation across the platform. Users are experiencing intermittent connection timeouts and slow response times.",
  enhanced_problem: "The network infrastructure is experiencing severe connectivity disruptions that are impacting service availability. Multiple network segments are showing packet loss and latency spikes, resulting in cascading failures across dependent services. The issue appears to be related to recent network configuration changes and is affecting both internal and external traffic flows.",
  impact: [
    "Service degradation affecting 80% of users",
    "Multiple application timeouts",
    "Database connection failures",
    "API response delays exceeding 30 seconds",
    "Customer support ticket volume increased by 300%"
  ],
  priority: "High",
  short_description: "Network connectivity issues causing service degradation",
  source: "ServiceNow",
  urgency: "Critical",
  tickets: [
    {
      category: "Database",
      description: "Primary database connection timeout errors occurring intermittently across multiple application instances. Connection pool exhaustion detected with timeout values exceeding 30 seconds.",
      priority: "High",
      short_description: "Database connection timeout errors",
      source: "ServiceNow",
      urgency: "Critical"
    },
    {
      category: "API Gateway",
      description: "API gateway experiencing high latency and response delays. Multiple endpoints showing degraded performance with response times exceeding normal thresholds.",
      priority: "Medium",
      short_description: "API gateway high latency issues",
      source: "Jira",
      urgency: "High"
    }
  ]
};

const testSimilarTickets = [
  {
    id: "INC-2024-1234",
    short_description: "Database connection pool exhaustion",
    subcategory: "email",
    category: "Database",
    priority: "High",
    description: "Connection pool reached maximum capacity during high traffic periods"
  },
  {
    id: "INC-2024-5678",
    short_description: "API Gateway timeout errors",
    subcategory: "authentication",
    category: "API Gateway",
    priority: "Medium",
    description: "Gateway experiencing intermittent timeout issues under load"
  },
  {
    id: "INC-2024-9012",
    short_description: "Network latency spikes affecting services",
    subcategory: "routing",
    category: "Network Infrastructure",
    priority: "Critical",
    description: "Network infrastructure changes caused service disruptions"
  }
];

/**
 * Test function to demonstrate the RCA Root Cause Analysis agent
 */
async function testRootCauseAnalysis() {
  try {
    console.log('🚀 Starting RCA Root Cause Analysis Test...\n');

    // Test agent capabilities
    console.log('📋 Agent Capabilities:');
    const capabilities = rcaRootCauseAgent.getCapabilities();
    console.log(JSON.stringify(capabilities, null, 2));
    console.log('\n' + '='.repeat(80) + '\n');

    // Test root cause analysis
    console.log('🔍 Analyzing Root Causes...');
    console.log('Current Ticket Category:', testCurrentTicket.category);
    console.log('Current Ticket Description:', testCurrentTicket.short_description);
    console.log('Similar Tickets Count:', testSimilarTickets.length);
    console.log('\n');

    const result = await rcaRootCauseAgent.analyzeRootCauses(testCurrentTicket, testSimilarTickets);

    if (result.success) {
      console.log('✅ Analysis completed successfully!\n');
      
      console.log('📊 Analysis Results:');
      console.log('Total Root Causes Found:', result.analysis_metadata.total_root_causes);
      console.log('Highest Confidence:', result.analysis_metadata.highest_confidence + '%');
      console.log('Average Confidence:', result.analysis_metadata.average_confidence + '%');
      console.log('\n');

      console.log('🔍 Root Causes Identified:');
      console.log('='.repeat(50));
      
      result.results.forEach((cause, index) => {
        console.log(`\n${index + 1}. ${cause.rootCause}`);
        console.log(`   Confidence: ${cause.confidence}%`);
        console.log(`   Analysis: ${cause.analysis}`);
        console.log('   Supporting Evidence:');
        
        cause.evidence.forEach((evidence, evidenceIndex) => {
          console.log(`     ${evidenceIndex + 1}. ${evidence.type}: ${evidence.finding}`);
          console.log(`        Source: ${evidence.source}`);
          
          // Highlight if source includes ticket ID
          if (evidence.source && (evidence.source.includes('INC-') || evidence.source.includes('CHG-') || evidence.source.includes('PRB-'))) {
            console.log(`        📋 Related to historical ticket pattern`);
          }
        });
      });

      console.log('\n' + '='.repeat(80));
      console.log('📋 Full JSON Response:');
      console.log(JSON.stringify(result, null, 2));

    } else {
      console.error('❌ Analysis failed:', result.message);
      console.error('Error details:', result.error);
    }

  } catch (error) {
    console.error('💥 Test failed with error:', error.message);
    console.error(error);
  }
}

/**
 * Test input validation
 */
async function testValidation() {
  console.log('\n🧪 Testing Input Validation...\n');

  // Test missing required fields
  try {
    const invalidTicket = {
      category: "Network",
      // Missing description and short_description
    };

    const result = await rcaRootCauseAgent.analyzeRootCauses(invalidTicket, []);
    console.log('Validation test result:', result.success ? 'FAIL - Should have failed' : 'PASS - Correctly failed validation');
    
    if (!result.success) {
      console.log('Validation error:', result.message);
    }
  } catch (error) {
    console.log('Validation test result: PASS - Correctly threw error');
    console.log('Error message:', error.message);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  async function runAllTests() {
    await testRootCauseAnalysis();
    await testValidation();
  }
  
  runAllTests().catch(console.error);
}

module.exports = {
  testCurrentTicket,
  testSimilarTickets,
  testRootCauseAnalysis,
  testValidation
};