# Start Right Tutoring Platform

A comprehensive tutoring management platform with learning style matching, video conferencing, payment processing, and administrative tools.

## Features

- **User Management**: Students, Parents, Tutors, and Administrators with role-based access control
- **Learning Style Assessment**: AI-powered matching system to pair students with compatible tutors
- **Booking System**: Session scheduling with automatic tutor matching
- **Video Conferencing**: Integrated Whereby video calls for virtual sessions
- **Payment Processing**: Stripe integration for secure payment handling
- **Analytics Dashboard**: Comprehensive reporting and analytics for administrators
- **Content Management**: Educational resources, challenges, and announcements
- **Payroll System**: Automated payroll calculation for tutors

## Tech Stack

### Backend
- **Node.js** with Express.js
- **MongoDB** with Mongoose ODM
- **JWT** for authentication
- **Stripe** for payments
- **Whereby** for video conferencing
- **Winston** for logging

### Frontend
- **React 18** with React Router
- **Vite** for build tooling
- **Tailwind CSS** for styling
- **Lucide React** for icons
- **Stripe Elements** for payment UI

## Prerequisites

- Node.js (v18 or higher)
- MongoDB (local or Atlas)
- npm or yarn

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd OperationSRT-1
   ```

2. **Install server dependencies**
   ```bash
   cd server
   npm install
   ```

3. **Install client dependencies**
   ```bash
   cd ../client
   npm install
   ```

4. **Set up environment variables**
   
   Copy `.env.example` to `.env` in the root directory and server directory:
   ```bash
   cp .env.example .env
   cd server
   cp ../.env.example .env
   ```
   
   Update the `.env` files with your configuration:
   - `MONGO_URI`: MongoDB connection string
   - `JWT_SECRET`: A secure random string (minimum 32 characters)
   - `STRIPE_SECRET_KEY` and `STRIPE_PUBLISHABLE_KEY`: From Stripe dashboard
   - `WHEREBY_API_KEY`: From Whereby dashboard
   - `FRONTEND_URL`: Your frontend URL(s) for CORS

5. **Initialize the database**
   ```bash
   cd server
   node scripts/seedAdmin.js  # Creates initial admin user
   node scripts/initializeMembershipPlans.js  # Sets up membership plans
   ```

## Development

### Start Development Servers

**Option 1: Using the provided scripts**
```bash
./start-all.sh  # Starts both server and client
./stop-all.sh   # Stops both servers
```

**Option 2: Manual start**

Terminal 1 - Server:
```bash
cd server
npm run dev  # or node server.js
```

Terminal 2 - Client:
```bash
cd client
npm run dev
```

The application will be available at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3001

## Production Deployment

### Build the Frontend

```bash
cd client
npm run build
```

The built files will be in `client/dist/`. Serve these with a web server like Nginx or serve them from your Express server.

### Deploy with PM2

1. **Install PM2 globally**
   ```bash
   npm install -g pm2
   ```

2. **Start the server with PM2**
   ```bash
   pm2 start ecosystem.config.js --env production
   ```

3. **Useful PM2 commands**
   ```bash
   pm2 list              # List all processes
   pm2 logs              # View logs
   pm2 restart all       # Restart all processes
   pm2 stop all          # Stop all processes
   pm2 delete all        # Delete all processes
   ```

### Environment Variables for Production

Ensure all environment variables are set in your production environment:
- Set `NODE_ENV=production`
- Use strong, unique values for `JWT_SECRET`
- Configure `FRONTEND_URL` with your production domain(s)
- Use production Stripe keys
- Set up MongoDB Atlas or production MongoDB instance

### Health Check

The server includes a health check endpoint:
```
GET /health
```

This endpoint checks database connectivity and returns server status. Use this for load balancer health checks.

## Project Structure

```
OperationSRT-1/
├── client/                 # React frontend
│   ├── src/
│   │   ├── api/           # API client functions
│   │   ├── components/    # React components
│   │   ├── contexts/      # React contexts (Auth, etc.)
│   │   ├── pages/         # Page components
│   │   └── App.jsx        # Main app component
│   └── package.json
├── server/                 # Express backend
│   ├── config/            # Configuration files
│   ├── controllers/       # Route controllers
│   ├── middleware/        # Express middleware
│   ├── models/            # Mongoose models
│   ├── routes/            # API routes
│   ├── services/          # Business logic services
│   ├── utils/             # Utility functions
│   └── server.js          # Server entry point
├── .env.example           # Environment variables template
├── ecosystem.config.js    # PM2 configuration
└── README.md              # This file
```

## API Documentation

### Authentication
- `POST /api/auth/register` - Register new user (students/parents)
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh access token
- `GET /api/auth/user` - Get current user

### Bookings
- `GET /api/bookings` - Get user's bookings (paginated)
- `GET /api/bookings/all` - Get all bookings (admin, paginated)
- `POST /api/bookings` - Create new booking
- `PUT /api/bookings/:id` - Update booking
- `DELETE /api/bookings/:id` - Cancel booking

### Matching
- `GET /api/matching/find-tutors` - Find tutor matches for student
- `GET /api/matching/compatibility/:tutorId/:studentId` - Get compatibility analysis

### Payments
- `POST /api/payments/create-intent` - Create payment intent
- `POST /api/payments/confirm` - Confirm payment
- `POST /api/payments/webhook` - Stripe webhook handler

## Security Features

- **CORS**: Configured for production with origin restrictions
- **Helmet**: Security headers middleware
- **Rate Limiting**: Applied to auth endpoints (5 req/15min) and general API (100 req/15min)
- **JWT Authentication**: 2-hour access tokens with 7-day refresh tokens
- **Password Security**: Minimum 8 characters with letter and number requirements
- **Input Validation**: Environment variable validation on startup
- **Error Handling**: Centralized error handling with sanitized error messages
- **File Upload Security**: File type validation, size limits, and path traversal protection

## Performance Optimizations

- **Code Splitting**: React.lazy() for route-based code splitting
- **Database Indexing**: Indexes on frequently queried fields
- **Pagination**: All list endpoints support pagination
- **Compression**: Gzip compression for API responses
- **Error Boundaries**: React error boundaries to prevent full app crashes

## Logging

The application uses Winston for structured logging:
- Console output in development
- File logging in production (`server/logs/`)
- Log levels: error, warn, info, http, debug
- Sensitive data is automatically redacted

## Troubleshooting

### Server won't start
- Check that MongoDB is running and accessible
- Verify all required environment variables are set
- Check `server/logs/` for error details

### CORS errors
- Ensure `FRONTEND_URL` is set correctly in production
- Check that the frontend URL matches exactly (including protocol)

### Database connection issues
- Verify `MONGO_URI` format is correct
- Check network connectivity to MongoDB
- Ensure MongoDB user has proper permissions

## Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## License

[Your License Here]

## Support

For support, contact [your support email] or create an issue in the repository.
