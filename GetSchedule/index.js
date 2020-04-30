var rp = require('request-promise');
var sql = require("../PostSchedule/sqldb.js");
var fs = require('fs');
var moment = require('moment-timezone');


const JST_OFFSET = -9;

// QueryString: {
//  target_user: スケジュール検索対象となるユーザー、設備のLogin名( email の @ の前)   
// }
//
// Response: {
//  subject: "" //予定の件名
//  start:  ""  //予定の開始時刻
//  end:    ""  //予定の終了時刻
//  isAllDay:   ""  // 終日予定かどうか
// }

function get_time_range()
{
    var range = {
        stime: "",
        etime: ""
    };

    var s = new moment().tz("Asia/Tokyo");
    var e = new moment().tz("Asia/Tokyo");
        
    s.set({ 'hour':0, 'minute':0, 'second':0 });
    e.set({ 'hour':23, 'minute':59, 'second':59 });
    
    range.stime = s.format();
    range.etime = e.format();
    
    return range;
}

function get_target_info(TargetId){
    return new Promise((resolve, reject) => {

        sql.get_garoon_id_type(TargetId)
            .then((target) => {
                resolve(target)
            })
            .catch((err) => {
                reject(err)
            });

    });
}

module.exports = function (context, req) {

    context.log('GetSchedule HTTP trigger function processed a request.');

    var target_id = req.query.target_user;
    var range = get_time_range();
    
    var target = {
        garoon_id: "",
        garoon_type: ""
    };

    // 引数で指定されたemailから、ユーザーなのか設備なのか判断
    get_target_info(target_id)
    .then((target) => {
        var options = {
            uri: 'https://motex.s.cybozu.com/g/api/v1/schedule/events',
            qs: {
                "orderBy": "start asc",
                "rangeStart": range.stime,
                "rangeEnd": range.etime,
                "target": target.garoon_id,
                "targetType": (target.garoon_type == 'U') ? 'user': 'facility',
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
    
        rp(options)
        .then(function (response){            
            context.res = {
                status: 200,
                body: response
            }
            context.done();
        })
        .catch(function(err){
            context.res = {
                status: 500,
                body: { "Error": err.message }
            }
            context.done();
        });
    })
    .catch(function(err){
        context.res = {
            status: 500,
            body: { "Error": err.message }
        }
        context.done();
    }); 
}