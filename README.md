# Expense Tracker Backend

A comprehensive backend API for a mobile expense tracking and savings management application built with Node.js, Express, and MongoDB.

## Features

### 🏦 **Savings Management**
- **Daily, Weekly, Monthly, Yearly** savings tracking
- **Goal-based savings** with progress tracking
- **Emergency fund** management
- **Investment tracking**
- **Recurring savings** setup

### 💰 **Expense Tracking**
- **14 expense categories** (Food, Transportation, Shopping, etc.)
- **Payment method** tracking
- **Location-based** expense recording
- **Receipt upload** support
- **Recurring expense** management
- **Tags and notes** for better organization

### 📊 **Analytics & Visualizations**
- **Pie charts** for expense categories
- **Savings type** breakdowns
- **Monthly trends** and comparisons
- **Category-wise** expense analysis
- **Financial overview** with net worth calculation
- **Custom date range** filtering

### 🔐 **Security & Authentication**
- **JWT-based** authentication
- **Password hashing** with bcrypt
- **Input validation** and sanitization
- **Rate limiting** for API protection
- **CORS** configuration for mobile apps
- **Helmet** security headers

### 📱 **Mobile App Ready**
- **CORS** configured for mobile apps
- **Push notification** settings
- **User preferences** management
- **Multi-currency** support
- **Timezone** handling

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT + bcrypt
- **Validation**: express-validator
- **Security**: Helmet, CORS, Rate Limiting
- **Logging**: Morgan
- **Compression**: gzip compression

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd expense-tracker-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   # Copy environment template
   cp env.example .env
   
   # Edit .env file with your configuration
   nano .env
   ```

4. **Environment Variables**
   ```env
   # Server Configuration
   PORT=5000
   NODE_ENV=development
   
   # MongoDB Configuration
   MONGODB_URI=mongodb://localhost:27017/expense-tracker
   
   # JWT Configuration
   JWT_SECRET=your-super-secret-jwt-key-here
   JWT_EXPIRE=30d
   
   # Rate Limiting
   RATE_LIMIT_WINDOW_MS=900000
   RATE_LIMIT_MAX_REQUESTS=100
   ```

5. **Start MongoDB**
   ```bash
   # Start MongoDB service
   sudo systemctl start mongod
   
   # Or run MongoDB locally
   mongod
   ```

6. **Run the application**
   ```bash
   # Development mode with auto-reload
   npm run dev
   
   # Production mode
   npm start
   ```

## API Endpoints

### Authentication
| Method | Endpoint | Description | Access |
|--------|----------|-------------|---------|
| POST | `/api/auth/register` | User registration | Public |
| POST | `/api/auth/login` | User login | Public |
| GET | `/api/auth/me` | Get current user | Private |
| PUT | `/api/auth/profile` | Update profile | Private |
| PUT | `/api/auth/change-password` | Change password | Private |
| PUT | `/api/auth/notifications` | Update notifications | Private |
| POST | `/api/auth/logout` | Logout user | Private |

### User Management
| Method | Endpoint | Description | Access |
|--------|----------|-------------|---------|
| GET | `/api/user/profile` | Get user profile | Private |
| PUT | `/api/user/profile` | Update user profile | Private |
| PUT | `/api/user/notifications` | Update notification settings | Private |
| PUT | `/api/user/change-password` | Change password | Private |
| DELETE | `/api/user/account` | Deactivate account | Private |
| GET | `/api/user/stats` | Get user statistics | Private |

### Expenses
| Method | Endpoint | Description | Access |
|--------|----------|-------------|---------|
| POST | `/api/expenses` | Create expense | Private |
| GET | `/api/expenses` | Get expenses (with filtering) | Private |
| GET | `/api/expenses/:id` | Get expense by ID | Private |
| PUT | `/api/expenses/:id` | Update expense | Private |
| DELETE | `/api/expenses/:id` | Delete expense | Private |
| GET | `/api/expenses/summary/summary` | Get expense summary | Private |
| DELETE | `/api/expenses/bulk` | Bulk delete expenses | Private |
| GET | `/api/expenses/categories` | Get expense categories | Private |

### Savings
| Method | Endpoint | Description | Access |
|--------|----------|-------------|---------|
| POST | `/api/savings` | Create savings entry | Private |
| GET | `/api/savings` | Get savings (with filtering) | Private |
| GET | `/api/savings/:id` | Get savings by ID | Private |
| PUT | `/api/savings/:id` | Update savings entry | Private |
| DELETE | `/api/savings/:id` | Delete savings entry | Private |
| GET | `/api/savings/summary/period` | Get period summary | Private |
| GET | `/api/savings/goals` | Get savings goals | Private |
| GET | `/api/savings/type/:type` | Get savings by type | Private |
| DELETE | `/api/savings/bulk` | Bulk delete savings | Private |
| GET | `/api/savings/categories` | Get savings categories | Private |

### Analytics
| Method | Endpoint | Description | Access |
|--------|----------|-------------|---------|
| GET | `/api/analytics/expenses/pie-chart` | Expense pie chart data | Private |
| GET | `/api/analytics/savings/pie-chart` | Savings pie chart data | Private |
| GET | `/api/analytics/overview` | Financial overview | Private |
| GET | `/api/analytics/trends/monthly` | Monthly trends | Private |
| GET | `/api/analytics/expenses/category-trends` | Category trends | Private |

## Data Models

### User Model
- **Personal Info**: firstName, lastName, email, phoneNumber
- **Preferences**: currency, timezone, notificationSettings
- **Security**: password (hashed), isActive, lastLogin
- **Timestamps**: createdAt, updatedAt

### Expense Model
- **Financial**: amount, currency, category, subcategory
- **Details**: description, date, paymentMethod, location
- **Features**: isRecurring, recurringFrequency, tags, notes
- **Attachments**: receipt (url, filename)

### Savings Model
- **Financial**: amount, currency, type, category
- **Period**: startDate, endDate, duration
- **Goals**: targetAmount, targetDate, progress, isCompleted
- **Features**: isRecurring, recurringAmount, source

## API Response Format

### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error description",
  "errors": [
    {
      "field": "fieldName",
      "message": "Validation error message"
    }
  ]
}
```

