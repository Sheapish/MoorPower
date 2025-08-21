#include <WiFi.h>
#include <WebServer.h>
#include <Wire.h>
#include <ICM_20948.h>
#include <ArduinoJson.h>

// Replace with your WiFi credentials
const char* ssid = "YOUR_SSID";
const char* password = "YOUR_PASSWORD";

// Web server
WebServer server(80);

// IMU
ICM_20948_I2C myICM;

unsigned long lastTime = 0;

void handleData() {
  icm_20948_DMP_data_t data;
  if (myICM.dataReady()) {
    myICM.getAGMT(); // refresh accel, gyro, etc.

    if (myICM.readDMPdataFromFIFO(&data) == ICM_20948_Stat_Ok) {
      float qw = 1.0, qx = 0.0, qy = 0.0, qz = 0.0;

      if ((data.header & DMP_header_bitmap_Quat9) > 0) {
        // Many SparkFun builds only expose 3 values (Q1,Q2,Q3) as a rotation vector
        qx = data.Quat9.Data.Q1 / 1073741824.0f;
        qy = data.Quat9.Data.Q2 / 1073741824.0f;
        qz = data.Quat9.Data.Q3 / 1073741824.0f;

        // Recompute scalar part qw so quaternion is normalized
        float norm2 = 1.0f - (qx*qx + qy*qy + qz*qz);
        qw = (norm2 > 0) ? sqrt(norm2) : 0.0f;
      }

      // Accelerometer (m/s²)
      float ax = myICM.accX() * 9.80665 / 1000.0;
      float ay = myICM.accY() * 9.80665 / 1000.0;
      float az = myICM.accZ() * 9.80665 / 1000.0;

      // Gyroscope (rad/s)
      float gx = myICM.gyrX() * (PI / 180.0);
      float gy = myICM.gyrY() * (PI / 180.0);
      float gz = myICM.gyrZ() * (PI / 180.0);

      // Time step
      unsigned long now = millis();
      float dt = (now - lastTime) / 1000.0;
      if (dt <= 0) dt = 0.05;
      lastTime = now;

      // Build JSON
      StaticJsonDocument<256> doc;
      JsonArray q = doc.createNestedArray("q");
      q.add(qw); q.add(qx); q.add(qy); q.add(qz);

      JsonArray acc = doc.createNestedArray("acc");
      acc.add(ax); acc.add(ay); acc.add(az);

      JsonArray gyr = doc.createNestedArray("gyr");
      gyr.add(gx); gyr.add(gy); gyr.add(gz);

      doc["dt"] = dt;

      String response;
      serializeJson(doc, response);
      server.send(200, "application/json", response);
      return;
    }
  }

  // No fresh data
  server.send(503, "application/json", "{\"error\":\"No IMU data\"}");
}

void setup() {
  Serial.begin(115200);
  Wire.begin();

  // Initialize IMU
  if (myICM.begin(Wire, 0x69) != ICM_20948_Stat_Ok) {
    Serial.println("IMU not detected!");
    while (1);
  }
  Serial.println("IMU connected.");

  // Enable DMP + Quaternion
  myICM.initializeDMP();
  myICM.enableDMPSensor(INV_ICM20948_SENSOR_ORIENTATION); // Quaternion 9
  myICM.setDMPODRrate(INV_ICM20948_SENSOR_ORIENTATION, 225); // Hz
  myICM.enableFIFO();
  myICM.enableDMP();
  myICM.resetDMP();
  myICM.resetFIFO();

  // WiFi
  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi connected!");
  Serial.print("ESP32 IP: ");
  Serial.println(WiFi.localIP());

  // Web server
  server.on("/data", handleData);
  server.begin();
}

void loop() {
  server.handleClient();
}
