
var DBConnection = require('tedious').Connection;
var DBRequest = require('tedious').Request;  
var TYPES = require('tedious').TYPES;
var Promise = require('promise');

const URL_AZURE_SQLDB = "mydomesticdatabase.database.windows.net";

function db_conn(){

    console.log("Connecting...");

    var my_config = {
        "userName": process.env.MY_AZURE_SQLDB_USERNAME,
        "password": process.env.MY_AZURE_SQLDB_PASSWORD,
        "server": URL_AZURE_SQLDB,
        "options":{
            "useColumnNames": true,
            "rowCollectionOnRequestCompletion": true,
            "encrypt": true,
            "database": process.env.MY_AZURE_SQLDB_DATABASE
        }
    };
    
    return new Promise((resolve, reject) => {
        //CreateConnection
        var conn = new DBConnection(my_config);
        conn.on('connect', function(err) {  
            if(err){
                reject(err);
            } else {  
                // If no error, then good to proceed.
                console.log("Connected");
                resolve(conn);
            }
        });
    });
}

function db_execquery(conn, from_email){ 

    console.log("db_execquery");

    var query = "SELECT c.email FROM dbo.USERS_CYBOZU as c WHERE c.email = @who_email";
    var results = 0;

    return new Promise((resolve, reject) => {

        queryrequest = new DBRequest(query, function(err, rowCount, rows){
            if (err) {
                reject(err);
            } else {
                results = rowCount;
            }
        });  

        queryrequest.addParameter('who_email', TYPES.NVarChar, from_email);

        queryrequest.on('requestCompleted', function(){
            console.log('reqCompleted');
            conn.close();
            resolve(results);
        });

        conn.execSql(queryrequest);
    });
}


function query_garoon_user_master(user_email){
      
    return db_conn()
            .then(conn => db_execquery(conn, user_email)); 
}

exports.is_user_exist = function(user_email){

    console.log("query garoon_user_master");
      
    return new Promise((resolve, reject) => {
        var ret = false;
        query_garoon_user_master(user_email)
            //バグってないか？
            .then(num =>{
                if (num != 0) {
                    ret = true;
                }
                resolve(ret);
            })
            .catch(function(err){
                reject(err);
            });            
    });      
};

//var target = {
//    garoon_id: "",
//    garoon_type: ""
//};
exports.get_garoon_id_type = function(GaroonLogin){

    return new Promise((resolve, reject) => {
        db_conn()
        .then(conn => {
            var query = "SELECT g.userId, g.id_type FROM dbo.USERS_GAROON as g WHERE g.login_name = @who";
            var param = [
                {
                    pname: 'who',
                    stype: TYPES.NVarChar,
                    value: GaroonLogin
                }
            ];

            db_execquery2(conn, query, param)
            .then((qresults) => {
                if (qresults.length == 0) {
                    reject(new Error("Login not found."));
                } else if (qresults.length == 1) {
                    var target ={
                        garoon_id: qresults[0].userId.value.trim(),
                        garoon_type: qresults[0].id_type.value.trim()
                    }
                    resolve(target);
                } else {
                    reject(new Error("Login too many."));
                }
            })
            .catch((err) => {
                reject(err);
            });
        });
    }); 
}

function db_execquery2(conn, query, param){ 

    console.log("db_execquery");

    var results = [];

    return new Promise((resolve, reject) => {

        queryrequest = new DBRequest(query, function(err, rowCount, rows){
            if (err) {
                reject(err);
            } else if (rowCount == 0){
                reject(new Error("not Found."))
            } else {
                console.log(rowCount + " row(s) found.");
                rows.forEach(function(row){
                    results.push(row);
                });
            }
        });  

        param.forEach((p) => {
            queryrequest.addParameter(p.pname, p.stype, p.value);
        });

        conn.execSql(queryrequest);

        queryrequest.on('requestCompleted', function(){
            console.log('reqCompleted');
            conn.close();
            resolve(results);
        });

    });
}