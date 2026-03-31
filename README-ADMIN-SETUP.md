# Admin User Setup Guide

## Initial Admin Creation

### Option 1: Using the Seed Script (Recommended for First-Time Setup)

Run the seed script to create the default admin user:

```bash
cd server
node scripts/seedAdmin.js
```

**Default Admin Credentials:**
- **Email:** `admin@startrighttutoring.com`
- **Password:** `Admin123!`
- **Name:** `Administrator`
- **Role:** `admin`

**To customize the admin credentials**, set these environment variables before running the script:

```bash
export ADMIN_EMAIL=your-email@example.com
export ADMIN_PASSWORD=YourPassword123!
export ADMIN_NAME=Your Name
node scripts/seedAdmin.js
```

Or add them to your `.env` file:
```
ADMIN_EMAIL=your-email@example.com
ADMIN_PASSWORD=YourPassword123!
ADMIN_NAME=Your Name
```

### Option 2: Using the Employee Signup Page

1. Navigate to: `http://localhost:5173/employee-signup`
2. Fill in the form:
   - **Name:** Your full name
   - **Email:** Your work email
   - **Account Type:** Select "Admin"
   - **Password:** Create a secure password
   - **Confirm Password:** Re-enter your password
3. Click "Create Employee Account"

**Note:** If an admin already exists, only existing admins can create new admin accounts. For the first admin, use the seed script or the signup page (if no admin exists yet).

## Logging In as Admin

1. Navigate to: `http://localhost:5173/employee-login`
2. Enter your admin email and password
3. Click "Sign In to Portal"

## Creating Additional Employees

### Creating Tutors

Tutors can be created through:
1. **Employee Signup Page** (`/employee-signup`) - Anyone can create a tutor account
2. **Admin Panel** - Admins can create tutor accounts (future feature)

### Creating Additional Admins

Additional admins can only be created by existing admins:
1. Log in as an admin
2. Use the Admin Panel (future feature) or
3. Use the Employee Signup Page while logged in as an admin

## Security Notes

- **Change the default admin password** after first login
- The seed script will not overwrite an existing admin user
- If you need to reset the admin password, you'll need to do so directly in the database or delete the existing admin and run the seed script again
- Employee accounts (tutors/admins) are separate from client accounts (students/parents)

## Troubleshooting

### "An admin already exists" Error

If you see this error when trying to create an admin:
- An admin user already exists in the database
- Only existing admins can create new admin accounts
- Use the seed script to check if an admin exists, or log in with existing admin credentials

### "Invalid credentials" Error

- Verify you're using the correct email and password
- Make sure you're logging in at `/employee-login` (not `/login`)
- Check that the admin user was created successfully by running the seed script again (it will show if an admin already exists)

### Database Connection Issues

- Ensure MongoDB is running and accessible
- Check your `.env` file has the correct `MONGO_URI`
- Verify the database connection in `server/config/db.js`

