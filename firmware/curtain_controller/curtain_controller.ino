#include <ESP8266WiFi.h>
#include <ESP8266WebServer.h>
#include <Servo.h>
#include <EEPROM.h>
#include <time.h>
#include "secrets.h"




// NodeMCU D5 = GPIO14. Servo signal wire goes here.
constexpr uint8_t SERVO_PIN = D5;
// Continuous servos normally stop near 1500 us. Adjust from the web UI if
// this particular servo's true neutral point is different.
constexpr int DEFAULT_NEUTRAL = 1500;
constexpr unsigned long POSITION_HOLD_MS = 1500;
constexpr unsigned long MAX_RUN_MS = 6UL * 60UL * 60UL * 1000UL;
// Calibration: the latest 10-turn test produced 9.75 turns, so increase
// the previous factor by 10 / 9.75.
constexpr float TURN_CALIBRATION_FACTOR = 1.4918f;
constexpr uint32_t SCHEDULE_MAGIC = 0x53434831UL;
constexpr uint8_t MAX_SCHEDULES = 8;
constexpr size_t EEPROM_SIZE = 512;

struct ScheduleEntry {
  uint8_t enabled;
  uint8_t days;       // bit 0 = Monday ... bit 6 = Sunday
  uint8_t hour;
  uint8_t minute;
  int8_t direction;   // 1 = clockwise, -1 = counter-clockwise
  uint8_t speed;
  uint16_t turns10;   // turns multiplied by 10
  uint16_t msPerRev;
};

struct ScheduleStore {
  uint32_t magic;
  uint8_t count;
  ScheduleEntry entries[MAX_SCHEDULES];
};

ESP8266WebServer server(80);
Servo servo;

enum MotionMode { MOTION_NONE, MOTION_TURNS, MOTION_TIMED, MOTION_JOG };
MotionMode motionMode = MOTION_NONE;
bool motionRunning = false;
unsigned long motionStopAt = 0;
int continuousNeutral = DEFAULT_NEUTRAL;
int continuousOutput = DEFAULT_NEUTRAL;
bool servoAttached = false;
bool servoDetachPending = false;
unsigned long servoDetachAt = 0;
ScheduleStore scheduleStore;
int lastRunDay[MAX_SCHEDULES];
unsigned long lastScheduleCheck = 0;

#include "WebUpdate.h"

void addCorsHeaders() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Cache-Control", "no-store");
}

String motionModeName() {
  if (motionMode == MOTION_TURNS) return "turns";
  if (motionMode == MOTION_TIMED) return "timed";
  if (motionMode == MOTION_JOG) return "jog";
  return "none";
}

void sendJson(int code, const String& body) {
  addCorsHeaders();
  server.send(code, "application/json; charset=utf-8", body);
}

void ensureServoAttached() {
  if (!servoAttached) {
    servo.attach(SERVO_PIN, 500, 2500);
    servoAttached = true;
  }
  servoDetachPending = false;
}

void requestServoDetach(unsigned long delayMs = 250) {
  if (!servoAttached) return;
  servoDetachPending = true;
  servoDetachAt = millis() + delayMs;
}

void disableServoOutput() {
  servoDetachPending = false;
  if (servoAttached) servo.detach();
  servoAttached = false;
  // Do not leave the signal wire floating after detach.
  pinMode(SERVO_PIN, OUTPUT);
  digitalWrite(SERVO_PIN, LOW);
}

void serviceServoDetach() {
  if (!servoDetachPending || motionRunning || (long)(millis() - servoDetachAt) < 0) return;
  disableServoOutput();
}

void stopMotion() {
  motionRunning = false;
  motionMode = MOTION_NONE;
  // Stop by removing PWM immediately. Sending the configured neutral pulse
  // here could make the servo move if the neutral point is not exact.
  disableServoOutput();
  continuousOutput = continuousNeutral;
}

void handleRoot() {
  addCorsHeaders();
  if (filesystemReady && LittleFS.exists("/index.html")) {
    File index = LittleFS.open("/index.html", "r");
    server.streamFile(index, "text/html; charset=utf-8");
  } else {
    server.send(503, "text/html; charset=utf-8", "<meta charset=utf-8>網頁尚未安裝。<a href=/update>開啟更新頁</a>");
  }
}

