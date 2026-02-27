# 🏥 Q Nirvana - Hospital Management System

Q Nirvana is a state-of-the-art Hospital Management System designed for a modern, tech-driven healthcare ecosystem.

## 🚀 Local Development Setup

Since the system is now optimized for local development, follow these steps to launch the suite.

### Prerequisites
- Node.js (v18+)
- PostgreSQL (running locally with a database named `nirvana`)

### 1. Database Setup
Ensure PostgreSQL is running and the schema is applied:
```bash
cd backend
npm run db:create    # Only if database doesn't exist
npm run db:schema    # To apply/refresh schema
```

### 2. Launch Backend
```bash
cd backend
npm install
npm run start
```

### 3. Launch Frontend
```bash
cd frontend
npm install
npm run dev
```

### Accessing the Suite
- **Frontend Portal**: [http://localhost:5173](http://localhost:5173)
- **API Health**: [http://localhost:5000/api/health](http://localhost:5000/api/health)

---

## 🛠️ Technology Stack
- **Frontend**: React (Vite), Lucide Icons, Modern CSS (Glassmorphism)
- **Backend**: Node.js, Express, WebSocket, Dijkstra routing algorithm
- **Database**: PostgreSQL
- **DevOps**: Docker, Docker Compose

---

## 🔐 Demo Credentials
| Role | Email | Password |
| :--- | :--- | :--- |
| **Admin** | admin@qnirvana.com | password123 |
| **Doctor** | doctor@qnirvana.com | password123 |
| **Driver** | driver@qnirvana.com | password123 |
| **Patient** | patient@qnirvana.com | password123 |

---

## ✨ Core Intelligent Modules
1. **Dijkstra Dispatch**: Real-time ambulance routing optimized for distance and road safety factors.
2. **Priority Queueing**: Intelligent OPD queueing system based on age, vulnerability, and emergency status.
3. **Blood Bank Sentinel**: Real-time monitoring of blood reserves with automated critical alerts.
4. **Health Repository**: Secure, centralized storage for prescriptions and medical history.

---
Built with ❤️ by the Q Nirvana Team
