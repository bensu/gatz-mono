var $CLJS = require("./cljs_env");
var $jscomp = $CLJS.$jscomp;
var COMPILED = false;
require("./cljs.core.js");
require("./clojure.string.js");
require("./shadow.json.js");
require("./shadow.cljs.devtools.client.env.js");
require("./shadow.cljs.devtools.client.console.js");
require("./shadow.cljs.devtools.client.hud.js");
require("./shadow.cljs.devtools.client.websocket.js");
require("./shadow.cljs.devtools.client.shared.js");
require("./shadow.remote.runtime.api.js");
require("./shadow.remote.runtime.shared.js");
var cognitect=$CLJS.cognitect || ($CLJS.cognitect = {});
var clojure=$CLJS.clojure || ($CLJS.clojure = {});
var crdt=$CLJS.crdt || ($CLJS.crdt = {});
var cljs=$CLJS.cljs || ($CLJS.cljs = {});
var shadow=$CLJS.shadow || ($CLJS.shadow = {});
var goog=$CLJS.goog || ($CLJS.goog = {});
var gatz=$CLJS.gatz || ($CLJS.gatz = {});
var medley=$CLJS.medley || ($CLJS.medley = {});
var com=$CLJS.com || ($CLJS.com = {});

$CLJS.SHADOW_ENV.setLoaded("shadow.cljs.devtools.client.browser.js");

goog.provide('shadow.cljs.devtools.client.browser');
shadow.cljs.devtools.client.browser.devtools_msg = (function shadow$cljs$devtools$client$browser$devtools_msg(var_args){
var args__5732__auto__ = [];
var len__5726__auto___42572 = arguments.length;
var i__5727__auto___42573 = (0);
while(true){
if((i__5727__auto___42573 < len__5726__auto___42572)){
args__5732__auto__.push((arguments[i__5727__auto___42573]));

var G__42574 = (i__5727__auto___42573 + (1));
i__5727__auto___42573 = G__42574;
continue;
} else {
}
break;
}

var argseq__5733__auto__ = ((((1) < args__5732__auto__.length))?(new cljs.core.IndexedSeq(args__5732__auto__.slice((1)),(0),null)):null);
return shadow.cljs.devtools.client.browser.devtools_msg.cljs$core$IFn$_invoke$arity$variadic((arguments[(0)]),argseq__5733__auto__);
});

(shadow.cljs.devtools.client.browser.devtools_msg.cljs$core$IFn$_invoke$arity$variadic = (function (msg,args){
if(shadow.cljs.devtools.client.env.log){
if(cljs.core.seq(shadow.cljs.devtools.client.env.log_style)){
return console.log.apply(console,cljs.core.into_array.cljs$core$IFn$_invoke$arity$1(cljs.core.into.cljs$core$IFn$_invoke$arity$2(new cljs.core.PersistentVector(null, 2, 5, cljs.core.PersistentVector.EMPTY_NODE, [["%cshadow-cljs: ",cljs.core.str.cljs$core$IFn$_invoke$arity$1(msg)].join(''),shadow.cljs.devtools.client.env.log_style], null),args)));
} else {
return console.log.apply(console,cljs.core.into_array.cljs$core$IFn$_invoke$arity$1(cljs.core.into.cljs$core$IFn$_invoke$arity$2(new cljs.core.PersistentVector(null, 1, 5, cljs.core.PersistentVector.EMPTY_NODE, [["shadow-cljs: ",cljs.core.str.cljs$core$IFn$_invoke$arity$1(msg)].join('')], null),args)));
}
} else {
return null;
}
}));

(shadow.cljs.devtools.client.browser.devtools_msg.cljs$lang$maxFixedArity = (1));

/** @this {Function} */
(shadow.cljs.devtools.client.browser.devtools_msg.cljs$lang$applyTo = (function (seq42087){
var G__42088 = cljs.core.first(seq42087);
var seq42087__$1 = cljs.core.next(seq42087);
var self__5711__auto__ = this;
return self__5711__auto__.cljs$core$IFn$_invoke$arity$variadic(G__42088,seq42087__$1);
}));

shadow.cljs.devtools.client.browser.script_eval = (function shadow$cljs$devtools$client$browser$script_eval(code){
return goog.globalEval(code);
});
shadow.cljs.devtools.client.browser.do_js_load = (function shadow$cljs$devtools$client$browser$do_js_load(sources){
var seq__42092 = cljs.core.seq(sources);
var chunk__42093 = null;
var count__42094 = (0);
var i__42095 = (0);
while(true){
if((i__42095 < count__42094)){
var map__42102 = chunk__42093.cljs$core$IIndexed$_nth$arity$2(null, i__42095);
var map__42102__$1 = cljs.core.__destructure_map(map__42102);
var src = map__42102__$1;
var resource_id = cljs.core.get.cljs$core$IFn$_invoke$arity$2(map__42102__$1,new cljs.core.Keyword(null,"resource-id","resource-id",-1308422582));
var output_name = cljs.core.get.cljs$core$IFn$_invoke$arity$2(map__42102__$1,new cljs.core.Keyword(null,"output-name","output-name",-1769107767));
var resource_name = cljs.core.get.cljs$core$IFn$_invoke$arity$2(map__42102__$1,new cljs.core.Keyword(null,"resource-name","resource-name",2001617100));
var js = cljs.core.get.cljs$core$IFn$_invoke$arity$2(map__42102__$1,new cljs.core.Keyword(null,"js","js",1768080579));
$CLJS.SHADOW_ENV.setLoaded(output_name);

shadow.cljs.devtools.client.browser.devtools_msg.cljs$core$IFn$_invoke$arity$variadic("load JS",cljs.core.prim_seq.cljs$core$IFn$_invoke$arity$2([resource_name], 0));

shadow.cljs.devtools.client.env.before_load_src(src);

try{shadow.cljs.devtools.client.browser.script_eval([cljs.core.str.cljs$core$IFn$_invoke$arity$1(js),"\n//# sourceURL=",cljs.core.str.cljs$core$IFn$_invoke$arity$1($CLJS.SHADOW_ENV.scriptBase),cljs.core.str.cljs$core$IFn$_invoke$arity$1(output_name)].join(''));
}catch (e42103){var e_42575 = e42103;
if(shadow.cljs.devtools.client.env.log){
console.error(["Failed to load ",cljs.core.str.cljs$core$IFn$_invoke$arity$1(resource_name)].join(''),e_42575);
} else {
}

throw (new Error(["Failed to load ",cljs.core.str.cljs$core$IFn$_invoke$arity$1(resource_name),": ",cljs.core.str.cljs$core$IFn$_invoke$arity$1(e_42575.message)].join('')));
}

var G__42576 = seq__42092;
var G__42577 = chunk__42093;
var G__42578 = count__42094;
var G__42579 = (i__42095 + (1));
seq__42092 = G__42576;
chunk__42093 = G__42577;
count__42094 = G__42578;
i__42095 = G__42579;
continue;
} else {
var temp__5804__auto__ = cljs.core.seq(seq__42092);
if(temp__5804__auto__){
var seq__42092__$1 = temp__5804__auto__;
if(cljs.core.chunked_seq_QMARK_(seq__42092__$1)){
var c__5525__auto__ = cljs.core.chunk_first(seq__42092__$1);
var G__42580 = cljs.core.chunk_rest(seq__42092__$1);
var G__42581 = c__5525__auto__;
var G__42582 = cljs.core.count(c__5525__auto__);
var G__42583 = (0);
seq__42092 = G__42580;
chunk__42093 = G__42581;
count__42094 = G__42582;
i__42095 = G__42583;
continue;
} else {
var map__42105 = cljs.core.first(seq__42092__$1);
var map__42105__$1 = cljs.core.__destructure_map(map__42105);
var src = map__42105__$1;
var resource_id = cljs.core.get.cljs$core$IFn$_invoke$arity$2(map__42105__$1,new cljs.core.Keyword(null,"resource-id","resource-id",-1308422582));
var output_name = cljs.core.get.cljs$core$IFn$_invoke$arity$2(map__42105__$1,new cljs.core.Keyword(null,"output-name","output-name",-1769107767));
var resource_name = cljs.core.get.cljs$core$IFn$_invoke$arity$2(map__42105__$1,new cljs.core.Keyword(null,"resource-name","resource-name",2001617100));
var js = cljs.core.get.cljs$core$IFn$_invoke$arity$2(map__42105__$1,new cljs.core.Keyword(null,"js","js",1768080579));
$CLJS.SHADOW_ENV.setLoaded(output_name);

shadow.cljs.devtools.client.browser.devtools_msg.cljs$core$IFn$_invoke$arity$variadic("load JS",cljs.core.prim_seq.cljs$core$IFn$_invoke$arity$2([resource_name], 0));

shadow.cljs.devtools.client.env.before_load_src(src);

try{shadow.cljs.devtools.client.browser.script_eval([cljs.core.str.cljs$core$IFn$_invoke$arity$1(js),"\n//# sourceURL=",cljs.core.str.cljs$core$IFn$_invoke$arity$1($CLJS.SHADOW_ENV.scriptBase),cljs.core.str.cljs$core$IFn$_invoke$arity$1(output_name)].join(''));
}catch (e42108){var e_42584 = e42108;
if(shadow.cljs.devtools.client.env.log){
console.error(["Failed to load ",cljs.core.str.cljs$core$IFn$_invoke$arity$1(resource_name)].join(''),e_42584);
} else {
}

throw (new Error(["Failed to load ",cljs.core.str.cljs$core$IFn$_invoke$arity$1(resource_name),": ",cljs.core.str.cljs$core$IFn$_invoke$arity$1(e_42584.message)].join('')));
}

var G__42585 = cljs.core.next(seq__42092__$1);
var G__42586 = null;
var G__42587 = (0);
var G__42588 = (0);
seq__42092 = G__42585;
chunk__42093 = G__42586;
count__42094 = G__42587;
i__42095 = G__42588;
continue;
}
} else {
return null;
}
}
break;
}
});
shadow.cljs.devtools.client.browser.do_js_reload = (function shadow$cljs$devtools$client$browser$do_js_reload(msg,sources,complete_fn,failure_fn){
return shadow.cljs.devtools.client.env.do_js_reload.cljs$core$IFn$_invoke$arity$4(cljs.core.assoc.cljs$core$IFn$_invoke$arity$variadic(msg,new cljs.core.Keyword(null,"log-missing-fn","log-missing-fn",732676765),(function (fn_sym){
return null;
}),cljs.core.prim_seq.cljs$core$IFn$_invoke$arity$2([new cljs.core.Keyword(null,"log-call-async","log-call-async",183826192),(function (fn_sym){
return shadow.cljs.devtools.client.browser.devtools_msg(["call async ",cljs.core.str.cljs$core$IFn$_invoke$arity$1(fn_sym)].join(''));
}),new cljs.core.Keyword(null,"log-call","log-call",412404391),(function (fn_sym){
return shadow.cljs.devtools.client.browser.devtools_msg(["call ",cljs.core.str.cljs$core$IFn$_invoke$arity$1(fn_sym)].join(''));
})], 0)),(function (){
return shadow.cljs.devtools.client.browser.do_js_load(sources);
}),complete_fn,failure_fn);
});
/**
 * when (require '["some-str" :as x]) is done at the REPL we need to manually call the shadow.js.require for it
 * since the file only adds the shadow$provide. only need to do this for shadow-js.
 */
