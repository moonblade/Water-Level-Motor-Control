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


//Define Firebase Data objects
FirebaseData fd;
double timestamp;
int waitOnStartMin, switchingDelaySec;
int inputVal;
int shouldLog;
String currentCommand, command;

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
  currentCommand = "off";
  delay(waitOnStartMin*60*1000);
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



void loop() {
  inputVal = digitalRead(CURR);
  if (inputVal == 1) {
    currentCommand = "on";
  } else {
    currentCommand = "off";
  }
  Firebase.getString(fd, "/motorController/command/current");
  command = fd.stringData();

  Firebase.getInt(fd, "/settings/motorControllerLog");
  shouldLog = fd.intData();
 
  if (command != currentCommand && command != "none") {
    printlns("Turning motor " + command);
    if (command == "on") {
      motorOn();
    } else if (command == "off"){
      motorOff();
    }
  }

  printlns("Current state " + currentCommand);
  Firebase.set(fd, "/motorController/state/current", currentCommand);
  Firebase.setTimestamp(fd, "/motorController/state/timestamp");
  
  printlns(".");
  delay(10000);
}
