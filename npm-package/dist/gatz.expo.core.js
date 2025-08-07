var $CLJS = require("./cljs_env");
var $jscomp = $CLJS.$jscomp;
var COMPILED = false;
require("./cljs.core.js");
require("./crdt.core.js");
require("./crdt.ulid.js");
require("./cljs.reader.js");
var cognitect=$CLJS.cognitect || ($CLJS.cognitect = {});
var clojure=$CLJS.clojure || ($CLJS.clojure = {});
var crdt=$CLJS.crdt || ($CLJS.crdt = {});
var cljs=$CLJS.cljs || ($CLJS.cljs = {});
var shadow=$CLJS.shadow || ($CLJS.shadow = {});
var goog=$CLJS.goog || ($CLJS.goog = {});
var gatz=$CLJS.gatz || ($CLJS.gatz = {});
var medley=$CLJS.medley || ($CLJS.medley = {});
var com=$CLJS.com || ($CLJS.com = {});

$CLJS.SHADOW_ENV.setLoaded("gatz.expo.core.js");

goog.provide('gatz.expo.core');
gatz.expo.core.new_lww = (function gatz$expo$core$new_lww(clock,value){
return crdt.core.__GT_LWW(clock,value);
});
gatz.expo.core.new_min_wins = (function gatz$expo$core$new_min_wins(value){
return crdt.core.min_wins(value);
});
gatz.expo.core.new_max_wins = (function gatz$expo$core$new_max_wins(value){
return crdt.core.max_wins(value);
});
gatz.expo.core.new_grow_only_set = (function gatz$expo$core$new_grow_only_set(values){
return crdt.core.gos(cljs.core.js__GT_clj.cljs$core$IFn$_invoke$arity$1(values));
});
gatz.expo.core.new_lww_set = (function gatz$expo$core$new_lww_set(clock,values){
return crdt.core.lww_set.cljs$core$IFn$_invoke$arity$2(clock,cljs.core.js__GT_clj.cljs$core$IFn$_invoke$arity$1(values));
});
gatz.expo.core.merge_crdts = (function gatz$expo$core$merge_crdts(a,b){
return crdt.core._merge(a,b);
});
gatz.expo.core.apply_delta = (function gatz$expo$core$apply_delta(crdt__$1,delta){
return crdt.core._apply_delta(crdt__$1,delta);
});
gatz.expo.core.get_value = (function gatz$expo$core$get_value(crdt__$1){
return cljs.core.clj__GT_js(crdt.core._value(crdt__$1));
});
gatz.expo.core.new_hlc = (function gatz$expo$core$new_hlc(node_id){
return crdt.core.new_hlc.cljs$core$IFn$_invoke$arity$2(node_id,(new Date()));
});
gatz.expo.core.read_crdt = (function gatz$expo$core$read_crdt(edn_str){
return cljs.reader.read_string.cljs$core$IFn$_invoke$arity$1(edn_str);
});
gatz.expo.core.__GT_out = (function gatz$expo$core$__GT_out(user){
return cljs.core.clj__GT_js(crdt.core._value(user));
});
gatz.expo.core.read_edn = (function gatz$expo$core$read_edn(edn_str){
return cljs.reader.read_string.cljs$core$IFn$_invoke$arity$1(edn_str);
});
gatz.expo.core.get_BANG_ = (function gatz$expo$core$get_BANG_(base_url,token,url){
return fetch([cljs.core.str.cljs$core$IFn$_invoke$arity$1(base_url),cljs.core.str.cljs$core$IFn$_invoke$arity$1(url)].join(''),({"headers": ({"Authorization": token, "Accept": "application/edn", "Content-Type": "application/edn"})})).then((function (response){
return response.text();
})).then(gatz.expo.core.read_edn);
});
gatz.expo.core.post_BANG_ = (function gatz$expo$core$post_BANG_(base_url,token,url,data){
return fetch([cljs.core.str.cljs$core$IFn$_invoke$arity$1(base_url),cljs.core.str.cljs$core$IFn$_invoke$arity$1(url)].join(''),({"headers": ({"Authorization": token, "Accept": "application/edn", "Content-Type": "application/edn"}), "method": "POST", "body": cljs.core.pr_str.cljs$core$IFn$_invoke$arity$variadic(cljs.core.prim_seq.cljs$core$IFn$_invoke$arity$2([data], 0))})).then((function (response){
return response.text();
})).then(gatz.expo.core.read_edn);
});
gatz.expo.core.get_user_BANG_ = (function gatz$expo$core$get_user_BANG_(base_url,token){
return gatz.expo.core.get_BANG_(base_url,token,"/api/me/crdt").then((function (response){
return new cljs.core.Keyword(null,"user","user",1532431356).cljs$core$IFn$_invoke$arity$1(response);
}));
});
gatz.expo.core.send_user_action_BANG_ = (function gatz$expo$core$send_user_action_BANG_(base_url,token,action){
return gatz.expo.core.post_BANG_(base_url,token,"/api/me/crdt",new cljs.core.PersistentArrayMap(null, 1, [new cljs.core.Keyword(null,"action","action",-811238024),action], null)).then((function (response){
return new cljs.core.Keyword(null,"user","user",1532431356).cljs$core$IFn$_invoke$arity$1(response);
}));
});

/**
 * @interface
 */
gatz.expo.core.ISyncEngine = function(){};

