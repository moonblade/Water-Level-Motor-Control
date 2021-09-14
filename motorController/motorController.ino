#include "FirebaseESP8266.h"
#include <ESP8266WiFi.h>

#define FIREBASE_HOST "water-level-indicator-a555e-default-rtdb.firebaseio.com"  //Change to your Firebase RTDB project ID e.g. Your_Project_ID.firebaseio.com
#define FIREBASE_AUTH "RSycUEGVNj1wiOVGrmXjQkdpE65voJNJmaGPs3Z7" //Change to your Firebase RTDB secret password
#define WIFI_SSID "sarayi_2"
/* #define WIFI_SSID "Sarayi_ff_24" */
#define WIFI_PASSWORD "code||die"
/* #define WIFI_PASSWORD "abduljabbar" */

#define ON D5
#define ONTWO D6
#define OFF D7
#define CURR D8
#define TURNON HIGH
#define TURNOFF LOW
#define CACHESIZE 5


//Define Firebase Data objects
FirebaseData fd;
double timestamp, lastPercentageUpdate, lastMeasurementUpdate;
int waitOnStartMin, switchingDelaySec, switchToDirectModeAfterMins;
int measurement, minVal, maxVal, motorOffThreshold, motorOnThreshold;
int inputVal;
int shouldLog;
int currentPercent;
int lastFivePercent[CACHESIZE];
int currentIndex = 0;
String currentState, command;

bool allLowerThan(int value) {
  for (int i=0; i<CACHESIZE; i++) {
    if (lastFivePercent[i] > value) {
      return false;
    }
  }
  return true;
}

void printlns(String statement) {
  Serial.println(statement);
  if (shouldLog == 1) {
    Firebase.set(fd, "/logs/" + String(millis()), statement);
  }
}

void setup() {
  shouldLog = 0;
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

  // On start wait five minutes before doing anything
  Firebase.getInt(fd, "settings/waitOnStartMin");
  waitOnStartMin = fd.intData();
  Firebase.getInt(fd, "settings/switchingDelaySec");
  switchingDelaySec = fd.intData();
  currentState = "off";
  delay(waitOnStartMin*60*1000);

  for (int i=0; i<CACHESIZE; ++i) {
    lastFivePercent[CACHESIZE] = 50;
  }
}

void motorOn() {
  printlns("Turning motor on");
  printlns("Button on");
  digitalWrite(ON, TURNON);
  digitalWrite(ONTWO, TURNON);
  delay(switchingDelaySec * 1000);
  printlns("Button off");
  digitalWrite(ON, TURNOFF);
  digitalWrite(ONTWO, TURNOFF);
}

void motorOff() {
  printlns("Turning motor off");
  printlns("Button on");
  digitalWrite(OFF, TURNON);
  delay(switchingDelaySec * 1000);
  printlns("Button off");
  digitalWrite(OFF, TURNOFF);
}

void readCurrentState() {
  inputVal = digitalRead(CURR);
  if (inputVal == 1) {
    currentState = "on";
  } else {
    currentState = "off";
  }

  // set current state to firebase
  printlns("Current state " + currentState);
  Firebase.set(fd, "/motorController/state/current", currentState);
  Firebase.setTimestamp(fd, "/motorController/state/timestamp");
}

void initVariables() {
  Firebase.getString(fd, "/motorController/command/current");
  command = fd.stringData();

  Firebase.getInt(fd, "/settings/motorControllerLog");
  shouldLog = fd.intData();
 
}

void controlMotor() {
  if (command != currentState && command != "none") {
    printlns("Turning motor " + command);
    if (command == "on") {
      motorOn();
    } else if (command == "off"){
      motorOff();
    }
  }
}

bool switchOverToManualMode() {
  Firebase.getDouble(fd, "/waterlevel/percentageUpdatedAt");
  lastPercentageUpdate = fd.doubleData();


  Firebase.getDouble(fd, "/waterlevel/timestamp");
  lastMeasurementUpdate = fd.doubleData();

  Firebase.getInt(fd, "/settings/switchToDirectModeAfterMins");
  switchToDirectModeAfterMins = fd.intData();

  return (lastMeasurementUpdate - lastPercentageUpdate > switchToDirectModeAfterMins * 60 * 1000);
}

void calculatePercentageAndAddToList() {
    //find currentPercent
    Firebase.getInt(fd, "/waterlevel/measurement");
    measurement = fd.intData();
    Firebase.getInt(fd, "settings/maximumValue");
    maxVal = fd.intData();
    Firebase.getInt(fd, "settings/minimumValue");
    minVal = fd.intData();

    currentPercent = max(min(100, (100 - (((measurement - minVal) * 100) / max((maxVal - minVal), 1)))), 0);

    //Add it to list
    lastFivePercent[currentIndex] = currentPercent;
    currentIndex += 1;
    currentIndex %= CACHESIZE;
}

void createCurrentCommand() {
  Firebase.getInt(fd, "settings/motorOffThreshold");
  motorOffThreshold = fd.intData();

  Firebase.getInt(fd, "settings/motorOnThreshold");
  motorOnThreshold = fd.intData();

  if (currentPercent > motorOffThreshold) {
    command = "off";
  } else if (allLowerThan(motorOnThreshold)) {
    command = "on";
  } else {
    command = "none";
  }
  printlns("Direct mode command is: " + command);
}

void controlMotorInManualMode() {
  printlns("Taking over motor control in direct mode");
  calculatePercentageAndAddToList();
  createCurrentCommand();
  controlMotor();
}

void loop() {
  readCurrentState();

  initVariables();

  controlMotor();

  if (switchOverToManualMode()) {
    controlMotorInManualMode();
  }

  delay(10000);
}
