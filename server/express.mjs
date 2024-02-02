import express from "express";

const application = express();

application.get("/", (request, response) => {
  console.log(request.path);
  response.send();
});

application.listen(8000);
