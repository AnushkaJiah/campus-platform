"""
Smart Campus Resource Management Platform - IoT Sensor Simulator

Generates fake sensor readings (temperature, humidity, occupancy, AC/lights
status, energy use) for every Resource in the database and POSTs them to
the Spring Boot backend on a loop, simulating real IoT sensors.

Usage:
    pip install requests
    python simulate_sensors.py

Make sure the backend is running first (mvn spring-boot:run) and that you
have at least one Building + Resource created (e.g. via Postman).
"""

import random
import time
import requests

BASE_URL = "http://localhost:8080/api"
INTERVAL_SECONDS = 20  # how often to generate a new reading per resource


def get_all_resources():
    response = requests.get(f"{BASE_URL}/resources")
    response.raise_for_status()
    return response.json()


def generate_reading(resource):
    """
    Occasionally generates 'unusual' conditions on purpose so the alert
    rules we build on Day 6 have something to actually detect:
      - ~5% chance the room is empty but AC/lights are still on (energy waste)
      - ~4% chance occupancy exceeds capacity (overcrowding)
      - ~4% chance temperature/humidity is out of normal range
    """
    capacity = resource.get("capacity") or 30
    is_wasting_energy = random.random() < 0.05
    is_overcrowded = random.random() < 0.04
    is_env_unusual = random.random() < 0.04

    if is_overcrowded:
        occupancy = capacity + random.randint(1, 5)
    elif is_wasting_energy:
        occupancy = 0
    else:
        occupancy = random.randint(0, capacity)

    ac_on = True if is_wasting_energy else random.random() < 0.5
    lights_on = True if is_wasting_energy else random.random() < 0.6

    if is_env_unusual:
        temperature = round(random.uniform(30, 38), 1)  # too hot
        humidity = round(random.uniform(75, 95), 1)      # too humid
    else:
        temperature = round(random.uniform(20, 26), 1)
        humidity = round(random.uniform(35, 60), 1)

    energy = round(random.uniform(0.5, 3.5) if (ac_on or lights_on) else random.uniform(0.0, 0.3), 2)

    return {
        "resource": {"id": resource["id"]},
        "temperatureCelsius": temperature,
        "humidityPercent": humidity,
        "occupancyCount": occupancy,
        "acOn": ac_on,
        "lightsOn": lights_on,
        "energyConsumptionKwh": energy,
    }


def post_reading(reading):
    response = requests.post(f"{BASE_URL}/sensor-readings", json=reading)
    response.raise_for_status()
    return response.json()


def main():
    print("Smart Campus IoT Simulator starting...")
    print(f"Backend: {BASE_URL}")
    print(f"Posting a new reading every {INTERVAL_SECONDS} seconds per resource.")
    print("Press Ctrl+C to stop.\n")

    while True:
        try:
            resources = get_all_resources()
        except requests.exceptions.RequestException as e:
            print(f"Could not reach backend ({e}). Retrying in {INTERVAL_SECONDS}s...")
            time.sleep(INTERVAL_SECONDS)
            continue

        if not resources:
            print("No resources found yet. Create one via Postman first (POST /api/resources).")
            time.sleep(INTERVAL_SECONDS)
            continue

        for resource in resources:
            reading = generate_reading(resource)
            try:
                saved = post_reading(reading)
                print(
                    f"[{resource['name']}] "
                    f"occ={saved['occupancyCount']} "
                    f"temp={saved['temperatureCelsius']}C "
                    f"humidity={saved['humidityPercent']}% "
                    f"ac={saved['acOn']} lights={saved['lightsOn']} "
                    f"energy={saved['energyConsumptionKwh']}kWh"
                )
            except requests.exceptions.RequestException as e:
                print(f"Failed to post reading for {resource['name']}: {e}")

        time.sleep(INTERVAL_SECONDS)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nSimulator stopped.")
