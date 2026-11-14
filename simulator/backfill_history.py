#!/usr/bin/env python3
"""
Smart Campus - fill the database with realistic sensor history.

The live simulator only produces readings from the moment you start it, so the
Analytics charts would show a single day. This script creates the previous N days
(default 30) of readings, 2 per hour for every space, shaped like a real campus:

  * classrooms and labs: busy weekday mornings and afternoons, lunch dip, empty weekends
  * study spaces: fill up through the afternoon and evening
  * cafeteria: lunch rush; fitness centre: early morning and after-class peaks
  * a few overcrowding, odd-temperature and "AC left on in an empty room" events,
    with matching alerts (already marked resolved, so the live dashboard stays clean)

It also fills today up to the current time. It REPLACES all existing readings and alerts (they are only simulated data),
so you can run it again safely. Times are stored in UTC, exactly like the Spring Boot backend stores them
(see serverTimezone=UTC in application.properties), so the charts line up with your local clock.

Usage (on your Mac, with MySQL running; stop the simulator first):
    python3 backfill_history.py                # asks for your MySQL password, then asks to confirm
    python3 backfill_history.py --days 14
    python3 backfill_history.py --dry-run      # no database needed: just prints what it would generate
"""
import argparse
import getpass
import math
import os
import random
import sys
from datetime import datetime, timedelta, timezone

READINGS_PER_HOUR = 2
SAMPLE_RESOURCES = [  # used by --dry-run only
    (1, "Room 204", "CLASSROOM", 40), (2, "Room 101", "CLASSROOM", 35), (3, "Robotics Lab", "LAB", 24),
    (4, "Circuits Lab", "LAB", 28), (5, "Quiet Study Pod 1", "STUDY_SPACE", 8), (6, "Group Study Room", "STUDY_SPACE", 12),
    (7, "Main Cafeteria", "FACILITY", 120), (8, "Fitness Center", "FACILITY", 60),
]


def bump(hour, centre, width):
    return math.exp(-(((hour - centre) / width) ** 2))


def base_utilization(rtype, name, hour, weekday):
    """Typical share of capacity in use (0..1) for this kind of space at this time."""
    n = name.lower()
    weekend = weekday >= 5
    if "cafeteria" in n or "canteen" in n:
        u = 0.07 + 0.80 * bump(hour, 13, 1.6) + 0.35 * bump(hour, 8.5, 1.0) + 0.30 * bump(hour, 18.5, 1.2)
        return u * (0.45 if weekend else 1.0)
    if "fitness" in n or "gym" in n:
        u = 0.05 + 0.50 * bump(hour, 7.5, 1.3) + 0.65 * bump(hour, 18, 1.8)
        return u * (0.8 if weekend else 1.0)
    if rtype in ("CLASSROOM", "LAB"):
        if weekend:
            return 0.03 + 0.06 * bump(hour, 12, 3)
        u = 0.78 * bump(hour, 10.5, 2.6) + 0.62 * bump(hour, 15, 2.2)
        u *= 1 - 0.45 * bump(hour, 13, 0.8)  # lunch dip
        return (0.03 + u) * (0.92 if rtype == "LAB" else 1.0)
    if rtype == "STUDY_SPACE":
        u = 0.06 + 0.80 * bump(hour, 16, 3.4) + 0.22 * bump(hour, 10, 2.0) + 0.30 * bump(hour, 20.5, 1.8)
        return u * (0.6 if weekend else 1.0)
    u = 0.05 + 0.50 * bump(hour, 12, 3.5)  # other facilities
    return u * (0.3 if weekend else 1.0)


