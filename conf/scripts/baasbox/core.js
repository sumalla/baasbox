/*
 * Copyright (c) 2014.
 *
 * BaasBox - info@baasbox.com
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * Created by Andrea Tortorella on 23/06/14.
 */

Console.log("Loaded baasbox core");

/**
 * Baasbox server version
 * @type {string}
 */
exports.version = '0.9.0';

var Documents = {};



var log = function(msg){
    var message;
    if(typeof msg === 'string'){
        message = msg;
    } else {
        message = JSON.stringify(msg);
    }

    _command({resource: 'script',
              name: 'log',
              params: ' '+id+' '+message});

};


var DB = {};


DB.runInTransaction = function(fn){
    if(!(typeof fn === 'function'))
        throw new Error("runInTransaction requires a single function argument");
    _command({resource: 'db',
              name: 'transact',
              callback: fn
              });
};

DB.abortTransaction = function(){
    _command({resource: 'db',name: 'abortTransaction'});
};

DB.isInTransaction = function(){
    return _command({resource: 'db',
                     name: 'isInTransaction'});
};

DB.createCollection = function(name){
    if(! (typeof name === 'string')){
        throw new TypeError("missing collection name");
    }
    return _command({resource: 'collections',
                     name: 'post',
                     params: name});
};

DB.dropCollection = function(name){
    if(!(typeof name === 'string')) {
         throw new TypeError("missing collection name");
    }
    return _command({resource: 'collections',
                     name: 'drop',
                     params: name})

};
DB.existsCollection = function(name){
    if(!(typeof name === 'string')){
        throw new TypeError("missing collection name");
    }
    return _command({resource: 'collections',
                     name: 'exists',
                     params: name});
};

DB.ensureCollection = function(name){
    if(!DB.existsCollection(name)){
        return DB.createCollection(name);
    } else {
        return true;
    }
};

var isAdmin = function(){
    return _command({resource: 'db',
                     name: 'isAdmin'});
};

var runAsAdmin = function(fn) {
    return _command({resource: 'db',
                     name: 'switchUser',
                     callback: fn});
};

var Users = {};


Users.find = function(){
    var q = null,
        id = null;
    if(arguments.length < 1) {
        throw new TypeError("missing parameter");
    } else if(typeof arguments[0] === 'string') {
        id = arguments[0];
    } else if(typeof arguments[0] === 'object'){
        q = arguments[0];
    }
    if(!!id){
        return _command({resource: 'users',
                         name: 'get',
                         params: {
                             username: id
                         } });
    } else if(!!q) {
        return _command({resource: 'users',
                         name: 'list',
                        params: q});
    } else {
        throw new TypeError("you must specify  a username or a query")
    }
};

Users.me = function(){
    return Users.find(context.userName);
};

Users.save = function(uzr){
    var upd = {};
    if(arguments.length == 1 && typeof arguments[0] === 'object') {
        upd.visibleByFriends = uzr.visibleByFriends;
        upd.visibleByAnonymousUsers = uzr.visibleByAnonymousUsers;
        upd.visibleByRegisteredUsers = uzr.visibleByRegisteredUsers;
        upd.visibleByTheUser = uzr.visibleByTheUser;

        if(isAdmin()) {
            upd.username = uzr.username;

        } else {
            upd.username = context.userName;
        }

        return _command({resource: 'users',
            name: 'put',
            params: upd
        });

    } else {
        throw new TypeError("you must supply a user to save");
    }
};




Documents.find = function(){
    var coll = null,
        q = null,
        id = null;
    switch (arguments.length){
        case 2:
            if(typeof arguments[1] === 'string') {
                id = arguments[1];
            } else {
                q = arguments[1];
            }
        case 1:
            coll = arguments[0];
    }
    if(!(typeof coll === 'string')){
        throw new TypeError("you must specify a collection");
    }
    if(id === null && (typeof q === 'object')){
        return _command({resource: 'documents',
                         name: 'list',
                         params: {
                             collection: coll,
                             query: q
                         }});
    } else {
        return _command({resource: 'documents',
                         name: 'get',
                         params:{
                             id: id
                         }});
    }
};