void handleServo() {
  if (rejectDuringUpdate()) return;
  if (!server.hasArg("angle")) {
    sendJson(400, "{\"error\":\"missing angle\"}");
    return;
  }

  int angle = constrain(server.arg("angle").toInt(), 0, 180);
  stopMotion();
  ensureServoAttached();
  int pulse = map(angle, 0, 180, 500, DEFAULT_NEUTRAL);
  servo.writeMicroseconds(pulse);
  continuousOutput = pulse;
  requestServoDetach(POSITION_HOLD_MS);
  sendJson(200, String("{\"angle\":") + angle + "}");
}

void handleStop() {
  stopMotion();
  sendJson(200, "{\"running\":false,\"message\":\"已停止\"}");
}

void saveScheduleStore() {
  scheduleStore.magic = SCHEDULE_MAGIC;
  EEPROM.put(0, scheduleStore);
  EEPROM.commit();
}

void loadScheduleStore() {
  EEPROM.begin(EEPROM_SIZE);
  EEPROM.get(0, scheduleStore);
  if (scheduleStore.magic != SCHEDULE_MAGIC || scheduleStore.count > MAX_SCHEDULES) {
    memset(&scheduleStore, 0, sizeof(scheduleStore));
    scheduleStore.magic = SCHEDULE_MAGIC;
    saveScheduleStore();
  }
  for (uint8_t i = 0; i < MAX_SCHEDULES; i++) lastRunDay[i] = -1;
}

bool getLocalTime(struct tm& localInfo) {
  time_t now = time(nullptr);
  if (now < 1700000000) return false;
  localtime_r(&now, &localInfo);
  return true;
}

String localTimeString() {
  struct tm localInfo;
  if (!getLocalTime(localInfo)) return "尚未校時";
  char text[24];
  strftime(text, sizeof(text), "%Y-%m-%d %H:%M:%S", &localInfo);
  return String(text);
}

void handleSchedules() {
  struct tm localInfo;
  bool synced = getLocalTime(localInfo);
  String body = "{\"timeSynced\":" + String(synced ? "true" : "false") +
                ",\"localTime\":\"" + localTimeString() + "\",\"items\":[";

  for (uint8_t i = 0; i < scheduleStore.count; i++) {
    if (i > 0) body += ",";
    ScheduleEntry& item = scheduleStore.entries[i];
    body += "{\"id\":" + String(i) +
            ",\"enabled\":" + String(item.enabled ? "true" : "false") +
            ",\"days\":" + String(item.days) +
            ",\"hour\":" + String(item.hour) +
            ",\"minute\":" + String(item.minute) +
            ",\"direction\":\"" + String(item.direction < 0 ? "ccw" : "cw") +
            "\",\"speed\":" + String(item.speed) +
            ",\"turns\":" + String(item.turns10 / 10.0f, 1) +
            ",\"msrev\":" + String(item.msPerRev) + "}";
  }
  body += "]}";
  sendJson(200, body);
}

void handleScheduleAdd() {
  if (rejectDuringUpdate()) return;
  if (scheduleStore.count >= MAX_SCHEDULES) {
    sendJson(400, "{\"error\":\"最多只能建立 8 筆排程\"}");
    return;
  }

  int days = constrain(server.arg("days").toInt(), 1, 127);
  int hour = constrain(server.arg("hour").toInt(), 0, 23);
  int minute = constrain(server.arg("minute").toInt(), 0, 59);
  int speed = constrain(server.arg("speed").toInt(), 1, 100);
  float turns = constrain(server.arg("turns").toFloat(), 0.1f, 1000.0f);
  int msPerRev = constrain(server.arg("msrev").toInt(), 100, 60000);

  ScheduleEntry& item = scheduleStore.entries[scheduleStore.count];
  item.enabled = 1;
  item.days = (uint8_t)days;
  item.hour = (uint8_t)hour;
  item.minute = (uint8_t)minute;
  item.direction = server.arg("direction") == "ccw" ? -1 : 1;
  item.speed = (uint8_t)speed;
  item.turns10 = (uint16_t)constrain((int)round(turns * 10.0f), 1, 10000);
  item.msPerRev = (uint16_t)msPerRev;
  scheduleStore.count++;
  saveScheduleStore();
  sendJson(200, "{\"ok\":true}");
}