var gatz$expo$core$ISyncEngine$_tick$dyn_45876 = (function (_){
var x__5350__auto__ = (((_ == null))?null:_);
var m__5351__auto__ = (gatz.expo.core._tick[goog.typeOf(x__5350__auto__)]);
if((!((m__5351__auto__ == null)))){
return (m__5351__auto__.cljs$core$IFn$_invoke$arity$1 ? m__5351__auto__.cljs$core$IFn$_invoke$arity$1(_) : m__5351__auto__.call(null, _));
} else {
var m__5349__auto__ = (gatz.expo.core._tick["_"]);
if((!((m__5349__auto__ == null)))){
return (m__5349__auto__.cljs$core$IFn$_invoke$arity$1 ? m__5349__auto__.cljs$core$IFn$_invoke$arity$1(_) : m__5349__auto__.call(null, _));
} else {
throw cljs.core.missing_protocol("ISyncEngine.-tick",_);
}
}
});
gatz.expo.core._tick = (function gatz$expo$core$_tick(_){
if((((!((_ == null)))) && ((!((_.gatz$expo$core$ISyncEngine$_tick$arity$1 == null)))))){
return _.gatz$expo$core$ISyncEngine$_tick$arity$1(_);
} else {
return gatz$expo$core$ISyncEngine$_tick$dyn_45876(_);
}
});

var gatz$expo$core$ISyncEngine$_merge_to_me$dyn_45877 = (function (_,delta){
var x__5350__auto__ = (((_ == null))?null:_);
var m__5351__auto__ = (gatz.expo.core._merge_to_me[goog.typeOf(x__5350__auto__)]);
if((!((m__5351__auto__ == null)))){
return (m__5351__auto__.cljs$core$IFn$_invoke$arity$2 ? m__5351__auto__.cljs$core$IFn$_invoke$arity$2(_,delta) : m__5351__auto__.call(null, _,delta));
} else {
var m__5349__auto__ = (gatz.expo.core._merge_to_me["_"]);
if((!((m__5349__auto__ == null)))){
return (m__5349__auto__.cljs$core$IFn$_invoke$arity$2 ? m__5349__auto__.cljs$core$IFn$_invoke$arity$2(_,delta) : m__5349__auto__.call(null, _,delta));
} else {
throw cljs.core.missing_protocol("ISyncEngine.-merge-to-me",_);
}
}
});
gatz.expo.core._merge_to_me = (function gatz$expo$core$_merge_to_me(_,delta){
if((((!((_ == null)))) && ((!((_.gatz$expo$core$ISyncEngine$_merge_to_me$arity$2 == null)))))){
return _.gatz$expo$core$ISyncEngine$_merge_to_me$arity$2(_,delta);
} else {
return gatz$expo$core$ISyncEngine$_merge_to_me$dyn_45877(_,delta);
}
});

var gatz$expo$core$ISyncEngine$_sync_user$dyn_45878 = (function (_){
var x__5350__auto__ = (((_ == null))?null:_);
var m__5351__auto__ = (gatz.expo.core._sync_user[goog.typeOf(x__5350__auto__)]);
if((!((m__5351__auto__ == null)))){
return (m__5351__auto__.cljs$core$IFn$_invoke$arity$1 ? m__5351__auto__.cljs$core$IFn$_invoke$arity$1(_) : m__5351__auto__.call(null, _));
} else {
var m__5349__auto__ = (gatz.expo.core._sync_user["_"]);
if((!((m__5349__auto__ == null)))){
return (m__5349__auto__.cljs$core$IFn$_invoke$arity$1 ? m__5349__auto__.cljs$core$IFn$_invoke$arity$1(_) : m__5349__auto__.call(null, _));
} else {
throw cljs.core.missing_protocol("ISyncEngine.-sync-user",_);
}
}
});
gatz.expo.core._sync_user = (function gatz$expo$core$_sync_user(_){
if((((!((_ == null)))) && ((!((_.gatz$expo$core$ISyncEngine$_sync_user$arity$1 == null)))))){
return _.gatz$expo$core$ISyncEngine$_sync_user$arity$1(_);
} else {
return gatz$expo$core$ISyncEngine$_sync_user$dyn_45878(_);
}
});

var gatz$expo$core$ISyncEngine$_subscribe_to_me$dyn_45879 = (function (_,listener_name,callback){
var x__5350__auto__ = (((_ == null))?null:_);
var m__5351__auto__ = (gatz.expo.core._subscribe_to_me[goog.typeOf(x__5350__auto__)]);
if((!((m__5351__auto__ == null)))){
return (m__5351__auto__.cljs$core$IFn$_invoke$arity$3 ? m__5351__auto__.cljs$core$IFn$_invoke$arity$3(_,listener_name,callback) : m__5351__auto__.call(null, _,listener_name,callback));
} else {
var m__5349__auto__ = (gatz.expo.core._subscribe_to_me["_"]);
if((!((m__5349__auto__ == null)))){
return (m__5349__auto__.cljs$core$IFn$_invoke$arity$3 ? m__5349__auto__.cljs$core$IFn$_invoke$arity$3(_,listener_name,callback) : m__5349__auto__.call(null, _,listener_name,callback));
} else {
throw cljs.core.missing_protocol("ISyncEngine.-subscribe-to-me",_);
}
}
});
gatz.expo.core._subscribe_to_me = (function gatz$expo$core$_subscribe_to_me(_,listener_name,callback){
if((((!((_ == null)))) && ((!((_.gatz$expo$core$ISyncEngine$_subscribe_to_me$arity$3 == null)))))){
return _.gatz$expo$core$ISyncEngine$_subscribe_to_me$arity$3(_,listener_name,callback);
} else {
return gatz$expo$core$ISyncEngine$_subscribe_to_me$dyn_45879(_,listener_name,callback);
}
});

