# Microservice Backend Project

This is a scaffolded microservice backend project created with `create-my-custom-backend`.

## Features

- Express.js server with middleware setup
- Authentication middleware (SuperTokens-based with session management)
- Database integration support
- Object storage integration support
- LLM integration support
- Health check endpoints
- Basic error handling

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy environment file:
   ```bash
   cp .env.example .env
   ```

3. Configure your environment variables in `.env`

4. Start the development server:
   ```bash
   npm run dev
   ```

## Available Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon

## Project Structure

```
src/
├── config/          # Configuration files
├── controllers/     # Route controllers
├── middleware/      # Custom middleware
├── models/          # Data models
├── routes/          # API routes
├── services/        # Business logic services
├── utils/           # Utility functions
├── validators/      # Input validation
└── app.js           # Main application file
```

## Environment Variables

See `.env.example` for all required environment variables.

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request


Application: http://localhost:3000
MinIO Console: http://localhost:9001 (minioadmin/minioadmin123)
SuperTokens: http://localhost:3567
MongoDB: mongodb://localhost:27017
Redis: redis://localhost:6379
