var express = require('express');
var app = express();


app.post('/', function (req, res)
{
    console.log("Got a POST request for the homepage");
    req.on("data", (chunk) =>
    {
        console.log(chunk)
    });
});


var server = app.listen(80, function ()
{
    console.log("Server running");
})