var gatz$expo$core$ISyncEngine$_unsubscribe_from_me$dyn_45880 = (function (_,listener_name){
var x__5350__auto__ = (((_ == null))?null:_);
var m__5351__auto__ = (gatz.expo.core._unsubscribe_from_me[goog.typeOf(x__5350__auto__)]);
if((!((m__5351__auto__ == null)))){
return (m__5351__auto__.cljs$core$IFn$_invoke$arity$2 ? m__5351__auto__.cljs$core$IFn$_invoke$arity$2(_,listener_name) : m__5351__auto__.call(null, _,listener_name));
} else {
var m__5349__auto__ = (gatz.expo.core._unsubscribe_from_me["_"]);
if((!((m__5349__auto__ == null)))){
return (m__5349__auto__.cljs$core$IFn$_invoke$arity$2 ? m__5349__auto__.cljs$core$IFn$_invoke$arity$2(_,listener_name) : m__5349__auto__.call(null, _,listener_name));
} else {
throw cljs.core.missing_protocol("ISyncEngine.-unsubscribe-from-me",_);
}
}
});
gatz.expo.core._unsubscribe_from_me = (function gatz$expo$core$_unsubscribe_from_me(_,listener_name){
if((((!((_ == null)))) && ((!((_.gatz$expo$core$ISyncEngine$_unsubscribe_from_me$arity$2 == null)))))){
return _.gatz$expo$core$ISyncEngine$_unsubscribe_from_me$arity$2(_,listener_name);
} else {
return gatz$expo$core$ISyncEngine$_unsubscribe_from_me$dyn_45880(_,listener_name);
}
});

var gatz$expo$core$ISyncEngine$_handle_ws_edn$dyn_45881 = (function (_,edn){
var x__5350__auto__ = (((_ == null))?null:_);
var m__5351__auto__ = (gatz.expo.core._handle_ws_edn[goog.typeOf(x__5350__auto__)]);
if((!((m__5351__auto__ == null)))){
return (m__5351__auto__.cljs$core$IFn$_invoke$arity$2 ? m__5351__auto__.cljs$core$IFn$_invoke$arity$2(_,edn) : m__5351__auto__.call(null, _,edn));
} else {
var m__5349__auto__ = (gatz.expo.core._handle_ws_edn["_"]);
if((!((m__5349__auto__ == null)))){
return (m__5349__auto__.cljs$core$IFn$_invoke$arity$2 ? m__5349__auto__.cljs$core$IFn$_invoke$arity$2(_,edn) : m__5349__auto__.call(null, _,edn));
} else {
throw cljs.core.missing_protocol("ISyncEngine.-handle-ws-edn",_);
}
}
});
gatz.expo.core._handle_ws_edn = (function gatz$expo$core$_handle_ws_edn(_,edn){
if((((!((_ == null)))) && ((!((_.gatz$expo$core$ISyncEngine$_handle_ws_edn$arity$2 == null)))))){
return _.gatz$expo$core$ISyncEngine$_handle_ws_edn$arity$2(_,edn);
} else {
return gatz$expo$core$ISyncEngine$_handle_ws_edn$dyn_45881(_,edn);
}
});


/**
 * @interface
 */
gatz.expo.core.IClient = function(){};

var gatz$expo$core$IClient$_get_user$dyn_45882 = (function (client){
var x__5350__auto__ = (((client == null))?null:client);
var m__5351__auto__ = (gatz.expo.core._get_user[goog.typeOf(x__5350__auto__)]);
if((!((m__5351__auto__ == null)))){
return (m__5351__auto__.cljs$core$IFn$_invoke$arity$1 ? m__5351__auto__.cljs$core$IFn$_invoke$arity$1(client) : m__5351__auto__.call(null, client));
} else {
var m__5349__auto__ = (gatz.expo.core._get_user["_"]);
if((!((m__5349__auto__ == null)))){
return (m__5349__auto__.cljs$core$IFn$_invoke$arity$1 ? m__5349__auto__.cljs$core$IFn$_invoke$arity$1(client) : m__5349__auto__.call(null, client));
} else {
throw cljs.core.missing_protocol("IClient.-get-user",client);
}
}
});
gatz.expo.core._get_user = (function gatz$expo$core$_get_user(client){
if((((!((client == null)))) && ((!((client.gatz$expo$core$IClient$_get_user$arity$1 == null)))))){
return client.gatz$expo$core$IClient$_get_user$arity$1(client);
} else {
return gatz$expo$core$IClient$_get_user$dyn_45882(client);
}
});

var gatz$expo$core$IClient$_send_user_action_BANG_$dyn_45883 = (function (client,action){
var x__5350__auto__ = (((client == null))?null:client);
var m__5351__auto__ = (gatz.expo.core._send_user_action_BANG_[goog.typeOf(x__5350__auto__)]);
if((!((m__5351__auto__ == null)))){
return (m__5351__auto__.cljs$core$IFn$_invoke$arity$2 ? m__5351__auto__.cljs$core$IFn$_invoke$arity$2(client,action) : m__5351__auto__.call(null, client,action));
} else {
var m__5349__auto__ = (gatz.expo.core._send_user_action_BANG_["_"]);
if((!((m__5349__auto__ == null)))){
return (m__5349__auto__.cljs$core$IFn$_invoke$arity$2 ? m__5349__auto__.cljs$core$IFn$_invoke$arity$2(client,action) : m__5349__auto__.call(null, client,action));
} else {
throw cljs.core.missing_protocol("IClient.-send-user-action!",client);
}
}
});
gatz.expo.core._send_user_action_BANG_ = (function gatz$expo$core$_send_user_action_BANG_(client,action){
if((((!((client == null)))) && ((!((client.gatz$expo$core$IClient$_send_user_action_BANG_$arity$2 == null)))))){
return client.gatz$expo$core$IClient$_send_user_action_BANG_$arity$2(client,action);
} else {
return gatz$expo$core$IClient$_send_user_action_BANG_$dyn_45883(client,action);
}
});

