#include <WiFi.h>
#include <ESPAsyncWebServer.h>
#include <AsyncTCP.h>
#include <Wire.h>
#include <ICM_20948.h>
#include <ArduinoJson.h>
#include <LittleFS.h>

// ---------------- WiFi ----------------
const char* ssid     = "Carnegie_Guest";
const char* password = "CleanInternet!";

// ---------------- Server / WebSocket ----------------
AsyncWebServer server(80);
AsyncWebSocket ws("/ws");

// ---------------- IMU ----------------
ICM_20948_I2C myICM;
static const uint8_t ICM_ADDR = 0x68;

// Update interval
const unsigned long UPDATE_INTERVAL_MS = 100;

// ---------------- PTO geometry ----------------
struct PTO {
  const char* name;
  float r[3];
  float anchor[3];
};

static const PTO PTOs[3] = {
  { "PTO 1", {  5.0f,  0.0f, 0.0f }, {  10.0f,  0.0f, -10.0f } },
  { "PTO 2", { -5.0f,  2.5f, 0.0f }, { -10.0f,  5.0f, -10.0f } },
  { "PTO 3", { -5.0f, -2.5f, 0.0f }, { -10.0f, -5.0f, -10.0f } }
};

// ---------------- Tiny vector helpers ----------------
static inline void vsub(const float a[3], const float b[3], float out[3]) {
  out[0] = a[0]-b[0]; out[1] = a[1]-b[1]; out[2] = a[2]-b[2];
}
static inline float vdot(const float a[3], const float b[3]) {
  return a[0]*b[0] + a[1]*b[1] + a[2]*b[2];
}
static inline void vcross(const float a[3], const float b[3], float out[3]) {
  out[0] = a[1]*b[2] - a[2]*b[1];
  out[1] = a[2]*b[0] - a[0]*b[2];
  out[2] = a[0]*b[1] - a[1]*b[0];
}
static inline void vscale(float v[3], float s) { v[0]*=s; v[1]*=s; v[2]*=s; }
static inline void vnorm(float v[3]) {
  float n = sqrtf(vdot(v,v));
  if (n > 1e-9f) vscale(v, 1.0f/n); else { v[0]=v[1]=v[2]=0.0f; }
}

// ---------------- Broadcast computed rates ----------------
void broadcastIMU() {
  static unsigned long lastSent = 0;
  unsigned long now = millis();
  if (now - lastSent < UPDATE_INTERVAL_MS) return;
  lastSent = now;

  if (!myICM.dataReady()) return;
  myICM.getAGMT();

  // Only rotations along x/y axes, z rotation ignored
  float omega[3] = {
    myICM.gyrX() * (PI / 180.0f),
    myICM.gyrY() * (PI / 180.0f),
    0.0f  // ignore yaw
  };

  const float deadband = 0.005f;
  for (int i=0;i<3;i++) if (fabsf(omega[i]) < deadband) omega[i] = 0.0f;

  float rates[3] = {0,0,0};

  for (int i = 0; i < 3; ++i) {
    float dir[3];
    vsub(PTOs[i].anchor, PTOs[i].r, dir);
    vnorm(dir);

    float v_pto[3];
    vcross(omega, PTOs[i].r, v_pto);

    float rate = vdot(v_pto, dir);
    if (rate < 0.0f) rate = 0.0f;

    rates[i] = rate;
  }

  const float dt = UPDATE_INTERVAL_MS / 1000.0f;

  // Build JSON
  StaticJsonDocument<256> doc;
  JsonArray jr = doc.createNestedArray("rates");
  jr.add(rates[0]); jr.add(rates[1]); jr.add(rates[2]);
  doc["dt"] = dt;

  char buf[256];
  serializeJson(doc, buf, sizeof(buf));
  ws.textAll(buf);
}

// ---------------- Setup ----------------
void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("ESP32 booted!");

  Wire.begin(21, 22);
  Wire.setClock(400000);

  for(int attempt=0; attempt<10; attempt++){
    if(myICM.begin(Wire, ICM_ADDR) == ICM_20948_Stat_Ok){
      Serial.println("IMU connected.");
      break;
    }
    Serial.println("IMU not detected, retrying...");
    delay(1000);
  }
  if(myICM.status != ICM_20948_Stat_Ok){
    Serial.println("IMU init failed. Halting.");
    while(1) delay(1000);
  }

  Serial.println("Connecting to WiFi...");
  WiFi.begin(ssid,password);
  while(WiFi.status() != WL_CONNECTED){
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi connected. IP: " + WiFi.localIP().toString());

  if(!LittleFS.begin(true)){
    Serial.println("LittleFS mount failed!");
    while(1) delay(1000);
  }

  server.serveStatic("/", LittleFS, "/").setDefaultFile("index.html");
  server.addHandler(&ws);
  server.begin();
}

// ---------------- Loop ----------------
void loop() {
  broadcastIMU();
  ws.cleanupClients();
}
