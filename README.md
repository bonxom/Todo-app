# 📝 TodoApp - AI-Powered Task Management System

A modern, full-stack task management application with AI-powered task generation, comprehensive analytics, and an intuitive user interface. Built with the MERN stack and enhanced with Google's Gemini AI.

---

## 🌟 Introduction

TodoApp is a feature-rich personal task management system designed to help users organize their tasks efficiently. The application combines traditional task management features with cutting-edge AI capabilities, allowing users to generate tasks based on natural language requirements. With a clean, responsive interface built with React and Tailwind CSS, users can manage tasks across multiple categories, track progress with detailed statistics, and visualize deadlines through an interactive calendar view.

---

## ✨ Features

### 🔐 Authentication & User Management
- **Secure Authentication**: JWT-based authentication system with bcrypt password hashing
- **User Registration & Login**: Secure user account creation and login
- **Profile Management**: Users can update their profile information and change passwords
- **Avatar Upload**: Custom profile picture support

### 📋 Task Management
- **CRUD Operations**: Create, read, update, and delete tasks
- **Task Status Tracking**: Four status types - Pending, In Progress, Completed, and Given Up
- **Priority Levels**: Organize tasks by Low, Medium, or High priority
- **Task Categories**: Group tasks into custom categories
- **Due Dates**: Set and track task deadlines
- **Task Search & Filter**: Search tasks by title and filter by status
- **Quick Actions**: Start, finish, or give up on tasks with one click

### 🤖 AI-Powered Task Generation
- **Natural Language Task Creation**: Generate tasks using Google Gemini AI by describing your requirements
- **Smart Categorization**: AI automatically assigns tasks to appropriate categories
- **Batch Generation**: Generate multiple related tasks at once
- **Interactive AI Chat**: Built-in chat interface for task generation and management

### 📊 Categories
- **Custom Categories**: Create and manage custom task categories
- **Category Statistics**: View task distribution and completion rates per category
- **Default Category**: Auto-assigned "Uncategorized" category for tasks
- **Category-based Task View**: Filter and view tasks by category

### 📅 Calendar View
- **Visual Timeline**: Interactive calendar displaying tasks with due dates
- **Monthly Overview**: View all deadlines at a glance
- **Task Details**: Click on calendar dates to view task details
- **Deadline Management**: Track upcoming and overdue tasks

### 📈 Statistics & Analytics
- **Progress Tracking**: Visual progress bars showing task completion
- **Status Distribution**: Pie charts showing tasks by status
- **Category Distribution**: Pie charts showing tasks by category
- **Historical Data**: Line charts tracking task completion over time
- **Summary Statistics**: Total tasks, completion rate, and category breakdown

### 🎨 User Interface
- **Responsive Design**: Mobile-first design that works on all devices
- **Dark Theme**: Modern dark-themed interface for comfortable viewing
- **Smooth Animations**: Polished animations and transitions
- **Intuitive Navigation**: Easy-to-use sidebar navigation
- **Landing Page**: Attractive landing page with feature highlights

---

## 🛠️ Tech Stack

