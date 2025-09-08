#!/bin/bash

# Setup script for Docker containers
# This script helps initialize the containers and create necessary buckets/containers

echo "🚀 Setting up Docker containers for test-bg..."

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp env.example .env
    echo "✅ .env file created. Please review and update the values as needed."
fi

# Start the containers
echo "🐳 Starting Docker containers..."
docker-compose up -d

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 30

# Create MinIO bucket
echo "🪣 Creating MinIO bucket..."
docker exec test-bg-minio mc alias set myminio http://localhost:9000 minioadmin minioadmin123
docker exec test-bg-minio mc mb myminio/test-bg-bucket --ignore-existing

# Create S3 bucket in LocalStack
echo "🪣 Creating S3 bucket in LocalStack..."
docker exec test-bg-localstack awslocal s3 mb s3://test-bg-s3-bucket

# Create Azure container in Azurite
echo "🪣 Creating Azure container in Azurite..."
docker exec test-bg-azurite az storage container create --name test-bg-container --connection-string "DefaultEndpointsProtocol=http;AccountName=devstoreaccount1;AccountKey=Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==;BlobEndpoint=http://localhost:10000/devstoreaccount1;"

echo "✅ Setup completed successfully!"
echo ""
echo "🌐 Service URLs:"
echo "  - Application: http://localhost:3000"
echo "  - MongoDB: mongodb://localhost:27017"
echo "  - Redis: redis://localhost:6379"
echo "  - MinIO Console: http://localhost:9001 (minioadmin/minioadmin123)"
echo "  - SuperTokens: http://localhost:3567"
echo "  - PostgreSQL: postgresql://localhost:5432"
echo "  - Azurite Blob: http://localhost:10000"
echo "  - LocalStack S3: http://localhost:4566"
echo ""
echo "📋 Useful commands:"
echo "  - View logs: docker-compose logs -f"
echo "  - Stop services: docker-compose down"
echo "  - Restart services: docker-compose restart"
echo "  - View running containers: docker-compose ps"

