// const baseUrl = "http://192.168.29.28:40002/"
const baseUrl = "http://localhost:40002/"
getAutomaticControl = () => {
  fetch(baseUrl + "automaticControl").then(response => {
    return response.json();
  }).then(response => { 
    if (response.automaticControl == 1) {
      $("#autoControl").prop("checked", true);
    }
  }) 
}

setMotor = (command) => {
  fetch(baseUrl + "setMotorState?command=" + command, {
    method: "POST",
  }).then(() => {
    alert("Motor switched " + command);
  });
}

setAutoControl = (automaticControl) => {
    fetch(baseUrl + "automaticControl?value=" + automaticControl, {
    method: "POST",
  }).then(() => {
    alert("automaticControl set to " + command);
  });
}

setDbValue = (key, value) => {
  fetch(baseUrl + "setDbValue?key=" + key + "&value=" + value, {
    method: "POST",
  }).then(() => {
    console.log("key: " + key + ", value:" + value + "set");
  });
}

getDbValue = async (key) => {
  return fetch(baseUrl + "getDbValue?key=" + key, {
    method: "POST",
  }).then((response) => {
    return response.json();
  }).then(response => {
    return response.value;
  });
}


const idToKey = {
  "motorOnThreshold": "settings/motorOnThreshold",
  "motorOffThreshold": "settings/motorOffThreshold",
  "switchingDelaySec": "settings/switchingDelaySec",
}

save = () => {
  for (key in idToKey) {
    const value = $("#" + key).val();
    setDbValue(idToKey[key], value);
  }
  alert("Saved configuration");
}

$("#autoControl").change(() => {
  setAutoControl($("#autoControl").prop("checked"))
})

$("#save").click(() => {
  save();
});

$("#on").click(() => {
  setMotor("on");
});

$("#off").click(() => {
  setMotor("off");
});

$(function() {
  getAutomaticControl();
  getDbValue("settings").then(settings => {
    for (key in idToKey) {
      if (settings[key]) {
        $("#"+key).val(settings[key]);
      }
    }
    console.log(settings);
  });
});