if((typeof gatz !== 'undefined') && (typeof gatz.expo !== 'undefined') && (typeof gatz.expo.core !== 'undefined') && (typeof gatz.expo.core.handle_evt_BANG_ !== 'undefined')){
} else {
gatz.expo.core.handle_evt_BANG_ = (function (){var method_table__5599__auto__ = cljs.core.atom.cljs$core$IFn$_invoke$arity$1(cljs.core.PersistentArrayMap.EMPTY);
var prefer_table__5600__auto__ = cljs.core.atom.cljs$core$IFn$_invoke$arity$1(cljs.core.PersistentArrayMap.EMPTY);
var method_cache__5601__auto__ = cljs.core.atom.cljs$core$IFn$_invoke$arity$1(cljs.core.PersistentArrayMap.EMPTY);
var cached_hierarchy__5602__auto__ = cljs.core.atom.cljs$core$IFn$_invoke$arity$1(cljs.core.PersistentArrayMap.EMPTY);
var hierarchy__5603__auto__ = cljs.core.get.cljs$core$IFn$_invoke$arity$3(cljs.core.PersistentArrayMap.EMPTY,new cljs.core.Keyword(null,"hierarchy","hierarchy",-1053470341),(function (){var fexpr__45873 = cljs.core.get_global_hierarchy;
return (fexpr__45873.cljs$core$IFn$_invoke$arity$0 ? fexpr__45873.cljs$core$IFn$_invoke$arity$0() : fexpr__45873.call(null, ));
})());
return (new cljs.core.MultiFn(cljs.core.symbol.cljs$core$IFn$_invoke$arity$2("gatz.expo.core","handle-evt!"),(function (_sync,evt){
return new cljs.core.Keyword("event","type","event/type",1532247862).cljs$core$IFn$_invoke$arity$1(evt);
}),new cljs.core.Keyword(null,"default","default",-1987822328),hierarchy__5603__auto__,method_table__5599__auto__,prefer_table__5600__auto__,method_cache__5601__auto__,cached_hierarchy__5602__auto__));
})();
}
gatz.expo.core.handle_evt_BANG_.cljs$core$IMultiFn$_add_method$arity$3(null, new cljs.core.Keyword("gatz.crdt.user","delta","gatz.crdt.user/delta",686290465),(function (sync,evt){
var action = new cljs.core.Keyword("event","data","event/data",124474021).cljs$core$IFn$_invoke$arity$1(evt);
var delta = new cljs.core.Keyword(null,"delta","delta",108939957).cljs$core$IFn$_invoke$arity$1(action);
return gatz.expo.core._merge_to_me(sync,delta);
}));

/**
* @constructor
 * @implements {gatz.expo.core.IClient}
 * @implements {gatz.expo.core.ISyncEngine}
*/
gatz.expo.core.SyncEngine = (function (base_url,token,user_id,user_atom){
this.base_url = base_url;
this.token = token;
this.user_id = user_id;
this.user_atom = user_atom;
});
(gatz.expo.core.SyncEngine.prototype.gatz$expo$core$IClient$ = cljs.core.PROTOCOL_SENTINEL);

(gatz.expo.core.SyncEngine.prototype.gatz$expo$core$IClient$_get_user$arity$1 = (function (_){
var self__ = this;
var ___$1 = this;
return gatz.expo.core.get_user_BANG_(self__.base_url,self__.token);
}));

(gatz.expo.core.SyncEngine.prototype.gatz$expo$core$IClient$_send_user_action_BANG_$arity$2 = (function (_,action){
var self__ = this;
var ___$1 = this;
return gatz.expo.core.send_user_action_BANG_(self__.base_url,self__.token,action);
}));

(gatz.expo.core.SyncEngine.prototype.gatz$expo$core$ISyncEngine$ = cljs.core.PROTOCOL_SENTINEL);

(gatz.expo.core.SyncEngine.prototype.gatz$expo$core$ISyncEngine$_tick$arity$1 = (function (_){
var self__ = this;
var ___$1 = this;
return crdt.core.new_hlc.cljs$core$IFn$_invoke$arity$1(self__.user_id);
}));

(gatz.expo.core.SyncEngine.prototype.gatz$expo$core$ISyncEngine$_sync_user$arity$1 = (function (_){
var self__ = this;
var ___$1 = this;
return gatz.expo.core.get_user_BANG_(self__.base_url,self__.token).then((function (user){
return cljs.core.swap_BANG_.cljs$core$IFn$_invoke$arity$2(self__.user_atom,(function (old){
if(cljs.core.truth_(old)){
return crdt.core._apply_delta(old,user);
} else {
return user;
}
}));
}));
}));

(gatz.expo.core.SyncEngine.prototype.gatz$expo$core$ISyncEngine$_merge_to_me$arity$2 = (function (this$,delta){
var self__ = this;
var this$__$1 = this;
var temp__5802__auto__ = cljs.core.deref(self__.user_atom);
if(cljs.core.truth_(temp__5802__auto__)){
var _user = temp__5802__auto__;
return cljs.core.swap_BANG_.cljs$core$IFn$_invoke$arity$2(self__.user_atom,(function (old){
if(cljs.core.truth_(old)){
try{return crdt.core._apply_delta(old,delta);
}catch (e45874){if((e45874 instanceof Error)){
var e = e45874;
return old;
} else {
throw e45874;

}
}} else {
return delta;
}
}));
} else {
return this$__$1.gatz$expo$core$ISyncEngine$_sync_user$arity$1(null, ).then((function (){
return this$__$1.gatz$expo$core$ISyncEngine$_merge_to_me$arity$2(null, delta);
}));
}
}));

