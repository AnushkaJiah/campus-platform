# Smart Campus Resource Management Platform

A centralized platform for monitoring and managing campus resources (classrooms, labs, energy, environment) using simulated IoT sensors, Spring Boot, MySQL, and React.

## Tech Stack
- **Backend:** Spring Boot (Java 17), Spring Data JPA
- **Database:** MySQL
- **Frontend:** React.js
- **IoT:** Simulated sensor data generator
- **CI/CD:** GitHub Actions

## Project Structure
```
campus-platform/
├── backend/     # Spring Boot REST API
└── frontend/    # React dashboard
```

## Day 1 Setup

### Prerequisites (install/check)
```bash
java -version      # need Java 17+
mvn -version       # Maven
node -version      # Node.js 18+
npm -version
mysql --version
```

### 1. Create the GitHub repo
```bash
cd campus-platform
git init
git add .
git commit -m "Day 1: initial project scaffolding (Spring Boot + React)"
git branch -M main
git remote add origin <your-repo-url>
git push -u origin main
```

### 2. Set up MySQL
```sql
CREATE DATABASE campus_platform;
```
Then update `backend/src/main/resources/application.properties` with your MySQL username/password.

### 3. Run the backend
```bash
cd backend
mvn spring-boot:run
```
Visit http://localhost:8080/api/health — should return a JSON status.

### 4. Run the frontend
```bash
cd frontend
npm install
npm start
```
Visit http://localhost:3000 — the dashboard should show "✅ Backend connected".

## Roadmap (7-day plan)
- **Day 1:** Repo + toolchain + project scaffolds (this commit)
- **Day 2:** Database design, entities, Spring Boot ↔ MySQL connection
- **Day 3:** Building/Resource entities, CRUD APIs, Postman tests
- **Day 4:** Sensor-reading entity, sensor API, first IoT simulator
- **Day 5:** Simulated data → backend → MySQL, verify storage
- **Day 6:** Energy-wastage, overcrowding, environmental alert rules
- **Day 7:** React dashboard connected to live backend data
