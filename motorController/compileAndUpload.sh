arduino-cli compile motorController --fqbn esp8266:esp8266:d1_mini -e
arduino-cli upload -p /dev/cu.usbserial-${1-143210} --fqbn esp8266:esp8266:d1_mini motorController.ino
