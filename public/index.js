
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
getAutomaticControl();

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

$("#autoControl").change(() => {
  setAutoControl($("#autoControl").prop("checked"))
})

$("#on").click(() => {
  setMotor("on");
});

$("#off").click(() => {
  setMotor("off");
});
