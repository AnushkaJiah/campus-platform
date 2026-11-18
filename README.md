# Smart Campus Resource Management Platform

A web platform that shows which campus spaces are empty, full or wasted. A Python simulator stands in for room
sensors and sends occupancy, temperature and energy readings to a Spring Boot REST API backed by MySQL. A React
interface lets administrators watch spaces live, approve bookings, track maintenance and study utilization, and lets
students find and book spaces.

Capstone project, UCF 439.

## Features

| Area | What it does |
| --- | --- |
| Live dashboard | Latest occupancy, temperature and utilization per space, with active alerts (overcrowding, temperature, AC left on in an empty room) |
| Campus map | Buildings and floors as a floor plan or a 3D view; colour shows how full each space is, a ring marks an active alert |
| Booking | Students request a slot, admins approve or reject (with a reason), either side can cancel, everyone is notified |
| Notifications | Bell in the header with readable messages and mark-as-read |
| Maintenance | Anyone reports a fault with a priority; admins update its status |
| Analytics | Utilization over a chosen period: daily trend, busiest hours, ranking of under-used and crowded spaces, alert counts (utilization averages cover 08:00-20:00) |
| Login and roles | Signed JWT login with two roles, ADMIN and STUDENT; admin endpoints are closed by default |
| Themes and phones | Light and dark mode with a toggle; every page works on a phone |
| CI | GitHub Actions builds the backend, the frontend and checks the simulator on every push |

## Tech stack

Java 17, Spring Boot 3.3.4, Spring Security, JPA / Hibernate, MySQL, React, Python 3, GitHub Actions.

## Repository layout

| Folder | Contents |
| --- | --- |
| `backend/` | Spring Boot application |
| `frontend/` | React application |
| `simulator/` | Live sensor simulator and the history generator `backfill_history.py` |
| `.github/workflows/` | CI definition |

## Run it locally

Requirements: Java 17, Maven, Node.js 20, MySQL, Python 3.

1. **Start MySQL.** On a Mac with Homebrew: `brew services restart mysql`.
2. **Backend.** The database `campus_platform` is created automatically. Check the username and password in
   `backend/src/main/resources/application.properties`, then:
   ```
   cd backend
   mvn spring-boot:run
   ```
   The API runs on http://localhost:8080. Two demo accounts are created on first start.
3. **Frontend.**
   ```
   cd frontend
   npm install
   npm start
   ```
   Open http://localhost:3000.
4. **Live sensor data.** In a third terminal, from the project root:
   ```
   python3 simulator/simulate_sensors.py
   ```
5. **Realistic history for Analytics (optional).** Stop the live simulator, then:
   ```
   pip3 install pymysql --break-system-packages
   python3 simulator/backfill_history.py
   ```
   It generates 30 days of readings shaped like a real campus. **It deletes existing readings and alerts**, and asks
   you to type `yes` first. Use `--dry-run` to preview.

## Demo accounts

| Role | Email | Password |
| --- | --- | --- |
| Admin | admin@campus.edu | admin123 |
| Student | student@campus.edu | student123 |

These are demo credentials for local use only.

## How it works

```
Python simulator  -->  Spring Boot REST API  -->  MySQL
                              ^
                       React web app (JWT)
```

- Utilization = occupancy / capacity. Under 30% is under-used, over 85% is crowded.
- The API is the only door to the database: the simulator and the web app both go through it.
- A JWT filter checks every request; endpoints not explicitly opened to students require the ADMIN role.
- Timestamps are stored in UTC.

## Known limitations

- Sensor data is simulated; the reading format is fixed so real devices could replace the simulator.
- The database password and JWT secret in `application.properties` are development values and must be moved to
  environment variables before any real deployment.
- Automated back-end tests are minimal.
