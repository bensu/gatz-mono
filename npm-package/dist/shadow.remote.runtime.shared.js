var $CLJS = require("./cljs_env");
var $jscomp = $CLJS.$jscomp;
var COMPILED = false;
require("./cljs.core.js");
require("./shadow.remote.runtime.api.js");
var cognitect=$CLJS.cognitect || ($CLJS.cognitect = {});
var clojure=$CLJS.clojure || ($CLJS.clojure = {});
var crdt=$CLJS.crdt || ($CLJS.crdt = {});
var cljs=$CLJS.cljs || ($CLJS.cljs = {});
var shadow=$CLJS.shadow || ($CLJS.shadow = {});
var goog=$CLJS.goog || ($CLJS.goog = {});
var gatz=$CLJS.gatz || ($CLJS.gatz = {});
var medley=$CLJS.medley || ($CLJS.medley = {});
var com=$CLJS.com || ($CLJS.com = {});

$CLJS.SHADOW_ENV.setLoaded("shadow.remote.runtime.shared.js");

goog.provide('shadow.remote.runtime.shared');
shadow.remote.runtime.shared.init_state = (function shadow$remote$runtime$shared$init_state(client_info){
return new cljs.core.PersistentArrayMap(null, 5, [new cljs.core.Keyword(null,"extensions","extensions",-1103629196),cljs.core.PersistentArrayMap.EMPTY,new cljs.core.Keyword(null,"ops","ops",1237330063),cljs.core.PersistentArrayMap.EMPTY,new cljs.core.Keyword(null,"client-info","client-info",1958982504),client_info,new cljs.core.Keyword(null,"call-id-seq","call-id-seq",-1679248218),(0),new cljs.core.Keyword(null,"call-handlers","call-handlers",386605551),cljs.core.PersistentArrayMap.EMPTY], null);
});
shadow.remote.runtime.shared.now = (function shadow$remote$runtime$shared$now(){
return Date.now();
});
shadow.remote.runtime.shared.get_client_id = (function shadow$remote$runtime$shared$get_client_id(p__35792){
var map__35793 = p__35792;
var map__35793__$1 = cljs.core.__destructure_map(map__35793);
var runtime = map__35793__$1;
var state_ref = cljs.core.get.cljs$core$IFn$_invoke$arity$2(map__35793__$1,new cljs.core.Keyword(null,"state-ref","state-ref",2127874952));
var or__5002__auto__ = new cljs.core.Keyword(null,"client-id","client-id",-464622140).cljs$core$IFn$_invoke$arity$1(cljs.core.deref(state_ref));
if(cljs.core.truth_(or__5002__auto__)){
return or__5002__auto__;
} else {
throw cljs.core.ex_info.cljs$core$IFn$_invoke$arity$2("runtime has no assigned runtime-id",new cljs.core.PersistentArrayMap(null, 1, [new cljs.core.Keyword(null,"runtime","runtime",-1331573996),runtime], null));
}
});
shadow.remote.runtime.shared.relay_msg = (function shadow$remote$runtime$shared$relay_msg(runtime,msg){
var self_id_36091 = shadow.remote.runtime.shared.get_client_id(runtime);
if(cljs.core.not_EQ_.cljs$core$IFn$_invoke$arity$2(new cljs.core.Keyword(null,"to","to",192099007).cljs$core$IFn$_invoke$arity$1(msg),self_id_36091)){
shadow.remote.runtime.api.relay_msg(runtime,msg);
} else {
Promise.resolve((1)).then((function (){
var G__35806 = runtime;
var G__35807 = cljs.core.assoc.cljs$core$IFn$_invoke$arity$3(msg,new cljs.core.Keyword(null,"from","from",1815293044),self_id_36091);
return (shadow.remote.runtime.shared.process.cljs$core$IFn$_invoke$arity$2 ? shadow.remote.runtime.shared.process.cljs$core$IFn$_invoke$arity$2(G__35806,G__35807) : shadow.remote.runtime.shared.process.call(null, G__35806,G__35807));
}));
}

return msg;
});
shadow.remote.runtime.shared.reply = (function shadow$remote$runtime$shared$reply(runtime,p__35812,res){
var map__35814 = p__35812;
var map__35814__$1 = cljs.core.__destructure_map(map__35814);
var call_id = cljs.core.get.cljs$core$IFn$_invoke$arity$2(map__35814__$1,new cljs.core.Keyword(null,"call-id","call-id",1043012968));
var from = cljs.core.get.cljs$core$IFn$_invoke$arity$2(map__35814__$1,new cljs.core.Keyword(null,"from","from",1815293044));
var res__$1 = (function (){var G__35817 = res;
var G__35817__$1 = (cljs.core.truth_(call_id)?cljs.core.assoc.cljs$core$IFn$_invoke$arity$3(G__35817,new cljs.core.Keyword(null,"call-id","call-id",1043012968),call_id):G__35817);
if(cljs.core.truth_(from)){
return cljs.core.assoc.cljs$core$IFn$_invoke$arity$3(G__35817__$1,new cljs.core.Keyword(null,"to","to",192099007),from);
} else {
return G__35817__$1;
}
})();
return shadow.remote.runtime.api.relay_msg(runtime,res__$1);
});
shadow.remote.runtime.shared.call = (function shadow$remote$runtime$shared$call(var_args){
var G__35827 = arguments.length;
switch (G__35827) {
case 3:
return shadow.remote.runtime.shared.call.cljs$core$IFn$_invoke$arity$3((arguments[(0)]),(arguments[(1)]),(arguments[(2)]));

break;
case 4:
return shadow.remote.runtime.shared.call.cljs$core$IFn$_invoke$arity$4((arguments[(0)]),(arguments[(1)]),(arguments[(2)]),(arguments[(3)]));

break;
default:
throw (new Error(["Invalid arity: ",cljs.core.str.cljs$core$IFn$_invoke$arity$1(arguments.length)].join('')));

}
});

