
var DBConnection = require('tedious').Connection;
var DBRequest = require('tedious').Request;  
var TYPES = require('tedious').TYPES;
var Promise = require('promise');

const URL_AZURE_SQLDB = "lspgatewaysql.database.windows.net";

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

    console.log("query garoon_user_master");
      
    return db_conn()
            .then(conn => db_execquery(conn, user_email)); 
}

exports.is_user_exist = function(user_email){

    console.log("query garoon_user_master");
      
    return new Promise((resolve, reject) => {
        query_garoon_user_master(user_email)
            .then(num =>{
                if (num == 0) {
                    reject(new Error("insuffcient privilege."));
                } else {
                    resolve(num);
                }
            })
            .catch(function(err){
                reject(err);
            });            
    });      
};