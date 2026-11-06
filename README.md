# Smart Campus Resource Management Platform

A centralized platform for monitoring and managing campus resources — classrooms, labs, study spaces, energy usage, and environmental conditions — using simulated IoT sensors, automatic alert rules, and live dashboards for both campus administrators and students.

## The Problem

Campus resource management today is manual and reactive: no one notices a classroom's AC running in an empty room, or a lecture hall going over capacity, until someone happens to walk by or a complaint is filed. Students, meanwhile, have no easy way to find an open study room or lab without physically checking each one.

## The Solution

This platform makes campus monitoring **proactive instead of reactive**:
- Simulated IoT sensors continuously report occupancy, temperature, humidity, and energy use for every room
- A backend rule engine automatically detects problems the moment they happen — energy waste, overcrowding, unsafe environmental conditions — and raises alerts for staff
- Students get a simple, live view of which classrooms, labs, and study spaces are actually available right now
- Admins get a real-time monitoring dashboard with occupancy, energy, environment, and an active alerts feed

## Tech Stack
- **Backend:** Spring Boot (Java 17), Spring Data JPA
- **Database:** MySQL
- **Frontend:** React.js
- **IoT:** Python-based simulated sensor data generator
- **Version Control:** Git/GitHub

## Architecture

```
[Python IoT Simulator] --POST--> [Spring Boot REST API] --JPA--> [MySQL]
                                          |
                                          v
                                  [Alert Rule Engine]
                                  (energy waste, overcrowding,
                                   environmental checks)
                                          |
                                          v
                              [React Dashboard] (polls every 5s)
                              - Admin view: live sensors + alerts
                              - Student view: available spaces
```

## Project Structure
```
campus-platform/
├── backend/       # Spring Boot REST API
│   └── src/main/java/com/campus/platform/
│       ├── entity/       # Building, Resource, SensorReading, Alert
│       ├── repository/   # Spring Data JPA repositories
│       ├── service/      # AlertService (the rule engine)
│       └── controller/   # REST endpoints
├── frontend/      # React dashboard (Admin + Student views)
└── simulator/     # Python IoT sensor data simulator
```

## Key Features

### Smart Alert Rules
| Rule | Trigger | Severity |
|---|---|---|
| Energy Waste | Room is empty (0 occupancy) but AC and/or lights are still on | Medium |
| Overcrowding | Occupancy exceeds the room's stated capacity | High |
| Environmental | Temperature outside 16-28°C, or humidity over 70% | Medium/High |

Alerts are de-duplicated — the same unresolved problem won't spam a new alert every few seconds while it persists.

### Two Purpose-Built Views
- **Admin dashboard:** live sensor data per room, color-coded status (normal / energy waste / critical), active alerts feed with one-click resolve
- **Student view:** browse available classrooms, labs, and study spaces, filterable by type — no sensor/energy detail, just what's needed to find a space

## Running Locally

### Prerequisites
```bash
java -version      # Java 17+
mvn -version        # Maven
node -version       # Node.js 18+
mysql --version
python3 --version
```

### 1. Database setup
```sql
CREATE DATABASE campus_platform;
```
Update `backend/src/main/resources/application.properties` with your MySQL credentials.

### 2. Run the backend
```bash
cd backend
mvn spring-boot:run
```
Tables are created automatically. Verify at `http://localhost:8080/api/health`.

### 3. (Optional) Load sample data
Run `sample-data.sql` against your database to add a few more buildings and rooms beyond the default one, for a fuller demo.

### 4. Run the IoT simulator
```bash
cd simulator
pip3 install -r requirements.txt
python3 simulate_sensors.py
```
Generates a new sensor reading for every resource every 5 seconds, occasionally simulating overcrowding/energy-waste/environmental scenarios so the alert rules have something to catch.

### 5. Run the frontend
```bash
cd frontend
npm install
npm start
```
Visit `http://localhost:3000`. Use the Admin/Student toggle in the header to switch views.

## API Overview
| Endpoint | Method | Purpose |
|---|---|---|
| `/api/buildings` | GET/POST/PUT/DELETE | Manage buildings |
| `/api/resources` | GET/POST/PUT/DELETE | Manage rooms/labs/spaces (filterable by type, status, building) |
| `/api/sensor-readings` | GET/POST | Sensor data ingestion + history |
| `/api/alerts` | GET | Active alerts |
| `/api/alerts/{id}/resolve` | PUT | Mark an alert resolved |

## Status

**Completed:** Backend, database design, full CRUD APIs, IoT simulation, smart alert engine, Admin + Student dashboards.

**Planned for final submission:** Historical analytics/charts, GitHub Actions CI/CD, basic login/role separation.
