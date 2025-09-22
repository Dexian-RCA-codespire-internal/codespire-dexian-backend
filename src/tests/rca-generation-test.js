/**
 * RCA Generation Test Script
 * Simple test to validate RCA generation functionality
 */

const { service } = require('../agents/rca-generation');

// Sample test data based on the user's requirements
const sampleTicketData = {
    ticket_id: "INC0001234",
    short_description: "System outage affecting multiple users in D2M team",
    description: "Complete system outage occurred affecting D2M team members using Softphones. Multiple users unable to access the system.",
    category: "Infrastructure",
    priority: "High",
    impact: "Major",
    urgency: "High",
    source: "ServiceNow"
};

const sampleRCAFields = {
    problem: "D2M team experienced extended wait times and system outages due to Softphone connectivity issues affecting customer service operations",
    timeline: "5/31/2022 4:28a EDT - D2M Team member opened ticket (6686307) with ACD provider for Softphone audio issues. 6/1/2022 2:00a EDT - Ticket resolved. 6/2/2022 9:07a EDT - Peter Walla informed of customer feedback regarding wait times",
    impact: "5 calls abandoned between 8:13p to 11:38p on 5/31/2022. All customers experienced extended wait times. Business operations disrupted with customer satisfaction concerns raised",
    rootCause: "Two team members were using new Softphones (Jabber) instead of Hardphones. Softphone inbound and outbound audio was not functioning. Management was not informed of the outage until issue identification. ACD outage was incorrectly reported as Sev 3 instead of higher severity",
    correctiveActions: "Ensured all agents have Hardphones by 6/10/2022. Created documentation for Hardphone/Softphone usage by 6/17/2022. Established internal escalation policy for ACD provider tickets. Implemented Message of the Day (MotD) process for Sev 1 issues. Created follow-up procedures and severity matrix for ACD provider tickets"
};

async function testRCAGeneration() {
    console.log('🧪 Starting RCA Generation Test...\n');
    
    try {
        // Test 1: Health Check
        console.log('1️⃣ Testing health status...');
        const healthResult = await service.getHealthStatus();
        console.log('Health Status:', healthResult.success ? '✅ Healthy' : '❌ Unhealthy');
        console.log('Details:', healthResult.data?.status, '\n');

        // Test 2: Input Validation
        console.log('2️⃣ Testing input validation...');
        const validation = service.validateRCARequest({
            ticketData: sampleTicketData,
            rcaFields: sampleRCAFields
        });
        console.log('Validation:', validation.isValid ? '✅ Valid' : '❌ Invalid');
        if (!validation.isValid) {
            console.log('Errors:', validation.errors);
        }
        console.log('');

        // Test 3: Generate Technical RCA only
        console.log('3️⃣ Testing technical RCA generation...');
        const startTime = Date.now();
        const technicalResult = await service.generateTechnicalRCA(sampleTicketData, sampleRCAFields);
        const technicalTime = Date.now() - startTime;
        
        if (technicalResult.success) {
            console.log('✅ Technical RCA generated successfully');
            console.log(`⏱️ Processing time: ${technicalTime}ms`);
            console.log(`📄 RCA length: ${technicalResult.data.technicalRCA.length} characters`);
            console.log('📋 Technical RCA Preview:');
            console.log(technicalResult.data.technicalRCA.substring(0, 200) + '...\n');
        } else {
            console.log('❌ Technical RCA generation failed:', technicalResult.error, '\n');
            return;
        }

        // Test 4: Generate Customer Summary
        console.log('4️⃣ Testing customer summary generation...');
        const summaryStartTime = Date.now();
        const summaryResult = await service.generateCustomerSummary(
            technicalResult.data.technicalRCA,
            sampleTicketData
        );
        const summaryTime = Date.now() - summaryStartTime;
        
        if (summaryResult.success) {
            console.log('✅ Customer summary generated successfully');
            console.log(`⏱️ Processing time: ${summaryTime}ms`);
            console.log(`📄 Summary length: ${summaryResult.data.customerSummary.length} characters (target: 300-2000)`);
            console.log('📋 Customer Summary:');
            console.log(summaryResult.data.customerSummary, '\n');
            
            // Check if length is within expected range
            const length = summaryResult.data.customerSummary.length;
            if (length >= 300 && length <= 2000) {
                console.log('✅ Customer summary length is within expected range (300-2000 characters)');
            } else {
                console.log(`⚠️ Customer summary length (${length}) is outside expected range (300-2000)`);
            }
        } else {
            console.log('❌ Customer summary generation failed:', summaryResult.error, '\n');
        }

        // Test 5: Generate Complete RCA
        console.log('5️⃣ Testing complete RCA generation...');
        const completeStartTime = Date.now();
        const completeResult = await service.generateCompleteRCA(sampleTicketData, sampleRCAFields);
        const completeTime = Date.now() - completeStartTime;
        
        if (completeResult.success) {
            console.log('✅ Complete RCA generated successfully');
            console.log(`⏱️ Total processing time: ${completeTime}ms`);
            console.log(`📄 Technical RCA length: ${completeResult.data.technicalRCA.length} characters`);
            console.log(`📄 Customer summary length: ${completeResult.data.customerSummary.length} characters`);
            console.log('📋 Generated at:', completeResult.data.generatedAt, '\n');
        } else {
            console.log('❌ Complete RCA generation failed:', completeResult.error, '\n');
        }

        console.log('🎉 All tests completed successfully!');
        
    } catch (error) {
        console.error('❌ Test failed with error:', error.message);
        console.error('Stack trace:', error.stack);
    }
}

// Run tests if called directly
if (require.main === module) {
    testRCAGeneration()
        .then(() => {
            console.log('\n✅ Test script completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n❌ Test script failed:', error);
            process.exit(1);
        });
}

module.exports = {
    testRCAGeneration,
    sampleTicketData,
    sampleRCAFields
};
