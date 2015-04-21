/*
 * (C) 2015 Seth Lakowske
 */

var pgReqLogger = require('pg-http-request-logger');
var uuid        = require('node-uuid');

function classTable(client, callback) {

    //Depends on requests table existing
    pgReqLogger.requestTable(client, function(err, result) {
        var createClasses = 'create table if not exists classes ('
            + 'class_id text primary key,'
            + 'class_time timestamptz default current_timestamp,'
            + 'request_id text references requests(request_id) not null,'
            + 'user_id text not null,'
            + 'class text not null'
            + ')'

        console.log(createClasses);

        client.query(createClasses, callback);
    })

}

/*
 * Insert a classification into the database.
 *
 * clazz {Object} - an object containing a request_id, user_id and clazz
 */
function insertClass(client, clazz, callback) {

    var insertClass = 'insert into classes (class_id, request_id, user_id, class) VALUES ($1, $2, $3, $4)';

    var id = clazz.class_id;
    if (id === undefined) id = uuid.v4();

    client.query(insertClass,
                 [id,
                  clazz.request_id,
                  clazz.user_id,
                  clazz.clazz],
                 function (err, result) {
                     callback(err, result, id);
                 }
                );

}

/*
 * Get the user's next unclassified request
 *
 * user {String} - a string containing a user_id
 */
function nextRequest(client, user, count, callback) {

    var nextRequest = "select r.* from requests r where r.request_id not in (select request_id from classes where user_id=$1 and request_id is not null) limit $2";

    client.query(nextRequest,
                 [user,
                 count],
                 callback);
}

function dropClassTable(client, callback) {

    var dropClasses = 'drop table classes cascade';

    client.query(dropClasses, callback);

}

/*
 * Chain together a number of database operations
 */
function chain(client, fns, index) {
    if (index === fns.length) return;

    var client = arguments[0];
    var fns    = arguments[1];
    var index  = arguments[2];


    var callback = function(err, result) {
        var extras = []
        extras.push(client);
        extras.push(fns);
        extras.push(index+1);

        for (var j = 2 ; j < arguments.length ; j++) {
            extras.push(arguments[j]);
        }

        extras.push(err);
        extras.push(result);

        if (err) {
            console.log(err);
        } else {
            chain.apply(this, extras)
        }
    }

    var varArgs = [];
    varArgs.push(client);
    varArgs.push(callback);

    for (var j = 3 ; j < arguments.length ; j++) {
        varArgs.push(arguments[j]);
    }

    //console.log(index);
    fns[index].apply(this, varArgs);
}

module.exports.classTable     = classTable;
module.exports.insertClass    = insertClass;
module.exports.nextRequest    = nextRequest;
module.exports.dropClassTable = dropClassTable;
module.exports.chain          = chain;