(gatz.expo.core.SyncEngine.prototype.gatz$expo$core$ISyncEngine$_subscribe_to_me$arity$3 = (function (this$,listener_name,callback){
var self__ = this;
var this$__$1 = this;
if(cljs.core.fn_QMARK_(callback)){
} else {
throw (new Error(["Assert failed: ","callback must be a function","\n","(fn? callback)"].join('')));
}

cljs.core.add_watch(self__.user_atom,listener_name,(function (_,___$1,old,new$){
if(cljs.core._EQ_.cljs$core$IFn$_invoke$arity$2(old,new$)){
return null;
} else {
return (callback.cljs$core$IFn$_invoke$arity$1 ? callback.cljs$core$IFn$_invoke$arity$1(new$) : callback.call(null, new$));
}
}));

var temp__5802__auto__ = cljs.core.deref(self__.user_atom);
if(cljs.core.truth_(temp__5802__auto__)){
var user = temp__5802__auto__;
return Promise.resolve(user);
} else {
return this$__$1.gatz$expo$core$ISyncEngine$_sync_user$arity$1(null, );
}
}));

(gatz.expo.core.SyncEngine.prototype.gatz$expo$core$ISyncEngine$_unsubscribe_from_me$arity$2 = (function (_,listener_name){
var self__ = this;
var ___$1 = this;
return cljs.core.remove_watch(self__.user_atom,listener_name);
}));

(gatz.expo.core.SyncEngine.prototype.gatz$expo$core$ISyncEngine$_handle_ws_edn$arity$2 = (function (this$,edn){
var self__ = this;
var this$__$1 = this;
return gatz.expo.core.handle_evt_BANG_.cljs$core$IFn$_invoke$arity$2(this$__$1,edn);
}));

(gatz.expo.core.SyncEngine.getBasis = (function (){
return new cljs.core.PersistentVector(null, 4, 5, cljs.core.PersistentVector.EMPTY_NODE, [new cljs.core.Symbol(null,"base-url","base-url",1650071925,null),new cljs.core.Symbol(null,"token","token",429068312,null),new cljs.core.Symbol(null,"user-id","user-id",1433709236,null),new cljs.core.Symbol(null,"user-atom","user-atom",-1661867400,null)], null);
}));

(gatz.expo.core.SyncEngine.cljs$lang$type = true);

(gatz.expo.core.SyncEngine.cljs$lang$ctorStr = "gatz.expo.core/SyncEngine");

(gatz.expo.core.SyncEngine.cljs$lang$ctorPrWriter = (function (this__5287__auto__,writer__5288__auto__,opt__5289__auto__){
return cljs.core._write(writer__5288__auto__,"gatz.expo.core/SyncEngine");
}));

/**
 * Positional factory function for gatz.expo.core/SyncEngine.
 */
gatz.expo.core.__GT_SyncEngine = (function gatz$expo$core$__GT_SyncEngine(base_url,token,user_id,user_atom){
return (new gatz.expo.core.SyncEngine(base_url,token,user_id,user_atom));
});

