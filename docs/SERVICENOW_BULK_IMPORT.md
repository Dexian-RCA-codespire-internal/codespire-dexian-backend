# ServiceNow Bulk Import

This document describes the bulk import functionality that automatically fetches ALL tickets from ServiceNow during application startup.

## Overview

The bulk import feature is designed for initial setup and data synchronization. It fetches ALL tickets from ServiceNow without pagination limits, making it perfect for:

- Initial application setup
- Full data synchronization
- One-time data migration
- Complete ticket inventory

## Features

- **No Pagination Limits**: Fetches ALL tickets regardless of count
- **Large Batch Processing**: Uses configurable batch sizes (default: 1000)
- **Automatic Startup**: Runs automatically when enabled
- **Progress Logging**: Detailed logging of import progress
- **Error Handling**: Continues processing even if individual tickets fail
- **Upsert Logic**: Updates existing tickets or creates new ones

## Configuration

Add these environment variables to your `.env` file:

```bash
# Enable/disable bulk import on startup
SERVICENOW_ENABLE_BULK_IMPORT=true

# Batch size for bulk import (default: 1000)
SERVICENOW_BULK_IMPORT_BATCH_SIZE=1000

# Required ServiceNow configuration
SERVICENOW_URL=https://your-instance.service-now.com
SERVICENOW_USERNAME=your_username
SERVICENOW_PASSWORD=your_password
SERVICENOW_API_ENDPOINT=/api/now/table/incident
```

## How It Works

### Startup Sequence

1. **Application Starts**: Server initializes
2. **Bulk Import Runs**: If enabled, fetches ALL tickets
3. **Polling Starts**: If enabled, begins incremental polling
4. **Server Ready**: Application is fully operational

### Import Process

1. **Batch Fetching**: Fetches tickets in large batches (default: 1000)
2. **Progress Logging**: Logs progress for each batch
3. **Database Operations**: Saves/updates tickets in database
4. **Error Handling**: Continues processing even if some tickets fail
5. **Completion Report**: Logs final statistics

### Database Operations

- **New Tickets**: Creates new records in database
- **Existing Tickets**: Updates existing records with latest data
- **Error Tracking**: Counts and logs any processing errors

## Usage Examples

### Enable Bulk Import

```bash
# Set environment variable
export SERVICENOW_ENABLE_BULK_IMPORT=true

# Start application
npm start
```

### Custom Batch Size

```bash
# Use smaller batches for slower connections
export SERVICENOW_BULK_IMPORT_BATCH_SIZE=500

# Use larger batches for faster connections
export SERVICENOW_BULK_IMPORT_BATCH_SIZE=2000
```

### Programmatic Usage

```javascript
const { bulkImportAllTickets } = require('./services/servicenowIngestionService');

// Basic bulk import
const result = await bulkImportAllTickets();

// With custom options
const result = await bulkImportAllTickets({
  batchSize: 500,
  query: 'state=Open' // Only import open tickets
});
```

## Logging Output

### Startup Logs

```
🚀 Server running on port 3000
📱 Health check: http://localhost:3000/health
🔄 Starting ServiceNow bulk import...
🚀 Starting bulk import of ALL tickets from ServiceNow...
🔧 Bulk import settings:
   - Batch size: 1000
   - Query filter: None (all tickets)
📄 Fetching batch 1 (records 1 to 1000)...
✅ Fetched 1000 tickets (Total: 1000)
📄 Fetching batch 2 (records 1001 to 2000)...
✅ Fetched 1000 tickets (Total: 2000)
📊 Bulk import completed: 2500 tickets fetched from ServiceNow
💾 Saving all tickets to database...
✅ Bulk import database operations completed:
   - New tickets saved: 2500
   - Existing tickets updated: 0
   - Errors: 0
✅ ServiceNow bulk import completed successfully:
   - Total tickets imported: 2500
   - New tickets: 2500
   - Updated tickets: 0
   - Errors: 0
```

## Performance Considerations

### Batch Size Guidelines

| Connection Speed | Recommended Batch Size | Notes |
|------------------|------------------------|-------|
| Slow (DSL/Cable) | 100-500 | Smaller batches, longer processing time |
| Medium (Fiber) | 500-1000 | Balanced approach |
| Fast (Enterprise) | 1000-2000 | Larger batches, faster processing |

### Memory Usage

- **Small Batches**: Lower memory usage, longer processing time
- **Large Batches**: Higher memory usage, faster processing time
- **Recommendation**: Start with 1000, adjust based on your system

### API Rate Limits

- **ServiceNow Limits**: Respects ServiceNow API rate limits
- **Built-in Delays**: 200ms delay between batches
- **Error Handling**: Continues processing if rate limited

## Comparison with Polling

| Feature | Bulk Import | Polling |
|---------|-------------|---------|
| **Purpose** | Initial setup | Ongoing sync |
| **Frequency** | Once on startup | Every minute |
| **Data Volume** | ALL tickets | New/updated only |
| **Performance** | High resource usage | Low resource usage |
| **Use Case** | First-time setup | Continuous operation |

## Best Practices

### When to Use Bulk Import

✅ **Good for:**
- Initial application setup
- Complete data synchronization
- One-time data migration
- Full ticket inventory

❌ **Avoid for:**
- Regular operations (use polling instead)
- Frequent restarts
- Development/testing (unless needed)

### Configuration Tips

1. **Enable Only When Needed**: Set `SERVICENOW_ENABLE_BULK_IMPORT=true` only for initial setup
2. **Disable After Setup**: Turn off bulk import after initial data load
3. **Use Polling for Ongoing**: Enable polling for continuous synchronization
4. **Monitor Performance**: Watch logs for batch processing times

### Environment Setup

```bash
# Initial setup (bulk import + polling)
SERVICENOW_ENABLE_BULK_IMPORT=true
SERVICENOW_ENABLE_POLLING=true

# After setup (polling only)
SERVICENOW_ENABLE_BULK_IMPORT=false
SERVICENOW_ENABLE_POLLING=true
```

## Troubleshooting

### Common Issues

1. **Import Takes Too Long**
   - Increase batch size
   - Check network connection
   - Monitor ServiceNow API performance

2. **Memory Issues**
   - Decrease batch size
   - Monitor system resources
   - Consider running during off-peak hours

3. **API Rate Limiting**
   - Decrease batch size
   - Increase delay between batches
   - Check ServiceNow API limits

### Debug Commands

```bash
# Test bulk import manually
node scripts/test-bulk-import.js

# Check database count
mongo
> db.tickets.countDocuments({source: "ServiceNow"})

# Monitor logs
tail -f logs/app.log
```

## Security Considerations

- **Credentials**: Store ServiceNow credentials securely
- **API Access**: Use dedicated service account
- **Network**: Ensure secure connection to ServiceNow
- **Monitoring**: Monitor for unusual import patterns

## Integration with Polling

The bulk import and polling systems work together:

1. **Bulk Import**: Fetches ALL existing tickets on startup
2. **Polling**: Fetches only new/updated tickets going forward
3. **No Duplicates**: Both systems use the same upsert logic
4. **Seamless Operation**: No conflicts between the two systems

This ensures you have a complete ticket inventory initially, then stay synchronized with ongoing changes.