void handleScheduleDelete() {
  if (rejectDuringUpdate()) return;
  int id = server.arg("id").toInt();
  if (id < 0 || id >= scheduleStore.count) {
    sendJson(400, "{\"error\":\"無效的排程 ID\"}");
    return;
  }

  for (uint8_t i = id; i + 1 < scheduleStore.count; i++) {
    scheduleStore.entries[i] = scheduleStore.entries[i + 1];
  }
  scheduleStore.count--;
  memset(&scheduleStore.entries[scheduleStore.count], 0, sizeof(ScheduleEntry));
  saveScheduleStore();
  for (uint8_t i = 0; i < MAX_SCHEDULES; i++) lastRunDay[i] = -1;
  sendJson(200, "{\"ok\":true}");
}

void startContinuousMotion(int direction, int speed, int neutral, unsigned long duration, MotionMode requestedMode) {
  continuousNeutral = constrain(neutral, 500, 2500);
  stopMotion();
  motionMode = requestedMode;
  motionRunning = true;
  motionStopAt = millis() + duration;
  // direction=1 (CW) uses a lower pulse; direction=-1 (CCW) uses a higher pulse.
  int span = direction > 0 ? continuousNeutral - 500 : 2500 - continuousNeutral;
  int offset = (span * speed) / 100;
  continuousOutput = constrain(continuousNeutral + (direction > 0 ? -offset : offset), 500, 2500);
  ensureServoAttached();
  servo.writeMicroseconds(continuousOutput);
}

void checkSchedules() {
  if (millis() - lastScheduleCheck < 1000) return;
  lastScheduleCheck = millis();

  struct tm localInfo;
  if (!getLocalTime(localInfo)) return;

  int dayIndex = (localInfo.tm_wday + 6) % 7;
  int dayKey = (localInfo.tm_year * 1000) + localInfo.tm_yday;
  for (uint8_t i = 0; i < scheduleStore.count; i++) {
    ScheduleEntry& item = scheduleStore.entries[i];
    if (!item.enabled || !(item.days & (1 << dayIndex)) ||
        item.hour != localInfo.tm_hour || item.minute != localInfo.tm_min ||
        lastRunDay[i] == dayKey) continue;

    lastRunDay[i] = dayKey;
    if (motionRunning) continue;
    unsigned long duration = (unsigned long)min(
      (float)MAX_RUN_MS, (item.turns10 / 10.0f) * item.msPerRev * TURN_CALIBRATION_FACTOR);
    startContinuousMotion(item.direction, item.speed, DEFAULT_NEUTRAL, duration, MOTION_TURNS);
    Serial.printf("Schedule %u started at %02d:%02d\n", i, localInfo.tm_hour, localInfo.tm_min);
  }
}

void handleStatus() {
  unsigned long remaining = 0;
  if (motionRunning) {
    long delta = (long)(motionStopAt - millis());
    if (delta > 0) remaining = (unsigned long)delta;
  }

  bool wifiConnected = WiFi.status() == WL_CONNECTED;
  String ip = WiFi.localIP().toString();
  int rssi = wifiConnected ? WiFi.RSSI() : -127;
  struct tm localInfo;
  bool timeSynced = getLocalTime(localInfo);
  String body = "{\"wifiConnected\":" + String(wifiConnected ? "true" : "false") +
                ",\"ip\":\"" + ip +
                "\",\"rssi\":" + String(rssi) +
                ",\"localTime\":\"" + localTimeString() +
                "\",\"timeSynced\":" + String(timeSynced ? "true" : "false") +
                ",\"scheduleCount\":" + String(scheduleStore.count) +
                ",\"servoPwm\":" + String(servoAttached ? "true" : "false") +
                ",\"uptimeSec\":" + String(millis() / 1000UL) +
                ",\"running\":" + String(motionRunning ? "true" : "false") +
                ",\"mode\":\"" + motionModeName() +
                "\",\"remainingMs\":" + String(remaining) +
                ",\"output\":" + String(continuousOutput) + "}";
  body.remove(body.length() - 1);
  body += String(",\"firmware\":\"") + FIRMWARE_VERSION + "\",\"otaEnabled\":true,\"filesystemReady\":" + (filesystemReady ? "true" : "false") + ",\"freeHeap\":" + ESP.getFreeHeap() + "}";
  sendJson(200, body);
}

