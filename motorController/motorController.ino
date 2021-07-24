#include "FirebaseESP8266.h"
#include <ESP8266WiFi.h>

#define FIREBASE_HOST "water-level-indicator-a555e-default-rtdb.firebaseio.com"  //Change to your Firebase RTDB project ID e.g. Your_Project_ID.firebaseio.com
#define FIREBASE_AUTH "RSycUEGVNj1wiOVGrmXjQkdpE65voJNJmaGPs3Z7" //Change to your Firebase RTDB secret password
/* #define WIFI_SSID "sarayi_2" */
#define WIFI_SSID "Sarayi_ff_24"
/* #define WIFI_PASSWORD "code||die" */
#define WIFI_PASSWORD "abduljabbar"

#define ONONE D5
#define ONTWO D6
#define OFF D7


//Define Firebase Data objects
FirebaseData fd;
double timestamp;
int waitOnStartMin, switchingDelaySec;
String currentCommand, command;

void setup() {
  pinMode(ONONE, OUTPUT);
  pinMode(ONTWO, OUTPUT);
  pinMode(OFF, OUTPUT);
  digitalWrite(ONONE, HIGH);
  digitalWrite(ONTWO, HIGH);
  digitalWrite(OFF, HIGH);
 
  // put your setup code here, to run once:
  Serial.begin(9600);

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.println("");

  // Wait for connection
  while (WiFi.status() != WL_CONNECTED) {
    delay(1000);
    Serial.print(".");
  }

  pinMode(ONONE, OUTPUT);
  pinMode(ONTWO, OUTPUT);
  pinMode(OFF, OUTPUT);

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
  Serial.println("Button on");
  digitalWrite(ONONE, LOW);
  digitalWrite(ONTWO, LOW);
  delay(switchingDelaySec * 1000);
  Serial.println("Button off");
  digitalWrite(ONONE, HIGH);
  digitalWrite(ONTWO, HIGH);
}

void motorOff() {
  Serial.println("Button on");
  digitalWrite(OFF, LOW);
  delay(switchingDelaySec * 1000);
  Serial.println("Button off");
  digitalWrite(OFF, HIGH);
}



void loop() {
  Firebase.getString(fd, "/motorController/command/current");
  command = fd.stringData();

  if (command != currentCommand) {
    Serial.println("Turning motor " + command);
    currentCommand = command;
    if (currentCommand == "on") {
      motorOn();
    } else {
      motorOff();
    }
  }

  Firebase.set(fd, "/motorController/state/current", currentCommand);
  Firebase.setTimestamp(fd, "/motorController/state/timestamp");
  
  Serial.println(".");
  delay(10000);
}