def make_reading(rng, resource, ts, day_factor, room_factor):
    rid, name, rtype, capacity = resource
    capacity = capacity or 30
    util = base_utilization(rtype, name, ts.hour, ts.weekday()) * day_factor * room_factor
    util = max(0.0, min(1.0, util * (1 + rng.gauss(0, 0.12))))
    occupancy = 0 if util < 0.06 else int(round(capacity * util))
    if util > 0.5 and rng.random() < 0.012:  # rare overcrowding event
        occupancy = capacity + rng.randint(1, 4)

    if occupancy > 0:
        ac_on, lights_on = rng.random() < 0.8, True
    else:
        ac_on, lights_on = rng.random() < 0.05, rng.random() < 0.12  # an empty room left running = energy waste

    ratio = min(occupancy / capacity, 1.2)
    temperature = 21.5 + 3.5 * ratio - (1.0 if ac_on else 0) + rng.gauss(0, 0.7)
    humidity = 48 + 8 * ratio + rng.gauss(0, 5)
    roll = rng.random()
    if roll < 0.008:    # too hot and humid
        temperature, humidity = rng.uniform(29, 36), rng.uniform(76, 92)
    elif roll < 0.011:  # too cold
        temperature = rng.uniform(12, 15)
    humidity = max(30, min(95, humidity))

    if ac_on or lights_on:
        energy = rng.uniform(0.5, 2.0) + 1.5 * min(ratio, 1.0)
    else:
        energy = rng.uniform(0.0, 0.3)
    return {"resource": resource, "ts": ts, "temp": round(temperature, 1), "humidity": round(humidity, 1),
            "occupancy": occupancy, "ac": ac_on, "lights": lights_on, "energy": round(energy, 2)}


def alerts_for(reading):
    """Same rules as the live backend (AlertService): returns [(type, severity, message)]."""
    rid, name, rtype, capacity = reading["resource"]
    capacity = capacity or 30
    out = []
    if reading["occupancy"] > capacity:
        over = reading["occupancy"] - capacity
        out.append(("OVERCROWDING", "HIGH",
                    f"{name} is overcrowded: {reading['occupancy']} people in a room rated for {capacity} ({over} over capacity)."))
    if reading["temp"] > 28 or reading["temp"] < 16:
        out.append(("ENVIRONMENTAL", "HIGH",
                    f"{name} has an unusual temperature: {reading['temp']}°C (normal range is 16-28°C)."))
    if reading["occupancy"] == 0 and (reading["ac"] or reading["lights"]):
        what = "AC and lights are" if reading["ac"] and reading["lights"] else ("AC is" if reading["ac"] else "lights are")
        out.append(("ENERGY_WASTE", "MEDIUM", f"{name} empty but {what} still running - energy being wasted."))
    return out


