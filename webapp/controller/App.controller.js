sap.ui.define([
 "sap/ui/core/mvc/Controller",
 "sap/ui/model/json/JSONModel"
], function (Controller, JSONModel) {

 return Controller.extend("demo.controller.App", {

  onInit: function () {

   fetch("/api/transports")
   .then(res => res.json())
   .then(data => {

    data.transports.forEach(t => {

     if (t.risk_score < 0.3){
       t.status="SAFE"
       t.state="Success"
     }

     else if (t.risk_score < 0.6){
       t.status="MEDIUM"
       t.state="Warning"
     }

     else{
       t.status="HIGH"
       t.state="Error"
     }

    });

    var model = new JSONModel(data);
    this.getView().setModel(model);

   });

  }

 });

});
