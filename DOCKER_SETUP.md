# Docker Setup Guide

This guide explains how to run the test-bg application with all required services using Docker Compose.

## Services Included

- **MongoDB** - Primary database
- **Redis** - Caching and session storage
- **MinIO** - S3-compatible object storage
- **LocalStack** - AWS S3 local emulation
- **Azurite** - Azure Blob Storage local emulation
- **SuperTokens** - Authentication service
- **PostgreSQL** - Database for SuperTokens
- **MailHog** - Email testing service for local development
- **Email Service** - Custom email service for OTP verification and notifications
- **Node.js App** - Your application

## Quick Start

### 1. Prerequisites

- Docker and Docker Compose installed
- Git (to clone the repository)

### 2. Setup

```bash
# Clone the repository (if not already done)
git clone <your-repo-url>
cd test-bg

# Copy environment template
cp env.example .env

# Review and update .env file with your preferred values
# The default values will work for local development

# Run the setup script (Linux/Mac)
chmod +x scripts/setup-containers.sh
./scripts/setup-containers.sh

# Or manually start the containers
docker-compose up -d
```

### 3. Access Services

| Service | URL | Credentials |
|---------|-----|-------------|
| Application | http://localhost:3000 | - |
| MongoDB | mongodb://localhost:27018 | admin/password123 |
| Redis | redis://localhost:6379 | redis123 |
| MinIO Console | http://localhost:9001 | minioadmin/minioadmin123 |
| SuperTokens | http://localhost:3567 | - |
| PostgreSQL | postgresql://localhost:5432 | supertokens/supertokens123 |
| Email Service | http://localhost:3001 | - |
| MailHog Web UI | http://localhost:8025 | - |
| Azurite Blob | http://localhost:10000 | devstoreaccount1/Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw== |
| LocalStack S3 | http://localhost:4566 | test/test |

## Environment Configuration

The `env.example` file contains all necessary environment variables. Key configurations:

### Database
- `MONGO_ROOT_USERNAME` - MongoDB root username
- `MONGO_ROOT_PASSWORD` - MongoDB root password
- `MONGO_DATABASE` - Application database name

### Storage Services
- **MinIO**: S3-compatible storage for local development
- **LocalStack**: AWS S3 emulation
- **Azurite**: Azure Blob Storage emulation

### Authentication
- `SUPERTOKENS_API_KEY` - Your SuperTokens API key
- `SUPERTOKENS_APP_NAME` - Application name for SuperTokens

### Email/Notifications
- `EMAIL_SERVICE_API_KEY` - Your email service API key
- `SENDGRID_API_KEY` - SendGrid API key for email delivery
- `SMTP_*` - SMTP configuration for email delivery
- `MAIL_PROVIDER` - Email provider (sendgrid, smtp, or mailhog for local dev)

## Docker Commands

### Basic Operations
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down

# Restart a specific service
docker-compose restart app

# View running containers
docker-compose ps
```

### Development
```bash
# Rebuild and start
docker-compose up --build -d

# View logs for specific service
docker-compose logs -f app

# Execute command in running container
docker-compose exec app npm test

# Access container shell
docker-compose exec app sh
```

### Data Management
```bash
# Remove all containers and volumes (WARNING: This deletes all data)
docker-compose down -v

# Backup MongoDB data
docker exec test-bg-mongodb mongodump --out /backup

# Restore MongoDB data
docker exec test-bg-mongodb mongorestore /backup
```

## Storage Services Usage

### MinIO (S3-compatible)
- Access console at http://localhost:9001
- Default bucket: `test-bg-bucket`
- Use MinIO client or AWS SDK with endpoint: `http://localhost:9000`

### LocalStack (AWS S3)
- Endpoint: `http://localhost:4566`
- Default bucket: `test-bg-s3-bucket`
- Use AWS SDK with endpoint configuration

### Azurite (Azure Blob Storage)
- Endpoint: `http://localhost:10000`
- Default container: `test-bg-container`
- Use Azure Storage SDK with connection string

## Health Checks

All services include health checks. You can monitor service health:

```bash
# Check health status
docker-compose ps

# View health check logs
docker-compose logs app | grep health
```

## Troubleshooting

### Common Issues

1. **Port conflicts**: Ensure ports 3000, 27017, 6379, 9000, 9001, 3567, 5432, 10000, 10001, 10002, 4566 are available

2. **Permission issues**: On Linux/Mac, ensure Docker has proper permissions

3. **Memory issues**: Ensure Docker has sufficient memory allocated (recommended: 4GB+)

4. **Service startup order**: Services have health checks and dependencies to ensure proper startup order

### Logs and Debugging

```bash
# View all logs
docker-compose logs

# View specific service logs
docker-compose logs mongodb
docker-compose logs app

# Follow logs in real-time
docker-compose logs -f app
```

### Reset Everything

```bash
# Stop and remove all containers, networks, and volumes
docker-compose down -v

# Remove all images (optional)
docker-compose down --rmi all

# Start fresh
docker-compose up -d
```

## Production Considerations

For production deployment:

1. **Use real cloud services** instead of local emulators
2. **Update environment variables** with production credentials
3. **Use secrets management** for sensitive data
4. **Configure proper networking** and security
5. **Set up monitoring** and logging
6. **Use production-grade images** and configurations

## Support

If you encounter issues:

1. Check the logs: `docker-compose logs`
2. Verify environment variables in `.env`
3. Ensure all required ports are available
4. Check Docker and Docker Compose versions
5. Review the troubleshooting section above
