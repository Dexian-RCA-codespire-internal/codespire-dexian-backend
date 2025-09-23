# Ticket Generation Script

This script generates 10,000 realistic tickets and stores them in both MongoDB and Qdrant vector database.

## Prerequisites

1. **MongoDB** - Running on localhost:27017 (or configured via TICKET_DATABASE_URL)
2. **Qdrant Vector Database** - Running on localhost:6333 (or configured via QDRANT_URL)
3. **Environment Variables** - Set up the following environment variables:

```bash
# Required
TICKET_DATABASE_URL=mongodb://localhost:27017/tickets
QDRANT_URL=http://localhost:6333
GEMINI_API_KEY=your_gemini_api_key_here

# Optional
QDRANT_API_KEY=
ENABLE_QDRANT=true
GEMINI_MODEL=text-embedding-004
```

## Usage

### Method 1: Using npm script (Recommended)
```bash
npm run generate:tickets
```

### Method 2: Direct execution
```bash
node scripts/generate-tickets.js
```

## What the Script Does

1. **Clears Existing Data**
   - Removes all existing tickets from MongoDB
   - Clears the Qdrant vector database collection
   - Recreates the Qdrant collection with proper configuration

2. **Generates Realistic Tickets**
   - Creates 10,000 tickets with realistic distribution across categories
   - Categories: Email (15%), Network (12%), Authentication (10%), Hardware (8%), Software (20%), Inquiry/Help (25%), Incident (10%)
   - Each category has similar ticket groupings (3-8 similar tickets per template)
   - Dates range from September 15-23, 2025
   - Includes realistic Splunk server logs (3-7 logs per ticket)

3. **Stores Data**
   - Saves tickets to MongoDB using the existing Ticket model
   - Vectorizes ticket content and stores in Qdrant for similarity search
   - Uses the existing ticketVectorizationService for consistency

## Generated Data Structure

Each ticket includes:
- **Basic Info**: ticket_id, source, status, priority, impact, urgency
- **Content**: short_description, description, category, subcategory
- **Timing**: opened_time, closed_time, resolved_time (within Sept 15-23, 2025)
- **Users**: assigned_to, requester, company, location
- **Logs**: Array of Splunk server logs with realistic service messages
- **Raw Data**: Complete ServiceNow-style raw payload

## Categories and Templates

### Email (15% of tickets)
- Email signature issues
- Send/receive problems
- Spam filtering issues
- Attachment problems
- Outlook synchronization
- Similar tickets: 3-8 per template

### Network (12% of tickets)
- VPN connectivity
- WiFi issues
- Network performance
- Internal resource access
- Similar tickets: 4-7 per template

### Authentication (10% of tickets)
- Password reset issues
- Multi-factor authentication
- Account lockouts
- Single sign-on problems
- Similar tickets: 3-6 per template

### Hardware (8% of tickets)
- Laptop/desktop issues
- Peripheral problems
- Monitor issues
- USB connectivity
- Similar tickets: 2-5 per template

### Software (20% of tickets)
- Application crashes
- Update failures
- License issues
- Installation problems
- Similar tickets: 4-9 per template

### Inquiry/Help (25% of tickets)
- General questions
- Training requests
- Process inquiries
- Information requests
- Similar tickets: 5-12 per template

### Incident (10% of tickets)
- System outages
- Security incidents
- Data corruption
- Service unavailability
- Similar tickets: 2-4 per template

## Splunk Logs

Each ticket includes realistic server logs from various services:
- **auth-service**: Authentication and login events
- **email-service**: SMTP and email processing logs
- **network-service**: Network connectivity and VPN logs
- **app-service**: Application and database logs
- **system-service**: System health and maintenance logs

## Progress Reporting

The script provides real-time progress updates:
- Database initialization status
- Data clearing progress
- Ticket generation progress (every 500 tickets)
- MongoDB save progress (every 100 tickets)
- Vectorization progress
- Final statistics report

## Error Handling

- Graceful handling of database connection issues
- Retry logic for vectorization failures
- Detailed error reporting for troubleshooting
- Cleanup of resources on exit

## Performance

- Generates tickets in memory first for speed
- Saves to MongoDB in batches of 100
- Vectorizes in batches of 10 to avoid rate limiting
- Includes delays between batches to prevent overwhelming services
- Expected runtime: 10-20 minutes depending on system performance

## Verification

After successful completion, you can verify the data:

```bash
# Check MongoDB
mongosh
use tickets
db.tickets.countDocuments()  // Should show 10,000

# Check Qdrant (if you have Qdrant client)
curl http://localhost:6333/collections/ticket/count
```

## Troubleshooting

### Common Issues

1. **MongoDB Connection Error**
   - Ensure MongoDB is running on localhost:27017
   - Check TICKET_DATABASE_URL environment variable
   - Verify database permissions

2. **Qdrant Connection Error**
   - Ensure Qdrant is running on localhost:6333
   - Check QDRANT_URL environment variable
   - Verify Qdrant API key if authentication is enabled

3. **OpenAI API Error**
   - Verify OPENAI_API_KEY is set correctly
   - Check API key has sufficient credits
   - Ensure embedding model is accessible

4. **Memory Issues**
   - Reduce batch sizes in the script if running on limited memory
   - Monitor system resources during execution

### Docker Setup

If using Docker, ensure services are running:
```bash
docker-compose up -d mongodb
# For Qdrant, you may need to add it to docker-compose.yml or run separately
docker run -p 6333:6333 qdrant/qdrant
```
