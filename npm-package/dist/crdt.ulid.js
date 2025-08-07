var $CLJS = require("./cljs_env");
var $jscomp = $CLJS.$jscomp;
var COMPILED = false;
require("./cljs.core.js");
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

$CLJS.SHADOW_ENV.setLoaded("crdt.ulid.js");

goog.provide('crdt.ulid');

/**
* @constructor
*/
crdt.ulid.Ulid = (function (s){
this.s = s;
});

(crdt.ulid.Ulid.getBasis = (function (){
return new cljs.core.PersistentVector(null, 1, 5, cljs.core.PersistentVector.EMPTY_NODE, [new cljs.core.Symbol(null,"s","s",-948495851,null)], null);
}));

(crdt.ulid.Ulid.cljs$lang$type = true);

(crdt.ulid.Ulid.cljs$lang$ctorStr = "crdt.ulid/Ulid");

(crdt.ulid.Ulid.cljs$lang$ctorPrWriter = (function (this__5287__auto__,writer__5288__auto__,opt__5289__auto__){
return cljs.core._write(writer__5288__auto__,"crdt.ulid/Ulid");
}));

/**
 * Positional factory function for crdt.ulid/Ulid.
 */
crdt.ulid.__GT_Ulid = (function crdt$ulid$__GT_Ulid(s){
return (new crdt.ulid.Ulid(s));
});

crdt.ulid.read_ulid = (function crdt$ulid$read_ulid(s){
return (new crdt.ulid.Ulid(s));
});
cljs.reader.register_tag_parser_BANG_(new cljs.core.Symbol("crdt","ulid","crdt/ulid",-1453582971,null),crdt.ulid.read_ulid);

//# sourceMappingURL=crdt.ulid.js.map