(shadow.remote.runtime.shared.call.cljs$core$IFn$_invoke$arity$3 = (function (runtime,msg,handlers){
return shadow.remote.runtime.shared.call.cljs$core$IFn$_invoke$arity$4(runtime,msg,handlers,(0));
}));

(shadow.remote.runtime.shared.call.cljs$core$IFn$_invoke$arity$4 = (function (p__35832,msg,handlers,timeout_after_ms){
var map__35833 = p__35832;
var map__35833__$1 = cljs.core.__destructure_map(map__35833);
var runtime = map__35833__$1;
var state_ref = cljs.core.get.cljs$core$IFn$_invoke$arity$2(map__35833__$1,new cljs.core.Keyword(null,"state-ref","state-ref",2127874952));
if(cljs.core.map_QMARK_(msg)){
} else {
throw (new Error("Assert failed: (map? msg)"));
}

if(cljs.core.map_QMARK_(handlers)){
} else {
throw (new Error("Assert failed: (map? handlers)"));
}

if(cljs.core.nat_int_QMARK_(timeout_after_ms)){
} else {
throw (new Error("Assert failed: (nat-int? timeout-after-ms)"));
}

var call_id = new cljs.core.Keyword(null,"call-id-seq","call-id-seq",-1679248218).cljs$core$IFn$_invoke$arity$1(cljs.core.deref(state_ref));
cljs.core.swap_BANG_.cljs$core$IFn$_invoke$arity$4(state_ref,cljs.core.update,new cljs.core.Keyword(null,"call-id-seq","call-id-seq",-1679248218),cljs.core.inc);

cljs.core.swap_BANG_.cljs$core$IFn$_invoke$arity$4(state_ref,cljs.core.assoc_in,new cljs.core.PersistentVector(null, 2, 5, cljs.core.PersistentVector.EMPTY_NODE, [new cljs.core.Keyword(null,"call-handlers","call-handlers",386605551),call_id], null),new cljs.core.PersistentArrayMap(null, 4, [new cljs.core.Keyword(null,"handlers","handlers",79528781),handlers,new cljs.core.Keyword(null,"called-at","called-at",607081160),shadow.remote.runtime.shared.now(),new cljs.core.Keyword(null,"msg","msg",-1386103444),msg,new cljs.core.Keyword(null,"timeout","timeout",-318625318),timeout_after_ms], null));

return shadow.remote.runtime.api.relay_msg(runtime,cljs.core.assoc.cljs$core$IFn$_invoke$arity$3(msg,new cljs.core.Keyword(null,"call-id","call-id",1043012968),call_id));
}));