Documents.remove = function(coll,id){
    if(!(coll && id)){
        throw new TypeError("missing arguments");
    }
    return _command({resource: 'documents',
                     name: 'delete',
                     params: {

                         collection: 'collection',
                         id: id
                     }});
};

Documents.revoke = function(coll,id,permissions){
    if (! typeof permissions === 'object'){
        throw new TypeError("invalid permissions")
    }
    return _command({resource: 'documents',
        name: 'revoke',
        params: {
            collection: coll,
            id: id,
            users: permissions.users,
            roles: permissions.roles,
        }});
};

Documents.grant = function(coll,id,permissions){
    if (! typeof permissions === 'object'){
        throw new TypeError("invalid permissions")
    }
    return _command({resource: 'documents',
        name: 'grant',
        params: {
            collection: coll,
            id: id,
            users: permissions.users,
            roles: permissions.roles
        }});
};



Documents.save = function(){
    var coll = null,
        obj = null,
        id = null;
    if(arguments.length===1 && typeof arguments[0] === 'object'){
        obj = arguments[0];
        coll = obj['@class'];
        id = obj['id'];
    } else if(arguments.length===1 &&
              typeof arguments[0]==='string' &&
              typeof arguments[1]==='object'){
        coll = arguments[0];
        obj = arguments[1];
        id = obj['id'];
    }
    if(!(obj && coll)){
        throw new TypeError("Invalid arguments");
    }
    if(id){
        return _command({resource: 'documents',
                         name: 'put',
                         params: {
                             collection: coll,
                             data: obj,
                             id: id
                         }});
    } else {
        return _command({
            resource: 'documents',
            name: 'post',
            params: {
                collection: '',
                data: {}
            }
        });
    }
};

var queryUsers = function(to){
    var ret = [];
    Users.find(to).forEach(function (u){
      ret.push(u.username);
    });
    return ret;
};

var Push ={};
Object.defineProperty(Push,"OK",{value: 0});
Object.defineProperty(Push,"ERROR",{value: 2});
Object.defineProperty(Push,"PARTIAL",{value: 1});
Object.defineProperty(Push,"PROFILE_1",{value: 1});
Object.defineProperty(Push,"PROFILE_2",{value: 2});
Object.defineProperty(Push,"PROFILE_3",{value: 3});

Push.send = function(){
    var body,
        to,
        profiles=Push.PROFILE_1;

    switch (arguments.length){
        case 3:
            profiles = arguments[2];
        case 2:
            body = arguments[1];
            to = arguments[0];
            break;
        default:
            throw new TypeError("missing required parameters");
    }
    if(body === null||to===null){
        throw new TypeError("missing required parameters body and to");
    }
    if(typeof body === 'string'){
        body = {message: body};
    }

    if(typeof to === 'string'){
        to = [to];
    } else if((Object.prototype.toString.apply(to) === '[object Object]')){
        if(to.username){
            to=to.username;
        } else {
            to = queryUsers(to);
        }
    } else if(!(Object.prototype.toString.apply(to) === '[object Array]')){
        throw new TypeError("wrong to parameter");
    }

    if(typeof profiles === 'number'){
        profiles = [profiles];
    }

    return _command({resource: 'push',
                     name: 'send',
                     params:{
                        'body': body,
                         'to': to,
                         'profiles': profiles
                     }});
};


exports.Documents = Documents;
exports.Users = Users;
exports.DB = DB;
exports.Push = Push;
exports.log = log;

exports.runAsAdmin=runAsAdmin;

//exports.runInTransaction=runInTransaction;

exports.isAdmin=isAdmin;

//exports.isInTransaction=isInTransaction;