shadow.cljs.devtools.client.browser.do_js_requires = (function shadow$cljs$devtools$client$browser$do_js_requires(js_requires){
var seq__42112 = cljs.core.seq(js_requires);
var chunk__42113 = null;
var count__42114 = (0);
var i__42115 = (0);
while(true){
if((i__42115 < count__42114)){
var js_ns = chunk__42113.cljs$core$IIndexed$_nth$arity$2(null, i__42115);
var require_str_42589 = ["var ",cljs.core.str.cljs$core$IFn$_invoke$arity$1(js_ns)," = shadow.js.require(\"",cljs.core.str.cljs$core$IFn$_invoke$arity$1(js_ns),"\");"].join('');
shadow.cljs.devtools.client.browser.script_eval(require_str_42589);


var G__42590 = seq__42112;
var G__42591 = chunk__42113;
var G__42592 = count__42114;
var G__42593 = (i__42115 + (1));
seq__42112 = G__42590;
chunk__42113 = G__42591;
count__42114 = G__42592;
i__42115 = G__42593;
continue;
} else {
var temp__5804__auto__ = cljs.core.seq(seq__42112);
if(temp__5804__auto__){
var seq__42112__$1 = temp__5804__auto__;
if(cljs.core.chunked_seq_QMARK_(seq__42112__$1)){
var c__5525__auto__ = cljs.core.chunk_first(seq__42112__$1);
var G__42594 = cljs.core.chunk_rest(seq__42112__$1);
var G__42595 = c__5525__auto__;
var G__42596 = cljs.core.count(c__5525__auto__);
var G__42597 = (0);
seq__42112 = G__42594;
chunk__42113 = G__42595;
count__42114 = G__42596;
i__42115 = G__42597;
continue;
} else {
var js_ns = cljs.core.first(seq__42112__$1);
var require_str_42598 = ["var ",cljs.core.str.cljs$core$IFn$_invoke$arity$1(js_ns)," = shadow.js.require(\"",cljs.core.str.cljs$core$IFn$_invoke$arity$1(js_ns),"\");"].join('');
shadow.cljs.devtools.client.browser.script_eval(require_str_42598);


var G__42599 = cljs.core.next(seq__42112__$1);
var G__42600 = null;
var G__42601 = (0);
var G__42602 = (0);
seq__42112 = G__42599;
chunk__42113 = G__42600;
count__42114 = G__42601;
i__42115 = G__42602;
continue;
}
} else {
return null;
}
}
break;
}
});
shadow.cljs.devtools.client.browser.handle_build_complete = (function shadow$cljs$devtools$client$browser$handle_build_complete(runtime,p__42120){
var map__42121 = p__42120;
var map__42121__$1 = cljs.core.__destructure_map(map__42121);
var msg = map__42121__$1;
var info = cljs.core.get.cljs$core$IFn$_invoke$arity$2(map__42121__$1,new cljs.core.Keyword(null,"info","info",-317069002));
var reload_info = cljs.core.get.cljs$core$IFn$_invoke$arity$2(map__42121__$1,new cljs.core.Keyword(null,"reload-info","reload-info",1648088086));
var warnings = cljs.core.into.cljs$core$IFn$_invoke$arity$2(cljs.core.PersistentVector.EMPTY,cljs.core.distinct.cljs$core$IFn$_invoke$arity$1((function (){var iter__5480__auto__ = (function shadow$cljs$devtools$client$browser$handle_build_complete_$_iter__42122(s__42123){
return (new cljs.core.LazySeq(null,(function (){
var s__42123__$1 = s__42123;
while(true){
var temp__5804__auto__ = cljs.core.seq(s__42123__$1);
if(temp__5804__auto__){
var xs__6360__auto__ = temp__5804__auto__;
var map__42128 = cljs.core.first(xs__6360__auto__);
var map__42128__$1 = cljs.core.__destructure_map(map__42128);
var src = map__42128__$1;
var resource_name = cljs.core.get.cljs$core$IFn$_invoke$arity$2(map__42128__$1,new cljs.core.Keyword(null,"resource-name","resource-name",2001617100));
var warnings = cljs.core.get.cljs$core$IFn$_invoke$arity$2(map__42128__$1,new cljs.core.Keyword(null,"warnings","warnings",-735437651));
if(cljs.core.not(new cljs.core.Keyword(null,"from-jar","from-jar",1050932827).cljs$core$IFn$_invoke$arity$1(src))){
var iterys__5476__auto__ = ((function (s__42123__$1,map__42128,map__42128__$1,src,resource_name,warnings,xs__6360__auto__,temp__5804__auto__,map__42121,map__42121__$1,msg,info,reload_info){
return (function shadow$cljs$devtools$client$browser$handle_build_complete_$_iter__42122_$_iter__42124(s__42125){
return (new cljs.core.LazySeq(null,((function (s__42123__$1,map__42128,map__42128__$1,src,resource_name,warnings,xs__6360__auto__,temp__5804__auto__,map__42121,map__42121__$1,msg,info,reload_info){
return (function (){
var s__42125__$1 = s__42125;
while(true){
var temp__5804__auto____$1 = cljs.core.seq(s__42125__$1);
if(temp__5804__auto____$1){
var s__42125__$2 = temp__5804__auto____$1;
if(cljs.core.chunked_seq_QMARK_(s__42125__$2)){
var c__5478__auto__ = cljs.core.chunk_first(s__42125__$2);
var size__5479__auto__ = cljs.core.count(c__5478__auto__);
var b__42127 = cljs.core.chunk_buffer(size__5479__auto__);
if((function (){var i__42126 = (0);
while(true){
if((i__42126 < size__5479__auto__)){
var warning = cljs.core._nth(c__5478__auto__,i__42126);
cljs.core.chunk_append(b__42127,cljs.core.assoc.cljs$core$IFn$_invoke$arity$3(warning,new cljs.core.Keyword(null,"resource-name","resource-name",2001617100),resource_name));

var G__42603 = (i__42126 + (1));
i__42126 = G__42603;
continue;
} else {
return true;
}
break;
}
})()){
return cljs.core.chunk_cons(cljs.core.chunk(b__42127),shadow$cljs$devtools$client$browser$handle_build_complete_$_iter__42122_$_iter__42124(cljs.core.chunk_rest(s__42125__$2)));
} else {
return cljs.core.chunk_cons(cljs.core.chunk(b__42127),null);
}
} else {
var warning = cljs.core.first(s__42125__$2);
return cljs.core.cons(cljs.core.assoc.cljs$core$IFn$_invoke$arity$3(warning,new cljs.core.Keyword(null,"resource-name","resource-name",2001617100),resource_name),shadow$cljs$devtools$client$browser$handle_build_complete_$_iter__42122_$_iter__42124(cljs.core.rest(s__42125__$2)));
}
} else {
return null;
}
break;
}
});})(s__42123__$1,map__42128,map__42128__$1,src,resource_name,warnings,xs__6360__auto__,temp__5804__auto__,map__42121,map__42121__$1,msg,info,reload_info))
,null,null));
});})(s__42123__$1,map__42128,map__42128__$1,src,resource_name,warnings,xs__6360__auto__,temp__5804__auto__,map__42121,map__42121__$1,msg,info,reload_info))
;
var fs__5477__auto__ = cljs.core.seq(iterys__5476__auto__(warnings));
if(fs__5477__auto__){
return cljs.core.concat.cljs$core$IFn$_invoke$arity$2(fs__5477__auto__,shadow$cljs$devtools$client$browser$handle_build_complete_$_iter__42122(cljs.core.rest(s__42123__$1)));
} else {
var G__42604 = cljs.core.rest(s__42123__$1);
s__42123__$1 = G__42604;
continue;
}
} else {
var G__42605 = cljs.core.rest(s__42123__$1);
s__42123__$1 = G__42605;
continue;
}
} else {
return null;
}
break;
}
}),null,null));
});
return iter__5480__auto__(new cljs.core.Keyword(null,"sources","sources",-321166424).cljs$core$IFn$_invoke$arity$1(info));
})()));
if(shadow.cljs.devtools.client.env.log){
var seq__42129_42606 = cljs.core.seq(warnings);
var chunk__42130_42607 = null;
var count__42131_42608 = (0);
var i__42132_42609 = (0);
while(true){
if((i__42132_42609 < count__42131_42608)){
var map__42137_42610 = chunk__42130_42607.cljs$core$IIndexed$_nth$arity$2(null, i__42132_42609);
var map__42137_42611__$1 = cljs.core.__destructure_map(map__42137_42610);
var w_42612 = map__42137_42611__$1;
var msg_42613__$1 = cljs.core.get.cljs$core$IFn$_invoke$arity$2(map__42137_42611__$1,new cljs.core.Keyword(null,"msg","msg",-1386103444));
var line_42614 = cljs.core.get.cljs$core$IFn$_invoke$arity$2(map__42137_42611__$1,new cljs.core.Keyword(null,"line","line",212345235));
var column_42615 = cljs.core.get.cljs$core$IFn$_invoke$arity$2(map__42137_42611__$1,new cljs.core.Keyword(null,"column","column",2078222095));
var resource_name_42616 = cljs.core.get.cljs$core$IFn$_invoke$arity$2(map__42137_42611__$1,new cljs.core.Keyword(null,"resource-name","resource-name",2001617100));
console.warn(["BUILD-WARNING in ",cljs.core.str.cljs$core$IFn$_invoke$arity$1(resource_name_42616)," at [",cljs.core.str.cljs$core$IFn$_invoke$arity$1(line_42614),":",cljs.core.str.cljs$core$IFn$_invoke$arity$1(column_42615),"]\n\t",cljs.core.str.cljs$core$IFn$_invoke$arity$1(msg_42613__$1)].join(''));


var G__42617 = seq__42129_42606;
var G__42618 = chunk__42130_42607;
var G__42619 = count__42131_42608;
var G__42620 = (i__42132_42609 + (1));
seq__42129_42606 = G__42617;
chunk__42130_42607 = G__42618;
count__42131_42608 = G__42619;
i__42132_42609 = G__42620;
continue;
} else {
var temp__5804__auto___42621 = cljs.core.seq(seq__42129_42606);
if(temp__5804__auto___42621){
var seq__42129_42622__$1 = temp__5804__auto___42621;
if(cljs.core.chunked_seq_QMARK_(seq__42129_42622__$1)){
var c__5525__auto___42623 = cljs.core.chunk_first(seq__42129_42622__$1);
var G__42624 = cljs.core.chunk_rest(seq__42129_42622__$1);
var G__42625 = c__5525__auto___42623;
var G__42626 = cljs.core.count(c__5525__auto___42623);
var G__42627 = (0);
seq__42129_42606 = G__42624;
chunk__42130_42607 = G__42625;
count__42131_42608 = G__42626;
i__42132_42609 = G__42627;
continue;
} else {
var map__42139_42628 = cljs.core.first(seq__42129_42622__$1);
var map__42139_42629__$1 = cljs.core.__destructure_map(map__42139_42628);
var w_42630 = map__42139_42629__$1;
var msg_42631__$1 = cljs.core.get.cljs$core$IFn$_invoke$arity$2(map__42139_42629__$1,new cljs.core.Keyword(null,"msg","msg",-1386103444));
var line_42632 = cljs.core.get.cljs$core$IFn$_invoke$arity$2(map__42139_42629__$1,new cljs.core.Keyword(null,"line","line",212345235));
var column_42633 = cljs.core.get.cljs$core$IFn$_invoke$arity$2(map__42139_42629__$1,new cljs.core.Keyword(null,"column","column",2078222095));
var resource_name_42634 = cljs.core.get.cljs$core$IFn$_invoke$arity$2(map__42139_42629__$1,new cljs.core.Keyword(null,"resource-name","resource-name",2001617100));
console.warn(["BUILD-WARNING in ",cljs.core.str.cljs$core$IFn$_invoke$arity$1(resource_name_42634)," at [",cljs.core.str.cljs$core$IFn$_invoke$arity$1(line_42632),":",cljs.core.str.cljs$core$IFn$_invoke$arity$1(column_42633),"]\n\t",cljs.core.str.cljs$core$IFn$_invoke$arity$1(msg_42631__$1)].join(''));


var G__42635 = cljs.core.next(seq__42129_42622__$1);
var G__42636 = null;
var G__42637 = (0);
var G__42638 = (0);
seq__42129_42606 = G__42635;
chunk__42130_42607 = G__42636;
count__42131_42608 = G__42637;
i__42132_42609 = G__42638;
continue;
}
} else {
}
}
break;
}
} else {
}

if((!(shadow.cljs.devtools.client.env.autoload))){
return shadow.cljs.devtools.client.hud.load_end_success();
} else {
if(((cljs.core.empty_QMARK_(warnings)) || (shadow.cljs.devtools.client.env.ignore_warnings))){
var sources_to_get = shadow.cljs.devtools.client.env.filter_reload_sources(info,reload_info);
if(cljs.core.not(cljs.core.seq(sources_to_get))){
return shadow.cljs.devtools.client.hud.load_end_success();
} else {
if(cljs.core.seq(cljs.core.get_in.cljs$core$IFn$_invoke$arity$2(msg,new cljs.core.PersistentVector(null, 2, 5, cljs.core.PersistentVector.EMPTY_NODE, [new cljs.core.Keyword(null,"reload-info","reload-info",1648088086),new cljs.core.Keyword(null,"after-load","after-load",-1278503285)], null)))){
} else {
shadow.cljs.devtools.client.browser.devtools_msg.cljs$core$IFn$_invoke$arity$variadic("reloading code but no :after-load hooks are configured!",cljs.core.prim_seq.cljs$core$IFn$_invoke$arity$2(["https://shadow-cljs.github.io/docs/UsersGuide.html#_lifecycle_hooks"], 0));
}

return shadow.cljs.devtools.client.shared.load_sources(runtime,sources_to_get,(function (p1__42119_SHARP_){
return shadow.cljs.devtools.client.browser.do_js_reload(msg,p1__42119_SHARP_,shadow.cljs.devtools.client.hud.load_end_success,shadow.cljs.devtools.client.hud.load_failure);
}));
}
} else {
return null;
}
}
});
shadow.cljs.devtools.client.browser.page_load_uri = (cljs.core.truth_(goog.global.document)?goog.Uri.parse(document.location.href):null);
shadow.cljs.devtools.client.browser.match_paths = (function shadow$cljs$devtools$client$browser$match_paths(old,new$){
if(cljs.core._EQ_.cljs$core$IFn$_invoke$arity$2("file",shadow.cljs.devtools.client.browser.page_load_uri.getScheme())){
var rel_new = cljs.core.subs.cljs$core$IFn$_invoke$arity$2(new$,(1));
if(((cljs.core._EQ_.cljs$core$IFn$_invoke$arity$2(old,rel_new)) || (clojure.string.starts_with_QMARK_(old,[rel_new,"?"].join(''))))){
return rel_new;
} else {
return null;
}
} else {
var node_uri = goog.Uri.parse(old);
var node_uri_resolved = shadow.cljs.devtools.client.browser.page_load_uri.resolve(node_uri);
var node_abs = node_uri_resolved.getPath();
var and__5000__auto__ = ((cljs.core._EQ_.cljs$core$IFn$_invoke$arity$1(shadow.cljs.devtools.client.browser.page_load_uri.hasSameDomainAs(node_uri))) || (cljs.core.not(node_uri.hasDomain())));
if(and__5000__auto__){
var and__5000__auto____$1 = cljs.core._EQ_.cljs$core$IFn$_invoke$arity$2(node_abs,new$);
if(and__5000__auto____$1){
return cljs.core.str.cljs$core$IFn$_invoke$arity$1((function (){var G__42143 = node_uri;
G__42143.setQuery(null);

G__42143.setPath(new$);

return G__42143;
})());
} else {
return and__5000__auto____$1;
}
} else {
return and__5000__auto__;
}
}
});
shadow.cljs.devtools.client.browser.handle_asset_update = (function shadow$cljs$devtools$client$browser$handle_asset_update(p__42146){
var map__42147 = p__42146;
var map__42147__$1 = cljs.core.__destructure_map(map__42147);
var msg = map__42147__$1;
var updates = cljs.core.get.cljs$core$IFn$_invoke$arity$2(map__42147__$1,new cljs.core.Keyword(null,"updates","updates",2013983452));
var reload_info = cljs.core.get.cljs$core$IFn$_invoke$arity$2(map__42147__$1,new cljs.core.Keyword(null,"reload-info","reload-info",1648088086));
var seq__42148 = cljs.core.seq(updates);
var chunk__42150 = null;
var count__42151 = (0);
var i__42152 = (0);
while(true){
if((i__42152 < count__42151)){
var path = chunk__42150.cljs$core$IIndexed$_nth$arity$2(null, i__42152);
if(clojure.string.ends_with_QMARK_(path,"css")){
var seq__42350_42639 = cljs.core.seq(cljs.core.array_seq.cljs$core$IFn$_invoke$arity$1(document.querySelectorAll("link[rel=\"stylesheet\"]")));
var chunk__42354_42640 = null;
var count__42355_42641 = (0);
var i__42356_42642 = (0);
while(true){
if((i__42356_42642 < count__42355_42641)){
var node_42643 = chunk__42354_42640.cljs$core$IIndexed$_nth$arity$2(null, i__42356_42642);
if(cljs.core.not(node_42643.shadow$old)){
var path_match_42644 = shadow.cljs.devtools.client.browser.match_paths(node_42643.getAttribute("href"),path);
if(cljs.core.truth_(path_match_42644)){
var new_link_42645 = (function (){var G__42411 = node_42643.cloneNode(true);
G__42411.setAttribute("href",[cljs.core.str.cljs$core$IFn$_invoke$arity$1(path_match_42644),"?r=",cljs.core.str.cljs$core$IFn$_invoke$arity$1(cljs.core.rand.cljs$core$IFn$_invoke$arity$0())].join(''));

return G__42411;
})();
(node_42643.shadow$old = true);

(new_link_42645.onload = ((function (seq__42350_42639,chunk__42354_42640,count__42355_42641,i__42356_42642,seq__42148,chunk__42150,count__42151,i__42152,new_link_42645,path_match_42644,node_42643,path,map__42147,map__42147__$1,msg,updates,reload_info){
return (function (e){
var seq__42415_42646 = cljs.core.seq(cljs.core.get_in.cljs$core$IFn$_invoke$arity$2(msg,new cljs.core.PersistentVector(null, 2, 5, cljs.core.PersistentVector.EMPTY_NODE, [new cljs.core.Keyword(null,"reload-info","reload-info",1648088086),new cljs.core.Keyword(null,"asset-load","asset-load",-1925902322)], null)));
var chunk__42417_42647 = null;
var count__42418_42648 = (0);
var i__42419_42649 = (0);
while(true){
if((i__42419_42649 < count__42418_42648)){
var map__42423_42650 = chunk__42417_42647.cljs$core$IIndexed$_nth$arity$2(null, i__42419_42649);
var map__42423_42651__$1 = cljs.core.__destructure_map(map__42423_42650);
var task_42652 = map__42423_42651__$1;
var fn_str_42653 = cljs.core.get.cljs$core$IFn$_invoke$arity$2(map__42423_42651__$1,new cljs.core.Keyword(null,"fn-str","fn-str",-1348506402));
var fn_sym_42654 = cljs.core.get.cljs$core$IFn$_invoke$arity$2(map__42423_42651__$1,new cljs.core.Keyword(null,"fn-sym","fn-sym",1423988510));
var fn_obj_42655 = goog.getObjectByName(fn_str_42653,$CLJS);
shadow.cljs.devtools.client.browser.devtools_msg(["call ",cljs.core.str.cljs$core$IFn$_invoke$arity$1(fn_sym_42654)].join(''));

(fn_obj_42655.cljs$core$IFn$_invoke$arity$2 ? fn_obj_42655.cljs$core$IFn$_invoke$arity$2(path,new_link_42645) : fn_obj_42655.call(null, path,new_link_42645));


var G__42656 = seq__42415_42646;
var G__42657 = chunk__42417_42647;
var G__42658 = count__42418_42648;
var G__42659 = (i__42419_42649 + (1));
seq__42415_42646 = G__42656;
chunk__42417_42647 = G__42657;
count__42418_42648 = G__42658;
i__42419_42649 = G__42659;
continue;
} else {
var temp__5804__auto___42660 = cljs.core.seq(seq__42415_42646);
if(temp__5804__auto___42660){
var seq__42415_42661__$1 = temp__5804__auto___42660;
if(cljs.core.chunked_seq_QMARK_(seq__42415_42661__$1)){
var c__5525__auto___42662 = cljs.core.chunk_first(seq__42415_42661__$1);
var G__42663 = cljs.core.chunk_rest(seq__42415_42661__$1);
var G__42664 = c__5525__auto___42662;
var G__42665 = cljs.core.count(c__5525__auto___42662);
var G__42666 = (0);
seq__42415_42646 = G__42663;
chunk__42417_42647 = G__42664;
count__42418_42648 = G__42665;
i__42419_42649 = G__42666;
continue;
} else {
var map__42424_42686 = cljs.core.first(seq__42415_42661__$1);
var map__42424_42687__$1 = cljs.core.__destructure_map(map__42424_42686);
var task_42688 = map__42424_42687__$1;
var fn_str_42689 = cljs.core.get.cljs$core$IFn$_invoke$arity$2(map__42424_42687__$1,new cljs.core.Keyword(null,"fn-str","fn-str",-1348506402));
var fn_sym_42690 = cljs.core.get.cljs$core$IFn$_invoke$arity$2(map__42424_42687__$1,new cljs.core.Keyword(null,"fn-sym","fn-sym",1423988510));
var fn_obj_42691 = goog.getObjectByName(fn_str_42689,$CLJS);
shadow.cljs.devtools.client.browser.devtools_msg(["call ",cljs.core.str.cljs$core$IFn$_invoke$arity$1(fn_sym_42690)].join(''));

(fn_obj_42691.cljs$core$IFn$_invoke$arity$2 ? fn_obj_42691.cljs$core$IFn$_invoke$arity$2(path,new_link_42645) : fn_obj_42691.call(null, path,new_link_42645));


var G__42695 = cljs.core.next(seq__42415_42661__$1);
var G__42696 = null;
var G__42697 = (0);
var G__42698 = (0);
seq__42415_42646 = G__42695;
chunk__42417_42647 = G__42696;
count__42418_42648 = G__42697;
i__42419_42649 = G__42698;
continue;
}
} else {
}
}
break;
}

return goog.dom.removeNode(node_42643);
});})(seq__42350_42639,chunk__42354_42640,count__42355_42641,i__42356_42642,seq__42148,chunk__42150,count__42151,i__42152,new_link_42645,path_match_42644,node_42643,path,map__42147,map__42147__$1,msg,updates,reload_info))
);

shadow.cljs.devtools.client.browser.devtools_msg.cljs$core$IFn$_invoke$arity$variadic("load CSS",cljs.core.prim_seq.cljs$core$IFn$_invoke$arity$2([path_match_42644], 0));

goog.dom.insertSiblingAfter(new_link_42645,node_42643);


var G__42699 = seq__42350_42639;
var G__42700 = chunk__42354_42640;
var G__42701 = count__42355_42641;
var G__42702 = (i__42356_42642 + (1));
seq__42350_42639 = G__42699;
chunk__42354_42640 = G__42700;
count__42355_42641 = G__42701;
i__42356_42642 = G__42702;
continue;
} else {
var G__42714 = seq__42350_42639;
var G__42715 = chunk__42354_42640;
var G__42716 = count__42355_42641;
var G__42717 = (i__42356_42642 + (1));
seq__42350_42639 = G__42714;
chunk__42354_42640 = G__42715;
count__42355_42641 = G__42716;
i__42356_42642 = G__42717;
continue;
}
} else {
var G__42718 = seq__42350_42639;
var G__42719 = chunk__42354_42640;
var G__42720 = count__42355_42641;
var G__42721 = (i__42356_42642 + (1));
seq__42350_42639 = G__42718;
chunk__42354_42640 = G__42719;
count__42355_42641 = G__42720;
i__42356_42642 = G__42721;
continue;
}
} else {
var temp__5804__auto___42722 = cljs.core.seq(seq__42350_42639);
if(temp__5804__auto___42722){
var seq__42350_42724__$1 = temp__5804__auto___42722;
if(cljs.core.chunked_seq_QMARK_(seq__42350_42724__$1)){
var c__5525__auto___42727 = cljs.core.chunk_first(seq__42350_42724__$1);
var G__42728 = cljs.core.chunk_rest(seq__42350_42724__$1);
var G__42729 = c__5525__auto___42727;
var G__42730 = cljs.core.count(c__5525__auto___42727);
var G__42731 = (0);
seq__42350_42639 = G__42728;
chunk__42354_42640 = G__42729;
count__42355_42641 = G__42730;
i__42356_42642 = G__42731;
continue;
} else {
var node_42732 = cljs.core.first(seq__42350_42724__$1);
if(cljs.core.not(node_42732.shadow$old)){
var path_match_42733 = shadow.cljs.devtools.client.browser.match_paths(node_42732.getAttribute("href"),path);
if(cljs.core.truth_(path_match_42733)){
var new_link_42734 = (function (){var G__42429 = node_42732.cloneNode(true);
G__42429.setAttribute("href",[cljs.core.str.cljs$core$IFn$_invoke$arity$1(path_match_42733),"?r=",cljs.core.str.cljs$core$IFn$_invoke$arity$1(cljs.core.rand.cljs$core$IFn$_invoke$arity$0())].join(''));

return G__42429;
})();
(node_42732.shadow$old = true);

(new_link_42734.onload = ((function (seq__42350_42639,chunk__42354_42640,count__42355_42641,i__42356_42642,seq__42148,chunk__42150,count__42151,i__42152,new_link_42734,path_match_42733,node_42732,seq__42350_42724__$1,temp__5804__auto___42722,path,map__42147,map__42147__$1,msg,updates,reload_info){
return (function (e){
var seq__42432_42738 = cljs.core.seq(cljs.core.get_in.cljs$core$IFn$_invoke$arity$2(msg,new cljs.core.PersistentVector(null, 2, 5, cljs.core.PersistentVector.EMPTY_NODE, [new cljs.core.Keyword(null,"reload-info","reload-info",1648088086),new cljs.core.Keyword(null,"asset-load","asset-load",-1925902322)], null)));
var chunk__42434_42739 = null;
var count__42435_42740 = (0);
var i__42436_42741 = (0);
while(true){
if((i__42436_42741 < count__42435_42740)){
var map__42455_42783 = chunk__42434_42739.cljs$core$IIndexed$_nth$arity$2(null, i__42436_42741);
var map__42455_42784__$1 = cljs.core.__destructure_map(map__42455_42783);
var task_42785 = map__42455_42784__$1;
var fn_str_42786 = cljs.core.get.cljs$core$IFn$_invoke$arity$2(map__42455_42784__$1,new cljs.core.Keyword(null,"fn-str","fn-str",-1348506402));
var fn_sym_42787 = cljs.core.get.cljs$core$IFn$_invoke$arity$2(map__42455_42784__$1,new cljs.core.Keyword(null,"fn-sym","fn-sym",1423988510));
var fn_obj_42788 = goog.getObjectByName(fn_str_42786,$CLJS);
shadow.cljs.devtools.client.browser.devtools_msg(["call ",cljs.core.str.cljs$core$IFn$_invoke$arity$1(fn_sym_42787)].join(''));

(fn_obj_42788.cljs$core$IFn$_invoke$arity$2 ? fn_obj_42788.cljs$core$IFn$_invoke$arity$2(path,new_link_42734) : fn_obj_42788.call(null, path,new_link_42734));


var G__42789 = seq__42432_42738;
var G__42790 = chunk__42434_42739;
var G__42791 = count__42435_42740;
var G__42792 = (i__42436_42741 + (1));
seq__42432_42738 = G__42789;
chunk__42434_42739 = G__42790;
count__42435_42740 = G__42791;
i__42436_42741 = G__42792;
continue;
} else {
var temp__5804__auto___42793__$1 = cljs.core.seq(seq__42432_42738);
if(temp__5804__auto___42793__$1){
var seq__42432_42794__$1 = temp__5804__auto___42793__$1;
if(cljs.core.chunked_seq_QMARK_(seq__42432_42794__$1)){
var c__5525__auto___42795 = cljs.core.chunk_first(seq__42432_42794__$1);
var G__42796 = cljs.core.chunk_rest(seq__42432_42794__$1);
var G__42797 = c__5525__auto___42795;
var G__42798 = cljs.core.count(c__5525__auto___42795);
var G__42799 = (0);
seq__42432_42738 = G__42796;
chunk__42434_42739 = G__42797;
count__42435_42740 = G__42798;
i__42436_42741 = G__42799;
continue;
} else {
var map__42459_42800 = cljs.core.first(seq__42432_42794__$1);
var map__42459_42801__$1 = cljs.core.__destructure_map(map__42459_42800);
var task_42802 = map__42459_42801__$1;
var fn_str_42803 = cljs.core.get.cljs$core$IFn$_invoke$arity$2(map__42459_42801__$1,new cljs.core.Keyword(null,"fn-str","fn-str",-1348506402));
var fn_sym_42804 = cljs.core.get.cljs$core$IFn$_invoke$arity$2(map__42459_42801__$1,new cljs.core.Keyword(null,"fn-sym","fn-sym",1423988510));
var fn_obj_42805 = goog.getObjectByName(fn_str_42803,$CLJS);
shadow.cljs.devtools.client.browser.devtools_msg(["call ",cljs.core.str.cljs$core$IFn$_invoke$arity$1(fn_sym_42804)].join(''));

(fn_obj_42805.cljs$core$IFn$_invoke$arity$2 ? fn_obj_42805.cljs$core$IFn$_invoke$arity$2(path,new_link_42734) : fn_obj_42805.call(null, path,new_link_42734));


var G__42806 = cljs.core.next(seq__42432_42794__$1);
var G__42807 = null;
var G__42808 = (0);
var G__42809 = (0);
seq__42432_42738 = G__42806;
chunk__42434_42739 = G__42807;
count__42435_42740 = G__42808;
i__42436_42741 = G__42809;
continue;
}
} else {
}
}
break;
}

return goog.dom.removeNode(node_42732);
});})(seq__42350_42639,chunk__42354_42640,count__42355_42641,i__42356_42642,seq__42148,chunk__42150,count__42151,i__42152,new_link_42734,path_match_42733,node_42732,seq__42350_42724__$1,temp__5804__auto___42722,path,map__42147,map__42147__$1,msg,updates,reload_info))
);

shadow.cljs.devtools.client.browser.devtools_msg.cljs$core$IFn$_invoke$arity$variadic("load CSS",cljs.core.prim_seq.cljs$core$IFn$_invoke$arity$2([path_match_42733], 0));

goog.dom.insertSiblingAfter(new_link_42734,node_42732);


var G__42810 = cljs.core.next(seq__42350_42724__$1);
var G__42811 = null;
var G__42812 = (0);
var G__42813 = (0);
seq__42350_42639 = G__42810;
chunk__42354_42640 = G__42811;
count__42355_42641 = G__42812;
i__42356_42642 = G__42813;
continue;
} else {
var G__42814 = cljs.core.next(seq__42350_42724__$1);
var G__42815 = null;
var G__42816 = (0);
var G__42817 = (0);
seq__42350_42639 = G__42814;
chunk__42354_42640 = G__42815;
count__42355_42641 = G__42816;
i__42356_42642 = G__42817;
continue;
}
} else {
var G__42818 = cljs.core.next(seq__42350_42724__$1);
var G__42819 = null;
var G__42820 = (0);
var G__42821 = (0);
seq__42350_42639 = G__42818;
chunk__42354_42640 = G__42819;
count__42355_42641 = G__42820;
i__42356_42642 = G__42821;
continue;
}
}
} else {
}
}
break;
}


var G__42822 = seq__42148;
var G__42823 = chunk__42150;
var G__42824 = count__42151;
var G__42825 = (i__42152 + (1));
seq__42148 = G__42822;
chunk__42150 = G__42823;
count__42151 = G__42824;
i__42152 = G__42825;
continue;
} else {
var G__42826 = seq__42148;
var G__42827 = chunk__42150;
var G__42828 = count__42151;
var G__42829 = (i__42152 + (1));
seq__42148 = G__42826;
chunk__42150 = G__42827;
count__42151 = G__42828;
i__42152 = G__42829;
continue;
}
} else {
var temp__5804__auto__ = cljs.core.seq(seq__42148);
if(temp__5804__auto__){
var seq__42148__$1 = temp__5804__auto__;
if(cljs.core.chunked_seq_QMARK_(seq__42148__$1)){
var c__5525__auto__ = cljs.core.chunk_first(seq__42148__$1);
var G__42830 = cljs.core.chunk_rest(seq__42148__$1);
var G__42831 = c__5525__auto__;
var G__42832 = cljs.core.count(c__5525__auto__);
var G__42833 = (0);
seq__42148 = G__42830;
chunk__42150 = G__42831;
count__42151 = G__42832;
i__42152 = G__42833;
continue;
} else {
var path = cljs.core.first(seq__42148__$1);
if(clojure.string.ends_with_QMARK_(path,"css")){
var seq__42460_42834 = cljs.core.seq(cljs.core.array_seq.cljs$core$IFn$_invoke$arity$1(document.querySelectorAll("link[rel=\"stylesheet\"]")));
var chunk__42464_42835 = null;
var count__42465_42836 = (0);
var i__42466_42837 = (0);
while(true){
if((i__42466_42837 < count__42465_42836)){
var node_42838 = chunk__42464_42835.cljs$core$IIndexed$_nth$arity$2(null, i__42466_42837);
if(cljs.core.not(node_42838.shadow$old)){
var path_match_42839 = shadow.cljs.devtools.client.browser.match_paths(node_42838.getAttribute("href"),path);
if(cljs.core.truth_(path_match_42839)){
var new_link_42840 = (function (){var G__42521 = node_42838.cloneNode(true);
G__42521.setAttribute("href",[cljs.core.str.cljs$core$IFn$_invoke$arity$1(path_match_42839),"?r=",cljs.core.str.cljs$core$IFn$_invoke$arity$1(cljs.core.rand.cljs$core$IFn$_invoke$arity$0())].join(''));

return G__42521;
})();
(node_42838.shadow$old = true);

(new_link_42840.onload = ((function (seq__42460_42834,chunk__42464_42835,count__42465_42836,i__42466_42837,seq__42148,chunk__42150,count__42151,i__42152,new_link_42840,path_match_42839,node_42838,path,seq__42148__$1,temp__5804__auto__,map__42147,map__42147__$1,msg,updates,reload_info){
return (function (e){
var seq__42522_42841 = cljs.core.seq(cljs.core.get_in.cljs$core$IFn$_invoke$arity$2(msg,new cljs.core.PersistentVector(null, 2, 5, cljs.core.PersistentVector.EMPTY_NODE, [new cljs.core.Keyword(null,"reload-info","reload-info",1648088086),new cljs.core.Keyword(null,"asset-load","asset-load",-1925902322)], null)));
var chunk__42524_42842 = null;
var count__42525_42843 = (0);
var i__42526_42844 = (0);
while(true){
if((i__42526_42844 < count__42525_42843)){
var map__42532_42845 = chunk__42524_42842.cljs$core$IIndexed$_nth$arity$2(null, i__42526_42844);
var map__42532_42846__$1 = cljs.core.__destructure_map(map__42532_42845);
var task_42847 = map__42532_42846__$1;
var fn_str_42848 = cljs.core.get.cljs$core$IFn$_invoke$arity$2(map__42532_42846__$1,new cljs.core.Keyword(null,"fn-str","fn-str",-1348506402));
var fn_sym_42849 = cljs.core.get.cljs$core$IFn$_invoke$arity$2(map__42532_42846__$1,new cljs.core.Keyword(null,"fn-sym","fn-sym",1423988510));
var fn_obj_42850 = goog.getObjectByName(fn_str_42848,$CLJS);
shadow.cljs.devtools.client.browser.devtools_msg(["call ",cljs.core.str.cljs$core$IFn$_invoke$arity$1(fn_sym_42849)].join(''));

(fn_obj_42850.cljs$core$IFn$_invoke$arity$2 ? fn_obj_42850.cljs$core$IFn$_invoke$arity$2(path,new_link_42840) : fn_obj_42850.call(null, path,new_link_42840));


var G__42851 = seq__42522_42841;
var G__42852 = chunk__42524_42842;
var G__42853 = count__42525_42843;
var G__42854 = (i__42526_42844 + (1));
seq__42522_42841 = G__42851;
chunk__42524_42842 = G__42852;
count__42525_42843 = G__42853;
i__42526_42844 = G__42854;
continue;
} else {
var temp__5804__auto___42855__$1 = cljs.core.seq(seq__42522_42841);
if(temp__5804__auto___42855__$1){
var seq__42522_42856__$1 = temp__5804__auto___42855__$1;
if(cljs.core.chunked_seq_QMARK_(seq__42522_42856__$1)){
var c__5525__auto___42857 = cljs.core.chunk_first(seq__42522_42856__$1);
var G__42874 = cljs.core.chunk_rest(seq__42522_42856__$1);
var G__42875 = c__5525__auto___42857;
var G__42876 = cljs.core.count(c__5525__auto___42857);
var G__42877 = (0);
seq__42522_42841 = G__42874;
chunk__42524_42842 = G__42875;
count__42525_42843 = G__42876;
i__42526_42844 = G__42877;
continue;
} else {
var map__42534_42878 = cljs.core.first(seq__42522_42856__$1);
var map__42534_42879__$1 = cljs.core.__destructure_map(map__42534_42878);
var task_42880 = map__42534_42879__$1;
var fn_str_42881 = cljs.core.get.cljs$core$IFn$_invoke$arity$2(map__42534_42879__$1,new cljs.core.Keyword(null,"fn-str","fn-str",-1348506402));
var fn_sym_42882 = cljs.core.get.cljs$core$IFn$_invoke$arity$2(map__42534_42879__$1,new cljs.core.Keyword(null,"fn-sym","fn-sym",1423988510));
var fn_obj_42883 = goog.getObjectByName(fn_str_42881,$CLJS);
shadow.cljs.devtools.client.browser.devtools_msg(["call ",cljs.core.str.cljs$core$IFn$_invoke$arity$1(fn_sym_42882)].join(''));

(fn_obj_42883.cljs$core$IFn$_invoke$arity$2 ? fn_obj_42883.cljs$core$IFn$_invoke$arity$2(path,new_link_42840) : fn_obj_42883.call(null, path,new_link_42840));


var G__42885 = cljs.core.next(seq__42522_42856__$1);
var G__42886 = null;
var G__42887 = (0);
var G__42888 = (0);
seq__42522_42841 = G__42885;
chunk__42524_42842 = G__42886;
count__42525_42843 = G__42887;
i__42526_42844 = G__42888;
continue;
}
} else {
}
}
break;
}

return goog.dom.removeNode(node_42838);
});})(seq__42460_42834,chunk__42464_42835,count__42465_42836,i__42466_42837,seq__42148,chunk__42150,count__42151,i__42152,new_link_42840,path_match_42839,node_42838,path,seq__42148__$1,temp__5804__auto__,map__42147,map__42147__$1,msg,updates,reload_info))
);

shadow.cljs.devtools.client.browser.devtools_msg.cljs$core$IFn$_invoke$arity$variadic("load CSS",cljs.core.prim_seq.cljs$core$IFn$_invoke$arity$2([path_match_42839], 0));

goog.dom.insertSiblingAfter(new_link_42840,node_42838);


var G__42896 = seq__42460_42834;
var G__42897 = chunk__42464_42835;
var G__42898 = count__42465_42836;
var G__42899 = (i__42466_42837 + (1));
seq__42460_42834 = G__42896;
chunk__42464_42835 = G__42897;
count__42465_42836 = G__42898;
i__42466_42837 = G__42899;
continue;
} else {
var G__42900 = seq__42460_42834;
var G__42901 = chunk__42464_42835;
var G__42902 = count__42465_42836;
var G__42903 = (i__42466_42837 + (1));
seq__42460_42834 = G__42900;
chunk__42464_42835 = G__42901;
count__42465_42836 = G__42902;
i__42466_42837 = G__42903;
continue;
}
} else {
var G__42905 = seq__42460_42834;
var G__42906 = chunk__42464_42835;
var G__42907 = count__42465_42836;
var G__42908 = (i__42466_42837 + (1));
seq__42460_42834 = G__42905;
chunk__42464_42835 = G__42906;
count__42465_42836 = G__42907;
i__42466_42837 = G__42908;
continue;
}
} else {
var temp__5804__auto___42910__$1 = cljs.core.seq(seq__42460_42834);
if(temp__5804__auto___42910__$1){
var seq__42460_42911__$1 = temp__5804__auto___42910__$1;
if(cljs.core.chunked_seq_QMARK_(seq__42460_42911__$1)){
var c__5525__auto___42912 = cljs.core.chunk_first(seq__42460_42911__$1);
var G__42913 = cljs.core.chunk_rest(seq__42460_42911__$1);
var G__42914 = c__5525__auto___42912;
var G__42915 = cljs.core.count(c__5525__auto___42912);
var G__42916 = (0);
seq__42460_42834 = G__42913;
chunk__42464_42835 = G__42914;
count__42465_42836 = G__42915;
i__42466_42837 = G__42916;
continue;
} else {
var node_42918 = cljs.core.first(seq__42460_42911__$1);
if(cljs.core.not(node_42918.shadow$old)){
var path_match_42920 = shadow.cljs.devtools.client.browser.match_paths(node_42918.getAttribute("href"),path);
if(cljs.core.truth_(path_match_42920)){
var new_link_42921 = (function (){var G__42539 = node_42918.cloneNode(true);
G__42539.setAttribute("href",[cljs.core.str.cljs$core$IFn$_invoke$arity$1(path_match_42920),"?r=",cljs.core.str.cljs$core$IFn$_invoke$arity$1(cljs.core.rand.cljs$core$IFn$_invoke$arity$0())].join(''));

return G__42539;
})();
(node_42918.shadow$old = true);

(new_link_42921.onload = ((function (seq__42460_42834,chunk__42464_42835,count__42465_42836,i__42466_42837,seq__42148,chunk__42150,count__42151,i__42152,new_link_42921,path_match_42920,node_42918,seq__42460_42911__$1,temp__5804__auto___42910__$1,path,seq__42148__$1,temp__5804__auto__,map__42147,map__42147__$1,msg,updates,reload_info){
return (function (e){
var seq__42540_42922 = cljs.core.seq(cljs.core.get_in.cljs$core$IFn$_invoke$arity$2(msg,new cljs.core.PersistentVector(null, 2, 5, cljs.core.PersistentVector.EMPTY_NODE, [new cljs.core.Keyword(null,"reload-info","reload-info",1648088086),new cljs.core.Keyword(null,"asset-load","asset-load",-1925902322)], null)));
var chunk__42542_42923 = null;
var count__42543_42924 = (0);
var i__42544_42925 = (0);
while(true){
if((i__42544_42925 < count__42543_42924)){
var map__42548_42926 = chunk__42542_42923.cljs$core$IIndexed$_nth$arity$2(null, i__42544_42925);
var map__42548_42927__$1 = cljs.core.__destructure_map(map__42548_42926);
var task_42928 = map__42548_42927__$1;
var fn_str_42929 = cljs.core.get.cljs$core$IFn$_invoke$arity$2(map__42548_42927__$1,new cljs.core.Keyword(null,"fn-str","fn-str",-1348506402));
var fn_sym_42930 = cljs.core.get.cljs$core$IFn$_invoke$arity$2(map__42548_42927__$1,new cljs.core.Keyword(null,"fn-sym","fn-sym",1423988510));
var fn_obj_42931 = goog.getObjectByName(fn_str_42929,$CLJS);
shadow.cljs.devtools.client.browser.devtools_msg(["call ",cljs.core.str.cljs$core$IFn$_invoke$arity$1(fn_sym_42930)].join(''));

(fn_obj_42931.cljs$core$IFn$_invoke$arity$2 ? fn_obj_42931.cljs$core$IFn$_invoke$arity$2(path,new_link_42921) : fn_obj_42931.call(null, path,new_link_42921));


var G__42932 = seq__42540_42922;
var G__42933 = chunk__42542_42923;
var G__42934 = count__42543_42924;
var G__42935 = (i__42544_42925 + (1));
seq__42540_42922 = G__42932;
chunk__42542_42923 = G__42933;
count__42543_42924 = G__42934;
i__42544_42925 = G__42935;
continue;
} else {
var temp__5804__auto___42936__$2 = cljs.core.seq(seq__42540_42922);
if(temp__5804__auto___42936__$2){
var seq__42540_42937__$1 = temp__5804__auto___42936__$2;
if(cljs.core.chunked_seq_QMARK_(seq__42540_42937__$1)){
var c__5525__auto___42938 = cljs.core.chunk_first(seq__42540_42937__$1);
var G__42939 = cljs.core.chunk_rest(seq__42540_42937__$1);
var G__42940 = c__5525__auto___42938;
var G__42941 = cljs.core.count(c__5525__auto___42938);
var G__42942 = (0);
seq__42540_42922 = G__42939;
chunk__42542_42923 = G__42940;
count__42543_42924 = G__42941;
i__42544_42925 = G__42942;
continue;
} else {
var map__42552_42943 = cljs.core.first(seq__42540_42937__$1);
var map__42552_42944__$1 = cljs.core.__destructure_map(map__42552_42943);
var task_42945 = map__42552_42944__$1;
var fn_str_42946 = cljs.core.get.cljs$core$IFn$_invoke$arity$2(map__42552_42944__$1,new cljs.core.Keyword(null,"fn-str","fn-str",-1348506402));
var fn_sym_42947 = cljs.core.get.cljs$core$IFn$_invoke$arity$2(map__42552_42944__$1,new cljs.core.Keyword(null,"fn-sym","fn-sym",1423988510));
var fn_obj_42948 = goog.getObjectByName(fn_str_42946,$CLJS);
shadow.cljs.devtools.client.browser.devtools_msg(["call ",cljs.core.str.cljs$core$IFn$_invoke$arity$1(fn_sym_42947)].join(''));

(fn_obj_42948.cljs$core$IFn$_invoke$arity$2 ? fn_obj_42948.cljs$core$IFn$_invoke$arity$2(path,new_link_42921) : fn_obj_42948.call(null, path,new_link_42921));


var G__42949 = cljs.core.next(seq__42540_42937__$1);
var G__42950 = null;
var G__42951 = (0);
var G__42952 = (0);
seq__42540_42922 = G__42949;
chunk__42542_42923 = G__42950;
count__42543_42924 = G__42951;
i__42544_42925 = G__42952;
continue;
}
} else {
}
}
break;
}

return goog.dom.removeNode(node_42918);
});})(seq__42460_42834,chunk__42464_42835,count__42465_42836,i__42466_42837,seq__42148,chunk__42150,count__42151,i__42152,new_link_42921,path_match_42920,node_42918,seq__42460_42911__$1,temp__5804__auto___42910__$1,path,seq__42148__$1,temp__5804__auto__,map__42147,map__42147__$1,msg,updates,reload_info))
);

shadow.cljs.devtools.client.browser.devtools_msg.cljs$core$IFn$_invoke$arity$variadic("load CSS",cljs.core.prim_seq.cljs$core$IFn$_invoke$arity$2([path_match_42920], 0));

goog.dom.insertSiblingAfter(new_link_42921,node_42918);


var G__42958 = cljs.core.next(seq__42460_42911__$1);
var G__42959 = null;
var G__42960 = (0);
var G__42961 = (0);
seq__42460_42834 = G__42958;
chunk__42464_42835 = G__42959;
count__42465_42836 = G__42960;
i__42466_42837 = G__42961;
continue;
} else {
var G__42962 = cljs.core.next(seq__42460_42911__$1);
var G__42963 = null;
var G__42964 = (0);
var G__42965 = (0);
seq__42460_42834 = G__42962;
chunk__42464_42835 = G__42963;
count__42465_42836 = G__42964;
i__42466_42837 = G__42965;
continue;
}
} else {
var G__42966 = cljs.core.next(seq__42460_42911__$1);
var G__42967 = null;
var G__42968 = (0);
var G__42969 = (0);
seq__42460_42834 = G__42966;
chunk__42464_42835 = G__42967;
count__42465_42836 = G__42968;
i__42466_42837 = G__42969;
continue;
}
}
} else {
}
}
break;
}


var G__42971 = cljs.core.next(seq__42148__$1);
var G__42972 = null;
var G__42973 = (0);
var G__42974 = (0);
seq__42148 = G__42971;
chunk__42150 = G__42972;
count__42151 = G__42973;
i__42152 = G__42974;
continue;
} else {
var G__42975 = cljs.core.next(seq__42148__$1);
var G__42976 = null;
var G__42977 = (0);
var G__42978 = (0);
seq__42148 = G__42975;
chunk__42150 = G__42976;
count__42151 = G__42977;
i__42152 = G__42978;
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
shadow.cljs.devtools.client.browser.global_eval = (function shadow$cljs$devtools$client$browser$global_eval(js){
if(cljs.core.not_EQ_.cljs$core$IFn$_invoke$arity$2("undefined",typeof(module))){
return eval(js);
} else {
return (0,eval)(js);;
}
});
shadow.cljs.devtools.client.browser.runtime_info = (((typeof SHADOW_CONFIG !== 'undefined'))?shadow.json.to_clj.cljs$core$IFn$_invoke$arity$1(SHADOW_CONFIG):null);
shadow.cljs.devtools.client.browser.client_info = cljs.core.merge.cljs$core$IFn$_invoke$arity$variadic(cljs.core.prim_seq.cljs$core$IFn$_invoke$arity$2([shadow.cljs.devtools.client.browser.runtime_info,new cljs.core.PersistentArrayMap(null, 3, [new cljs.core.Keyword(null,"host","host",-1558485167),(cljs.core.truth_(goog.global.document)?new cljs.core.Keyword(null,"browser","browser",828191719):new cljs.core.Keyword(null,"browser-worker","browser-worker",1638998282)),new cljs.core.Keyword(null,"user-agent","user-agent",1220426212),[(cljs.core.truth_(goog.userAgent.OPERA)?"Opera":(cljs.core.truth_(goog.userAgent.product.CHROME)?"Chrome":(cljs.core.truth_(goog.userAgent.IE)?"MSIE":(cljs.core.truth_(goog.userAgent.EDGE)?"Edge":(cljs.core.truth_(goog.userAgent.GECKO)?"Firefox":(cljs.core.truth_(goog.userAgent.SAFARI)?"Safari":(cljs.core.truth_(goog.userAgent.WEBKIT)?"Webkit":null)))))))," ",cljs.core.str.cljs$core$IFn$_invoke$arity$1(goog.userAgent.VERSION)," [",cljs.core.str.cljs$core$IFn$_invoke$arity$1(goog.userAgent.PLATFORM),"]"].join(''),new cljs.core.Keyword(null,"dom","dom",-1236537922),(!((goog.global.document == null)))], null)], 0));
if((typeof shadow !== 'undefined') && (typeof shadow.cljs !== 'undefined') && (typeof shadow.cljs.devtools !== 'undefined') && (typeof shadow.cljs.devtools.client !== 'undefined') && (typeof shadow.cljs.devtools.client.browser !== 'undefined') && (typeof shadow.cljs.devtools.client.browser.ws_was_welcome_ref !== 'undefined')){
} else {
shadow.cljs.devtools.client.browser.ws_was_welcome_ref = cljs.core.atom.cljs$core$IFn$_invoke$arity$1(false);
}
if(((shadow.cljs.devtools.client.env.enabled) && ((shadow.cljs.devtools.client.env.worker_client_id > (0))))){
(shadow.cljs.devtools.client.shared.Runtime.prototype.shadow$remote$runtime$api$IEvalJS$ = cljs.core.PROTOCOL_SENTINEL);

(shadow.cljs.devtools.client.shared.Runtime.prototype.shadow$remote$runtime$api$IEvalJS$_js_eval$arity$2 = (function (this$,code){
var this$__$1 = this;
return shadow.cljs.devtools.client.browser.global_eval(code);
}));

(shadow.cljs.devtools.client.shared.Runtime.prototype.shadow$cljs$devtools$client$shared$IHostSpecific$ = cljs.core.PROTOCOL_SENTINEL);

(shadow.cljs.devtools.client.shared.Runtime.prototype.shadow$cljs$devtools$client$shared$IHostSpecific$do_invoke$arity$3 = (function (this$,ns,p__42554){
var map__42555 = p__42554;
var map__42555__$1 = cljs.core.__destructure_map(map__42555);
var js = cljs.core.get.cljs$core$IFn$_invoke$arity$2(map__42555__$1,new cljs.core.Keyword(null,"js","js",1768080579));
var this$__$1 = this;
return shadow.cljs.devtools.client.browser.global_eval(js);
}));

(shadow.cljs.devtools.client.shared.Runtime.prototype.shadow$cljs$devtools$client$shared$IHostSpecific$do_repl_init$arity$4 = (function (runtime,p__42556,done,error){
var map__42557 = p__42556;
var map__42557__$1 = cljs.core.__destructure_map(map__42557);
var repl_sources = cljs.core.get.cljs$core$IFn$_invoke$arity$2(map__42557__$1,new cljs.core.Keyword(null,"repl-sources","repl-sources",723867535));
var runtime__$1 = this;
return shadow.cljs.devtools.client.shared.load_sources(runtime__$1,cljs.core.into.cljs$core$IFn$_invoke$arity$2(cljs.core.PersistentVector.EMPTY,cljs.core.remove.cljs$core$IFn$_invoke$arity$2(shadow.cljs.devtools.client.env.src_is_loaded_QMARK_,repl_sources)),(function (sources){
shadow.cljs.devtools.client.browser.do_js_load(sources);

return (done.cljs$core$IFn$_invoke$arity$0 ? done.cljs$core$IFn$_invoke$arity$0() : done.call(null, ));
}));
}));

(shadow.cljs.devtools.client.shared.Runtime.prototype.shadow$cljs$devtools$client$shared$IHostSpecific$do_repl_require$arity$4 = (function (runtime,p__42558,done,error){
var map__42559 = p__42558;
var map__42559__$1 = cljs.core.__destructure_map(map__42559);
var msg = map__42559__$1;
var sources = cljs.core.get.cljs$core$IFn$_invoke$arity$2(map__42559__$1,new cljs.core.Keyword(null,"sources","sources",-321166424));
var reload_namespaces = cljs.core.get.cljs$core$IFn$_invoke$arity$2(map__42559__$1,new cljs.core.Keyword(null,"reload-namespaces","reload-namespaces",250210134));
var js_requires = cljs.core.get.cljs$core$IFn$_invoke$arity$2(map__42559__$1,new cljs.core.Keyword(null,"js-requires","js-requires",-1311472051));
var runtime__$1 = this;
var sources_to_load = cljs.core.into.cljs$core$IFn$_invoke$arity$2(cljs.core.PersistentVector.EMPTY,cljs.core.remove.cljs$core$IFn$_invoke$arity$2((function (p__42560){
var map__42561 = p__42560;
var map__42561__$1 = cljs.core.__destructure_map(map__42561);
var src = map__42561__$1;
var provides = cljs.core.get.cljs$core$IFn$_invoke$arity$2(map__42561__$1,new cljs.core.Keyword(null,"provides","provides",-1634397992));
var and__5000__auto__ = shadow.cljs.devtools.client.env.src_is_loaded_QMARK_(src);
if(cljs.core.truth_(and__5000__auto__)){
return cljs.core.not(cljs.core.some(reload_namespaces,provides));
} else {
return and__5000__auto__;
}
}),sources));
if(cljs.core.not(cljs.core.seq(sources_to_load))){
var G__42562 = cljs.core.PersistentVector.EMPTY;
return (done.cljs$core$IFn$_invoke$arity$1 ? done.cljs$core$IFn$_invoke$arity$1(G__42562) : done.call(null, G__42562));
} else {
return shadow.remote.runtime.shared.call.cljs$core$IFn$_invoke$arity$3(runtime__$1,new cljs.core.PersistentArrayMap(null, 3, [new cljs.core.Keyword(null,"op","op",-1882987955),new cljs.core.Keyword(null,"cljs-load-sources","cljs-load-sources",-1458295962),new cljs.core.Keyword(null,"to","to",192099007),shadow.cljs.devtools.client.env.worker_client_id,new cljs.core.Keyword(null,"sources","sources",-321166424),cljs.core.into.cljs$core$IFn$_invoke$arity$3(cljs.core.PersistentVector.EMPTY,cljs.core.map.cljs$core$IFn$_invoke$arity$1(new cljs.core.Keyword(null,"resource-id","resource-id",-1308422582)),sources_to_load)], null),new cljs.core.PersistentArrayMap(null, 1, [new cljs.core.Keyword(null,"cljs-sources","cljs-sources",31121610),(function (p__42563){
var map__42564 = p__42563;
var map__42564__$1 = cljs.core.__destructure_map(map__42564);
var msg__$1 = map__42564__$1;
var sources__$1 = cljs.core.get.cljs$core$IFn$_invoke$arity$2(map__42564__$1,new cljs.core.Keyword(null,"sources","sources",-321166424));
try{shadow.cljs.devtools.client.browser.do_js_load(sources__$1);

if(cljs.core.seq(js_requires)){
shadow.cljs.devtools.client.browser.do_js_requires(js_requires);
} else {
}

return (done.cljs$core$IFn$_invoke$arity$1 ? done.cljs$core$IFn$_invoke$arity$1(sources_to_load) : done.call(null, sources_to_load));
}catch (e42565){var ex = e42565;
return (error.cljs$core$IFn$_invoke$arity$1 ? error.cljs$core$IFn$_invoke$arity$1(ex) : error.call(null, ex));
}})], null));
}
}));

shadow.cljs.devtools.client.shared.add_plugin_BANG_(new cljs.core.Keyword("shadow.cljs.devtools.client.browser","client","shadow.cljs.devtools.client.browser/client",-1461019282),cljs.core.PersistentHashSet.EMPTY,(function (p__42566){
var map__42567 = p__42566;
var map__42567__$1 = cljs.core.__destructure_map(map__42567);
var env = map__42567__$1;
var runtime = cljs.core.get.cljs$core$IFn$_invoke$arity$2(map__42567__$1,new cljs.core.Keyword(null,"runtime","runtime",-1331573996));
var svc = new cljs.core.PersistentArrayMap(null, 1, [new cljs.core.Keyword(null,"runtime","runtime",-1331573996),runtime], null);
shadow.remote.runtime.api.add_extension(runtime,new cljs.core.Keyword("shadow.cljs.devtools.client.browser","client","shadow.cljs.devtools.client.browser/client",-1461019282),new cljs.core.PersistentArrayMap(null, 4, [new cljs.core.Keyword(null,"on-welcome","on-welcome",1895317125),(function (){
cljs.core.reset_BANG_(shadow.cljs.devtools.client.browser.ws_was_welcome_ref,true);

shadow.cljs.devtools.client.hud.connection_error_clear_BANG_();

shadow.cljs.devtools.client.env.patch_goog_BANG_();

return shadow.cljs.devtools.client.browser.devtools_msg(["#",cljs.core.str.cljs$core$IFn$_invoke$arity$1(new cljs.core.Keyword(null,"client-id","client-id",-464622140).cljs$core$IFn$_invoke$arity$1(cljs.core.deref(new cljs.core.Keyword(null,"state-ref","state-ref",2127874952).cljs$core$IFn$_invoke$arity$1(runtime))))," ready!"].join(''));
}),new cljs.core.Keyword(null,"on-disconnect","on-disconnect",-809021814),(function (e){
if(cljs.core.truth_(cljs.core.deref(shadow.cljs.devtools.client.browser.ws_was_welcome_ref))){
shadow.cljs.devtools.client.hud.connection_error("The Websocket connection was closed!");

return cljs.core.reset_BANG_(shadow.cljs.devtools.client.browser.ws_was_welcome_ref,false);
} else {
return null;
}
}),new cljs.core.Keyword(null,"on-reconnect","on-reconnect",1239988702),(function (e){
return shadow.cljs.devtools.client.hud.connection_error("Reconnecting ...");
}),new cljs.core.Keyword(null,"ops","ops",1237330063),new cljs.core.PersistentArrayMap(null, 7, [new cljs.core.Keyword(null,"access-denied","access-denied",959449406),(function (msg){
cljs.core.reset_BANG_(shadow.cljs.devtools.client.browser.ws_was_welcome_ref,false);

return shadow.cljs.devtools.client.hud.connection_error(["Stale Output! Your loaded JS was not produced by the running shadow-cljs instance."," Is the watch for this build running?"].join(''));
}),new cljs.core.Keyword(null,"cljs-asset-update","cljs-asset-update",1224093028),(function (msg){
return shadow.cljs.devtools.client.browser.handle_asset_update(msg);
}),new cljs.core.Keyword(null,"cljs-build-configure","cljs-build-configure",-2089891268),(function (msg){
return null;
}),new cljs.core.Keyword(null,"cljs-build-start","cljs-build-start",-725781241),(function (msg){
shadow.cljs.devtools.client.hud.hud_hide();

shadow.cljs.devtools.client.hud.load_start();

return shadow.cljs.devtools.client.env.run_custom_notify_BANG_(cljs.core.assoc.cljs$core$IFn$_invoke$arity$3(msg,new cljs.core.Keyword(null,"type","type",1174270348),new cljs.core.Keyword(null,"build-start","build-start",-959649480)));
}),new cljs.core.Keyword(null,"cljs-build-complete","cljs-build-complete",273626153),(function (msg){
var msg__$1 = shadow.cljs.devtools.client.env.add_warnings_to_info(msg);
shadow.cljs.devtools.client.hud.connection_error_clear_BANG_();

shadow.cljs.devtools.client.hud.hud_warnings(msg__$1);

shadow.cljs.devtools.client.browser.handle_build_complete(runtime,msg__$1);

return shadow.cljs.devtools.client.env.run_custom_notify_BANG_(cljs.core.assoc.cljs$core$IFn$_invoke$arity$3(msg__$1,new cljs.core.Keyword(null,"type","type",1174270348),new cljs.core.Keyword(null,"build-complete","build-complete",-501868472)));
}),new cljs.core.Keyword(null,"cljs-build-failure","cljs-build-failure",1718154990),(function (msg){
shadow.cljs.devtools.client.hud.load_end();

shadow.cljs.devtools.client.hud.hud_error(msg);

return shadow.cljs.devtools.client.env.run_custom_notify_BANG_(cljs.core.assoc.cljs$core$IFn$_invoke$arity$3(msg,new cljs.core.Keyword(null,"type","type",1174270348),new cljs.core.Keyword(null,"build-failure","build-failure",-2107487466)));
}),new cljs.core.Keyword("shadow.cljs.devtools.client.env","worker-notify","shadow.cljs.devtools.client.env/worker-notify",-1456820670),(function (p__42568){
var map__42569 = p__42568;
var map__42569__$1 = cljs.core.__destructure_map(map__42569);
var event_op = cljs.core.get.cljs$core$IFn$_invoke$arity$2(map__42569__$1,new cljs.core.Keyword(null,"event-op","event-op",200358057));
var client_id = cljs.core.get.cljs$core$IFn$_invoke$arity$2(map__42569__$1,new cljs.core.Keyword(null,"client-id","client-id",-464622140));
if(((cljs.core._EQ_.cljs$core$IFn$_invoke$arity$2(new cljs.core.Keyword(null,"client-disconnect","client-disconnect",640227957),event_op)) && (cljs.core._EQ_.cljs$core$IFn$_invoke$arity$2(client_id,shadow.cljs.devtools.client.env.worker_client_id)))){
shadow.cljs.devtools.client.hud.connection_error_clear_BANG_();

return shadow.cljs.devtools.client.hud.connection_error("The watch for this build was stopped!");
} else {
if(cljs.core._EQ_.cljs$core$IFn$_invoke$arity$2(new cljs.core.Keyword(null,"client-connect","client-connect",-1113973888),event_op)){
shadow.cljs.devtools.client.hud.connection_error_clear_BANG_();

return shadow.cljs.devtools.client.hud.connection_error("The watch for this build was restarted. Reload required!");
} else {
return null;
}
}
})], null)], null));

return svc;
}),(function (p__42570){
var map__42571 = p__42570;
var map__42571__$1 = cljs.core.__destructure_map(map__42571);
var svc = map__42571__$1;
var runtime = cljs.core.get.cljs$core$IFn$_invoke$arity$2(map__42571__$1,new cljs.core.Keyword(null,"runtime","runtime",-1331573996));
return shadow.remote.runtime.api.del_extension(runtime,new cljs.core.Keyword("shadow.cljs.devtools.client.browser","client","shadow.cljs.devtools.client.browser/client",-1461019282));
}));

shadow.cljs.devtools.client.shared.init_runtime_BANG_(shadow.cljs.devtools.client.browser.client_info,shadow.cljs.devtools.client.websocket.start,shadow.cljs.devtools.client.websocket.send,shadow.cljs.devtools.client.websocket.stop);
} else {
}

//# sourceMappingURL=shadow.cljs.devtools.client.browser.js.map
