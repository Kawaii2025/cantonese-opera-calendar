# Cantonese Opera Calendar - Requirements & Todo List

## 📋 Future Improvements

### 🔐 1. Admin Permission System
- Define admin roles and permissions
- Restrict admin page access
- Permission-based UI elements

### 👥 2. User System
- User registration
- User profiles
- User role management
- User preferences

### 🗄️ 3. Database for User/Admin
- Create users table
- Create roles/permissions tables
- Set up relationships
- Password hashing and security

### 🔑 4. Login/Logout
- Login component
- Logout functionality
- Session management
- Protected routes
- Remember me functionality

### ✏️ 5. Calendar Edit via Double-Click
- Enable double-click on calendar cells to edit events
- Populate edit modal with existing event data
- Save changes to database
- Delete functionality from calendar view

---

## 📅 Current System (As of 2026-05-15)

### ✅ Features Implemented:
- Calendar view of events
- List view of events
- Admin page with CRUD operations
- Date filtering (year/month selectors)
- Export calendar as image
- PostgreSQL database
- Express.js backend
- React + TypeScript + Ant Design frontend
- API endpoints with enhanced logging
- Timestamps in API responses

### 📁 Project Structure:
- `/backend` - Express API server
- `/src` - React frontend
  - `/components` - React components
  - `/styles` - CSS files
  - `/hooks` - Custom hooks
  - `/constants` - Constants
- `package.json` - Dependencies

---

**Note**: This file will be updated as new features are implemented!
