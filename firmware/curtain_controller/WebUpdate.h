#pragma once
#include <ArduinoOTA.h>
#include <LittleFS.h>
#include <Updater.h>
#include <flash_hal.h>

void stopMotion();
bool updateInProgress = false;
bool filesystemReady = false;
bool httpUpdateAuthenticated = false;
bool httpUpdateComplete = false;
String httpUpdateError;
constexpr const char* FIRMWARE_VERSION = "curtain-2026.10.21-ota1";

const char UPDATE_PAGE[] PROGMEM = R"html(<!doctype html><html lang="zh-Hant"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>捲簾將軍｜無線更新</title><style>body{font:16px system-ui;background:#f6f6f3;color:#222;max-width:560px;margin:48px auto;padding:24px}form{padding:24px 0;border-top:1px solid #ccc}input,button{display:block;margin:16px 0;font:inherit}button{padding:10px 18px}p{line-height:1.7}a{color:#2563eb}</style><h1>捲簾將軍 · 無線更新</h1><p>同一個 Wi-Fi 下即可更新，完成後裝置會重新啟動。</p><form method="post" enctype="multipart/form-data"><h2>更新韌體</h2><p>選擇 curtain_controller.ino.bin。保留網頁與排程資料。</p><input required type="file" accept=".bin" name="firmware"><button>上傳韌體</button></form><form method="post" enctype="multipart/form-data"><h2>更新網頁</h2><p>選擇 curtain_controller.littlefs.bin，更新 Apple／Google 介面。</p><input required type="file" accept=".bin" name="filesystem"><button>上傳網頁</button></form><a href="/">回控制介面</a></html>)html";

void mountWebFiles() {
  LittleFS.setConfig(LittleFSConfig().setAutoFormat(false));
  filesystemReady = LittleFS.begin();
}

void startUpdate(bool filesystem) {
  updateInProgress = true;
  stopMotion();
  if (filesystem) { close_all_fs(); LittleFS.end(); filesystemReady = false; }
}

bool rejectDuringUpdate() {
  if (!updateInProgress) return false;
  server.send(503, "application/json", "{\"error\":\"OTA update in progress\"}");
  return true;
}

void setupUpdates() {
  ArduinoOTA.setHostname("curtain-general");
  ArduinoOTA.setPasswordHash(OTA_PASSWORD_HASH);
  ArduinoOTA.onStart([]() { startUpdate(ArduinoOTA.getCommand() == U_FS); });
  ArduinoOTA.onError([](ota_error_t) { updateInProgress = false; if (!filesystemReady) mountWebFiles(); });
  ArduinoOTA.begin();

  server.on("/update", HTTP_GET, []() {
    if (!server.authenticate(OTA_USER, OTA_PASSWORD)) return server.requestAuthentication();
    server.sendHeader("Cache-Control", "no-store");
    server.send_P(200, "text/html; charset=utf-8", UPDATE_PAGE);
  });
  server.on("/update", HTTP_POST, []() {
    if (!httpUpdateAuthenticated) return server.requestAuthentication();
    if (!httpUpdateComplete || httpUpdateError.length()) {
      if (Update.isRunning()) Update.end();
      updateInProgress = false;
      if (!filesystemReady) mountWebFiles();
      server.send(400, "text/plain; charset=utf-8", "更新失敗：" + (httpUpdateError.length() ? httpUpdateError : String("未收到完整檔案")));
      return;
    }
    server.sendHeader("Cache-Control", "no-store");
    server.send(200, "text/html; charset=utf-8", "<meta charset=utf-8><meta http-equiv=refresh content='15;url=/'>更新完成，裝置正在重新啟動。15 秒後返回控制頁。");
    delay(150);
    server.client().stop();
    ESP.restart();
  }, []() {
    HTTPUpload& upload = server.upload();
    if (upload.status == UPLOAD_FILE_START) {
      httpUpdateAuthenticated = server.authenticate(OTA_USER, OTA_PASSWORD);
      httpUpdateComplete = false;
      httpUpdateError = "";
      if (!httpUpdateAuthenticated) return;
      if (updateInProgress || Update.isRunning()) { httpUpdateError = "裝置正在更新"; return; }
      const bool filesystem = upload.name == "filesystem";
      if (!filesystem && upload.name != "firmware") { httpUpdateError = "不支援的檔案類型"; return; }
      startUpdate(filesystem);
      Update.runAsync(true);
      const size_t maxSize = filesystem ? FS_PHYS_SIZE : ((ESP.getFreeSketchSpace() - 0x1000) & 0xFFFFF000);
      if (!Update.begin(maxSize, filesystem ? U_FS : U_FLASH)) httpUpdateError = Update.getErrorString();
    } else if (httpUpdateAuthenticated && !httpUpdateError.length() && upload.status == UPLOAD_FILE_WRITE) {
      if (Update.write(upload.buf, upload.currentSize) != upload.currentSize) httpUpdateError = Update.getErrorString();
    } else if (httpUpdateAuthenticated && !httpUpdateError.length() && upload.status == UPLOAD_FILE_END) {
      httpUpdateComplete = Update.end(true);
      if (!httpUpdateComplete) httpUpdateError = Update.getErrorString();
    } else if (httpUpdateAuthenticated && upload.status == UPLOAD_FILE_ABORTED) {
      if (Update.isRunning()) Update.end();
      httpUpdateError = "傳輸中斷";
      updateInProgress = false;
      if (!filesystemReady) mountWebFiles();
    }
    yield();
  });
}
