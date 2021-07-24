arduino-cli compile motorController --fqbn esp8266:esp8266:d1_mini
arduino-cli upload -p /dev/cu.usbserial-144220 --fqbn esp8266:esp8266:d1_mini motorController.ino
