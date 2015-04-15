/*
 * (C) 2015 Seth Lakowske
 */

var pgReqLogger = require('pg-http-request-logger');

function classifyTable(client, callback) {

    //Depends on requests table existing
    pgReqLogger.requestTable(client, function(err, result) {
        var createClasses = 'create table if not exists classes ('
            + 'class_id uuid primary key default uuid_generate_v4(),'
            + 'class_time timestamptz default current_timestamp,'
            + 'request_id uuid references requests(request_id),'
            + 'user text not null,'
            + 'class text not null'
            + ')'

        client.query(createClasses, callback);
    })

    
})
    
    
