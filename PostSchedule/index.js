
var sql = require('./sqldb.js');
var rp = require('request-promise');
var fs = require('fs');

const JST_OFFSET = -9;

function get_time(date)
{
    //var utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours(), date.getMinutes(), date.getSeconds()));

    var h = date.getHours() - JST_OFFSET;
    var m = date.getMinutes();

    h = ("00" + h).slice(-2);
    m = ("00" + m).slice(-2);

    return h + ":" + m;
}

function isProgress(start, end){
    var ret = false;
    var now = Date.now();

    if (start <= now && now <= end) {
        ret = true;
    }

    return ret;
}

function format_schedule(obj, ctx){

    ctx.log("found. " + JSON.stringify(obj));

    var msg = "No Schedule Found.\n";
    var events = obj.events;
    var mark = "";

    for( var i = 0 ; i < events.length ; i++){
        
        mark = " ";
        if (i == 0) {
            msg = "";
        }
        
        if (events[i].isAllDay == false) {
            var st = new Date(events[i].start.dateTime);
            var et = new Date(events[i].end.dateTime);
            if(isProgress(st, et)) {
                mark = "*"
            }
            msg += get_time(st) + "-" + get_time(et) + " " + mark;
        }

        msg += events[i].subject + "\n"
    }

    if (obj.hasNext) {
        msg += "...\n";
    }

    return msg;

}

/*
function get_offset(timezone){
    var offset = 0;
    if (timezone == "Asia/Tokyo") {
        offset = -9;
    }
    return offset; 
}
*/

function format_time(m, d) {
    var m0 = ('00' + m).slice(-2);
    var d0 = ('00' + d).slice(-2);
    return m0 + ":" + d0;
}


module.exports = function (context, req) {
    
    context.log('Webhook was triggered. [' + JSON.stringify(req.query) + ']');

    var userid = req.query.gid;
    var diff = req.query.diff;
    var from_email = req.query.femail;

    var sttime= new Date();
    var edtime = new Date();

    diff = !diff ? 0 : parseInt(diff, 10);

    sttime.setDate(sttime.getDate() + diff);
    edtime.setDate(edtime.getDate() + diff);

    sttime.setHours(0,0,0);
    edtime.setHours(23,59,59);

    var options = {
        uri: 'https://motex.s.cybozu.com/g/api/v1/schedule/events',
        qs: {
            "orderBy": "start asc",
            "rangeStart": sttime.toISOString(),
            "rangeEnd": edtime.toISOString(),
            "target": userid,
            "targetType": "user",
            "fields": "subject,start,end,isAllDay"
        },
        headers: {
            "X-Cybozu-Authorization": process.env.MY_GAROON_AUTH_STRING
        },
        agentOptions: {
            pfx: fs.readFileSync(process.env.MY_GAROON_CERT),
            passphrase: process.env.MY_GAROON_CERT_PASS,
            securityOptions: 'SSL_OP_NO_SSLv3'
        },
        json: true // Automatically parses the JSON string in the response
    };

    context.log('Sending a request.' + JSON.stringify(options.qs));

    sql.is_user_exist(from_email)
        .then(() => rp(options))
        .then((obj) => format_schedule(obj, context))
        .then(function (msg) {            
            context.res = {
                status: 200,
                body: "" + msg + "\n"
            }
            context.done();
        })
        .catch(function (err) {
            context.res = {
                status: 500,
                body: { "Error": err.message }
            }
            context.log(err.message + "|" + err.stack )
            context.done();
        });
        
}