### Backend
![Node.js](https://img.shields.io/badge/node.js-6DA55F?style=for-the-badge&logo=node.js&logoColor=white)
![Express.js](https://img.shields.io/badge/express.js-%23404d59.svg?style=for-the-badge&logo=express&logoColor=%2361DAFB)
![MongoDB](https://img.shields.io/badge/MongoDB-%234ea94b.svg?style=for-the-badge&logo=mongodb&logoColor=white)
![JWT](https://img.shields.io/badge/JWT-black?style=for-the-badge&logo=JSON%20web%20tokens)

- **Node.js**: JavaScript runtime environment
- **Express.js**: Web application framework
- **MongoDB**: NoSQL database with Mongoose ODM
- **JWT**: JSON Web Tokens for authentication
- **bcryptjs**: Password hashing
- **Google Gemini AI**: AI-powered task generation
- **Multer**: File upload handling
- **Zod**: Schema validation

### Frontend
![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white)

- **React.js**: UI library with hooks
- **React Router**: Client-side routing
- **Tailwind CSS**: Utility-first CSS framework
- **Vite**: Fast build tool and dev server
- **Axios**: HTTP client
- **Chart.js**: Data visualization

### DevOps
![Docker](https://img.shields.io/badge/docker-%230db7ed.svg?style=for-the-badge&logo=docker&logoColor=white)
![Vercel](https://img.shields.io/badge/vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)
![Postman](https://img.shields.io/badge/postman-FF6C37?style=for-the-badge&logo=postman&logoColor=white)

- **Docker**: Containerization and local development
- **Vercel**: Frontend deployment and hosting
- **Postman**: API testing and documentation

---

## 📁 Project Structure

```
TodoApp/
├── backend/
│   ├── config/          # Database and initialization config
│   ├── controller/      # Route controllers (auth, task, AI, stats)
│   ├── middleware/      # Authentication middleware
│   ├── model/          # Mongoose models (User, Task, Category, Stat)
│   ├── route/          # API routes
│   ├── utils/          # Utility functions (token generation)
│   └── index.js        # Main server file
│
└── frontend/
    ├── public/         # Static assets
    └── src/
        ├── api/        # API service layer
        ├── component/  # Reusable components (Sidebar, Topbar, Chat)
        ├── context/    # React context (TaskRefresh)
        ├── feature/    # Feature-specific components
        │   ├── Auth/       # Authentication components
        │   ├── Calendar/   # Calendar view components
        │   ├── Category/   # Category management
        │   ├── Dialog/     # Modal dialogs
        │   ├── Landing/    # Landing page sections
        │   ├── Profile/    # User profile
        │   ├── Statics/    # Statistics charts
        │   └── Todo/       # Todo list components
        ├── hook/       # Custom React hooks
        ├── layout/     # Layout components
        ├── page/       # Page components
        ├── route/      # Route configuration
        └── styles/     # Global styles
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (local or Atlas)
- Google Gemini API key

### Run with Docker (Fast)

1. **Create backend env file**
```bash
cd backend
cp .env.example .env
# Or create .env manually if you do not have .env.example
```

Example `.env`:
```env
PORT=4000
HOST=0.0.0.0
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
API_KEY=your_google_gemini_api_key
```

2. **Run with Docker Compose (build + up)**
```bash
cd ..
docker compose up --build
```

3. **Access the app**
- `http://localhost:3636`

Stop containers:
```bash
docker compose down
```

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd TodoApp
```

2. **Backend Setup**
```bash
cd backend
npm install

# Create .env file
echo "PORT=3001
HOST=localhost
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
API_KEY=your_google_gemini_api_key" > .env

# Start the backend server
npm run dev
```

3. **Frontend Setup**
```bash
cd frontend
npm install

# Start the development server
npm run dev
```

The application will be available at:
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3001`

---

## 📡 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login

### Tasks
- `GET /api/tasks` - Get all user tasks
- `POST /api/tasks` - Create new task
- `GET /api/tasks/:id` - Get task by ID
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task
- `PUT /api/tasks/:id/start` - Start task
- `PUT /api/tasks/:id/finish` - Complete task
- `PUT /api/tasks/:id/give-up` - Give up on task
- `GET /api/tasks/today-deadlines` - Get today's deadlines
- `GET /api/tasks/status/:status` - Get tasks by status
- `GET /api/tasks/category/:categoryId` - Get tasks by category

### Categories
- `GET /api/categories` - Get all categories
- `POST /api/categories` - Create category
- `PUT /api/categories/:id` - Update category
- `DELETE /api/categories/:id` - Delete category

### AI
- `POST /api/ai/generate-tasks` - Generate tasks with AI

### Statistics
- `GET /api/stats/user` - Get user statistics

### Users
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update profile
- `PUT /api/users/change-password` - Change password

---

## 🎯 Usage

1. **Register/Login**: Create an account or login to access the application
2. **Create Tasks**: Add tasks manually or use AI generation
3. **Organize**: Assign categories and set priorities
4. **Track Progress**: Monitor tasks through the calendar and statistics views
5. **AI Assistant**: Use the chat bubble to generate tasks with natural language
6. **Analyze**: View detailed statistics about your productivity

---

## 👥 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

## 📄 License

This project is licensed under the ISC License.

---

## 🙏 Acknowledgments

- Google Gemini AI for task generation capabilities
- The MERN stack community for excellent documentation and support
- Tailwind CSS for the amazing styling framework

---

**Built with HMD deep try**
