// Libraries
#include <FirebaseESP8266.h>
#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <ESP8266httpUpdate.h>

// Firebase Auth
#define FIREBASE_HOST "water-level-indicator-a555e-default-rtdb.firebaseio.com"  
#define FIREBASE_AUTH "RSycUEGVNj1wiOVGrmXjQkdpE65voJNJmaGPs3Z7" 

// Wifi details
/* #define WIFI_SSID "Sarayi_ff_24" */
/* #define WIFI_PASSWORD "abduljabbar" */
#define WIFI_SSID "sarayi_2"
#define WIFI_PASSWORD "code||die"

// Defaults for operation
#define ON D5
#define ONTWO D6
#define OFF D7
#define CURR D8
#define TURNON HIGH
#define TURNOFF LOW
#define CACHESIZE 10

// For auto updater
const String CURRENT_VERSION = String("__BINARY_NAME:motorController__BINARY_VERSION:") + __DATE__ + __TIME__ + "__";
const String BASE = String("/motorController");
String latestVersion, downloadUrl;

//Define Firebase Data objects
FirebaseData fd;
String currentState = String("off");
int lastFivePercent[CACHESIZE];
int currentIndex = 0;

void printlns(String statement) {
  Serial.println(statement);
  Firebase.set(fd, "/logs/" + String(millis()), statement);
}

bool allLowerThan(int value) {
  for (int i=0; i<CACHESIZE; i++) {
    if (lastFivePercent[i] > value) {
      return false;
    }
  }
  return true;
}


void setup() {
  pinMode(ON, OUTPUT);
  pinMode(ONTWO, OUTPUT);
  pinMode(OFF, OUTPUT);
  pinMode(CURR, INPUT);
  digitalWrite(ON, TURNOFF);
  digitalWrite(ONTWO, TURNOFF);
  digitalWrite(OFF, TURNOFF);
 
  // put your setup code here, to run once:
  Serial.begin(9600);

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.println("");

  // Wait for connection
  while (WiFi.status() != WL_CONNECTED) {
    delay(1000);
    Serial.print(".");
  }

  Firebase.begin(FIREBASE_HOST, FIREBASE_AUTH);
  Firebase.reconnectWiFi(true);

  for (int i=0; i<CACHESIZE; ++i) {
    lastFivePercent[CACHESIZE] = 50;
  }
}

void motorOn() {
  Serial.println("Turning motor on");
  Serial.println("Button on");
  digitalWrite(ON, TURNON);
  digitalWrite(ONTWO, TURNON);
  delay(1000);
  Serial.println("Button off");
  digitalWrite(ON, TURNOFF);
  digitalWrite(ONTWO, TURNOFF);
}

void motorOff() {
  Serial.println("Turning motor off");
  Serial.println("Button on");
  digitalWrite(OFF, TURNON);
  delay(1000);
  Serial.println("Button off");
  digitalWrite(OFF, TURNOFF);
}

void setCurrentState() {
  int inputVal = digitalRead(CURR);
  if (inputVal == 1) {
    currentState = "on";
  } else {
    currentState = "off";
  }

  // set current state to firebase
  Serial.println("Current state " + currentState);
  Firebase.set(fd, BASE + "/state/current", currentState);
  Firebase.setTimestamp(fd, BASE + "/state/timestamp");
}

void addToList(int currentPercent) {
  lastFivePercent[currentIndex] = currentPercent;
  currentIndex += 1;
  currentIndex %= CACHESIZE;
}

int getCurrentPercentage() {
  Firebase.getInt(fd, "/waterLevelSensor/output/percentage");
  return fd.intData();
}

String getCommand(int percentage) {
  Firebase.getInt(fd, BASE + "/configuration/motorOffThreshold");
  int motorOffThreshold = fd.intData();

  Firebase.getInt(fd, BASE + "/configuration/motorOnThreshold");
  int motorOnThreshold = fd.intData();

  String command = "none";
  if (percentage > motorOffThreshold) {
    command = "off";
  } else if (allLowerThan(motorOnThreshold)) {
  /* } else if (percentage < motorOnThreshold) { */
    command = "on";
  } else {
    command = "none";
  }
  Serial.println(String("Direct mode command is: ") + command);
  return command;
}

void controlMotor() {

  Firebase.getInt(fd, BASE + "/configuration/autoControl");
  int percentage = getCurrentPercentage();
  printlns(String(percentage));
  int autoControl = fd.intData();
  if (autoControl != 1) {
    return;
  }

  if (percentage == 0) {
    return;
  }

  addToList(percentage);

  String command = getCommand(percentage);
  if (command != currentState && command != "none") {
    Serial.println("Turning motor " + command);
    if (command == "on") {
      motorOn();
    } else if (command == "off"){
      motorOff();
    }
  }
}

void updateFirmware(String firmwareUrl) {
  WiFiClientSecure client;
  client.setInsecure();
  ESPhttpUpdate.update(client, firmwareUrl); 
}

void checkForUpdates() {
  Firebase.set(fd, BASE + "/firmware/currentVersion", CURRENT_VERSION);
  Firebase.getString(fd, BASE + "/firmware/binaryVersion");
  latestVersion = fd.stringData();

  if (!latestVersion.equalsIgnoreCase(CURRENT_VERSION)) {
    Serial.println("Version mismatch, downloading update");
    Firebase.getString(fd, BASE + "/firmware/downloadUrl");
    downloadUrl = fd.stringData();
    updateFirmware(downloadUrl);
  }
}

void loop() {
  setCurrentState();

  controlMotor();

  checkForUpdates();
  delay(10000);
}
