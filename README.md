## ESP32 + ICM-20948 IMU Webserver

This project simulates the power produced by carnegie's moor power device utilising an **ESP32 (Freenove)** and **ICM-20948 9-DOF IMU**, streaming sensor data (quaternion, accelerometer, gyroscope) over WiFi.  
A web frontend fetches the data via HTTP (https://sheapish.github.io/MoorPower/) and visualizes PTO belt power and battery charge in real time.

---

## Features
- ESP32 acts as a WiFi server
- ICM-20948 DMP (Digital Motion Processor) provides **fused quaternion** orientation
- Sensor data served as JSON
