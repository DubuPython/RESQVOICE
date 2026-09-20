import requests
import time
import random

# The URL of your Flask API endpoint
url = "http://localhost:5000/api/alert"

# Dummy data to simulate the ESP32
locations = ["Building A - CR 2", "Main Hallway", "Cafeteria", "Building C - CR 1"]
levels = ["Critical", "Warning"]

print("Starting ESP32 simulation... Sending an alert every 20 seconds. Press Ctrl+C to stop.")

try:
    while True:
        # Create a fake payload
        payload = {
            "location": random.choice(locations),
            "level": random.choice(levels)
        }
        
        # Send the POST request to the Flask server
        response = requests.post(url, json=payload)
        
        print(f"Sent: {payload} | Server Response: {response.json()}")
        
        # INCREASED DELAY: Wait 20 seconds before sending the next alert
        time.sleep(20)

except KeyboardInterrupt:
    print("\nSimulation stopped.")