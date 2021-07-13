#!/usr/local/bin/python2
import firebase_admin
from firebase_admin import credentials
from firebase_admin import db

class RTDB:
    def __init__(self):
        cred = credentials.Certificate("./config/water-level-indicator-a555e-81463e26b5ff.json");
        firebase_admin.initialize_app(cred, {
            'databaseURL': 'https://water-level-indicator-a555e-default-rtdb.firebaseio.com/'
        });
        self.db = db.reference("") 
        print(self.db.get())


if __name__ == "__main__":
    r = RTDB()

