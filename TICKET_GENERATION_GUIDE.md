# 🎫 Ticket Generation Guide

This guide shows you how to generate 10,000 realistic tickets for your application.

## 🚀 Quick Start

### Step 1: Set up Environment Variables
Create a `.env` file in the root directory with the following:

```bash
# Required
TICKET_DATABASE_URL=mongodb://localhost:27017/tickets
QDRANT_URL=http://localhost:6333
GEMINI_API_KEY=your_gemini_api_key_here

# Optional
ENABLE_QDRANT=true
GEMINI_MODEL=text-embedding-004
```

### Step 2: Start Required Services

**MongoDB** (if not using Docker):
```bash
mongod --dbpath /path/to/your/data
```

**Qdrant Vector Database**:
```bash
docker run -p 6333:6333 qdrant/qdrant
```

Or if using Docker Compose:
```bash
docker-compose up -d mongodb
```

### Step 3: Test the Setup (Recommended)
```bash
npm run test:generate
```
This generates 100 sample tickets to verify everything works.

### Step 4: Generate Full Dataset
```bash
npm run generate:tickets
```
This will:
- Clear existing tickets from MongoDB and Qdrant
- Generate 10,000 realistic tickets
- Store them in both MongoDB and vector database
- Show progress and final statistics

## 📊 What You Get

### Ticket Distribution
- **Email Issues**: 1,500 tickets (15%) - Email signatures, attachments, sync issues
- **Network Problems**: 1,200 tickets (12%) - VPN, WiFi, connectivity issues  
- **Authentication**: 1,000 tickets (10%) - Password resets, MFA, account lockouts
- **Hardware Issues**: 800 tickets (8%) - Laptop, monitor, peripheral problems
- **Software Problems**: 2,000 tickets (20%) - App crashes, updates, installations
- **Inquiries/Help**: 2,500 tickets (25%) - General questions, training requests
- **Incidents**: 1,000 tickets (10%) - System outages, security incidents

### Similar Ticket Grouping
Each category has realistic groupings:
- Email: 3-8 similar tickets per issue type
- Network: 4-7 similar tickets per problem
- Auth: 3-6 similar tickets per issue
- And so on...

### Realistic Data
- **Dates**: September 15-23, 2025
- **Users**: 50 different realistic user names
- **Companies**: 12 different company names
- **Locations**: 12 office locations
- **Logs**: 3-7 Splunk server logs per ticket
- **ServiceNow Format**: Complete raw payload matching your sample

## 🔧 Troubleshooting

### Common Issues

**MongoDB Connection Error**:
```
Error: TICKET_DATABASE_URL environment variable is not set
```
Solution: Set `TICKET_DATABASE_URL=mongodb://localhost:27017/tickets` in .env

**Qdrant Connection Error**:
```
Error: Qdrant connection failed
```
Solution: Start Qdrant with `docker run -p 6333:6333 qdrant/qdrant`

**Gemini API Error**:
```
Error: Gemini API key not found
```
Solution: Set `GEMINI_API_KEY=your_key_here` in .env

**Why Gemini instead of OpenAI?**
Your application is already configured to use **Gemini** for embeddings (text-embedding-004 model with 768 dimensions). This is more cost-effective and works perfectly for vector similarity search.

### Performance Tips
- The script takes 10-20 minutes to complete
- Progress is shown every 500 tickets generated
- Vectorization happens in batches to avoid rate limiting
- System requirements: 4GB+ RAM recommended

## 📈 Verification

After completion, verify your data:

**Check MongoDB**:
```bash
mongosh
use tickets
db.tickets.countDocuments()  // Should show 10,000
db.tickets.findOne()  // View a sample ticket
```

**Check categories**:
```bash
db.tickets.aggregate([
  { $group: { _id: "$category", count: { $sum: 1 } } },
  { $sort: { count: -1 } }
])
```

**Check date range**:
```bash
db.tickets.aggregate([
  { $group: { 
    _id: null, 
    minDate: { $min: "$opened_time" },
    maxDate: { $max: "$opened_time" }
  }}
])
```

## 🎯 What's Generated

Each ticket includes:
- ✅ Unique ticket ID (INC format)
- ✅ Realistic descriptions and categories
- ✅ Proper status/priority/impact distribution
- ✅ Date range: Sept 15-23, 2025
- ✅ 3-7 Splunk server logs per ticket
- ✅ Complete ServiceNow-style raw data
- ✅ Vector embeddings for similarity search
- ✅ Similar ticket groupings by category

## 🔄 Re-running

To generate fresh data:
1. The script automatically clears existing data
2. Just run `npm run generate:tickets` again
3. All 10,000 tickets will be regenerated with new IDs

## 📞 Support

If you encounter issues:
1. Check the troubleshooting section above
2. Verify all services are running
3. Check the console output for specific error messages
4. Run the test script first: `npm run test:generate`

---

**Ready to generate your tickets?** Run `npm run generate:tickets` and watch the magic happen! 🚀