(shadow.remote.runtime.shared.call.cljs$lang$maxFixedArity = 4);

shadow.remote.runtime.shared.trigger_BANG_ = (function shadow$remote$runtime$shared$trigger_BANG_(var_args){
var args__5732__auto__ = [];
var len__5726__auto___36176 = arguments.length;
var i__5727__auto___36177 = (0);
while(true){
if((i__5727__auto___36177 < len__5726__auto___36176)){
args__5732__auto__.push((arguments[i__5727__auto___36177]));

var G__36178 = (i__5727__auto___36177 + (1));
i__5727__auto___36177 = G__36178;
continue;
} else {
}
break;
}

var argseq__5733__auto__ = ((((2) < args__5732__auto__.length))?(new cljs.core.IndexedSeq(args__5732__auto__.slice((2)),(0),null)):null);
return shadow.remote.runtime.shared.trigger_BANG_.cljs$core$IFn$_invoke$arity$variadic((arguments[(0)]),(arguments[(1)]),argseq__5733__auto__);
});

(shadow.remote.runtime.shared.trigger_BANG_.cljs$core$IFn$_invoke$arity$variadic = (function (p__35863,ev,args){
var map__35864 = p__35863;
var map__35864__$1 = cljs.core.__destructure_map(map__35864);
var runtime = map__35864__$1;
var state_ref = cljs.core.get.cljs$core$IFn$_invoke$arity$2(map__35864__$1,new cljs.core.Keyword(null,"state-ref","state-ref",2127874952));
var seq__35865 = cljs.core.seq(cljs.core.vals(new cljs.core.Keyword(null,"extensions","extensions",-1103629196).cljs$core$IFn$_invoke$arity$1(cljs.core.deref(state_ref))));
var chunk__35868 = null;
var count__35869 = (0);
var i__35870 = (0);
while(true){
if((i__35870 < count__35869)){
var ext = chunk__35868.cljs$core$IIndexed$_nth$arity$2(null, i__35870);
var ev_fn = cljs.core.get.cljs$core$IFn$_invoke$arity$2(ext,ev);
if(cljs.core.truth_(ev_fn)){
cljs.core.apply.cljs$core$IFn$_invoke$arity$2(ev_fn,args);


var G__36180 = seq__35865;
var G__36181 = chunk__35868;
var G__36182 = count__35869;
var G__36183 = (i__35870 + (1));
seq__35865 = G__36180;
chunk__35868 = G__36181;
count__35869 = G__36182;
i__35870 = G__36183;
continue;
} else {
var G__36184 = seq__35865;
var G__36185 = chunk__35868;
var G__36186 = count__35869;
var G__36187 = (i__35870 + (1));
seq__35865 = G__36184;
chunk__35868 = G__36185;
count__35869 = G__36186;
i__35870 = G__36187;
continue;
}
} else {
var temp__5804__auto__ = cljs.core.seq(seq__35865);
if(temp__5804__auto__){
var seq__35865__$1 = temp__5804__auto__;
if(cljs.core.chunked_seq_QMARK_(seq__35865__$1)){
var c__5525__auto__ = cljs.core.chunk_first(seq__35865__$1);
var G__36188 = cljs.core.chunk_rest(seq__35865__$1);
var G__36189 = c__5525__auto__;
var G__36190 = cljs.core.count(c__5525__auto__);
var G__36191 = (0);
seq__35865 = G__36188;
chunk__35868 = G__36189;
count__35869 = G__36190;
i__35870 = G__36191;
continue;
} else {
var ext = cljs.core.first(seq__35865__$1);
var ev_fn = cljs.core.get.cljs$core$IFn$_invoke$arity$2(ext,ev);
if(cljs.core.truth_(ev_fn)){
cljs.core.apply.cljs$core$IFn$_invoke$arity$2(ev_fn,args);


var G__36192 = cljs.core.next(seq__35865__$1);
var G__36193 = null;
var G__36194 = (0);
var G__36195 = (0);
seq__35865 = G__36192;
chunk__35868 = G__36193;
count__35869 = G__36194;
i__35870 = G__36195;
continue;
} else {
var G__36196 = cljs.core.next(seq__35865__$1);
var G__36197 = null;
var G__36198 = (0);
var G__36199 = (0);
seq__35865 = G__36196;
chunk__35868 = G__36197;
count__35869 = G__36198;
i__35870 = G__36199;
continue;
}
}
} else {
return null;
}
}
break;
}
}));