gatz.expo.core.new_sync_engine = (function gatz$expo$core$new_sync_engine(base_url,token,user_id){
return (new gatz.expo.core.SyncEngine(base_url,token,cljs.core.uuid(user_id),cljs.core.atom.cljs$core$IFn$_invoke$arity$1(null)));
});
gatz.expo.core.set_full_name = (function gatz$expo$core$set_full_name(sync,full_name){
var lww = crdt.core.lww(gatz.expo.core._tick(sync),full_name);
var clock = gatz.expo.core._tick(sync);
var delta = new cljs.core.PersistentArrayMap(null, 3, [new cljs.core.Keyword("crdt","clock","crdt/clock",-897362432),clock,new cljs.core.Keyword("user","updated_at","user/updated_at",-459633829),crdt.core.max_wins(clock.ts),new cljs.core.Keyword("user","profile","user/profile",-543273885),new cljs.core.PersistentArrayMap(null, 1, [new cljs.core.Keyword("profile","full_name","profile/full_name",1616911543),lww], null)], null);
var action = new cljs.core.PersistentArrayMap(null, 2, [new cljs.core.Keyword("gatz.crdt.user","action","gatz.crdt.user/action",229843172),new cljs.core.Keyword("gatz.crdt.user","update-profile","gatz.crdt.user/update-profile",-1195429187),new cljs.core.Keyword("gatz.crdt.user","delta","gatz.crdt.user/delta",686290465),delta], null);
gatz.expo.core._merge_to_me(sync,delta);

return gatz.expo.core._send_user_action_BANG_(sync,action);
});
gatz.expo.core.set_twitter_username = (function gatz$expo$core$set_twitter_username(sync,twitter_username){
var clock = gatz.expo.core._tick(sync);
var lww = crdt.core.lww(clock,twitter_username);
var delta = new cljs.core.PersistentArrayMap(null, 3, [new cljs.core.Keyword("crdt","clock","crdt/clock",-897362432),clock,new cljs.core.Keyword("user","updated_at","user/updated_at",-459633829),crdt.core.max_wins(clock.ts),new cljs.core.Keyword("user","profile","user/profile",-543273885),new cljs.core.PersistentArrayMap(null, 1, [new cljs.core.Keyword("profile","urls","profile/urls",-483268738),new cljs.core.PersistentArrayMap(null, 1, [new cljs.core.Keyword("profile.urls","twitter","profile.urls/twitter",-1893252286),lww], null)], null)], null);
var action = new cljs.core.PersistentArrayMap(null, 2, [new cljs.core.Keyword("gatz.crdt.user","action","gatz.crdt.user/action",229843172),new cljs.core.Keyword("gatz.crdt.user","update-profile","gatz.crdt.user/update-profile",-1195429187),new cljs.core.Keyword("gatz.crdt.user","delta","gatz.crdt.user/delta",686290465),delta], null);
gatz.expo.core._merge_to_me(sync,delta);

return gatz.expo.core._send_user_action_BANG_(sync,action);
});
gatz.expo.core.set_website_url = (function gatz$expo$core$set_website_url(sync,website_url){
var clock = gatz.expo.core._tick(sync);
var lww = crdt.core.lww(clock,website_url);
var delta = new cljs.core.PersistentArrayMap(null, 3, [new cljs.core.Keyword("crdt","clock","crdt/clock",-897362432),clock,new cljs.core.Keyword("user","updated_at","user/updated_at",-459633829),crdt.core.max_wins(clock.ts),new cljs.core.Keyword("user","profile","user/profile",-543273885),new cljs.core.PersistentArrayMap(null, 1, [new cljs.core.Keyword("profile","urls","profile/urls",-483268738),new cljs.core.PersistentArrayMap(null, 1, [new cljs.core.Keyword("profile.urls","website","profile.urls/website",-529186096),lww], null)], null)], null);
var action = new cljs.core.PersistentArrayMap(null, 2, [new cljs.core.Keyword("gatz.crdt.user","action","gatz.crdt.user/action",229843172),new cljs.core.Keyword("gatz.crdt.user","update-profile","gatz.crdt.user/update-profile",-1195429187),new cljs.core.Keyword("gatz.crdt.user","delta","gatz.crdt.user/delta",686290465),delta], null);
gatz.expo.core._merge_to_me(sync,delta);

return gatz.expo.core._send_user_action_BANG_(sync,action);
});
gatz.expo.core.set_profile_picture = (function gatz$expo$core$set_profile_picture(sync,url){
var clock = gatz.expo.core._tick(sync);
var lww = crdt.core.lww(clock,url);
var delta = new cljs.core.PersistentArrayMap(null, 3, [new cljs.core.Keyword("crdt","clock","crdt/clock",-897362432),clock,new cljs.core.Keyword("user","updated_at","user/updated_at",-459633829),crdt.core.max_wins(clock.ts),new cljs.core.Keyword("user","avatar","user/avatar",-1612128612),lww], null);
var action = new cljs.core.PersistentArrayMap(null, 2, [new cljs.core.Keyword("gatz.crdt.user","action","gatz.crdt.user/action",229843172),new cljs.core.Keyword("gatz.crdt.user","update-avatar","gatz.crdt.user/update-avatar",741987756),new cljs.core.Keyword("gatz.crdt.user","delta","gatz.crdt.user/delta",686290465),delta], null);
gatz.expo.core._merge_to_me(sync,delta);

return gatz.expo.core._send_user_action_BANG_(sync,action);
});
gatz.expo.core.set_location_setting = (function gatz$expo$core$set_location_setting(sync,enabled){
if(cljs.core.boolean_QMARK_(enabled)){
} else {
throw (new Error("Assert failed: (boolean? enabled)"));
}

var clock = gatz.expo.core._tick(sync);
var lww = crdt.core.lww(clock,enabled);
var delta = new cljs.core.PersistentArrayMap(null, 3, [new cljs.core.Keyword("crdt","clock","crdt/clock",-897362432),clock,new cljs.core.Keyword("user","updated_at","user/updated_at",-459633829),crdt.core.max_wins(clock.ts),new cljs.core.Keyword("user","settings","user/settings",1559882910),new cljs.core.PersistentArrayMap(null, 1, [new cljs.core.Keyword("settings","location","settings/location",-809825025),new cljs.core.PersistentArrayMap(null, 1, [new cljs.core.Keyword("settings.location","enabled","settings.location/enabled",517043612),lww], null)], null)], null);
var action = new cljs.core.PersistentArrayMap(null, 2, [new cljs.core.Keyword("gatz.crdt.user","action","gatz.crdt.user/action",229843172),new cljs.core.Keyword("gatz.crdt.user","update-location-settings","gatz.crdt.user/update-location-settings",-172486392),new cljs.core.Keyword("gatz.crdt.user","delta","gatz.crdt.user/delta",686290465),delta], null);
gatz.expo.core._merge_to_me(sync,delta);

return gatz.expo.core._send_user_action_BANG_(sync,action);
});
gatz.expo.core.set_notification_settings = (function gatz$expo$core$set_notification_settings(sync,nts_settings){
var clock = gatz.expo.core._tick(sync);
var delta = new cljs.core.PersistentArrayMap(null, 3, [new cljs.core.Keyword("crdt","clock","crdt/clock",-897362432),clock,new cljs.core.Keyword("user","updated_at","user/updated_at",-459633829),crdt.core.max_wins(clock.ts),new cljs.core.Keyword("user","settings","user/settings",1559882910),new cljs.core.PersistentArrayMap(null, 1, [new cljs.core.Keyword("settings","notifications","settings/notifications",-1141008640),crdt.core.__GT_lww_map(nts_settings,clock)], null)], null);
var action = new cljs.core.PersistentArrayMap(null, 2, [new cljs.core.Keyword("gatz.crdt.user","action","gatz.crdt.user/action",229843172),new cljs.core.Keyword("gatz.crdt.user","update-notifications","gatz.crdt.user/update-notifications",-311774965),new cljs.core.Keyword("gatz.crdt.user","delta","gatz.crdt.user/delta",686290465),delta], null);
gatz.expo.core._merge_to_me(sync,delta);

return gatz.expo.core._send_user_action_BANG_(sync,action);
});
gatz.expo.core.notifications_off = new cljs.core.PersistentArrayMap(null, 5, [new cljs.core.Keyword("settings.notification","overall","settings.notification/overall",-479178826),false,new cljs.core.Keyword("settings.notification","activity","settings.notification/activity",-1953789177),new cljs.core.Keyword("settings.notification","none","settings.notification/none",1305748588),new cljs.core.Keyword("settings.notification","subscribe_on_comment","settings.notification/subscribe_on_comment",24381537),false,new cljs.core.Keyword("settings.notification","suggestions_from_gatz","settings.notification/suggestions_from_gatz",692775328),false,new cljs.core.Keyword("settings.notification","friend_accepted","settings.notification/friend_accepted",-706087569),false], null);
gatz.expo.core.notifications_on = new cljs.core.PersistentArrayMap(null, 5, [new cljs.core.Keyword("settings.notification","overall","settings.notification/overall",-479178826),true,new cljs.core.Keyword("settings.notification","activity","settings.notification/activity",-1953789177),new cljs.core.Keyword("settings.notification","daily","settings.notification/daily",-854136525),new cljs.core.Keyword("settings.notification","subscribe_on_comment","settings.notification/subscribe_on_comment",24381537),true,new cljs.core.Keyword("settings.notification","suggestions_from_gatz","settings.notification/suggestions_from_gatz",692775328),true,new cljs.core.Keyword("settings.notification","friend_accepted","settings.notification/friend_accepted",-706087569),true], null);
gatz.expo.core.disable_notification_settings = (function gatz$expo$core$disable_notification_settings(sync){
return gatz.expo.core.set_notification_settings(sync,gatz.expo.core.notifications_off);
});
gatz.expo.core.enable_notification_settings = (function gatz$expo$core$enable_notification_settings(sync){
return gatz.expo.core.set_notification_settings(sync,gatz.expo.core.notifications_on);
});
gatz.expo.core.notification_fields = new cljs.core.PersistentHashSet(null, new cljs.core.PersistentArrayMap(null, 5, [new cljs.core.Keyword("settings.notification","suggestions_from_gatz","settings.notification/suggestions_from_gatz",692775328),null,new cljs.core.Keyword("settings.notification","subscribe_on_comment","settings.notification/subscribe_on_comment",24381537),null,new cljs.core.Keyword("settings.notification","activity","settings.notification/activity",-1953789177),null,new cljs.core.Keyword("settings.notification","friend_accepted","settings.notification/friend_accepted",-706087569),null,new cljs.core.Keyword("settings.notification","overall","settings.notification/overall",-479178826),null], null), null);
gatz.expo.core.set_notification_settings_field = (function gatz$expo$core$set_notification_settings_field(sync,field,value){
var clock = gatz.expo.core._tick(sync);
var field__$1 = cljs.core.keyword.cljs$core$IFn$_invoke$arity$2("settings.notification",field);
var value__$1 = ((cljs.core._EQ_.cljs$core$IFn$_invoke$arity$2(field__$1,new cljs.core.Keyword("settings.notification","activity","settings.notification/activity",-1953789177)))?cljs.core.keyword.cljs$core$IFn$_invoke$arity$2("settings.notification",value):cljs.core.boolean$(value));
var lww = crdt.core.lww(clock,value__$1);
var delta = new cljs.core.PersistentArrayMap(null, 3, [new cljs.core.Keyword("crdt","clock","crdt/clock",-897362432),clock,new cljs.core.Keyword("user","updated_at","user/updated_at",-459633829),crdt.core.max_wins(clock.ts),new cljs.core.Keyword("user","settings","user/settings",1559882910),new cljs.core.PersistentArrayMap(null, 1, [new cljs.core.Keyword("settings","notifications","settings/notifications",-1141008640),cljs.core.PersistentArrayMap.createAsIfByAssoc([field__$1,lww])], null)], null);
var action = new cljs.core.PersistentArrayMap(null, 2, [new cljs.core.Keyword("gatz.crdt.user","action","gatz.crdt.user/action",229843172),new cljs.core.Keyword("gatz.crdt.user","update-notifications","gatz.crdt.user/update-notifications",-311774965),new cljs.core.Keyword("gatz.crdt.user","delta","gatz.crdt.user/delta",686290465),delta], null);
if(cljs.core.contains_QMARK_(gatz.expo.core.notification_fields,field__$1)){
} else {
throw (new Error(["Assert failed: ","Invalid field","\n","(contains? notification-fields field)"].join('')));
}

if(cljs.core._EQ_.cljs$core$IFn$_invoke$arity$2(new cljs.core.Keyword("settings.notification","activity","settings.notification/activity",-1953789177),field__$1)){
if(cljs.core.contains_QMARK_(new cljs.core.PersistentHashSet(null, new cljs.core.PersistentArrayMap(null, 2, [new cljs.core.Keyword("settings.notification","none","settings.notification/none",1305748588),null,new cljs.core.Keyword("settings.notification","daily","settings.notification/daily",-854136525),null], null), null),value__$1)){
} else {
throw (new Error("Assert failed: (contains? #{:settings.notification/none :settings.notification/daily} value)"));
}
} else {
if(cljs.core.boolean_QMARK_(value__$1)){
} else {
throw (new Error("Assert failed: (boolean? value)"));
}
}

gatz.expo.core._merge_to_me(sync,delta);

return gatz.expo.core._send_user_action_BANG_(sync,action);
});
gatz.expo.core.register_push_token = (function gatz$expo$core$register_push_token(sync,token){
if(typeof token === 'string'){
} else {
throw (new Error("Assert failed: (string? token)"));
}

var clock = gatz.expo.core._tick(sync);
var expo_token = new cljs.core.PersistentArrayMap(null, 3, [new cljs.core.Keyword("push","service","push/service",-1966777045),new cljs.core.Keyword("push","expo","push/expo",-613772200),new cljs.core.Keyword("push","token","push/token",-1199818081),token,new cljs.core.Keyword("push","created_at","push/created_at",1495277652),(new Date())], null);
var delta = new cljs.core.PersistentArrayMap(null, 4, [new cljs.core.Keyword("crdt","clock","crdt/clock",-897362432),clock,new cljs.core.Keyword("user","updated_at","user/updated_at",-459633829),crdt.core.max_wins(clock.ts),new cljs.core.Keyword("user","push_tokens","user/push_tokens",-2113250435),crdt.core.__GT_LWW(clock,new cljs.core.PersistentArrayMap(null, 1, [new cljs.core.Keyword("push","expo","push/expo",-613772200),expo_token], null)),new cljs.core.Keyword("user","settings","user/settings",1559882910),new cljs.core.PersistentArrayMap(null, 1, [new cljs.core.Keyword("settings","notifications","settings/notifications",-1141008640),crdt.core.__GT_lww_map(gatz.expo.core.notifications_on,clock)], null)], null);
var action = new cljs.core.PersistentArrayMap(null, 2, [new cljs.core.Keyword("gatz.crdt.user","action","gatz.crdt.user/action",229843172),new cljs.core.Keyword("gatz.crdt.user","add-push-token","gatz.crdt.user/add-push-token",-1740518064),new cljs.core.Keyword("gatz.crdt.user","delta","gatz.crdt.user/delta",686290465),delta], null);
gatz.expo.core._merge_to_me(sync,delta);

return gatz.expo.core._send_user_action_BANG_(sync,action);
});
gatz.expo.core.subscribe_to_me = (function gatz$expo$core$subscribe_to_me(sync,lid,callback){
var cb = (function (new$){
var G__45875 = gatz.expo.core.__GT_out(new$);
return (callback.cljs$core$IFn$_invoke$arity$1 ? callback.cljs$core$IFn$_invoke$arity$1(G__45875) : callback.call(null, G__45875));
});
return ({"user": gatz.expo.core._subscribe_to_me(sync,lid,cb).then(gatz.expo.core.__GT_out), "unsubscribe": (function (){
return gatz.expo.core._unsubscribe_from_me(sync,lid);
})});
});
gatz.expo.core.handle_ws_edn = (function gatz$expo$core$handle_ws_edn(sync,edn){
return gatz.expo.core._handle_ws_edn(sync,edn);
});
Object.defineProperty(module.exports, "new_lww", { enumerable: true, get: function() { return gatz.expo.core.new_lww; } });
Object.defineProperty(module.exports, "new_min_wins", { enumerable: true, get: function() { return gatz.expo.core.new_min_wins; } });
Object.defineProperty(module.exports, "new_max_wins", { enumerable: true, get: function() { return gatz.expo.core.new_max_wins; } });
Object.defineProperty(module.exports, "new_grow_only_set", { enumerable: true, get: function() { return gatz.expo.core.new_grow_only_set; } });
Object.defineProperty(module.exports, "new_lww_set", { enumerable: true, get: function() { return gatz.expo.core.new_lww_set; } });
Object.defineProperty(module.exports, "merge_crdts", { enumerable: true, get: function() { return gatz.expo.core.merge_crdts; } });
Object.defineProperty(module.exports, "apply_delta", { enumerable: true, get: function() { return gatz.expo.core.apply_delta; } });
Object.defineProperty(module.exports, "get_value", { enumerable: true, get: function() { return gatz.expo.core.get_value; } });
Object.defineProperty(module.exports, "new_hlc", { enumerable: true, get: function() { return gatz.expo.core.new_hlc; } });
Object.defineProperty(module.exports, "read_crdt", { enumerable: true, get: function() { return gatz.expo.core.read_crdt; } });
Object.defineProperty(module.exports, "read_edn", { enumerable: true, get: function() { return gatz.expo.core.read_edn; } });
Object.defineProperty(module.exports, "new_sync_engine", { enumerable: true, get: function() { return gatz.expo.core.new_sync_engine; } });
Object.defineProperty(module.exports, "set_full_name", { enumerable: true, get: function() { return gatz.expo.core.set_full_name; } });
Object.defineProperty(module.exports, "set_twitter_username", { enumerable: true, get: function() { return gatz.expo.core.set_twitter_username; } });
Object.defineProperty(module.exports, "set_website_url", { enumerable: true, get: function() { return gatz.expo.core.set_website_url; } });
Object.defineProperty(module.exports, "set_profile_picture", { enumerable: true, get: function() { return gatz.expo.core.set_profile_picture; } });
Object.defineProperty(module.exports, "set_location_setting", { enumerable: true, get: function() { return gatz.expo.core.set_location_setting; } });
Object.defineProperty(module.exports, "disable_notification_settings", { enumerable: true, get: function() { return gatz.expo.core.disable_notification_settings; } });
Object.defineProperty(module.exports, "enable_notification_settings", { enumerable: true, get: function() { return gatz.expo.core.enable_notification_settings; } });
Object.defineProperty(module.exports, "set_notification_settings_field", { enumerable: true, get: function() { return gatz.expo.core.set_notification_settings_field; } });
Object.defineProperty(module.exports, "register_push_token", { enumerable: true, get: function() { return gatz.expo.core.register_push_token; } });
Object.defineProperty(module.exports, "subscribe_to_me", { enumerable: true, get: function() { return gatz.expo.core.subscribe_to_me; } });
Object.defineProperty(module.exports, "handle_ws_edn", { enumerable: true, get: function() { return gatz.expo.core.handle_ws_edn; } });
//# sourceMappingURL=gatz.expo.core.js.map
