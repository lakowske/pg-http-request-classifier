/*
 * (C) 2015 Seth Lakowske
 */

var pg            = require('pg');
var pgReqClassify = require('./');
var pgReqLogger   = require('pg-http-request-logger');
var test          = require('tape');

function connectOrFail(t, callback) {

    var user = process.env['USER'];
    var connection = 'postgres://'+user+'@localhost/request';

    var client = new pg.Client(connection);

    client.connect(function(err) {

        if (err) {
            return console.error('error fetching client from pool', err);
            t.ok(false, "client connection failed to " + connection);
        }

        callback(client);

    })

}

test('can create the classes table', function(t) {

    connectOrFail(t, function(client) {
        pgReqClassify.chain(client, [pgReqLogger.requestTable, pgReqClassify.classTable, pgReqClassify.dropClassTable, pgReqLogger.dropRequestTable, finish(t)], 0);
    })

})

test('can classify request', function(t) {
    var req1 = function(client, callback) {
        pgReqLogger.insertRequest(client, {host:'sethlakowske.com', cookie:'yum', remoteAddress:'10.0.0.1',
                                           method:'GET', url:'/', 'user-agent':'secret agent man'}, callback);
    }

    var class1 = function(client, callback, id) {
        pgReqClassify.insertClass(client, { request_id:id, user_id:'robotron', clazz:'PrimaryReq'}, callback)
    }

    connectOrFail(t, function(client) {
        pgReqClassify.chain(client, [pgReqClassify.classTable, req1, class1, pgReqClassify.dropClassTable, pgReqLogger.dropRequestTable, finish(t)], 0);
    })
})

function finish(t)  {
    return function(client, callback, err, result) {
        if (err) {
            console.log(err);
        }
        t.ok(result, 'verify result');
        client.end();
        t.end();
    }
}

function verify(t, rows) {
   return function(client, callback, err, result) {
        if (err) {
            console.log(err);
        }
        t.ok(result, 'verify result');
        if (rows) {
            t.equal(result.rowCount, rows);
        }
       callback(err, result);
    }
}

test('can query for unclassified requests', function(t) {

    var req1 = function(client, callback) {
        pgReqLogger.insertRequest(client, {host:'sethlakowske.com', cookie:'yum', remoteAddress:'10.0.0.1',
                                           method:'GET', url:'/req1', 'user-agent':'secret agent man'}, callback);
    }

    var req2 = function(client, callback) {
        pgReqLogger.insertRequest(client, {host:'sethlakowske.com', cookie:'yum', remoteAddress:'10.0.0.1',
                                           method:'GET', url:'/req2', 'user-agent':'secret agent man'}, callback);
    }

    var class1 = function(client, callback, id) {
        pgReqClassify.insertClass(client, { request_id:id, user_id:'robotron', clazz:'Primary'}, callback)
    }

    var class2 = function(client, callback, id) {
        pgReqClassify.insertClass(client, { request_id:id, user_id:'seth', clazz:'Primary'}, callback)
    }

    var query = function(client, callback) {
        pgReqClassify.nextRequest(client, 'seth', 1, callback);
    }

    connectOrFail(t, function(client) {
        pgReqClassify.chain(client, [pgReqLogger.requestTable,
                                     pgReqClassify.classTable,
                                     req1, class1,
                                     req2, class2,
                                     query, verify(t, 1),
                                     pgReqClassify.dropClassTable, pgReqLogger.dropRequestTable,
                                     finish(t)],
                            0);
    })
})