(shadow.remote.runtime.shared.trigger_BANG_.cljs$lang$maxFixedArity = (2));

/** @this {Function} */
(shadow.remote.runtime.shared.trigger_BANG_.cljs$lang$applyTo = (function (seq35845){
var G__35846 = cljs.core.first(seq35845);
var seq35845__$1 = cljs.core.next(seq35845);
var G__35847 = cljs.core.first(seq35845__$1);
var seq35845__$2 = cljs.core.next(seq35845__$1);
var self__5711__auto__ = this;
return self__5711__auto__.cljs$core$IFn$_invoke$arity$variadic(G__35846,G__35847,seq35845__$2);
}));

shadow.remote.runtime.shared.welcome = (function shadow$remote$runtime$shared$welcome(p__35881,p__35882){
var map__35884 = p__35881;
var map__35884__$1 = cljs.core.__destructure_map(map__35884);
var runtime = map__35884__$1;
var state_ref = cljs.core.get.cljs$core$IFn$_invoke$arity$2(map__35884__$1,new cljs.core.Keyword(null,"state-ref","state-ref",2127874952));
var map__35885 = p__35882;
var map__35885__$1 = cljs.core.__destructure_map(map__35885);
var msg = map__35885__$1;
var client_id = cljs.core.get.cljs$core$IFn$_invoke$arity$2(map__35885__$1,new cljs.core.Keyword(null,"client-id","client-id",-464622140));
cljs.core.swap_BANG_.cljs$core$IFn$_invoke$arity$variadic(state_ref,cljs.core.assoc,new cljs.core.Keyword(null,"client-id","client-id",-464622140),client_id,cljs.core.prim_seq.cljs$core$IFn$_invoke$arity$2([new cljs.core.Keyword(null,"welcome","welcome",-578152123),true], 0));

var map__35887 = cljs.core.deref(state_ref);
var map__35887__$1 = cljs.core.__destructure_map(map__35887);
var client_info = cljs.core.get.cljs$core$IFn$_invoke$arity$2(map__35887__$1,new cljs.core.Keyword(null,"client-info","client-info",1958982504));
var extensions = cljs.core.get.cljs$core$IFn$_invoke$arity$2(map__35887__$1,new cljs.core.Keyword(null,"extensions","extensions",-1103629196));
shadow.remote.runtime.shared.relay_msg(runtime,new cljs.core.PersistentArrayMap(null, 2, [new cljs.core.Keyword(null,"op","op",-1882987955),new cljs.core.Keyword(null,"hello","hello",-245025397),new cljs.core.Keyword(null,"client-info","client-info",1958982504),client_info], null));

return shadow.remote.runtime.shared.trigger_BANG_(runtime,new cljs.core.Keyword(null,"on-welcome","on-welcome",1895317125));
});
shadow.remote.runtime.shared.ping = (function shadow$remote$runtime$shared$ping(runtime,msg){
return shadow.remote.runtime.shared.reply(runtime,msg,new cljs.core.PersistentArrayMap(null, 1, [new cljs.core.Keyword(null,"op","op",-1882987955),new cljs.core.Keyword(null,"pong","pong",-172484958)], null));
});
shadow.remote.runtime.shared.request_supported_ops = (function shadow$remote$runtime$shared$request_supported_ops(p__35902,msg){
var map__35903 = p__35902;
var map__35903__$1 = cljs.core.__destructure_map(map__35903);
var runtime = map__35903__$1;
var state_ref = cljs.core.get.cljs$core$IFn$_invoke$arity$2(map__35903__$1,new cljs.core.Keyword(null,"state-ref","state-ref",2127874952));
return shadow.remote.runtime.shared.reply(runtime,msg,new cljs.core.PersistentArrayMap(null, 2, [new cljs.core.Keyword(null,"op","op",-1882987955),new cljs.core.Keyword(null,"supported-ops","supported-ops",337914702),new cljs.core.Keyword(null,"ops","ops",1237330063),cljs.core.disj.cljs$core$IFn$_invoke$arity$variadic(cljs.core.set(cljs.core.keys(new cljs.core.Keyword(null,"ops","ops",1237330063).cljs$core$IFn$_invoke$arity$1(cljs.core.deref(state_ref)))),new cljs.core.Keyword(null,"welcome","welcome",-578152123),cljs.core.prim_seq.cljs$core$IFn$_invoke$arity$2([new cljs.core.Keyword(null,"unknown-relay-op","unknown-relay-op",170832753),new cljs.core.Keyword(null,"unknown-op","unknown-op",1900385996),new cljs.core.Keyword(null,"request-supported-ops","request-supported-ops",-1034994502),new cljs.core.Keyword(null,"tool-disconnect","tool-disconnect",189103996)], 0))], null));
});
shadow.remote.runtime.shared.unknown_relay_op = (function shadow$remote$runtime$shared$unknown_relay_op(msg){
return console.warn("unknown-relay-op",msg);
});
shadow.remote.runtime.shared.unknown_op = (function shadow$remote$runtime$shared$unknown_op(msg){
return console.warn("unknown-op",msg);
});
shadow.remote.runtime.shared.add_extension_STAR_ = (function shadow$remote$runtime$shared$add_extension_STAR_(p__35911,key,p__35912){
var map__35913 = p__35911;
var map__35913__$1 = cljs.core.__destructure_map(map__35913);
var state = map__35913__$1;
var extensions = cljs.core.get.cljs$core$IFn$_invoke$arity$2(map__35913__$1,new cljs.core.Keyword(null,"extensions","extensions",-1103629196));
var map__35914 = p__35912;
var map__35914__$1 = cljs.core.__destructure_map(map__35914);
var spec = map__35914__$1;
var ops = cljs.core.get.cljs$core$IFn$_invoke$arity$2(map__35914__$1,new cljs.core.Keyword(null,"ops","ops",1237330063));
var transit_write_handlers = cljs.core.get.cljs$core$IFn$_invoke$arity$2(map__35914__$1,new cljs.core.Keyword(null,"transit-write-handlers","transit-write-handlers",1886308716));
if(cljs.core.contains_QMARK_(extensions,key)){
throw cljs.core.ex_info.cljs$core$IFn$_invoke$arity$2("extension already registered",new cljs.core.PersistentArrayMap(null, 2, [new cljs.core.Keyword(null,"key","key",-1516042587),key,new cljs.core.Keyword(null,"spec","spec",347520401),spec], null));
} else {
}

return cljs.core.reduce_kv((function (state__$1,op_kw,op_handler){
if(cljs.core.truth_(cljs.core.get_in.cljs$core$IFn$_invoke$arity$2(state__$1,new cljs.core.PersistentVector(null, 2, 5, cljs.core.PersistentVector.EMPTY_NODE, [new cljs.core.Keyword(null,"ops","ops",1237330063),op_kw], null)))){
throw cljs.core.ex_info.cljs$core$IFn$_invoke$arity$2("op already registered",new cljs.core.PersistentArrayMap(null, 2, [new cljs.core.Keyword(null,"key","key",-1516042587),key,new cljs.core.Keyword(null,"op","op",-1882987955),op_kw], null));
} else {
}

return cljs.core.assoc_in(state__$1,new cljs.core.PersistentVector(null, 2, 5, cljs.core.PersistentVector.EMPTY_NODE, [new cljs.core.Keyword(null,"ops","ops",1237330063),op_kw], null),op_handler);
}),cljs.core.assoc_in(state,new cljs.core.PersistentVector(null, 2, 5, cljs.core.PersistentVector.EMPTY_NODE, [new cljs.core.Keyword(null,"extensions","extensions",-1103629196),key], null),spec),ops);
});
shadow.remote.runtime.shared.add_extension = (function shadow$remote$runtime$shared$add_extension(p__35981,key,spec){
var map__35987 = p__35981;
var map__35987__$1 = cljs.core.__destructure_map(map__35987);
var runtime = map__35987__$1;
var state_ref = cljs.core.get.cljs$core$IFn$_invoke$arity$2(map__35987__$1,new cljs.core.Keyword(null,"state-ref","state-ref",2127874952));
cljs.core.swap_BANG_.cljs$core$IFn$_invoke$arity$4(state_ref,shadow.remote.runtime.shared.add_extension_STAR_,key,spec);

var temp__5808__auto___36204 = new cljs.core.Keyword(null,"on-welcome","on-welcome",1895317125).cljs$core$IFn$_invoke$arity$1(spec);
if((temp__5808__auto___36204 == null)){
} else {
var on_welcome_36205 = temp__5808__auto___36204;
if(cljs.core.truth_(new cljs.core.Keyword(null,"welcome","welcome",-578152123).cljs$core$IFn$_invoke$arity$1(cljs.core.deref(state_ref)))){
(on_welcome_36205.cljs$core$IFn$_invoke$arity$0 ? on_welcome_36205.cljs$core$IFn$_invoke$arity$0() : on_welcome_36205.call(null, ));
} else {
}
}

return runtime;
});
shadow.remote.runtime.shared.add_defaults = (function shadow$remote$runtime$shared$add_defaults(runtime){
return shadow.remote.runtime.shared.add_extension(runtime,new cljs.core.Keyword("shadow.remote.runtime.shared","defaults","shadow.remote.runtime.shared/defaults",-1821257543),new cljs.core.PersistentArrayMap(null, 1, [new cljs.core.Keyword(null,"ops","ops",1237330063),new cljs.core.PersistentArrayMap(null, 5, [new cljs.core.Keyword(null,"welcome","welcome",-578152123),(function (p1__35992_SHARP_){
return shadow.remote.runtime.shared.welcome(runtime,p1__35992_SHARP_);
}),new cljs.core.Keyword(null,"unknown-relay-op","unknown-relay-op",170832753),(function (p1__35993_SHARP_){
return shadow.remote.runtime.shared.unknown_relay_op(p1__35993_SHARP_);
}),new cljs.core.Keyword(null,"unknown-op","unknown-op",1900385996),(function (p1__35994_SHARP_){
return shadow.remote.runtime.shared.unknown_op(p1__35994_SHARP_);
}),new cljs.core.Keyword(null,"ping","ping",-1670114784),(function (p1__35995_SHARP_){
return shadow.remote.runtime.shared.ping(runtime,p1__35995_SHARP_);
}),new cljs.core.Keyword(null,"request-supported-ops","request-supported-ops",-1034994502),(function (p1__35996_SHARP_){
return shadow.remote.runtime.shared.request_supported_ops(runtime,p1__35996_SHARP_);
})], null)], null));
});
shadow.remote.runtime.shared.del_extension_STAR_ = (function shadow$remote$runtime$shared$del_extension_STAR_(state,key){
var ext = cljs.core.get_in.cljs$core$IFn$_invoke$arity$2(state,new cljs.core.PersistentVector(null, 2, 5, cljs.core.PersistentVector.EMPTY_NODE, [new cljs.core.Keyword(null,"extensions","extensions",-1103629196),key], null));
if(cljs.core.not(ext)){
return state;
} else {
return cljs.core.reduce_kv((function (state__$1,op_kw,op_handler){
return cljs.core.update_in.cljs$core$IFn$_invoke$arity$4(state__$1,new cljs.core.PersistentVector(null, 1, 5, cljs.core.PersistentVector.EMPTY_NODE, [new cljs.core.Keyword(null,"ops","ops",1237330063)], null),cljs.core.dissoc,op_kw);
}),cljs.core.update.cljs$core$IFn$_invoke$arity$4(state,new cljs.core.Keyword(null,"extensions","extensions",-1103629196),cljs.core.dissoc,key),new cljs.core.Keyword(null,"ops","ops",1237330063).cljs$core$IFn$_invoke$arity$1(ext));
}
});
shadow.remote.runtime.shared.del_extension = (function shadow$remote$runtime$shared$del_extension(p__36002,key){
var map__36003 = p__36002;
var map__36003__$1 = cljs.core.__destructure_map(map__36003);
var state_ref = cljs.core.get.cljs$core$IFn$_invoke$arity$2(map__36003__$1,new cljs.core.Keyword(null,"state-ref","state-ref",2127874952));
return cljs.core.swap_BANG_.cljs$core$IFn$_invoke$arity$3(state_ref,shadow.remote.runtime.shared.del_extension_STAR_,key);
});
shadow.remote.runtime.shared.unhandled_call_result = (function shadow$remote$runtime$shared$unhandled_call_result(call_config,msg){
return console.warn("unhandled call result",msg,call_config);
});
shadow.remote.runtime.shared.unhandled_client_not_found = (function shadow$remote$runtime$shared$unhandled_client_not_found(p__36009,msg){
var map__36012 = p__36009;
var map__36012__$1 = cljs.core.__destructure_map(map__36012);
var runtime = map__36012__$1;
var state_ref = cljs.core.get.cljs$core$IFn$_invoke$arity$2(map__36012__$1,new cljs.core.Keyword(null,"state-ref","state-ref",2127874952));
return shadow.remote.runtime.shared.trigger_BANG_.cljs$core$IFn$_invoke$arity$variadic(runtime,new cljs.core.Keyword(null,"on-client-not-found","on-client-not-found",-642452849),cljs.core.prim_seq.cljs$core$IFn$_invoke$arity$2([msg], 0));
});
shadow.remote.runtime.shared.reply_unknown_op = (function shadow$remote$runtime$shared$reply_unknown_op(runtime,msg){
return shadow.remote.runtime.shared.reply(runtime,msg,new cljs.core.PersistentArrayMap(null, 2, [new cljs.core.Keyword(null,"op","op",-1882987955),new cljs.core.Keyword(null,"unknown-op","unknown-op",1900385996),new cljs.core.Keyword(null,"msg","msg",-1386103444),msg], null));
});
shadow.remote.runtime.shared.process = (function shadow$remote$runtime$shared$process(p__36032,p__36033){
var map__36034 = p__36032;
var map__36034__$1 = cljs.core.__destructure_map(map__36034);
var runtime = map__36034__$1;
var state_ref = cljs.core.get.cljs$core$IFn$_invoke$arity$2(map__36034__$1,new cljs.core.Keyword(null,"state-ref","state-ref",2127874952));
var map__36035 = p__36033;
var map__36035__$1 = cljs.core.__destructure_map(map__36035);
var msg = map__36035__$1;
var op = cljs.core.get.cljs$core$IFn$_invoke$arity$2(map__36035__$1,new cljs.core.Keyword(null,"op","op",-1882987955));
var call_id = cljs.core.get.cljs$core$IFn$_invoke$arity$2(map__36035__$1,new cljs.core.Keyword(null,"call-id","call-id",1043012968));
var state = cljs.core.deref(state_ref);
var op_handler = cljs.core.get_in.cljs$core$IFn$_invoke$arity$2(state,new cljs.core.PersistentVector(null, 2, 5, cljs.core.PersistentVector.EMPTY_NODE, [new cljs.core.Keyword(null,"ops","ops",1237330063),op], null));
if(cljs.core.truth_(call_id)){
var cfg = cljs.core.get_in.cljs$core$IFn$_invoke$arity$2(state,new cljs.core.PersistentVector(null, 2, 5, cljs.core.PersistentVector.EMPTY_NODE, [new cljs.core.Keyword(null,"call-handlers","call-handlers",386605551),call_id], null));
var call_handler = cljs.core.get_in.cljs$core$IFn$_invoke$arity$2(cfg,new cljs.core.PersistentVector(null, 2, 5, cljs.core.PersistentVector.EMPTY_NODE, [new cljs.core.Keyword(null,"handlers","handlers",79528781),op], null));
if(cljs.core.truth_(call_handler)){
cljs.core.swap_BANG_.cljs$core$IFn$_invoke$arity$variadic(state_ref,cljs.core.update,new cljs.core.Keyword(null,"call-handlers","call-handlers",386605551),cljs.core.dissoc,cljs.core.prim_seq.cljs$core$IFn$_invoke$arity$2([call_id], 0));

return (call_handler.cljs$core$IFn$_invoke$arity$1 ? call_handler.cljs$core$IFn$_invoke$arity$1(msg) : call_handler.call(null, msg));
} else {
if(cljs.core.truth_(op_handler)){
return (op_handler.cljs$core$IFn$_invoke$arity$1 ? op_handler.cljs$core$IFn$_invoke$arity$1(msg) : op_handler.call(null, msg));
} else {
return shadow.remote.runtime.shared.unhandled_call_result(cfg,msg);

}
}
} else {
if(cljs.core.truth_(op_handler)){
return (op_handler.cljs$core$IFn$_invoke$arity$1 ? op_handler.cljs$core$IFn$_invoke$arity$1(msg) : op_handler.call(null, msg));
} else {
if(cljs.core._EQ_.cljs$core$IFn$_invoke$arity$2(new cljs.core.Keyword(null,"client-not-found","client-not-found",-1754042614),op)){
return shadow.remote.runtime.shared.unhandled_client_not_found(runtime,msg);
} else {
return shadow.remote.runtime.shared.reply_unknown_op(runtime,msg);

}
}
}
});
shadow.remote.runtime.shared.run_on_idle = (function shadow$remote$runtime$shared$run_on_idle(state_ref){
var seq__36068 = cljs.core.seq(cljs.core.vals(new cljs.core.Keyword(null,"extensions","extensions",-1103629196).cljs$core$IFn$_invoke$arity$1(cljs.core.deref(state_ref))));
var chunk__36070 = null;
var count__36074 = (0);
var i__36075 = (0);
while(true){
if((i__36075 < count__36074)){
var map__36087 = chunk__36070.cljs$core$IIndexed$_nth$arity$2(null, i__36075);
var map__36087__$1 = cljs.core.__destructure_map(map__36087);
var on_idle = cljs.core.get.cljs$core$IFn$_invoke$arity$2(map__36087__$1,new cljs.core.Keyword(null,"on-idle","on-idle",2044706602));
if(cljs.core.truth_(on_idle)){
(on_idle.cljs$core$IFn$_invoke$arity$0 ? on_idle.cljs$core$IFn$_invoke$arity$0() : on_idle.call(null, ));


var G__36257 = seq__36068;
var G__36258 = chunk__36070;
var G__36259 = count__36074;
var G__36260 = (i__36075 + (1));
seq__36068 = G__36257;
chunk__36070 = G__36258;
count__36074 = G__36259;
i__36075 = G__36260;
continue;
} else {
var G__36261 = seq__36068;
var G__36262 = chunk__36070;
var G__36263 = count__36074;
var G__36264 = (i__36075 + (1));
seq__36068 = G__36261;
chunk__36070 = G__36262;
count__36074 = G__36263;
i__36075 = G__36264;
continue;
}
} else {
var temp__5804__auto__ = cljs.core.seq(seq__36068);
if(temp__5804__auto__){
var seq__36068__$1 = temp__5804__auto__;
if(cljs.core.chunked_seq_QMARK_(seq__36068__$1)){
var c__5525__auto__ = cljs.core.chunk_first(seq__36068__$1);
var G__36265 = cljs.core.chunk_rest(seq__36068__$1);
var G__36266 = c__5525__auto__;
var G__36267 = cljs.core.count(c__5525__auto__);
var G__36268 = (0);
seq__36068 = G__36265;
chunk__36070 = G__36266;
count__36074 = G__36267;
i__36075 = G__36268;
continue;
} else {
var map__36088 = cljs.core.first(seq__36068__$1);
var map__36088__$1 = cljs.core.__destructure_map(map__36088);
var on_idle = cljs.core.get.cljs$core$IFn$_invoke$arity$2(map__36088__$1,new cljs.core.Keyword(null,"on-idle","on-idle",2044706602));
if(cljs.core.truth_(on_idle)){
(on_idle.cljs$core$IFn$_invoke$arity$0 ? on_idle.cljs$core$IFn$_invoke$arity$0() : on_idle.call(null, ));


var G__36269 = cljs.core.next(seq__36068__$1);
var G__36270 = null;
var G__36271 = (0);
var G__36272 = (0);
seq__36068 = G__36269;
chunk__36070 = G__36270;
count__36074 = G__36271;
i__36075 = G__36272;
continue;
} else {
var G__36273 = cljs.core.next(seq__36068__$1);
var G__36274 = null;
var G__36275 = (0);
var G__36276 = (0);
seq__36068 = G__36273;
chunk__36070 = G__36274;
count__36074 = G__36275;
i__36075 = G__36276;
continue;
}
}
} else {
return null;
}
}
break;
}
});

//# sourceMappingURL=shadow.remote.runtime.shared.js.map
