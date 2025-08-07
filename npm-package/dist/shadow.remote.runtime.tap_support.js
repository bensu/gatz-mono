var $CLJS = require("./cljs_env");
var $jscomp = $CLJS.$jscomp;
var COMPILED = false;
require("./cljs.core.js");
require("./shadow.remote.runtime.api.js");
require("./shadow.remote.runtime.shared.js");
require("./shadow.remote.runtime.obj_support.js");
var cognitect=$CLJS.cognitect || ($CLJS.cognitect = {});
var clojure=$CLJS.clojure || ($CLJS.clojure = {});
var crdt=$CLJS.crdt || ($CLJS.crdt = {});
var cljs=$CLJS.cljs || ($CLJS.cljs = {});
var shadow=$CLJS.shadow || ($CLJS.shadow = {});
var goog=$CLJS.goog || ($CLJS.goog = {});
var gatz=$CLJS.gatz || ($CLJS.gatz = {});
var medley=$CLJS.medley || ($CLJS.medley = {});
var com=$CLJS.com || ($CLJS.com = {});

$CLJS.SHADOW_ENV.setLoaded("shadow.remote.runtime.tap_support.js");

goog.provide('shadow.remote.runtime.tap_support');
shadow.remote.runtime.tap_support.tap_subscribe = (function shadow$remote$runtime$tap_support$tap_subscribe(p__41490,p__41491){
var map__41492 = p__41490;
var map__41492__$1 = cljs.core.__destructure_map(map__41492);
var svc = map__41492__$1;
var subs_ref = cljs.core.get.cljs$core$IFn$_invoke$arity$2(map__41492__$1,new cljs.core.Keyword(null,"subs-ref","subs-ref",-1355989911));
var obj_support = cljs.core.get.cljs$core$IFn$_invoke$arity$2(map__41492__$1,new cljs.core.Keyword(null,"obj-support","obj-support",1522559229));
var runtime = cljs.core.get.cljs$core$IFn$_invoke$arity$2(map__41492__$1,new cljs.core.Keyword(null,"runtime","runtime",-1331573996));
var map__41493 = p__41491;
var map__41493__$1 = cljs.core.__destructure_map(map__41493);
var msg = map__41493__$1;
var from = cljs.core.get.cljs$core$IFn$_invoke$arity$2(map__41493__$1,new cljs.core.Keyword(null,"from","from",1815293044));
var summary = cljs.core.get.cljs$core$IFn$_invoke$arity$2(map__41493__$1,new cljs.core.Keyword(null,"summary","summary",380847952));
var history__$1 = cljs.core.get.cljs$core$IFn$_invoke$arity$2(map__41493__$1,new cljs.core.Keyword(null,"history","history",-247395220));
var num = cljs.core.get.cljs$core$IFn$_invoke$arity$3(map__41493__$1,new cljs.core.Keyword(null,"num","num",1985240673),(10));
cljs.core.swap_BANG_.cljs$core$IFn$_invoke$arity$4(subs_ref,cljs.core.assoc,from,msg);

if(cljs.core.truth_(history__$1)){
return shadow.remote.runtime.shared.reply(runtime,msg,new cljs.core.PersistentArrayMap(null, 2, [new cljs.core.Keyword(null,"op","op",-1882987955),new cljs.core.Keyword(null,"tap-subscribed","tap-subscribed",-1882247432),new cljs.core.Keyword(null,"history","history",-247395220),cljs.core.into.cljs$core$IFn$_invoke$arity$2(cljs.core.PersistentVector.EMPTY,cljs.core.map.cljs$core$IFn$_invoke$arity$2((function (oid){
return new cljs.core.PersistentArrayMap(null, 2, [new cljs.core.Keyword(null,"oid","oid",-768692334),oid,new cljs.core.Keyword(null,"summary","summary",380847952),shadow.remote.runtime.obj_support.obj_describe_STAR_(obj_support,oid)], null);
}),shadow.remote.runtime.obj_support.get_tap_history(obj_support,num)))], null));
} else {
return null;
}
});
shadow.remote.runtime.tap_support.tap_unsubscribe = (function shadow$remote$runtime$tap_support$tap_unsubscribe(p__41506,p__41507){
var map__41508 = p__41506;
var map__41508__$1 = cljs.core.__destructure_map(map__41508);
var subs_ref = cljs.core.get.cljs$core$IFn$_invoke$arity$2(map__41508__$1,new cljs.core.Keyword(null,"subs-ref","subs-ref",-1355989911));
var map__41509 = p__41507;
var map__41509__$1 = cljs.core.__destructure_map(map__41509);
var from = cljs.core.get.cljs$core$IFn$_invoke$arity$2(map__41509__$1,new cljs.core.Keyword(null,"from","from",1815293044));
return cljs.core.swap_BANG_.cljs$core$IFn$_invoke$arity$3(subs_ref,cljs.core.dissoc,from);
});
shadow.remote.runtime.tap_support.request_tap_history = (function shadow$remote$runtime$tap_support$request_tap_history(p__41511,p__41512){
var map__41513 = p__41511;
var map__41513__$1 = cljs.core.__destructure_map(map__41513);
var obj_support = cljs.core.get.cljs$core$IFn$_invoke$arity$2(map__41513__$1,new cljs.core.Keyword(null,"obj-support","obj-support",1522559229));
var runtime = cljs.core.get.cljs$core$IFn$_invoke$arity$2(map__41513__$1,new cljs.core.Keyword(null,"runtime","runtime",-1331573996));
var map__41514 = p__41512;
var map__41514__$1 = cljs.core.__destructure_map(map__41514);
var msg = map__41514__$1;
var num = cljs.core.get.cljs$core$IFn$_invoke$arity$3(map__41514__$1,new cljs.core.Keyword(null,"num","num",1985240673),(10));
var tap_ids = shadow.remote.runtime.obj_support.get_tap_history(obj_support,num);
return shadow.remote.runtime.shared.reply(runtime,msg,new cljs.core.PersistentArrayMap(null, 2, [new cljs.core.Keyword(null,"op","op",-1882987955),new cljs.core.Keyword(null,"tap-history","tap-history",-282803347),new cljs.core.Keyword(null,"oids","oids",-1580877688),tap_ids], null));
});
shadow.remote.runtime.tap_support.tool_disconnect = (function shadow$remote$runtime$tap_support$tool_disconnect(p__41515,tid){
var map__41516 = p__41515;
var map__41516__$1 = cljs.core.__destructure_map(map__41516);
var svc = map__41516__$1;
var subs_ref = cljs.core.get.cljs$core$IFn$_invoke$arity$2(map__41516__$1,new cljs.core.Keyword(null,"subs-ref","subs-ref",-1355989911));
return cljs.core.swap_BANG_.cljs$core$IFn$_invoke$arity$3(subs_ref,cljs.core.dissoc,tid);
});
shadow.remote.runtime.tap_support.start = (function shadow$remote$runtime$tap_support$start(runtime,obj_support){
var subs_ref = cljs.core.atom.cljs$core$IFn$_invoke$arity$1(cljs.core.PersistentArrayMap.EMPTY);
var tap_fn = (function shadow$remote$runtime$tap_support$start_$_runtime_tap(obj){
if((!((obj == null)))){
var oid = shadow.remote.runtime.obj_support.register(obj_support,obj,new cljs.core.PersistentArrayMap(null, 1, [new cljs.core.Keyword(null,"from","from",1815293044),new cljs.core.Keyword(null,"tap","tap",-1086702463)], null));
var seq__41522 = cljs.core.seq(cljs.core.deref(subs_ref));
var chunk__41523 = null;
var count__41524 = (0);
var i__41525 = (0);
while(true){
if((i__41525 < count__41524)){
var vec__41532 = chunk__41523.cljs$core$IIndexed$_nth$arity$2(null, i__41525);
var tid = cljs.core.nth.cljs$core$IFn$_invoke$arity$3(vec__41532,(0),null);
var tap_config = cljs.core.nth.cljs$core$IFn$_invoke$arity$3(vec__41532,(1),null);
shadow.remote.runtime.api.relay_msg(runtime,new cljs.core.PersistentArrayMap(null, 3, [new cljs.core.Keyword(null,"op","op",-1882987955),new cljs.core.Keyword(null,"tap","tap",-1086702463),new cljs.core.Keyword(null,"to","to",192099007),tid,new cljs.core.Keyword(null,"oid","oid",-768692334),oid], null));


var G__41548 = seq__41522;
var G__41549 = chunk__41523;
var G__41550 = count__41524;
var G__41551 = (i__41525 + (1));
seq__41522 = G__41548;
chunk__41523 = G__41549;
count__41524 = G__41550;
i__41525 = G__41551;
continue;
} else {
var temp__5804__auto__ = cljs.core.seq(seq__41522);
if(temp__5804__auto__){
var seq__41522__$1 = temp__5804__auto__;
if(cljs.core.chunked_seq_QMARK_(seq__41522__$1)){
var c__5525__auto__ = cljs.core.chunk_first(seq__41522__$1);
var G__41584 = cljs.core.chunk_rest(seq__41522__$1);
var G__41585 = c__5525__auto__;
var G__41586 = cljs.core.count(c__5525__auto__);
var G__41587 = (0);
seq__41522 = G__41584;
chunk__41523 = G__41585;
count__41524 = G__41586;
i__41525 = G__41587;
continue;
} else {
var vec__41536 = cljs.core.first(seq__41522__$1);
var tid = cljs.core.nth.cljs$core$IFn$_invoke$arity$3(vec__41536,(0),null);
var tap_config = cljs.core.nth.cljs$core$IFn$_invoke$arity$3(vec__41536,(1),null);
shadow.remote.runtime.api.relay_msg(runtime,new cljs.core.PersistentArrayMap(null, 3, [new cljs.core.Keyword(null,"op","op",-1882987955),new cljs.core.Keyword(null,"tap","tap",-1086702463),new cljs.core.Keyword(null,"to","to",192099007),tid,new cljs.core.Keyword(null,"oid","oid",-768692334),oid], null));


var G__41602 = cljs.core.next(seq__41522__$1);
var G__41603 = null;
var G__41604 = (0);
var G__41605 = (0);
seq__41522 = G__41602;
chunk__41523 = G__41603;
count__41524 = G__41604;
i__41525 = G__41605;
continue;
}
} else {
return null;
}
}
break;
}
} else {
return null;
}
});
var svc = new cljs.core.PersistentArrayMap(null, 4, [new cljs.core.Keyword(null,"runtime","runtime",-1331573996),runtime,new cljs.core.Keyword(null,"obj-support","obj-support",1522559229),obj_support,new cljs.core.Keyword(null,"tap-fn","tap-fn",1573556461),tap_fn,new cljs.core.Keyword(null,"subs-ref","subs-ref",-1355989911),subs_ref], null);
shadow.remote.runtime.api.add_extension(runtime,new cljs.core.Keyword("shadow.remote.runtime.tap-support","ext","shadow.remote.runtime.tap-support/ext",1019069674),new cljs.core.PersistentArrayMap(null, 2, [new cljs.core.Keyword(null,"ops","ops",1237330063),new cljs.core.PersistentArrayMap(null, 3, [new cljs.core.Keyword(null,"tap-subscribe","tap-subscribe",411179050),(function (p1__41517_SHARP_){
return shadow.remote.runtime.tap_support.tap_subscribe(svc,p1__41517_SHARP_);
}),new cljs.core.Keyword(null,"tap-unsubscribe","tap-unsubscribe",1183890755),(function (p1__41518_SHARP_){
return shadow.remote.runtime.tap_support.tap_unsubscribe(svc,p1__41518_SHARP_);
}),new cljs.core.Keyword(null,"request-tap-history","request-tap-history",-670837812),(function (p1__41519_SHARP_){
return shadow.remote.runtime.tap_support.request_tap_history(svc,p1__41519_SHARP_);
})], null),new cljs.core.Keyword(null,"on-tool-disconnect","on-tool-disconnect",693464366),(function (p1__41520_SHARP_){
return shadow.remote.runtime.tap_support.tool_disconnect(svc,p1__41520_SHARP_);
})], null));

cljs.core.add_tap(tap_fn);

return svc;
});
shadow.remote.runtime.tap_support.stop = (function shadow$remote$runtime$tap_support$stop(p__41541){
var map__41542 = p__41541;
var map__41542__$1 = cljs.core.__destructure_map(map__41542);
var svc = map__41542__$1;
var tap_fn = cljs.core.get.cljs$core$IFn$_invoke$arity$2(map__41542__$1,new cljs.core.Keyword(null,"tap-fn","tap-fn",1573556461));
var runtime = cljs.core.get.cljs$core$IFn$_invoke$arity$2(map__41542__$1,new cljs.core.Keyword(null,"runtime","runtime",-1331573996));
cljs.core.remove_tap(tap_fn);

return shadow.remote.runtime.api.del_extension(runtime,new cljs.core.Keyword("shadow.remote.runtime.tap-support","ext","shadow.remote.runtime.tap-support/ext",1019069674));
});

//# sourceMappingURL=shadow.remote.runtime.tap_support.js.map