void handleControl() {
  if (rejectDuringUpdate()) return;
  String mode = server.arg("mode");
  int direction = server.arg("direction") == "ccw" ? -1 : 1;
  int speed = constrain(server.arg("speed").toInt(), 1, 100);
  continuousNeutral = constrain(server.arg("neutral").toInt(), 500, 2500);

  float durationMs = 0;
  String message;
  MotionMode requestedMode;

  if (mode == "turns") {
    float turns = constrain(server.arg("turns").toFloat(), 0.1f, 1000.0f);
    float msPerRev = constrain(server.arg("msrev").toFloat(), 100.0f, 60000.0f);
    durationMs = turns * msPerRev * TURN_CALIBRATION_FACTOR;
    requestedMode = MOTION_TURNS;
    message = String("已啟動 ") + String(turns, 1) + " 圈，預計 " + String(durationMs / 1000.0f, 1) + " 秒";
  } else if (mode == "timed") {
    float seconds = constrain(server.arg("seconds").toFloat(), 0.1f, 21600.0f);
    durationMs = seconds * 1000.0f;
    requestedMode = MOTION_TIMED;
    message = String("已啟動定時運轉，預計 ") + String(seconds, 1) + " 秒";
  } else {
    sendJson(400, "{\"error\":\"invalid mode\"}");
    return;
  }

  unsigned long duration = (unsigned long)constrain(durationMs, 100.0f, (float)MAX_RUN_MS);
  startContinuousMotion(direction, speed, continuousNeutral, duration, requestedMode);

  String body = "{\"running\":true,\"message\":\"" + message + "\"}";
  sendJson(200, body);
}

void handleJog() {
  if (rejectDuringUpdate()) return;
  int direction = server.arg("direction") == "ccw" ? -1 : 1;
  int speed = constrain(server.arg("speed").toInt(), 1, 100);
  int neutral = constrain(server.arg("neutral").toInt(), 500, 2500);

  // A jog request is refreshed by the browser while the button is held.
  // If the browser disappears, the 2-second deadline stops the motor.
  if (!motionRunning || motionMode != MOTION_JOG) {
    startContinuousMotion(direction, speed, neutral, 2000, MOTION_JOG);
  } else {
    continuousNeutral = neutral;
    int span = direction > 0 ? continuousNeutral - 500 : 2500 - continuousNeutral;
    int offset = (span * speed) / 100;
    int output = constrain(continuousNeutral + (direction > 0 ? -offset : offset), 500, 2500);
    motionStopAt = millis() + 2000;
    if (output != continuousOutput) {
      continuousOutput = output;
      ensureServoAttached();
      servo.writeMicroseconds(continuousOutput);
    }
  }

  sendJson(200, "{\"running\":true,\"mode\":\"jog\"}");
}

void setup() {
  Serial.begin(115200);
  delay(100);

  mountWebFiles();
  loadScheduleStore();
  configTime(8 * 3600, 0, "pool.ntp.org", "time.nist.gov", "time.google.com");

  // Keep the signal deterministic and low during boot. Attach only when a
  // movement command arrives, so powering the board cannot start the servo.
  disableServoOutput();

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting to Wi-Fi");

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print('.');
  }

  Serial.println();
  Serial.print("Wi-Fi connected. Open: http://");
  Serial.println(WiFi.localIP());
  WiFi.setSleepMode(WIFI_NONE_SLEEP);

  server.on("/", handleRoot);
  server.on("/servo", handleServo);
  server.on("/control", handleControl);
  server.on("/jog", handleJog);
  server.on("/stop", handleStop);
  server.on("/status", handleStatus);
  server.on("/schedules", handleSchedules);
  server.on("/schedule/add", handleScheduleAdd);
  server.on("/schedule/delete", handleScheduleDelete);
  setupUpdates();
  server.serveStatic("/", LittleFS, "/", "no-cache");
  server.begin();
  Serial.println("HTTP server started");
  delay(250);
  servo.detach();
  servoAttached = false;
}

void loop() {
  ArduinoOTA.handle();
  server.handleClient();
  if (!updateInProgress) checkSchedules();

  if (motionRunning && (long)(millis() - motionStopAt) >= 0) {
    stopMotion();
  }
  serviceServoDetach();
}