def generate(resources, days, seed=2026):
    rng = random.Random(seed)
    today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    readings, alerts = [], []
    last_alert = {}  # (resource id, type) -> time, so one problem is not raised every 30 minutes
    room_factor = {r[0]: random.Random(r[0] * 7919).uniform(0.72, 1.25) for r in resources}
    now = datetime.now()
    for offset in range(days, -1, -1):  # offset 0 = today, only up to the current time
        day = today - timedelta(days=offset)
        for resource in resources:
            day_factor = rng.gauss(1.0, 0.10)
            for hour in range(24):
                for k in range(READINGS_PER_HOUR):
                    ts = day + timedelta(hours=hour, minutes=(60 // READINGS_PER_HOUR) * k + rng.randint(0, 4))
                    if ts > now:
                        continue
                    reading = make_reading(rng, resource, ts, day_factor, room_factor[resource[0]])
                    readings.append(reading)
                    for a_type, severity, message in alerts_for(reading):
                        key = (resource[0], a_type)
                        if key not in last_alert or ts - last_alert[key] > timedelta(hours=6):
                            last_alert[key] = ts
                            alerts.append((resource[0], a_type, severity, message, ts))
    return readings, alerts, today


def to_db_time(ts, local_time=False):
    """The backend stores times as UTC, so convert from this computer's clock."""
    if local_time:
        return ts
    return ts.astimezone(timezone.utc).replace(tzinfo=None)


def summarize(readings, alerts, resources):
    print(f"  {len(readings):,} readings, {len(alerts)} alerts")
    for rid, name, rtype, capacity in resources:
        rows = [r for r in readings if r["resource"][0] == rid]
        weekday_noon = [r["occupancy"] / (capacity or 30) for r in rows if r["ts"].weekday() < 5 and 10 <= r["ts"].hour < 12]
        day_rows = [r for r in rows if 8 <= r["ts"].hour < 20]  # same window the Analytics page averages over
        avg = sum(r["occupancy"] / (capacity or 30) for r in day_rows) / len(day_rows)
        noon = sum(weekday_noon) / len(weekday_noon) if weekday_noon else 0
        print(f"    {name:<22} avg fill 8-20h {avg * 100:5.1f}%   weekday 10-12h {noon * 100:5.1f}%")


def main():
    parser = argparse.ArgumentParser(description="Fill the Smart Campus database with realistic sensor history.")
    parser.add_argument("--days", type=int, default=30, help="how many past days to create (default 30)")
    parser.add_argument("--dry-run", action="store_true", help="only show what would be generated; no database needed")
    parser.add_argument("--local-time", action="store_true",
                        help="store local clock times instead of UTC (only if your backend does not use serverTimezone=UTC)")
    parser.add_argument("--host", default="localhost")
    parser.add_argument("--user", default="root")
    parser.add_argument("--db", default="campus_platform")
    args = parser.parse_args()
    days = max(1, min(args.days, 90))

    if args.dry_run:
        readings, alerts, today = generate(SAMPLE_RESOURCES, days)
        print(f"Dry run: {days} days before {today:%d %b %Y}, sample spaces.")
        summarize(readings, alerts, SAMPLE_RESOURCES)
        return

    try:
        import pymysql
    except ImportError:
        sys.exit("The 'pymysql' package is missing. Run:  pip3 install pymysql --break-system-packages")

    password = os.environ.get("DB_PASSWORD") or getpass.getpass(f"MySQL password for {args.user} (typing is hidden): ")
    conn = pymysql.connect(host=args.host, user=args.user, password=password, database=args.db)
    try:
        with conn.cursor() as cur:
            cur.execute("SHOW COLUMNS FROM sensor_readings")
            have = {row[0] for row in cur.fetchall()}
            need = {"resource_id", "temperature_celsius", "humidity_percent", "occupancy_count", "ac_on",
                    "lights_on", "energy_consumption_kwh", "timestamp"}
            if not need <= have:
                sys.exit(f"Unexpected sensor_readings columns, missing {sorted(need - have)}. Found: {sorted(have)}")
            cur.execute("SELECT id, name, type, capacity FROM resources ORDER BY id")
            resources = [(r[0], r[1], r[2], r[3]) for r in cur.fetchall()]
        if not resources:
            sys.exit("There are no spaces (resources) in the database yet. Create some first.")

        readings, alerts, today = generate(resources, days)
        print(f"Ready to create {days} days of history up to now ({datetime.now():%d %b %Y %H:%M}):")
        summarize(readings, alerts, resources)
        print("\nThis first DELETES ALL existing sensor readings and alerts (they are simulated), then inserts the new ones.")
        if input("Type yes to continue: ").strip().lower() != "yes":
            sys.exit("Cancelled. Nothing was changed.")

        with conn.cursor() as cur:
            cur.execute("DELETE FROM alerts")
            cur.execute("DELETE FROM sensor_readings")
            rows = [(r["resource"][0], r["temp"], r["humidity"], r["occupancy"], int(r["ac"]), int(r["lights"]),
                     r["energy"], to_db_time(r["ts"], args.local_time)) for r in readings]
            for i in range(0, len(rows), 2000):
                cur.executemany(
                    "INSERT INTO sensor_readings (resource_id, temperature_celsius, humidity_percent, occupancy_count,"
                    " ac_on, lights_on, energy_consumption_kwh, `timestamp`) VALUES (%s,%s,%s,%s,%s,%s,%s,%s)",
                    rows[i:i + 2000])
            cur.executemany(
                "INSERT INTO alerts (resource_id, type, severity, message, resolved, created_at) VALUES (%s,%s,%s,%s,1,%s)",
                [(a[0], a[1], a[2], a[3], to_db_time(a[4], args.local_time)) for a in alerts])
        conn.commit()
        print("Done. Open the Analytics tab and refresh.")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