### Pagination Response
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalItems": 100,
    "itemsPerPage": 20,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

## Query Parameters

### Common Filters
- `startDate`: Start date (ISO 8601 format)
- `endDate`: End date (ISO 8601 format)
- `page`: Page number for pagination
- `limit`: Items per page (max 100)
- `sortBy`: Sort field (date, amount, category, etc.)
- `sortOrder`: Sort direction (asc, desc)

### Expense Filters
- `category`: Expense category
- `minAmount`: Minimum amount
- `maxAmount`: Maximum amount
- `paymentMethod`: Payment method

### Savings Filters
- `type`: Savings type (Daily, Weekly, Monthly, etc.)
- `category`: Savings category

## Authentication

### JWT Token
Include the JWT token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

### Token Expiry
- Default expiry: 30 days
- Configurable via `JWT_EXPIRE` environment variable

## Security Features

- **Rate Limiting**: 100 requests per 15 minutes per IP
- **Input Validation**: Comprehensive validation for all inputs
- **SQL Injection Protection**: MongoDB with parameterized queries
- **XSS Protection**: Helmet security headers
- **CORS**: Configured for mobile app origins
- **Password Security**: bcrypt hashing with salt rounds

## Development

### Scripts
```bash
npm run dev      # Start development server with nodemon
npm start        # Start production server
npm test         # Run tests
```

### File Structure
```
├── models/          # Database models
├── routes/          # API route handlers
├── middleware/      # Custom middleware
├── server.js        # Main server file
├── package.json     # Dependencies and scripts
├── env.example      # Environment variables template
└── README.md        # This file
```

## Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## Deployment

### Production Checklist
- [ ] Set `NODE_ENV=production`
- [ ] Use strong `JWT_SECRET`
- [ ] Configure MongoDB connection string
- [ ] Set up proper logging
- [ ] Configure CORS for production domains
- [ ] Set up monitoring and health checks

### Environment Variables for Production
```env
NODE_ENV=production
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/expense-tracker
JWT_SECRET=very-long-random-secret-key
PORT=5000
```

## Mobile App Integration

### CORS Configuration
The backend is configured to work with mobile apps:
- Capacitor apps: `capacitor://localhost`
- React Native: `http://localhost:8081`
- Web apps: `http://localhost:3000`

### Push Notifications
The backend stores notification preferences that can be used by the mobile app to:
- Send daily reminders
- Generate weekly/monthly reports
- Alert about budget limits
- Handle push notifications

## Support

For questions and support:
- Create an issue in the repository
- Check the API documentation
- Review the code examples

## License

MIT License - see LICENSE file for details

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

---

**Built with ❤️ for mobile expense tracking**
