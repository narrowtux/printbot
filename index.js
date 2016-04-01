var RtmClient = require("@slack/client").RtmClient;
var CLIENT_EVENTS = require('@slack/client').CLIENT_EVENTS;
var RTM_EVENTS = require('@slack/client').RTM_EVENTS;
var request = require('request');
var spawn = require('child_process').spawn;

var token = 'xoxb-...';
var printer = 'name of printer (lpstat -p -d)';

var rtm = new RtmClient(token, {logLevel: 'info'});

rtm.start();

var jobPattern = /request id is ([a-zA-Z_0-9\-]+) .*/

function postPrintingMessage(job, channel) {
    var message = rtm.sendMessage('job ' + job + ' queued', channel);
}

rtm.on(RTM_EVENTS.MESSAGE, function(message) {
    console.log(message);
    if (message.file) {
        console.log("Found file", message.file.name);
        var url = message.file.url_private_download;
        
        if (url) {
            rtm.sendTyping(message.channel);
            var lp = spawn('lp', ['-d', printer, '-']);
            lp.on('close', function(code, signal) {
                console.log("lp closed", code, signal);
            })
            lp.stdout.pipe(process.stdout);
            lp.stdout.on('data', function(data) {
                var match = jobPattern.exec(data);
                if (match) {
                    postPrintingMessage(match[1], message.channel);
                }
            });
            request.get(url, {
                auth: {
                    bearer: token
                }
            })
            .on('response', function(res) {
                console.log("File download status", res.statusCode)
            })
            .pipe(lp.stdin);
        }
    }
});
