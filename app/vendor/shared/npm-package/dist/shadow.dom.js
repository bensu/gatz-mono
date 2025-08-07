var $CLJS = require("./cljs_env");
var $jscomp = $CLJS.$jscomp;
var COMPILED = false;
require("./cljs.core.js");
require("./clojure.string.js");
var cognitect=$CLJS.cognitect || ($CLJS.cognitect = {});
var clojure=$CLJS.clojure || ($CLJS.clojure = {});
var crdt=$CLJS.crdt || ($CLJS.crdt = {});
var cljs=$CLJS.cljs || ($CLJS.cljs = {});
var shadow=$CLJS.shadow || ($CLJS.shadow = {});
var goog=$CLJS.goog || ($CLJS.goog = {});
var gatz=$CLJS.gatz || ($CLJS.gatz = {});
var medley=$CLJS.medley || ($CLJS.medley = {});
var com=$CLJS.com || ($CLJS.com = {});

$CLJS.SHADOW_ENV.setLoaded("shadow.dom.js");

goog.provide('shadow.dom');
shadow.dom.transition_supported_QMARK_ = true;

/**
 * @interface
 */
shadow.dom.IElement = function(){};

var shadow$dom$IElement$_to_dom$dyn_33772 = (function (this$){
var x__5350__auto__ = (((this$ == null))?null:this$);
var m__5351__auto__ = (shadow.dom._to_dom[goog.typeOf(x__5350__auto__)]);
if((!((m__5351__auto__ == null)))){
return (m__5351__auto__.cljs$core$IFn$_invoke$arity$1 ? m__5351__auto__.cljs$core$IFn$_invoke$arity$1(this$) : m__5351__auto__.call(null, this$));
} else {
var m__5349__auto__ = (shadow.dom._to_dom["_"]);
if((!((m__5349__auto__ == null)))){
return (m__5349__auto__.cljs$core$IFn$_invoke$arity$1 ? m__5349__auto__.cljs$core$IFn$_invoke$arity$1(this$) : m__5349__auto__.call(null, this$));
} else {
throw cljs.core.missing_protocol("IElement.-to-dom",this$);
}
}
});
shadow.dom._to_dom = (function shadow$dom$_to_dom(this$){
if((((!((this$ == null)))) && ((!((this$.shadow$dom$IElement$_to_dom$arity$1 == null)))))){
return this$.shadow$dom$IElement$_to_dom$arity$1(this$);
} else {
return shadow$dom$IElement$_to_dom$dyn_33772(this$);
}
});


/**
 * @interface
 */
shadow.dom.SVGElement = function(){};

var shadow$dom$SVGElement$_to_svg$dyn_33777 = (function (this$){
var x__5350__auto__ = (((this$ == null))?null:this$);
var m__5351__auto__ = (shadow.dom._to_svg[goog.typeOf(x__5350__auto__)]);
if((!((m__5351__auto__ == null)))){
return (m__5351__auto__.cljs$core$IFn$_invoke$arity$1 ? m__5351__auto__.cljs$core$IFn$_invoke$arity$1(this$) : m__5351__auto__.call(null, this$));
} else {
var m__5349__auto__ = (shadow.dom._to_svg["_"]);
if((!((m__5349__auto__ == null)))){
return (m__5349__auto__.cljs$core$IFn$_invoke$arity$1 ? m__5349__auto__.cljs$core$IFn$_invoke$arity$1(this$) : m__5349__auto__.call(null, this$));
} else {
throw cljs.core.missing_protocol("SVGElement.-to-svg",this$);
}
}
});
shadow.dom._to_svg = (function shadow$dom$_to_svg(this$){
if((((!((this$ == null)))) && ((!((this$.shadow$dom$SVGElement$_to_svg$arity$1 == null)))))){
return this$.shadow$dom$SVGElement$_to_svg$arity$1(this$);
} else {
return shadow$dom$SVGElement$_to_svg$dyn_33777(this$);
}
});

shadow.dom.lazy_native_coll_seq = (function shadow$dom$lazy_native_coll_seq(coll,idx){
if((idx < coll.length)){
return (new cljs.core.LazySeq(null,(function (){
return cljs.core.cons((coll[idx]),(function (){var G__32924 = coll;
var G__32925 = (idx + (1));
return (shadow.dom.lazy_native_coll_seq.cljs$core$IFn$_invoke$arity$2 ? shadow.dom.lazy_native_coll_seq.cljs$core$IFn$_invoke$arity$2(G__32924,G__32925) : shadow.dom.lazy_native_coll_seq.call(null, G__32924,G__32925));
})());
}),null,null));
} else {
return null;
}
});

/**
* @constructor
 * @implements {cljs.core.IIndexed}
 * @implements {cljs.core.ICounted}
 * @implements {cljs.core.ISeqable}
 * @implements {cljs.core.IDeref}
 * @implements {shadow.dom.IElement}
*/
shadow.dom.NativeColl = (function (coll){
this.coll = coll;
this.cljs$lang$protocol_mask$partition0$ = 8421394;
this.cljs$lang$protocol_mask$partition1$ = 0;
});
(shadow.dom.NativeColl.prototype.cljs$core$IDeref$_deref$arity$1 = (function (this$){
var self__ = this;
var this$__$1 = this;
return self__.coll;
}));

(shadow.dom.NativeColl.prototype.cljs$core$IIndexed$_nth$arity$2 = (function (this$,n){
var self__ = this;
var this$__$1 = this;
return (self__.coll[n]);
}));

(shadow.dom.NativeColl.prototype.cljs$core$IIndexed$_nth$arity$3 = (function (this$,n,not_found){
var self__ = this;
var this$__$1 = this;
var or__5002__auto__ = (self__.coll[n]);
if(cljs.core.truth_(or__5002__auto__)){
return or__5002__auto__;
} else {
return not_found;
}
}));

(shadow.dom.NativeColl.prototype.cljs$core$ICounted$_count$arity$1 = (function (this$){
var self__ = this;
var this$__$1 = this;
return self__.coll.length;
}));

(shadow.dom.NativeColl.prototype.cljs$core$ISeqable$_seq$arity$1 = (function (this$){
var self__ = this;
var this$__$1 = this;
return shadow.dom.lazy_native_coll_seq(self__.coll,(0));
}));

(shadow.dom.NativeColl.prototype.shadow$dom$IElement$ = cljs.core.PROTOCOL_SENTINEL);

(shadow.dom.NativeColl.prototype.shadow$dom$IElement$_to_dom$arity$1 = (function (this$){
var self__ = this;
var this$__$1 = this;
return self__.coll;
}));

(shadow.dom.NativeColl.getBasis = (function (){
return new cljs.core.PersistentVector(null, 1, 5, cljs.core.PersistentVector.EMPTY_NODE, [new cljs.core.Symbol(null,"coll","coll",-1006698606,null)], null);
}));

(shadow.dom.NativeColl.cljs$lang$type = true);

(shadow.dom.NativeColl.cljs$lang$ctorStr = "shadow.dom/NativeColl");

(shadow.dom.NativeColl.cljs$lang$ctorPrWriter = (function (this__5287__auto__,writer__5288__auto__,opt__5289__auto__){
return cljs.core._write(writer__5288__auto__,"shadow.dom/NativeColl");
}));

/**
 * Positional factory function for shadow.dom/NativeColl.
 */
shadow.dom.__GT_NativeColl = (function shadow$dom$__GT_NativeColl(coll){
return (new shadow.dom.NativeColl(coll));
});

shadow.dom.native_coll = (function shadow$dom$native_coll(coll){
return (new shadow.dom.NativeColl(coll));
});
shadow.dom.dom_node = (function shadow$dom$dom_node(el){
if((el == null)){
return null;
} else {
if((((!((el == null))))?((((false) || ((cljs.core.PROTOCOL_SENTINEL === el.shadow$dom$IElement$))))?true:false):false)){
return el.shadow$dom$IElement$_to_dom$arity$1(null, );
} else {
if(typeof el === 'string'){
return document.createTextNode(el);
} else {
if(typeof el === 'number'){
return document.createTextNode(cljs.core.str.cljs$core$IFn$_invoke$arity$1(el));
} else {
return el;

}
}
}
}
});
shadow.dom.query_one = (function shadow$dom$query_one(var_args){
var G__32948 = arguments.length;
switch (G__32948) {
case 1:
return shadow.dom.query_one.cljs$core$IFn$_invoke$arity$1((arguments[(0)]));

break;
case 2:
return shadow.dom.query_one.cljs$core$IFn$_invoke$arity$2((arguments[(0)]),(arguments[(1)]));

break;
default:
throw (new Error(["Invalid arity: ",cljs.core.str.cljs$core$IFn$_invoke$arity$1(arguments.length)].join('')));

}
});

(shadow.dom.query_one.cljs$core$IFn$_invoke$arity$1 = (function (sel){
return document.querySelector(sel);
}));

(shadow.dom.query_one.cljs$core$IFn$_invoke$arity$2 = (function (sel,root){
return shadow.dom.dom_node(root).querySelector(sel);
}));

(shadow.dom.query_one.cljs$lang$maxFixedArity = 2);

shadow.dom.query = (function shadow$dom$query(var_args){
var G__32952 = arguments.length;
switch (G__32952) {
case 1:
return shadow.dom.query.cljs$core$IFn$_invoke$arity$1((arguments[(0)]));

break;
case 2:
return shadow.dom.query.cljs$core$IFn$_invoke$arity$2((arguments[(0)]),(arguments[(1)]));

break;
default:
throw (new Error(["Invalid arity: ",cljs.core.str.cljs$core$IFn$_invoke$arity$1(arguments.length)].join('')));

}
});

(shadow.dom.query.cljs$core$IFn$_invoke$arity$1 = (function (sel){
return (new shadow.dom.NativeColl(document.querySelectorAll(sel)));
}));

(shadow.dom.query.cljs$core$IFn$_invoke$arity$2 = (function (sel,root){
return (new shadow.dom.NativeColl(shadow.dom.dom_node(root).querySelectorAll(sel)));
}));

(shadow.dom.query.cljs$lang$maxFixedArity = 2);

shadow.dom.by_id = (function shadow$dom$by_id(var_args){
var G__32957 = arguments.length;
switch (G__32957) {
case 2:
return shadow.dom.by_id.cljs$core$IFn$_invoke$arity$2((arguments[(0)]),(arguments[(1)]));

break;
case 1:
return shadow.dom.by_id.cljs$core$IFn$_invoke$arity$1((arguments[(0)]));

break;
default:
throw (new Error(["Invalid arity: ",cljs.core.str.cljs$core$IFn$_invoke$arity$1(arguments.length)].join('')));

}
});

(shadow.dom.by_id.cljs$core$IFn$_invoke$arity$2 = (function (id,el){
return shadow.dom.dom_node(el).getElementById(id);
}));

(shadow.dom.by_id.cljs$core$IFn$_invoke$arity$1 = (function (id){
return document.getElementById(id);
}));

(shadow.dom.by_id.cljs$lang$maxFixedArity = 2);

shadow.dom.build = shadow.dom.dom_node;
shadow.dom.ev_stop = (function shadow$dom$ev_stop(var_args){
var G__32962 = arguments.length;
switch (G__32962) {
case 1:
return shadow.dom.ev_stop.cljs$core$IFn$_invoke$arity$1((arguments[(0)]));

break;
case 2:
return shadow.dom.ev_stop.cljs$core$IFn$_invoke$arity$2((arguments[(0)]),(arguments[(1)]));

break;
case 4:
return shadow.dom.ev_stop.cljs$core$IFn$_invoke$arity$4((arguments[(0)]),(arguments[(1)]),(arguments[(2)]),(arguments[(3)]));

break;
default:
throw (new Error(["Invalid arity: ",cljs.core.str.cljs$core$IFn$_invoke$arity$1(arguments.length)].join('')));

}
});

(shadow.dom.ev_stop.cljs$core$IFn$_invoke$arity$1 = (function (e){
if(cljs.core.truth_(e.stopPropagation)){
e.stopPropagation();

e.preventDefault();
} else {
(e.cancelBubble = true);

(e.returnValue = false);
}

return e;
}));

(shadow.dom.ev_stop.cljs$core$IFn$_invoke$arity$2 = (function (e,el){
shadow.dom.ev_stop.cljs$core$IFn$_invoke$arity$1(e);

return el;
}));

(shadow.dom.ev_stop.cljs$core$IFn$_invoke$arity$4 = (function (e,el,scope,owner){
shadow.dom.ev_stop.cljs$core$IFn$_invoke$arity$1(e);

return el;
}));

(shadow.dom.ev_stop.cljs$lang$maxFixedArity = 4);

/**
 * check wether a parent node (or the document) contains the child
 */
shadow.dom.contains_QMARK_ = (function shadow$dom$contains_QMARK_(var_args){
var G__32965 = arguments.length;
switch (G__32965) {
case 1:
return shadow.dom.contains_QMARK_.cljs$core$IFn$_invoke$arity$1((arguments[(0)]));

break;
case 2:
return shadow.dom.contains_QMARK_.cljs$core$IFn$_invoke$arity$2((arguments[(0)]),(arguments[(1)]));

break;
default:
throw (new Error(["Invalid arity: ",cljs.core.str.cljs$core$IFn$_invoke$arity$1(arguments.length)].join('')));

}
});

(shadow.dom.contains_QMARK_.cljs$core$IFn$_invoke$arity$1 = (function (el){
return goog.dom.contains(document,shadow.dom.dom_node(el));
}));

(shadow.dom.contains_QMARK_.cljs$core$IFn$_invoke$arity$2 = (function (parent,el){
return goog.dom.contains(shadow.dom.dom_node(parent),shadow.dom.dom_node(el));
}));

(shadow.dom.contains_QMARK_.cljs$lang$maxFixedArity = 2);

shadow.dom.add_class = (function shadow$dom$add_class(el,cls){
return goog.dom.classlist.add(shadow.dom.dom_node(el),cls);
});
shadow.dom.remove_class = (function shadow$dom$remove_class(el,cls){
return goog.dom.classlist.remove(shadow.dom.dom_node(el),cls);
});
shadow.dom.toggle_class = (function shadow$dom$toggle_class(var_args){
var G__32982 = arguments.length;
switch (G__32982) {
case 2:
return shadow.dom.toggle_class.cljs$core$IFn$_invoke$arity$2((arguments[(0)]),(arguments[(1)]));

break;
case 3:
return shadow.dom.toggle_class.cljs$core$IFn$_invoke$arity$3((arguments[(0)]),(arguments[(1)]),(arguments[(2)]));

break;
default:
throw (new Error(["Invalid arity: ",cljs.core.str.cljs$core$IFn$_invoke$arity$1(arguments.length)].join('')));

}
});

(shadow.dom.toggle_class.cljs$core$IFn$_invoke$arity$2 = (function (el,cls){
return goog.dom.classlist.toggle(shadow.dom.dom_node(el),cls);
}));

(shadow.dom.toggle_class.cljs$core$IFn$_invoke$arity$3 = (function (el,cls,v){
if(cljs.core.truth_(v)){
return shadow.dom.add_class(el,cls);
} else {
return shadow.dom.remove_class(el,cls);
}
}));

(shadow.dom.toggle_class.cljs$lang$maxFixedArity = 3);

shadow.dom.dom_listen = (cljs.core.truth_((function (){var or__5002__auto__ = (!((typeof document !== 'undefined')));
if(or__5002__auto__){
return or__5002__auto__;
} else {
return document.addEventListener;
}
})())?(function shadow$dom$dom_listen_good(el,ev,handler){
return el.addEventListener(ev,handler,false);
}):(function shadow$dom$dom_listen_ie(el,ev,handler){
try{return el.attachEvent(["on",cljs.core.str.cljs$core$IFn$_invoke$arity$1(ev)].join(''),(function (e){
return (handler.cljs$core$IFn$_invoke$arity$2 ? handler.cljs$core$IFn$_invoke$arity$2(e,el) : handler.call(null, e,el));
}));
}catch (e32986){if((e32986 instanceof Object)){
var e = e32986;
return console.log("didnt support attachEvent",el,e);
} else {
throw e32986;

}
}}));
shadow.dom.dom_listen_remove = (cljs.core.truth_((function (){var or__5002__auto__ = (!((typeof document !== 'undefined')));
if(or__5002__auto__){
return or__5002__auto__;
} else {
return document.removeEventListener;
}
})())?(function shadow$dom$dom_listen_remove_good(el,ev,handler){
return el.removeEventListener(ev,handler,false);
}):(function shadow$dom$dom_listen_remove_ie(el,ev,handler){
return el.detachEvent(["on",cljs.core.str.cljs$core$IFn$_invoke$arity$1(ev)].join(''),handler);
}));
shadow.dom.on_query = (function shadow$dom$on_query(root_el,ev,selector,handler){
var seq__32987 = cljs.core.seq(shadow.dom.query.cljs$core$IFn$_invoke$arity$2(selector,root_el));
var chunk__32988 = null;
var count__32989 = (0);
var i__32990 = (0);
while(true){
if((i__32990 < count__32989)){
var el = chunk__32988.cljs$core$IIndexed$_nth$arity$2(null, i__32990);
var handler_33815__$1 = ((function (seq__32987,chunk__32988,count__32989,i__32990,el){
return (function (e){
return (handler.cljs$core$IFn$_invoke$arity$2 ? handler.cljs$core$IFn$_invoke$arity$2(e,el) : handler.call(null, e,el));
});})(seq__32987,chunk__32988,count__32989,i__32990,el))
;
shadow.dom.dom_listen(el,cljs.core.name(ev),handler_33815__$1);


var G__33816 = seq__32987;
var G__33817 = chunk__32988;
var G__33818 = count__32989;
var G__33819 = (i__32990 + (1));
seq__32987 = G__33816;
chunk__32988 = G__33817;
count__32989 = G__33818;
i__32990 = G__33819;
continue;
} else {
var temp__5804__auto__ = cljs.core.seq(seq__32987);
if(temp__5804__auto__){
var seq__32987__$1 = temp__5804__auto__;
if(cljs.core.chunked_seq_QMARK_(seq__32987__$1)){
var c__5525__auto__ = cljs.core.chunk_first(seq__32987__$1);
var G__33820 = cljs.core.chunk_rest(seq__32987__$1);
var G__33821 = c__5525__auto__;
var G__33822 = cljs.core.count(c__5525__auto__);
var G__33823 = (0);
seq__32987 = G__33820;
chunk__32988 = G__33821;
count__32989 = G__33822;
i__32990 = G__33823;
continue;
} else {
var el = cljs.core.first(seq__32987__$1);
var handler_33824__$1 = ((function (seq__32987,chunk__32988,count__32989,i__32990,el,seq__32987__$1,temp__5804__auto__){
return (function (e){
return (handler.cljs$core$IFn$_invoke$arity$2 ? handler.cljs$core$IFn$_invoke$arity$2(e,el) : handler.call(null, e,el));
});})(seq__32987,chunk__32988,count__32989,i__32990,el,seq__32987__$1,temp__5804__auto__))
;
shadow.dom.dom_listen(el,cljs.core.name(ev),handler_33824__$1);


var G__33825 = cljs.core.next(seq__32987__$1);
var G__33826 = null;
var G__33827 = (0);
var G__33828 = (0);
seq__32987 = G__33825;
chunk__32988 = G__33826;
count__32989 = G__33827;
i__32990 = G__33828;
continue;
}
} else {
return null;
}
}
break;
}
});
shadow.dom.on = (function shadow$dom$on(var_args){
var G__32999 = arguments.length;
switch (G__32999) {
case 3:
return shadow.dom.on.cljs$core$IFn$_invoke$arity$3((arguments[(0)]),(arguments[(1)]),(arguments[(2)]));

break;
case 4:
return shadow.dom.on.cljs$core$IFn$_invoke$arity$4((arguments[(0)]),(arguments[(1)]),(arguments[(2)]),(arguments[(3)]));

break;
default:
throw (new Error(["Invalid arity: ",cljs.core.str.cljs$core$IFn$_invoke$arity$1(arguments.length)].join('')));

}
});

(shadow.dom.on.cljs$core$IFn$_invoke$arity$3 = (function (el,ev,handler){
return shadow.dom.on.cljs$core$IFn$_invoke$arity$4(el,ev,handler,false);
}));

(shadow.dom.on.cljs$core$IFn$_invoke$arity$4 = (function (el,ev,handler,capture){
if(cljs.core.vector_QMARK_(ev)){
return shadow.dom.on_query(el,cljs.core.first(ev),cljs.core.second(ev),handler);
} else {
var handler__$1 = (function (e){
return (handler.cljs$core$IFn$_invoke$arity$2 ? handler.cljs$core$IFn$_invoke$arity$2(e,el) : handler.call(null, e,el));
});
return shadow.dom.dom_listen(shadow.dom.dom_node(el),cljs.core.name(ev),handler__$1);
}
}));

(shadow.dom.on.cljs$lang$maxFixedArity = 4);

shadow.dom.remove_event_handler = (function shadow$dom$remove_event_handler(el,ev,handler){
return shadow.dom.dom_listen_remove(shadow.dom.dom_node(el),cljs.core.name(ev),handler);
});
shadow.dom.add_event_listeners = (function shadow$dom$add_event_listeners(el,events){
var seq__33007 = cljs.core.seq(events);
var chunk__33008 = null;
var count__33009 = (0);
var i__33010 = (0);
while(true){
if((i__33010 < count__33009)){
var vec__33022 = chunk__33008.cljs$core$IIndexed$_nth$arity$2(null, i__33010);
var k = cljs.core.nth.cljs$core$IFn$_invoke$arity$3(vec__33022,(0),null);
var v = cljs.core.nth.cljs$core$IFn$_invoke$arity$3(vec__33022,(1),null);
shadow.dom.on.cljs$core$IFn$_invoke$arity$3(el,k,v);


var G__33835 = seq__33007;
var G__33836 = chunk__33008;
var G__33837 = count__33009;
var G__33838 = (i__33010 + (1));
seq__33007 = G__33835;
chunk__33008 = G__33836;
count__33009 = G__33837;
i__33010 = G__33838;
continue;
} else {
var temp__5804__auto__ = cljs.core.seq(seq__33007);
if(temp__5804__auto__){
var seq__33007__$1 = temp__5804__auto__;
if(cljs.core.chunked_seq_QMARK_(seq__33007__$1)){
var c__5525__auto__ = cljs.core.chunk_first(seq__33007__$1);
var G__33839 = cljs.core.chunk_rest(seq__33007__$1);
var G__33840 = c__5525__auto__;
var G__33841 = cljs.core.count(c__5525__auto__);
var G__33842 = (0);
seq__33007 = G__33839;
chunk__33008 = G__33840;
count__33009 = G__33841;
i__33010 = G__33842;
continue;
} else {
var vec__33025 = cljs.core.first(seq__33007__$1);
var k = cljs.core.nth.cljs$core$IFn$_invoke$arity$3(vec__33025,(0),null);
var v = cljs.core.nth.cljs$core$IFn$_invoke$arity$3(vec__33025,(1),null);
shadow.dom.on.cljs$core$IFn$_invoke$arity$3(el,k,v);


var G__33845 = cljs.core.next(seq__33007__$1);
var G__33846 = null;
var G__33847 = (0);
var G__33848 = (0);
seq__33007 = G__33845;
chunk__33008 = G__33846;
count__33009 = G__33847;
i__33010 = G__33848;
continue;
}
} else {
return null;
}
}
break;
}
});
shadow.dom.set_style = (function shadow$dom$set_style(el,styles){
var dom = shadow.dom.dom_node(el);
var seq__33032 = cljs.core.seq(styles);
var chunk__33033 = null;
var count__33034 = (0);
var i__33035 = (0);
while(true){
if((i__33035 < count__33034)){
var vec__33061 = chunk__33033.cljs$core$IIndexed$_nth$arity$2(null, i__33035);
var k = cljs.core.nth.cljs$core$IFn$_invoke$arity$3(vec__33061,(0),null);
var v = cljs.core.nth.cljs$core$IFn$_invoke$arity$3(vec__33061,(1),null);
goog.style.setStyle(dom,cljs.core.name(k),(((v == null))?"":v));


var G__33852 = seq__33032;
var G__33853 = chunk__33033;
var G__33854 = count__33034;
var G__33855 = (i__33035 + (1));
seq__33032 = G__33852;
chunk__33033 = G__33853;
count__33034 = G__33854;
i__33035 = G__33855;
continue;
} else {
var temp__5804__auto__ = cljs.core.seq(seq__33032);
if(temp__5804__auto__){
var seq__33032__$1 = temp__5804__auto__;
if(cljs.core.chunked_seq_QMARK_(seq__33032__$1)){
var c__5525__auto__ = cljs.core.chunk_first(seq__33032__$1);
var G__33859 = cljs.core.chunk_rest(seq__33032__$1);
var G__33860 = c__5525__auto__;
var G__33861 = cljs.core.count(c__5525__auto__);
var G__33862 = (0);
seq__33032 = G__33859;
chunk__33033 = G__33860;
count__33034 = G__33861;
i__33035 = G__33862;
continue;
} else {
var vec__33067 = cljs.core.first(seq__33032__$1);
var k = cljs.core.nth.cljs$core$IFn$_invoke$arity$3(vec__33067,(0),null);
var v = cljs.core.nth.cljs$core$IFn$_invoke$arity$3(vec__33067,(1),null);
goog.style.setStyle(dom,cljs.core.name(k),(((v == null))?"":v));


var G__33865 = cljs.core.next(seq__33032__$1);
var G__33866 = null;
var G__33867 = (0);
var G__33868 = (0);
seq__33032 = G__33865;
chunk__33033 = G__33866;
count__33034 = G__33867;
i__33035 = G__33868;
continue;
}
} else {
return null;
}
}
break;
}
});
shadow.dom.set_attr_STAR_ = (function shadow$dom$set_attr_STAR_(el,key,value){
var G__33070_33877 = key;
var G__33070_33878__$1 = (((G__33070_33877 instanceof cljs.core.Keyword))?G__33070_33877.fqn:null);
switch (G__33070_33878__$1) {
case "id":
(el.id = cljs.core.str.cljs$core$IFn$_invoke$arity$1(value));

break;
case "class":
(el.className = cljs.core.str.cljs$core$IFn$_invoke$arity$1(value));

break;
case "for":
(el.htmlFor = value);

break;
case "cellpadding":
el.setAttribute("cellPadding",value);

break;
case "cellspacing":
el.setAttribute("cellSpacing",value);

break;
case "colspan":
el.setAttribute("colSpan",value);

break;
case "frameborder":
el.setAttribute("frameBorder",value);

break;
case "height":
el.setAttribute("height",value);

break;
case "maxlength":
el.setAttribute("maxLength",value);

break;
case "role":
el.setAttribute("role",value);

break;
case "rowspan":
el.setAttribute("rowSpan",value);

break;
case "type":
el.setAttribute("type",value);

break;
case "usemap":
el.setAttribute("useMap",value);

break;
case "valign":
el.setAttribute("vAlign",value);

break;
case "width":
el.setAttribute("width",value);

break;
case "on":
shadow.dom.add_event_listeners(el,value);

break;
case "style":
if((value == null)){
} else {
if(typeof value === 'string'){
el.setAttribute("style",value);
} else {
if(cljs.core.map_QMARK_(value)){
shadow.dom.set_style(el,value);
} else {
goog.style.setStyle(el,value);

}
}
}

break;
default:
var ks_33886 = cljs.core.name(key);
if(cljs.core.truth_((function (){var or__5002__auto__ = goog.string.startsWith(ks_33886,"data-");
if(cljs.core.truth_(or__5002__auto__)){
return or__5002__auto__;
} else {
return goog.string.startsWith(ks_33886,"aria-");
}
})())){
el.setAttribute(ks_33886,value);
} else {
(el[ks_33886] = value);
}

}

return el;
});
shadow.dom.set_attrs = (function shadow$dom$set_attrs(el,attrs){
return cljs.core.reduce_kv((function (el__$1,key,value){
shadow.dom.set_attr_STAR_(el__$1,key,value);

return el__$1;
}),shadow.dom.dom_node(el),attrs);
});
shadow.dom.set_attr = (function shadow$dom$set_attr(el,key,value){
return shadow.dom.set_attr_STAR_(shadow.dom.dom_node(el),key,value);
});
shadow.dom.has_class_QMARK_ = (function shadow$dom$has_class_QMARK_(el,cls){
return goog.dom.classlist.contains(shadow.dom.dom_node(el),cls);
});
shadow.dom.merge_class_string = (function shadow$dom$merge_class_string(current,extra_class){
if(cljs.core.seq(current)){
return [cljs.core.str.cljs$core$IFn$_invoke$arity$1(current)," ",cljs.core.str.cljs$core$IFn$_invoke$arity$1(extra_class)].join('');
} else {
return extra_class;
}
});
shadow.dom.parse_tag = (function shadow$dom$parse_tag(spec){
var spec__$1 = cljs.core.name(spec);
var fdot = spec__$1.indexOf(".");
var fhash = spec__$1.indexOf("#");
if(((cljs.core._EQ_.cljs$core$IFn$_invoke$arity$2((-1),fdot)) && (cljs.core._EQ_.cljs$core$IFn$_invoke$arity$2((-1),fhash)))){
return new cljs.core.PersistentVector(null, 3, 5, cljs.core.PersistentVector.EMPTY_NODE, [spec__$1,null,null], null);
} else {
if(cljs.core._EQ_.cljs$core$IFn$_invoke$arity$2((-1),fhash)){
return new cljs.core.PersistentVector(null, 3, 5, cljs.core.PersistentVector.EMPTY_NODE, [spec__$1.substring((0),fdot),null,clojure.string.replace(spec__$1.substring((fdot + (1))),/\./," ")], null);
} else {
if(cljs.core._EQ_.cljs$core$IFn$_invoke$arity$2((-1),fdot)){
return new cljs.core.PersistentVector(null, 3, 5, cljs.core.PersistentVector.EMPTY_NODE, [spec__$1.substring((0),fhash),spec__$1.substring((fhash + (1))),null], null);
} else {
if((fhash > fdot)){
throw ["cant have id after class?",spec__$1].join('');
} else {
return new cljs.core.PersistentVector(null, 3, 5, cljs.core.PersistentVector.EMPTY_NODE, [spec__$1.substring((0),fhash),spec__$1.substring((fhash + (1)),fdot),clojure.string.replace(spec__$1.substring((fdot + (1))),/\./," ")], null);

}
}
}
}
});
shadow.dom.create_dom_node = (function shadow$dom$create_dom_node(tag_def,p__33085){
var map__33090 = p__33085;
var map__33090__$1 = cljs.core.__destructure_map(map__33090);
var props = map__33090__$1;
var class$ = cljs.core.get.cljs$core$IFn$_invoke$arity$2(map__33090__$1,new cljs.core.Keyword(null,"class","class",-2030961996));
var tag_props = ({});
var vec__33091 = shadow.dom.parse_tag(tag_def);
var tag_name = cljs.core.nth.cljs$core$IFn$_invoke$arity$3(vec__33091,(0),null);
var tag_id = cljs.core.nth.cljs$core$IFn$_invoke$arity$3(vec__33091,(1),null);
var tag_classes = cljs.core.nth.cljs$core$IFn$_invoke$arity$3(vec__33091,(2),null);
if(cljs.core.truth_(tag_id)){
(tag_props["id"] = tag_id);
} else {
}

if(cljs.core.truth_(tag_classes)){
(tag_props["class"] = shadow.dom.merge_class_string(class$,tag_classes));
} else {
}

var G__33094 = goog.dom.createDom(tag_name,tag_props);
shadow.dom.set_attrs(G__33094,cljs.core.dissoc.cljs$core$IFn$_invoke$arity$2(props,new cljs.core.Keyword(null,"class","class",-2030961996)));

return G__33094;
});
shadow.dom.append = (function shadow$dom$append(var_args){
var G__33097 = arguments.length;
switch (G__33097) {
case 1:
return shadow.dom.append.cljs$core$IFn$_invoke$arity$1((arguments[(0)]));

break;
case 2:
return shadow.dom.append.cljs$core$IFn$_invoke$arity$2((arguments[(0)]),(arguments[(1)]));

break;
default:
throw (new Error(["Invalid arity: ",cljs.core.str.cljs$core$IFn$_invoke$arity$1(arguments.length)].join('')));

}
});

(shadow.dom.append.cljs$core$IFn$_invoke$arity$1 = (function (node){
if(cljs.core.truth_(node)){
var temp__5804__auto__ = shadow.dom.dom_node(node);
if(cljs.core.truth_(temp__5804__auto__)){
var n = temp__5804__auto__;
document.body.appendChild(n);

return n;
} else {
return null;
}
} else {
return null;
}
}));

(shadow.dom.append.cljs$core$IFn$_invoke$arity$2 = (function (el,node){
if(cljs.core.truth_(node)){
var temp__5804__auto__ = shadow.dom.dom_node(node);
if(cljs.core.truth_(temp__5804__auto__)){
var n = temp__5804__auto__;
shadow.dom.dom_node(el).appendChild(n);

return n;
} else {
return null;
}
} else {
return null;
}
}));

(shadow.dom.append.cljs$lang$maxFixedArity = 2);

shadow.dom.destructure_node = (function shadow$dom$destructure_node(create_fn,p__33098){
var vec__33099 = p__33098;
var seq__33100 = cljs.core.seq(vec__33099);
var first__33101 = cljs.core.first(seq__33100);
var seq__33100__$1 = cljs.core.next(seq__33100);
var nn = first__33101;
var first__33101__$1 = cljs.core.first(seq__33100__$1);
var seq__33100__$2 = cljs.core.next(seq__33100__$1);
var np = first__33101__$1;
var nc = seq__33100__$2;
var node = vec__33099;
if((nn instanceof cljs.core.Keyword)){
} else {
throw cljs.core.ex_info.cljs$core$IFn$_invoke$arity$2("invalid dom node",new cljs.core.PersistentArrayMap(null, 1, [new cljs.core.Keyword(null,"node","node",581201198),node], null));
}

if((((np == null)) && ((nc == null)))){
return new cljs.core.PersistentVector(null, 2, 5, cljs.core.PersistentVector.EMPTY_NODE, [(function (){var G__33102 = nn;
var G__33103 = cljs.core.PersistentArrayMap.EMPTY;
return (create_fn.cljs$core$IFn$_invoke$arity$2 ? create_fn.cljs$core$IFn$_invoke$arity$2(G__33102,G__33103) : create_fn.call(null, G__33102,G__33103));
})(),cljs.core.List.EMPTY], null);
} else {
if(cljs.core.map_QMARK_(np)){
return new cljs.core.PersistentVector(null, 2, 5, cljs.core.PersistentVector.EMPTY_NODE, [(create_fn.cljs$core$IFn$_invoke$arity$2 ? create_fn.cljs$core$IFn$_invoke$arity$2(nn,np) : create_fn.call(null, nn,np)),nc], null);
} else {
return new cljs.core.PersistentVector(null, 2, 5, cljs.core.PersistentVector.EMPTY_NODE, [(function (){var G__33104 = nn;
var G__33105 = cljs.core.PersistentArrayMap.EMPTY;
return (create_fn.cljs$core$IFn$_invoke$arity$2 ? create_fn.cljs$core$IFn$_invoke$arity$2(G__33104,G__33105) : create_fn.call(null, G__33104,G__33105));
})(),cljs.core.conj.cljs$core$IFn$_invoke$arity$2(nc,np)], null);

}
}
});
shadow.dom.make_dom_node = (function shadow$dom$make_dom_node(structure){
var vec__33108 = shadow.dom.destructure_node(shadow.dom.create_dom_node,structure);
var node = cljs.core.nth.cljs$core$IFn$_invoke$arity$3(vec__33108,(0),null);
var node_children = cljs.core.nth.cljs$core$IFn$_invoke$arity$3(vec__33108,(1),null);
var seq__33111_33890 = cljs.core.seq(node_children);
var chunk__33112_33891 = null;
var count__33113_33892 = (0);
var i__33114_33893 = (0);
while(true){
if((i__33114_33893 < count__33113_33892)){
var child_struct_33894 = chunk__33112_33891.cljs$core$IIndexed$_nth$arity$2(null, i__33114_33893);
var children_33895 = shadow.dom.dom_node(child_struct_33894);
if(cljs.core.seq_QMARK_(children_33895)){
var seq__33136_33896 = cljs.core.seq(cljs.core.map.cljs$core$IFn$_invoke$arity$2(shadow.dom.dom_node,children_33895));
var chunk__33138_33897 = null;
var count__33139_33898 = (0);
var i__33140_33899 = (0);
while(true){
if((i__33140_33899 < count__33139_33898)){
var child_33900 = chunk__33138_33897.cljs$core$IIndexed$_nth$arity$2(null, i__33140_33899);
if(cljs.core.truth_(child_33900)){
shadow.dom.append.cljs$core$IFn$_invoke$arity$2(node,child_33900);


var G__33901 = seq__33136_33896;
var G__33902 = chunk__33138_33897;
var G__33903 = count__33139_33898;
var G__33904 = (i__33140_33899 + (1));
seq__33136_33896 = G__33901;
chunk__33138_33897 = G__33902;
count__33139_33898 = G__33903;
i__33140_33899 = G__33904;
continue;
} else {
var G__33905 = seq__33136_33896;
var G__33906 = chunk__33138_33897;
var G__33907 = count__33139_33898;
var G__33908 = (i__33140_33899 + (1));
seq__33136_33896 = G__33905;
chunk__33138_33897 = G__33906;
count__33139_33898 = G__33907;
i__33140_33899 = G__33908;
continue;
}
} else {
var temp__5804__auto___33909 = cljs.core.seq(seq__33136_33896);
if(temp__5804__auto___33909){
var seq__33136_33910__$1 = temp__5804__auto___33909;
if(cljs.core.chunked_seq_QMARK_(seq__33136_33910__$1)){
var c__5525__auto___33911 = cljs.core.chunk_first(seq__33136_33910__$1);
var G__33912 = cljs.core.chunk_rest(seq__33136_33910__$1);
var G__33913 = c__5525__auto___33911;
var G__33914 = cljs.core.count(c__5525__auto___33911);
var G__33915 = (0);
seq__33136_33896 = G__33912;
chunk__33138_33897 = G__33913;
count__33139_33898 = G__33914;
i__33140_33899 = G__33915;
continue;
} else {
var child_33916 = cljs.core.first(seq__33136_33910__$1);
if(cljs.core.truth_(child_33916)){
shadow.dom.append.cljs$core$IFn$_invoke$arity$2(node,child_33916);


var G__33917 = cljs.core.next(seq__33136_33910__$1);
var G__33918 = null;
var G__33919 = (0);
var G__33920 = (0);
seq__33136_33896 = G__33917;
chunk__33138_33897 = G__33918;
count__33139_33898 = G__33919;
i__33140_33899 = G__33920;
continue;
} else {
var G__33921 = cljs.core.next(seq__33136_33910__$1);
var G__33922 = null;
var G__33923 = (0);
var G__33924 = (0);
seq__33136_33896 = G__33921;
chunk__33138_33897 = G__33922;
count__33139_33898 = G__33923;
i__33140_33899 = G__33924;
continue;
}
}
} else {
}
}
break;
}
} else {
shadow.dom.append.cljs$core$IFn$_invoke$arity$2(node,children_33895);
}


var G__33925 = seq__33111_33890;
var G__33926 = chunk__33112_33891;
var G__33927 = count__33113_33892;
var G__33928 = (i__33114_33893 + (1));
seq__33111_33890 = G__33925;
chunk__33112_33891 = G__33926;
count__33113_33892 = G__33927;
i__33114_33893 = G__33928;
continue;
} else {
var temp__5804__auto___33929 = cljs.core.seq(seq__33111_33890);
if(temp__5804__auto___33929){
var seq__33111_33930__$1 = temp__5804__auto___33929;
if(cljs.core.chunked_seq_QMARK_(seq__33111_33930__$1)){
var c__5525__auto___33931 = cljs.core.chunk_first(seq__33111_33930__$1);
var G__33932 = cljs.core.chunk_rest(seq__33111_33930__$1);
var G__33933 = c__5525__auto___33931;
var G__33934 = cljs.core.count(c__5525__auto___33931);
var G__33935 = (0);
seq__33111_33890 = G__33932;
chunk__33112_33891 = G__33933;
count__33113_33892 = G__33934;
i__33114_33893 = G__33935;
continue;
} else {
var child_struct_33936 = cljs.core.first(seq__33111_33930__$1);
var children_33937 = shadow.dom.dom_node(child_struct_33936);
if(cljs.core.seq_QMARK_(children_33937)){
var seq__33144_33938 = cljs.core.seq(cljs.core.map.cljs$core$IFn$_invoke$arity$2(shadow.dom.dom_node,children_33937));
var chunk__33146_33939 = null;
var count__33147_33940 = (0);
var i__33148_33941 = (0);
while(true){
if((i__33148_33941 < count__33147_33940)){
var child_33942 = chunk__33146_33939.cljs$core$IIndexed$_nth$arity$2(null, i__33148_33941);
if(cljs.core.truth_(child_33942)){
shadow.dom.append.cljs$core$IFn$_invoke$arity$2(node,child_33942);


var G__33943 = seq__33144_33938;
var G__33944 = chunk__33146_33939;
var G__33945 = count__33147_33940;
var G__33946 = (i__33148_33941 + (1));
seq__33144_33938 = G__33943;
chunk__33146_33939 = G__33944;
count__33147_33940 = G__33945;
i__33148_33941 = G__33946;
continue;
} else {
var G__33947 = seq__33144_33938;
var G__33948 = chunk__33146_33939;
var G__33949 = count__33147_33940;
var G__33950 = (i__33148_33941 + (1));
seq__33144_33938 = G__33947;
chunk__33146_33939 = G__33948;
count__33147_33940 = G__33949;
i__33148_33941 = G__33950;
continue;
}
} else {
var temp__5804__auto___33951__$1 = cljs.core.seq(seq__33144_33938);
if(temp__5804__auto___33951__$1){
var seq__33144_33952__$1 = temp__5804__auto___33951__$1;
if(cljs.core.chunked_seq_QMARK_(seq__33144_33952__$1)){
var c__5525__auto___33953 = cljs.core.chunk_first(seq__33144_33952__$1);
var G__33954 = cljs.core.chunk_rest(seq__33144_33952__$1);
var G__33955 = c__5525__auto___33953;
var G__33956 = cljs.core.count(c__5525__auto___33953);
var G__33957 = (0);
seq__33144_33938 = G__33954;
chunk__33146_33939 = G__33955;
count__33147_33940 = G__33956;
i__33148_33941 = G__33957;
continue;
} else {
var child_33958 = cljs.core.first(seq__33144_33952__$1);
if(cljs.core.truth_(child_33958)){
shadow.dom.append.cljs$core$IFn$_invoke$arity$2(node,child_33958);


var G__33959 = cljs.core.next(seq__33144_33952__$1);
var G__33960 = null;
var G__33961 = (0);
var G__33962 = (0);
seq__33144_33938 = G__33959;
chunk__33146_33939 = G__33960;
count__33147_33940 = G__33961;
i__33148_33941 = G__33962;
continue;
} else {
var G__33963 = cljs.core.next(seq__33144_33952__$1);
var G__33964 = null;
var G__33965 = (0);
var G__33966 = (0);
seq__33144_33938 = G__33963;
chunk__33146_33939 = G__33964;
count__33147_33940 = G__33965;
i__33148_33941 = G__33966;
continue;
}
}
} else {
}
}
break;
}
} else {
shadow.dom.append.cljs$core$IFn$_invoke$arity$2(node,children_33937);
}


var G__33967 = cljs.core.next(seq__33111_33930__$1);
var G__33968 = null;
var G__33969 = (0);
var G__33970 = (0);
seq__33111_33890 = G__33967;
chunk__33112_33891 = G__33968;
count__33113_33892 = G__33969;
i__33114_33893 = G__33970;
continue;
}
} else {
}
}
break;
}

return node;
});
(cljs.core.Keyword.prototype.shadow$dom$IElement$ = cljs.core.PROTOCOL_SENTINEL);

(cljs.core.Keyword.prototype.shadow$dom$IElement$_to_dom$arity$1 = (function (this$){
var this$__$1 = this;
return shadow.dom.make_dom_node(new cljs.core.PersistentVector(null, 1, 5, cljs.core.PersistentVector.EMPTY_NODE, [this$__$1], null));
}));

(cljs.core.PersistentVector.prototype.shadow$dom$IElement$ = cljs.core.PROTOCOL_SENTINEL);

(cljs.core.PersistentVector.prototype.shadow$dom$IElement$_to_dom$arity$1 = (function (this$){
var this$__$1 = this;
return shadow.dom.make_dom_node(this$__$1);
}));

(cljs.core.LazySeq.prototype.shadow$dom$IElement$ = cljs.core.PROTOCOL_SENTINEL);

(cljs.core.LazySeq.prototype.shadow$dom$IElement$_to_dom$arity$1 = (function (this$){
var this$__$1 = this;
return cljs.core.map.cljs$core$IFn$_invoke$arity$2(shadow.dom._to_dom,this$__$1);
}));
if(cljs.core.truth_(((typeof HTMLElement) != 'undefined'))){
(HTMLElement.prototype.shadow$dom$IElement$ = cljs.core.PROTOCOL_SENTINEL);

(HTMLElement.prototype.shadow$dom$IElement$_to_dom$arity$1 = (function (this$){
var this$__$1 = this;
return this$__$1;
}));
} else {
}
if(cljs.core.truth_(((typeof DocumentFragment) != 'undefined'))){
(DocumentFragment.prototype.shadow$dom$IElement$ = cljs.core.PROTOCOL_SENTINEL);

(DocumentFragment.prototype.shadow$dom$IElement$_to_dom$arity$1 = (function (this$){
var this$__$1 = this;
return this$__$1;
}));
} else {
}
/**
 * clear node children
 */
shadow.dom.reset = (function shadow$dom$reset(node){
return goog.dom.removeChildren(shadow.dom.dom_node(node));
});
shadow.dom.remove = (function shadow$dom$remove(node){
if((((!((node == null))))?(((((node.cljs$lang$protocol_mask$partition0$ & (8388608))) || ((cljs.core.PROTOCOL_SENTINEL === node.cljs$core$ISeqable$))))?true:false):false)){
var seq__33169 = cljs.core.seq(node);
var chunk__33170 = null;
var count__33171 = (0);
var i__33172 = (0);
while(true){
if((i__33172 < count__33171)){
var n = chunk__33170.cljs$core$IIndexed$_nth$arity$2(null, i__33172);
(shadow.dom.remove.cljs$core$IFn$_invoke$arity$1 ? shadow.dom.remove.cljs$core$IFn$_invoke$arity$1(n) : shadow.dom.remove.call(null, n));


var G__33973 = seq__33169;
var G__33974 = chunk__33170;
var G__33975 = count__33171;
var G__33976 = (i__33172 + (1));
seq__33169 = G__33973;
chunk__33170 = G__33974;
count__33171 = G__33975;
i__33172 = G__33976;
continue;
} else {
var temp__5804__auto__ = cljs.core.seq(seq__33169);
if(temp__5804__auto__){
var seq__33169__$1 = temp__5804__auto__;
if(cljs.core.chunked_seq_QMARK_(seq__33169__$1)){
var c__5525__auto__ = cljs.core.chunk_first(seq__33169__$1);
var G__33980 = cljs.core.chunk_rest(seq__33169__$1);
var G__33981 = c__5525__auto__;
var G__33982 = cljs.core.count(c__5525__auto__);
var G__33983 = (0);
seq__33169 = G__33980;
chunk__33170 = G__33981;
count__33171 = G__33982;
i__33172 = G__33983;
continue;
} else {
var n = cljs.core.first(seq__33169__$1);
(shadow.dom.remove.cljs$core$IFn$_invoke$arity$1 ? shadow.dom.remove.cljs$core$IFn$_invoke$arity$1(n) : shadow.dom.remove.call(null, n));


var G__33985 = cljs.core.next(seq__33169__$1);
var G__33986 = null;
var G__33987 = (0);
var G__33988 = (0);
seq__33169 = G__33985;
chunk__33170 = G__33986;
count__33171 = G__33987;
i__33172 = G__33988;
continue;
}
} else {
return null;
}
}
break;
}
} else {
return goog.dom.removeNode(node);
}
});
shadow.dom.replace_node = (function shadow$dom$replace_node(old,new$){
return goog.dom.replaceNode(shadow.dom.dom_node(new$),shadow.dom.dom_node(old));
});
shadow.dom.text = (function shadow$dom$text(var_args){
var G__33189 = arguments.length;
switch (G__33189) {
case 2:
return shadow.dom.text.cljs$core$IFn$_invoke$arity$2((arguments[(0)]),(arguments[(1)]));

break;
case 1:
return shadow.dom.text.cljs$core$IFn$_invoke$arity$1((arguments[(0)]));

break;
default:
throw (new Error(["Invalid arity: ",cljs.core.str.cljs$core$IFn$_invoke$arity$1(arguments.length)].join('')));

}
});

(shadow.dom.text.cljs$core$IFn$_invoke$arity$2 = (function (el,new_text){
return (shadow.dom.dom_node(el).innerText = new_text);
}));

(shadow.dom.text.cljs$core$IFn$_invoke$arity$1 = (function (el){
return shadow.dom.dom_node(el).innerText;
}));

(shadow.dom.text.cljs$lang$maxFixedArity = 2);

shadow.dom.check = (function shadow$dom$check(var_args){
var G__33195 = arguments.length;
switch (G__33195) {
case 1:
return shadow.dom.check.cljs$core$IFn$_invoke$arity$1((arguments[(0)]));

break;
case 2:
return shadow.dom.check.cljs$core$IFn$_invoke$arity$2((arguments[(0)]),(arguments[(1)]));

break;
default:
throw (new Error(["Invalid arity: ",cljs.core.str.cljs$core$IFn$_invoke$arity$1(arguments.length)].join('')));

}
});

(shadow.dom.check.cljs$core$IFn$_invoke$arity$1 = (function (el){
return shadow.dom.check.cljs$core$IFn$_invoke$arity$2(el,true);
}));

(shadow.dom.check.cljs$core$IFn$_invoke$arity$2 = (function (el,checked){
return (shadow.dom.dom_node(el).checked = checked);
}));

(shadow.dom.check.cljs$lang$maxFixedArity = 2);

shadow.dom.checked_QMARK_ = (function shadow$dom$checked_QMARK_(el){
return shadow.dom.dom_node(el).checked;
});
shadow.dom.form_elements = (function shadow$dom$form_elements(el){
return (new shadow.dom.NativeColl(shadow.dom.dom_node(el).elements));
});
shadow.dom.children = (function shadow$dom$children(el){
return (new shadow.dom.NativeColl(shadow.dom.dom_node(el).children));
});
shadow.dom.child_nodes = (function shadow$dom$child_nodes(el){
return (new shadow.dom.NativeColl(shadow.dom.dom_node(el).childNodes));
});
shadow.dom.attr = (function shadow$dom$attr(var_args){
var G__33199 = arguments.length;
switch (G__33199) {
case 2:
return shadow.dom.attr.cljs$core$IFn$_invoke$arity$2((arguments[(0)]),(arguments[(1)]));

break;
case 3:
return shadow.dom.attr.cljs$core$IFn$_invoke$arity$3((arguments[(0)]),(arguments[(1)]),(arguments[(2)]));

break;
default:
throw (new Error(["Invalid arity: ",cljs.core.str.cljs$core$IFn$_invoke$arity$1(arguments.length)].join('')));

}
});

(shadow.dom.attr.cljs$core$IFn$_invoke$arity$2 = (function (el,key){
return shadow.dom.dom_node(el).getAttribute(cljs.core.name(key));
}));

(shadow.dom.attr.cljs$core$IFn$_invoke$arity$3 = (function (el,key,default$){
var or__5002__auto__ = shadow.dom.dom_node(el).getAttribute(cljs.core.name(key));
if(cljs.core.truth_(or__5002__auto__)){
return or__5002__auto__;
} else {
return default$;
}
}));

(shadow.dom.attr.cljs$lang$maxFixedArity = 3);

shadow.dom.del_attr = (function shadow$dom$del_attr(el,key){
return shadow.dom.dom_node(el).removeAttribute(cljs.core.name(key));
});
shadow.dom.data = (function shadow$dom$data(el,key){
return shadow.dom.dom_node(el).getAttribute(["data-",cljs.core.name(key)].join(''));
});
shadow.dom.set_data = (function shadow$dom$set_data(el,key,value){
return shadow.dom.dom_node(el).setAttribute(["data-",cljs.core.name(key)].join(''),cljs.core.str.cljs$core$IFn$_invoke$arity$1(value));
});
shadow.dom.set_html = (function shadow$dom$set_html(node,text){
return (shadow.dom.dom_node(node).innerHTML = text);
});
shadow.dom.get_html = (function shadow$dom$get_html(node){
return shadow.dom.dom_node(node).innerHTML;
});
shadow.dom.fragment = (function shadow$dom$fragment(var_args){
var args__5732__auto__ = [];
var len__5726__auto___34017 = arguments.length;
var i__5727__auto___34019 = (0);
while(true){
if((i__5727__auto___34019 < len__5726__auto___34017)){
args__5732__auto__.push((arguments[i__5727__auto___34019]));

var G__34020 = (i__5727__auto___34019 + (1));
i__5727__auto___34019 = G__34020;
continue;
} else {
}
break;
}

var argseq__5733__auto__ = ((((0) < args__5732__auto__.length))?(new cljs.core.IndexedSeq(args__5732__auto__.slice((0)),(0),null)):null);
return shadow.dom.fragment.cljs$core$IFn$_invoke$arity$variadic(argseq__5733__auto__);
});

(shadow.dom.fragment.cljs$core$IFn$_invoke$arity$variadic = (function (nodes){
var fragment = document.createDocumentFragment();
var seq__33226_34024 = cljs.core.seq(nodes);
var chunk__33227_34025 = null;
var count__33228_34026 = (0);
var i__33229_34027 = (0);
while(true){
if((i__33229_34027 < count__33228_34026)){
var node_34028 = chunk__33227_34025.cljs$core$IIndexed$_nth$arity$2(null, i__33229_34027);
fragment.appendChild(shadow.dom._to_dom(node_34028));


var G__34029 = seq__33226_34024;
var G__34030 = chunk__33227_34025;
var G__34031 = count__33228_34026;
var G__34032 = (i__33229_34027 + (1));
seq__33226_34024 = G__34029;
chunk__33227_34025 = G__34030;
count__33228_34026 = G__34031;
i__33229_34027 = G__34032;
continue;
} else {
var temp__5804__auto___34033 = cljs.core.seq(seq__33226_34024);
if(temp__5804__auto___34033){
var seq__33226_34034__$1 = temp__5804__auto___34033;
if(cljs.core.chunked_seq_QMARK_(seq__33226_34034__$1)){
var c__5525__auto___34035 = cljs.core.chunk_first(seq__33226_34034__$1);
var G__34036 = cljs.core.chunk_rest(seq__33226_34034__$1);
var G__34037 = c__5525__auto___34035;
var G__34038 = cljs.core.count(c__5525__auto___34035);
var G__34039 = (0);
seq__33226_34024 = G__34036;
chunk__33227_34025 = G__34037;
count__33228_34026 = G__34038;
i__33229_34027 = G__34039;
continue;
} else {
var node_34040 = cljs.core.first(seq__33226_34034__$1);
fragment.appendChild(shadow.dom._to_dom(node_34040));


var G__34042 = cljs.core.next(seq__33226_34034__$1);
var G__34043 = null;
var G__34044 = (0);
var G__34045 = (0);
seq__33226_34024 = G__34042;
chunk__33227_34025 = G__34043;
count__33228_34026 = G__34044;
i__33229_34027 = G__34045;
continue;
}
} else {
}
}
break;
}

return (new shadow.dom.NativeColl(fragment));
}));

(shadow.dom.fragment.cljs$lang$maxFixedArity = (0));

/** @this {Function} */
(shadow.dom.fragment.cljs$lang$applyTo = (function (seq33223){
var self__5712__auto__ = this;
return self__5712__auto__.cljs$core$IFn$_invoke$arity$variadic(cljs.core.seq(seq33223));
}));

/**
 * given a html string, eval all <script> tags and return the html without the scripts
 * don't do this for everything, only content you trust.
 */
shadow.dom.eval_scripts = (function shadow$dom$eval_scripts(s){
var scripts = cljs.core.re_seq(/<script[^>]*?>(.+?)<\/script>/,s);
var seq__33231_34048 = cljs.core.seq(scripts);
var chunk__33232_34049 = null;
var count__33233_34050 = (0);
var i__33234_34051 = (0);
while(true){
if((i__33234_34051 < count__33233_34050)){
var vec__33242_34052 = chunk__33232_34049.cljs$core$IIndexed$_nth$arity$2(null, i__33234_34051);
var script_tag_34053 = cljs.core.nth.cljs$core$IFn$_invoke$arity$3(vec__33242_34052,(0),null);
var script_body_34054 = cljs.core.nth.cljs$core$IFn$_invoke$arity$3(vec__33242_34052,(1),null);
eval(script_body_34054);


var G__34057 = seq__33231_34048;
var G__34058 = chunk__33232_34049;
var G__34059 = count__33233_34050;
var G__34060 = (i__33234_34051 + (1));
seq__33231_34048 = G__34057;
chunk__33232_34049 = G__34058;
count__33233_34050 = G__34059;
i__33234_34051 = G__34060;
continue;
} else {
var temp__5804__auto___34061 = cljs.core.seq(seq__33231_34048);
if(temp__5804__auto___34061){
var seq__33231_34063__$1 = temp__5804__auto___34061;
if(cljs.core.chunked_seq_QMARK_(seq__33231_34063__$1)){
var c__5525__auto___34064 = cljs.core.chunk_first(seq__33231_34063__$1);
var G__34066 = cljs.core.chunk_rest(seq__33231_34063__$1);
var G__34067 = c__5525__auto___34064;
var G__34068 = cljs.core.count(c__5525__auto___34064);
var G__34069 = (0);
seq__33231_34048 = G__34066;
chunk__33232_34049 = G__34067;
count__33233_34050 = G__34068;
i__33234_34051 = G__34069;
continue;
} else {
var vec__33245_34071 = cljs.core.first(seq__33231_34063__$1);
var script_tag_34072 = cljs.core.nth.cljs$core$IFn$_invoke$arity$3(vec__33245_34071,(0),null);
var script_body_34073 = cljs.core.nth.cljs$core$IFn$_invoke$arity$3(vec__33245_34071,(1),null);
eval(script_body_34073);


var G__34076 = cljs.core.next(seq__33231_34063__$1);
var G__34077 = null;
var G__34078 = (0);
var G__34079 = (0);
seq__33231_34048 = G__34076;
chunk__33232_34049 = G__34077;
count__33233_34050 = G__34078;
i__33234_34051 = G__34079;
continue;
}
} else {
}
}
break;
}

return cljs.core.reduce.cljs$core$IFn$_invoke$arity$3((function (s__$1,p__33251){
var vec__33252 = p__33251;
var script_tag = cljs.core.nth.cljs$core$IFn$_invoke$arity$3(vec__33252,(0),null);
var script_body = cljs.core.nth.cljs$core$IFn$_invoke$arity$3(vec__33252,(1),null);
return clojure.string.replace(s__$1,script_tag,"");
}),s,scripts);
});
shadow.dom.str__GT_fragment = (function shadow$dom$str__GT_fragment(s){
var el = document.createElement("div");
(el.innerHTML = s);

return (new shadow.dom.NativeColl(goog.dom.childrenToNode_(document,el)));
});
shadow.dom.node_name = (function shadow$dom$node_name(el){
return shadow.dom.dom_node(el).nodeName;
});
shadow.dom.ancestor_by_class = (function shadow$dom$ancestor_by_class(el,cls){
return goog.dom.getAncestorByClass(shadow.dom.dom_node(el),cls);
});
shadow.dom.ancestor_by_tag = (function shadow$dom$ancestor_by_tag(var_args){
var G__33259 = arguments.length;
switch (G__33259) {
case 2:
return shadow.dom.ancestor_by_tag.cljs$core$IFn$_invoke$arity$2((arguments[(0)]),(arguments[(1)]));

break;
case 3:
return shadow.dom.ancestor_by_tag.cljs$core$IFn$_invoke$arity$3((arguments[(0)]),(arguments[(1)]),(arguments[(2)]));

break;
default:
throw (new Error(["Invalid arity: ",cljs.core.str.cljs$core$IFn$_invoke$arity$1(arguments.length)].join('')));

}
});

(shadow.dom.ancestor_by_tag.cljs$core$IFn$_invoke$arity$2 = (function (el,tag){
return goog.dom.getAncestorByTagNameAndClass(shadow.dom.dom_node(el),cljs.core.name(tag));
}));

(shadow.dom.ancestor_by_tag.cljs$core$IFn$_invoke$arity$3 = (function (el,tag,cls){
return goog.dom.getAncestorByTagNameAndClass(shadow.dom.dom_node(el),cljs.core.name(tag),cljs.core.name(cls));
}));

(shadow.dom.ancestor_by_tag.cljs$lang$maxFixedArity = 3);

shadow.dom.get_value = (function shadow$dom$get_value(dom){
return goog.dom.forms.getValue(shadow.dom.dom_node(dom));
});
shadow.dom.set_value = (function shadow$dom$set_value(dom,value){
return goog.dom.forms.setValue(shadow.dom.dom_node(dom),value);
});
shadow.dom.px = (function shadow$dom$px(value){
return [cljs.core.str.cljs$core$IFn$_invoke$arity$1((value | (0))),"px"].join('');
});
shadow.dom.pct = (function shadow$dom$pct(value){
return [cljs.core.str.cljs$core$IFn$_invoke$arity$1(value),"%"].join('');
});
shadow.dom.remove_style_STAR_ = (function shadow$dom$remove_style_STAR_(el,style){
return el.style.removeProperty(cljs.core.name(style));
});
shadow.dom.remove_style = (function shadow$dom$remove_style(el,style){
var el__$1 = shadow.dom.dom_node(el);
return shadow.dom.remove_style_STAR_(el__$1,style);
});
shadow.dom.remove_styles = (function shadow$dom$remove_styles(el,style_keys){
var el__$1 = shadow.dom.dom_node(el);
var seq__33279 = cljs.core.seq(style_keys);
var chunk__33280 = null;
var count__33281 = (0);
var i__33282 = (0);
while(true){
if((i__33282 < count__33281)){
var it = chunk__33280.cljs$core$IIndexed$_nth$arity$2(null, i__33282);
shadow.dom.remove_style_STAR_(el__$1,it);


var G__34102 = seq__33279;
var G__34103 = chunk__33280;
var G__34104 = count__33281;
var G__34105 = (i__33282 + (1));
seq__33279 = G__34102;
chunk__33280 = G__34103;
count__33281 = G__34104;
i__33282 = G__34105;
continue;
} else {
var temp__5804__auto__ = cljs.core.seq(seq__33279);
if(temp__5804__auto__){
var seq__33279__$1 = temp__5804__auto__;
if(cljs.core.chunked_seq_QMARK_(seq__33279__$1)){
var c__5525__auto__ = cljs.core.chunk_first(seq__33279__$1);
var G__34106 = cljs.core.chunk_rest(seq__33279__$1);
var G__34107 = c__5525__auto__;
var G__34108 = cljs.core.count(c__5525__auto__);
var G__34109 = (0);
seq__33279 = G__34106;
chunk__33280 = G__34107;
count__33281 = G__34108;
i__33282 = G__34109;
continue;
} else {
var it = cljs.core.first(seq__33279__$1);
shadow.dom.remove_style_STAR_(el__$1,it);


var G__34110 = cljs.core.next(seq__33279__$1);
var G__34111 = null;
var G__34112 = (0);
var G__34113 = (0);
seq__33279 = G__34110;
chunk__33280 = G__34111;
count__33281 = G__34112;
i__33282 = G__34113;
continue;
}
} else {
return null;
}
}
break;
}
});

/**
* @constructor
 * @implements {cljs.core.IRecord}
 * @implements {cljs.core.IKVReduce}
 * @implements {cljs.core.IEquiv}
 * @implements {cljs.core.IHash}
 * @implements {cljs.core.ICollection}
 * @implements {cljs.core.ICounted}
 * @implements {cljs.core.ISeqable}
 * @implements {cljs.core.IMeta}
 * @implements {cljs.core.ICloneable}
 * @implements {cljs.core.IPrintWithWriter}
 * @implements {cljs.core.IIterable}
 * @implements {cljs.core.IWithMeta}
 * @implements {cljs.core.IAssociative}
 * @implements {cljs.core.IMap}
 * @implements {cljs.core.ILookup}
*/
shadow.dom.Coordinate = (function (x,y,__meta,__extmap,__hash){
this.x = x;
this.y = y;
this.__meta = __meta;
this.__extmap = __extmap;
this.__hash = __hash;
this.cljs$lang$protocol_mask$partition0$ = 2230716170;
this.cljs$lang$protocol_mask$partition1$ = 139264;
});
(shadow.dom.Coordinate.prototype.cljs$core$ILookup$_lookup$arity$2 = (function (this__5300__auto__,k__5301__auto__){
var self__ = this;
var this__5300__auto____$1 = this;
return this__5300__auto____$1.cljs$core$ILookup$_lookup$arity$3(null, k__5301__auto__,null);
}));

(shadow.dom.Coordinate.prototype.cljs$core$ILookup$_lookup$arity$3 = (function (this__5302__auto__,k33292,else__5303__auto__){
var self__ = this;
var this__5302__auto____$1 = this;
var G__33328 = k33292;
var G__33328__$1 = (((G__33328 instanceof cljs.core.Keyword))?G__33328.fqn:null);
switch (G__33328__$1) {
case "x":
return self__.x;

break;
case "y":
return self__.y;

break;
default:
return cljs.core.get.cljs$core$IFn$_invoke$arity$3(self__.__extmap,k33292,else__5303__auto__);

}
}));

(shadow.dom.Coordinate.prototype.cljs$core$IKVReduce$_kv_reduce$arity$3 = (function (this__5320__auto__,f__5321__auto__,init__5322__auto__){
var self__ = this;
var this__5320__auto____$1 = this;
return cljs.core.reduce.cljs$core$IFn$_invoke$arity$3((function (ret__5323__auto__,p__33329){
var vec__33330 = p__33329;
var k__5324__auto__ = cljs.core.nth.cljs$core$IFn$_invoke$arity$3(vec__33330,(0),null);
var v__5325__auto__ = cljs.core.nth.cljs$core$IFn$_invoke$arity$3(vec__33330,(1),null);
return (f__5321__auto__.cljs$core$IFn$_invoke$arity$3 ? f__5321__auto__.cljs$core$IFn$_invoke$arity$3(ret__5323__auto__,k__5324__auto__,v__5325__auto__) : f__5321__auto__.call(null, ret__5323__auto__,k__5324__auto__,v__5325__auto__));
}),init__5322__auto__,this__5320__auto____$1);
}));

(shadow.dom.Coordinate.prototype.cljs$core$IPrintWithWriter$_pr_writer$arity$3 = (function (this__5315__auto__,writer__5316__auto__,opts__5317__auto__){
var self__ = this;
var this__5315__auto____$1 = this;
var pr_pair__5318__auto__ = (function (keyval__5319__auto__){
return cljs.core.pr_sequential_writer(writer__5316__auto__,cljs.core.pr_writer,""," ","",opts__5317__auto__,keyval__5319__auto__);
});
return cljs.core.pr_sequential_writer(writer__5316__auto__,pr_pair__5318__auto__,"#shadow.dom.Coordinate{",", ","}",opts__5317__auto__,cljs.core.concat.cljs$core$IFn$_invoke$arity$2(new cljs.core.PersistentVector(null, 2, 5, cljs.core.PersistentVector.EMPTY_NODE, [(new cljs.core.PersistentVector(null,2,(5),cljs.core.PersistentVector.EMPTY_NODE,[new cljs.core.Keyword(null,"x","x",2099068185),self__.x],null)),(new cljs.core.PersistentVector(null,2,(5),cljs.core.PersistentVector.EMPTY_NODE,[new cljs.core.Keyword(null,"y","y",-1757859776),self__.y],null))], null),self__.__extmap));
}));

(shadow.dom.Coordinate.prototype.cljs$core$IIterable$_iterator$arity$1 = (function (G__33291){
var self__ = this;
var G__33291__$1 = this;
return (new cljs.core.RecordIter((0),G__33291__$1,2,new cljs.core.PersistentVector(null, 2, 5, cljs.core.PersistentVector.EMPTY_NODE, [new cljs.core.Keyword(null,"x","x",2099068185),new cljs.core.Keyword(null,"y","y",-1757859776)], null),(cljs.core.truth_(self__.__extmap)?cljs.core._iterator(self__.__extmap):cljs.core.nil_iter())));
}));

(shadow.dom.Coordinate.prototype.cljs$core$IMeta$_meta$arity$1 = (function (this__5298__auto__){
var self__ = this;
var this__5298__auto____$1 = this;
return self__.__meta;
}));

(shadow.dom.Coordinate.prototype.cljs$core$ICloneable$_clone$arity$1 = (function (this__5295__auto__){
var self__ = this;
var this__5295__auto____$1 = this;
return (new shadow.dom.Coordinate(self__.x,self__.y,self__.__meta,self__.__extmap,self__.__hash));
}));

(shadow.dom.Coordinate.prototype.cljs$core$ICounted$_count$arity$1 = (function (this__5304__auto__){
var self__ = this;
var this__5304__auto____$1 = this;
return (2 + cljs.core.count(self__.__extmap));
}));

(shadow.dom.Coordinate.prototype.cljs$core$IHash$_hash$arity$1 = (function (this__5296__auto__){
var self__ = this;
var this__5296__auto____$1 = this;
var h__5111__auto__ = self__.__hash;
if((!((h__5111__auto__ == null)))){
return h__5111__auto__;
} else {
var h__5111__auto____$1 = (function (coll__5297__auto__){
return (145542109 ^ cljs.core.hash_unordered_coll(coll__5297__auto__));
})(this__5296__auto____$1);
(self__.__hash = h__5111__auto____$1);

return h__5111__auto____$1;
}
}));

(shadow.dom.Coordinate.prototype.cljs$core$IEquiv$_equiv$arity$2 = (function (this33293,other33294){
var self__ = this;
var this33293__$1 = this;
return (((!((other33294 == null)))) && ((((this33293__$1.constructor === other33294.constructor)) && (((cljs.core._EQ_.cljs$core$IFn$_invoke$arity$2(this33293__$1.x,other33294.x)) && (((cljs.core._EQ_.cljs$core$IFn$_invoke$arity$2(this33293__$1.y,other33294.y)) && (cljs.core._EQ_.cljs$core$IFn$_invoke$arity$2(this33293__$1.__extmap,other33294.__extmap)))))))));
}));

(shadow.dom.Coordinate.prototype.cljs$core$IMap$_dissoc$arity$2 = (function (this__5310__auto__,k__5311__auto__){
var self__ = this;
var this__5310__auto____$1 = this;
if(cljs.core.contains_QMARK_(new cljs.core.PersistentHashSet(null, new cljs.core.PersistentArrayMap(null, 2, [new cljs.core.Keyword(null,"y","y",-1757859776),null,new cljs.core.Keyword(null,"x","x",2099068185),null], null), null),k__5311__auto__)){
return cljs.core.dissoc.cljs$core$IFn$_invoke$arity$2(cljs.core._with_meta(cljs.core.into.cljs$core$IFn$_invoke$arity$2(cljs.core.PersistentArrayMap.EMPTY,this__5310__auto____$1),self__.__meta),k__5311__auto__);
} else {
return (new shadow.dom.Coordinate(self__.x,self__.y,self__.__meta,cljs.core.not_empty(cljs.core.dissoc.cljs$core$IFn$_invoke$arity$2(self__.__extmap,k__5311__auto__)),null));
}
}));

(shadow.dom.Coordinate.prototype.cljs$core$IAssociative$_contains_key_QMARK_$arity$2 = (function (this__5307__auto__,k33292){
var self__ = this;
var this__5307__auto____$1 = this;
var G__33420 = k33292;
var G__33420__$1 = (((G__33420 instanceof cljs.core.Keyword))?G__33420.fqn:null);
switch (G__33420__$1) {
case "x":
case "y":
return true;

break;
default:
return cljs.core.contains_QMARK_(self__.__extmap,k33292);

}
}));

(shadow.dom.Coordinate.prototype.cljs$core$IAssociative$_assoc$arity$3 = (function (this__5308__auto__,k__5309__auto__,G__33291){
var self__ = this;
var this__5308__auto____$1 = this;
var pred__33422 = cljs.core.keyword_identical_QMARK_;
var expr__33423 = k__5309__auto__;
if(cljs.core.truth_((pred__33422.cljs$core$IFn$_invoke$arity$2 ? pred__33422.cljs$core$IFn$_invoke$arity$2(new cljs.core.Keyword(null,"x","x",2099068185),expr__33423) : pred__33422.call(null, new cljs.core.Keyword(null,"x","x",2099068185),expr__33423)))){
return (new shadow.dom.Coordinate(G__33291,self__.y,self__.__meta,self__.__extmap,null));
} else {
if(cljs.core.truth_((pred__33422.cljs$core$IFn$_invoke$arity$2 ? pred__33422.cljs$core$IFn$_invoke$arity$2(new cljs.core.Keyword(null,"y","y",-1757859776),expr__33423) : pred__33422.call(null, new cljs.core.Keyword(null,"y","y",-1757859776),expr__33423)))){
return (new shadow.dom.Coordinate(self__.x,G__33291,self__.__meta,self__.__extmap,null));
} else {
return (new shadow.dom.Coordinate(self__.x,self__.y,self__.__meta,cljs.core.assoc.cljs$core$IFn$_invoke$arity$3(self__.__extmap,k__5309__auto__,G__33291),null));
}
}
}));

(shadow.dom.Coordinate.prototype.cljs$core$ISeqable$_seq$arity$1 = (function (this__5313__auto__){
var self__ = this;
var this__5313__auto____$1 = this;
return cljs.core.seq(cljs.core.concat.cljs$core$IFn$_invoke$arity$2(new cljs.core.PersistentVector(null, 2, 5, cljs.core.PersistentVector.EMPTY_NODE, [(new cljs.core.MapEntry(new cljs.core.Keyword(null,"x","x",2099068185),self__.x,null)),(new cljs.core.MapEntry(new cljs.core.Keyword(null,"y","y",-1757859776),self__.y,null))], null),self__.__extmap));
}));

(shadow.dom.Coordinate.prototype.cljs$core$IWithMeta$_with_meta$arity$2 = (function (this__5299__auto__,G__33291){
var self__ = this;
var this__5299__auto____$1 = this;
return (new shadow.dom.Coordinate(self__.x,self__.y,G__33291,self__.__extmap,self__.__hash));
}));

(shadow.dom.Coordinate.prototype.cljs$core$ICollection$_conj$arity$2 = (function (this__5305__auto__,entry__5306__auto__){
var self__ = this;
var this__5305__auto____$1 = this;
if(cljs.core.vector_QMARK_(entry__5306__auto__)){
return this__5305__auto____$1.cljs$core$IAssociative$_assoc$arity$3(null, cljs.core._nth(entry__5306__auto__,(0)),cljs.core._nth(entry__5306__auto__,(1)));
} else {
return cljs.core.reduce.cljs$core$IFn$_invoke$arity$3(cljs.core._conj,this__5305__auto____$1,entry__5306__auto__);
}
}));

(shadow.dom.Coordinate.getBasis = (function (){
return new cljs.core.PersistentVector(null, 2, 5, cljs.core.PersistentVector.EMPTY_NODE, [new cljs.core.Symbol(null,"x","x",-555367584,null),new cljs.core.Symbol(null,"y","y",-117328249,null)], null);
}));

(shadow.dom.Coordinate.cljs$lang$type = true);

(shadow.dom.Coordinate.cljs$lang$ctorPrSeq = (function (this__5346__auto__){
return (new cljs.core.List(null,"shadow.dom/Coordinate",null,(1),null));
}));

(shadow.dom.Coordinate.cljs$lang$ctorPrWriter = (function (this__5346__auto__,writer__5347__auto__){
return cljs.core._write(writer__5347__auto__,"shadow.dom/Coordinate");
}));

/**
 * Positional factory function for shadow.dom/Coordinate.
 */
shadow.dom.__GT_Coordinate = (function shadow$dom$__GT_Coordinate(x,y){
return (new shadow.dom.Coordinate(x,y,null,null,null));
});

/**
 * Factory function for shadow.dom/Coordinate, taking a map of keywords to field values.
 */
shadow.dom.map__GT_Coordinate = (function shadow$dom$map__GT_Coordinate(G__33320){
var extmap__5342__auto__ = (function (){var G__33502 = cljs.core.dissoc.cljs$core$IFn$_invoke$arity$variadic(G__33320,new cljs.core.Keyword(null,"x","x",2099068185),cljs.core.prim_seq.cljs$core$IFn$_invoke$arity$2([new cljs.core.Keyword(null,"y","y",-1757859776)], 0));
if(cljs.core.record_QMARK_(G__33320)){
return cljs.core.into.cljs$core$IFn$_invoke$arity$2(cljs.core.PersistentArrayMap.EMPTY,G__33502);
} else {
return G__33502;
}
})();
return (new shadow.dom.Coordinate(new cljs.core.Keyword(null,"x","x",2099068185).cljs$core$IFn$_invoke$arity$1(G__33320),new cljs.core.Keyword(null,"y","y",-1757859776).cljs$core$IFn$_invoke$arity$1(G__33320),null,cljs.core.not_empty(extmap__5342__auto__),null));
});

shadow.dom.get_position = (function shadow$dom$get_position(el){
var pos = goog.style.getPosition(shadow.dom.dom_node(el));
return shadow.dom.__GT_Coordinate(pos.x,pos.y);
});
shadow.dom.get_client_position = (function shadow$dom$get_client_position(el){
var pos = goog.style.getClientPosition(shadow.dom.dom_node(el));
return shadow.dom.__GT_Coordinate(pos.x,pos.y);
});
shadow.dom.get_page_offset = (function shadow$dom$get_page_offset(el){
var pos = goog.style.getPageOffset(shadow.dom.dom_node(el));
return shadow.dom.__GT_Coordinate(pos.x,pos.y);
});

/**
* @constructor
 * @implements {cljs.core.IRecord}
 * @implements {cljs.core.IKVReduce}
 * @implements {cljs.core.IEquiv}
 * @implements {cljs.core.IHash}
 * @implements {cljs.core.ICollection}
 * @implements {cljs.core.ICounted}
 * @implements {cljs.core.ISeqable}
 * @implements {cljs.core.IMeta}
 * @implements {cljs.core.ICloneable}
 * @implements {cljs.core.IPrintWithWriter}
 * @implements {cljs.core.IIterable}
 * @implements {cljs.core.IWithMeta}
 * @implements {cljs.core.IAssociative}
 * @implements {cljs.core.IMap}
 * @implements {cljs.core.ILookup}
*/
shadow.dom.Size = (function (w,h,__meta,__extmap,__hash){
this.w = w;
this.h = h;
this.__meta = __meta;
this.__extmap = __extmap;
this.__hash = __hash;
this.cljs$lang$protocol_mask$partition0$ = 2230716170;
this.cljs$lang$protocol_mask$partition1$ = 139264;
});
(shadow.dom.Size.prototype.cljs$core$ILookup$_lookup$arity$2 = (function (this__5300__auto__,k__5301__auto__){
var self__ = this;
var this__5300__auto____$1 = this;
return this__5300__auto____$1.cljs$core$ILookup$_lookup$arity$3(null, k__5301__auto__,null);
}));

(shadow.dom.Size.prototype.cljs$core$ILookup$_lookup$arity$3 = (function (this__5302__auto__,k33523,else__5303__auto__){
var self__ = this;
var this__5302__auto____$1 = this;
var G__33532 = k33523;
var G__33532__$1 = (((G__33532 instanceof cljs.core.Keyword))?G__33532.fqn:null);
switch (G__33532__$1) {
case "w":
return self__.w;

break;
case "h":
return self__.h;

break;
default:
return cljs.core.get.cljs$core$IFn$_invoke$arity$3(self__.__extmap,k33523,else__5303__auto__);

}
}));

(shadow.dom.Size.prototype.cljs$core$IKVReduce$_kv_reduce$arity$3 = (function (this__5320__auto__,f__5321__auto__,init__5322__auto__){
var self__ = this;
var this__5320__auto____$1 = this;
return cljs.core.reduce.cljs$core$IFn$_invoke$arity$3((function (ret__5323__auto__,p__33535){
var vec__33536 = p__33535;
var k__5324__auto__ = cljs.core.nth.cljs$core$IFn$_invoke$arity$3(vec__33536,(0),null);
var v__5325__auto__ = cljs.core.nth.cljs$core$IFn$_invoke$arity$3(vec__33536,(1),null);
return (f__5321__auto__.cljs$core$IFn$_invoke$arity$3 ? f__5321__auto__.cljs$core$IFn$_invoke$arity$3(ret__5323__auto__,k__5324__auto__,v__5325__auto__) : f__5321__auto__.call(null, ret__5323__auto__,k__5324__auto__,v__5325__auto__));
}),init__5322__auto__,this__5320__auto____$1);
}));

(shadow.dom.Size.prototype.cljs$core$IPrintWithWriter$_pr_writer$arity$3 = (function (this__5315__auto__,writer__5316__auto__,opts__5317__auto__){
var self__ = this;
var this__5315__auto____$1 = this;
var pr_pair__5318__auto__ = (function (keyval__5319__auto__){
return cljs.core.pr_sequential_writer(writer__5316__auto__,cljs.core.pr_writer,""," ","",opts__5317__auto__,keyval__5319__auto__);
});
return cljs.core.pr_sequential_writer(writer__5316__auto__,pr_pair__5318__auto__,"#shadow.dom.Size{",", ","}",opts__5317__auto__,cljs.core.concat.cljs$core$IFn$_invoke$arity$2(new cljs.core.PersistentVector(null, 2, 5, cljs.core.PersistentVector.EMPTY_NODE, [(new cljs.core.PersistentVector(null,2,(5),cljs.core.PersistentVector.EMPTY_NODE,[new cljs.core.Keyword(null,"w","w",354169001),self__.w],null)),(new cljs.core.PersistentVector(null,2,(5),cljs.core.PersistentVector.EMPTY_NODE,[new cljs.core.Keyword(null,"h","h",1109658740),self__.h],null))], null),self__.__extmap));
}));

(shadow.dom.Size.prototype.cljs$core$IIterable$_iterator$arity$1 = (function (G__33522){
var self__ = this;
var G__33522__$1 = this;
return (new cljs.core.RecordIter((0),G__33522__$1,2,new cljs.core.PersistentVector(null, 2, 5, cljs.core.PersistentVector.EMPTY_NODE, [new cljs.core.Keyword(null,"w","w",354169001),new cljs.core.Keyword(null,"h","h",1109658740)], null),(cljs.core.truth_(self__.__extmap)?cljs.core._iterator(self__.__extmap):cljs.core.nil_iter())));
}));

(shadow.dom.Size.prototype.cljs$core$IMeta$_meta$arity$1 = (function (this__5298__auto__){
var self__ = this;
var this__5298__auto____$1 = this;
return self__.__meta;
}));

(shadow.dom.Size.prototype.cljs$core$ICloneable$_clone$arity$1 = (function (this__5295__auto__){
var self__ = this;
var this__5295__auto____$1 = this;
return (new shadow.dom.Size(self__.w,self__.h,self__.__meta,self__.__extmap,self__.__hash));
}));

(shadow.dom.Size.prototype.cljs$core$ICounted$_count$arity$1 = (function (this__5304__auto__){
var self__ = this;
var this__5304__auto____$1 = this;
return (2 + cljs.core.count(self__.__extmap));
}));

(shadow.dom.Size.prototype.cljs$core$IHash$_hash$arity$1 = (function (this__5296__auto__){
var self__ = this;
var this__5296__auto____$1 = this;
var h__5111__auto__ = self__.__hash;
if((!((h__5111__auto__ == null)))){
return h__5111__auto__;
} else {
var h__5111__auto____$1 = (function (coll__5297__auto__){
return (-1228019642 ^ cljs.core.hash_unordered_coll(coll__5297__auto__));
})(this__5296__auto____$1);
(self__.__hash = h__5111__auto____$1);

return h__5111__auto____$1;
}
}));

(shadow.dom.Size.prototype.cljs$core$IEquiv$_equiv$arity$2 = (function (this33524,other33525){
var self__ = this;
var this33524__$1 = this;
return (((!((other33525 == null)))) && ((((this33524__$1.constructor === other33525.constructor)) && (((cljs.core._EQ_.cljs$core$IFn$_invoke$arity$2(this33524__$1.w,other33525.w)) && (((cljs.core._EQ_.cljs$core$IFn$_invoke$arity$2(this33524__$1.h,other33525.h)) && (cljs.core._EQ_.cljs$core$IFn$_invoke$arity$2(this33524__$1.__extmap,other33525.__extmap)))))))));
}));

(shadow.dom.Size.prototype.cljs$core$IMap$_dissoc$arity$2 = (function (this__5310__auto__,k__5311__auto__){
var self__ = this;
var this__5310__auto____$1 = this;
if(cljs.core.contains_QMARK_(new cljs.core.PersistentHashSet(null, new cljs.core.PersistentArrayMap(null, 2, [new cljs.core.Keyword(null,"w","w",354169001),null,new cljs.core.Keyword(null,"h","h",1109658740),null], null), null),k__5311__auto__)){
return cljs.core.dissoc.cljs$core$IFn$_invoke$arity$2(cljs.core._with_meta(cljs.core.into.cljs$core$IFn$_invoke$arity$2(cljs.core.PersistentArrayMap.EMPTY,this__5310__auto____$1),self__.__meta),k__5311__auto__);
} else {
return (new shadow.dom.Size(self__.w,self__.h,self__.__meta,cljs.core.not_empty(cljs.core.dissoc.cljs$core$IFn$_invoke$arity$2(self__.__extmap,k__5311__auto__)),null));
}
}));

(shadow.dom.Size.prototype.cljs$core$IAssociative$_contains_key_QMARK_$arity$2 = (function (this__5307__auto__,k33523){
var self__ = this;
var this__5307__auto____$1 = this;
var G__33544 = k33523;
var G__33544__$1 = (((G__33544 instanceof cljs.core.Keyword))?G__33544.fqn:null);
switch (G__33544__$1) {
case "w":
case "h":
return true;

break;
default:
return cljs.core.contains_QMARK_(self__.__extmap,k33523);

}
}));

(shadow.dom.Size.prototype.cljs$core$IAssociative$_assoc$arity$3 = (function (this__5308__auto__,k__5309__auto__,G__33522){
var self__ = this;
var this__5308__auto____$1 = this;
var pred__33545 = cljs.core.keyword_identical_QMARK_;
var expr__33546 = k__5309__auto__;
if(cljs.core.truth_((pred__33545.cljs$core$IFn$_invoke$arity$2 ? pred__33545.cljs$core$IFn$_invoke$arity$2(new cljs.core.Keyword(null,"w","w",354169001),expr__33546) : pred__33545.call(null, new cljs.core.Keyword(null,"w","w",354169001),expr__33546)))){
return (new shadow.dom.Size(G__33522,self__.h,self__.__meta,self__.__extmap,null));
} else {
if(cljs.core.truth_((pred__33545.cljs$core$IFn$_invoke$arity$2 ? pred__33545.cljs$core$IFn$_invoke$arity$2(new cljs.core.Keyword(null,"h","h",1109658740),expr__33546) : pred__33545.call(null, new cljs.core.Keyword(null,"h","h",1109658740),expr__33546)))){
return (new shadow.dom.Size(self__.w,G__33522,self__.__meta,self__.__extmap,null));
} else {
return (new shadow.dom.Size(self__.w,self__.h,self__.__meta,cljs.core.assoc.cljs$core$IFn$_invoke$arity$3(self__.__extmap,k__5309__auto__,G__33522),null));
}
}
}));

(shadow.dom.Size.prototype.cljs$core$ISeqable$_seq$arity$1 = (function (this__5313__auto__){
var self__ = this;
var this__5313__auto____$1 = this;
return cljs.core.seq(cljs.core.concat.cljs$core$IFn$_invoke$arity$2(new cljs.core.PersistentVector(null, 2, 5, cljs.core.PersistentVector.EMPTY_NODE, [(new cljs.core.MapEntry(new cljs.core.Keyword(null,"w","w",354169001),self__.w,null)),(new cljs.core.MapEntry(new cljs.core.Keyword(null,"h","h",1109658740),self__.h,null))], null),self__.__extmap));
}));

(shadow.dom.Size.prototype.cljs$core$IWithMeta$_with_meta$arity$2 = (function (this__5299__auto__,G__33522){
var self__ = this;
var this__5299__auto____$1 = this;
return (new shadow.dom.Size(self__.w,self__.h,G__33522,self__.__extmap,self__.__hash));
}));

(shadow.dom.Size.prototype.cljs$core$ICollection$_conj$arity$2 = (function (this__5305__auto__,entry__5306__auto__){
var self__ = this;
var this__5305__auto____$1 = this;
if(cljs.core.vector_QMARK_(entry__5306__auto__)){
return this__5305__auto____$1.cljs$core$IAssociative$_assoc$arity$3(null, cljs.core._nth(entry__5306__auto__,(0)),cljs.core._nth(entry__5306__auto__,(1)));
} else {
return cljs.core.reduce.cljs$core$IFn$_invoke$arity$3(cljs.core._conj,this__5305__auto____$1,entry__5306__auto__);
}
}));

(shadow.dom.Size.getBasis = (function (){
return new cljs.core.PersistentVector(null, 2, 5, cljs.core.PersistentVector.EMPTY_NODE, [new cljs.core.Symbol(null,"w","w",1994700528,null),new cljs.core.Symbol(null,"h","h",-1544777029,null)], null);
}));

(shadow.dom.Size.cljs$lang$type = true);

(shadow.dom.Size.cljs$lang$ctorPrSeq = (function (this__5346__auto__){
return (new cljs.core.List(null,"shadow.dom/Size",null,(1),null));
}));

(shadow.dom.Size.cljs$lang$ctorPrWriter = (function (this__5346__auto__,writer__5347__auto__){
return cljs.core._write(writer__5347__auto__,"shadow.dom/Size");
}));

/**
 * Positional factory function for shadow.dom/Size.
 */
shadow.dom.__GT_Size = (function shadow$dom$__GT_Size(w,h){
return (new shadow.dom.Size(w,h,null,null,null));
});

/**
 * Factory function for shadow.dom/Size, taking a map of keywords to field values.
 */
shadow.dom.map__GT_Size = (function shadow$dom$map__GT_Size(G__33527){
var extmap__5342__auto__ = (function (){var G__33551 = cljs.core.dissoc.cljs$core$IFn$_invoke$arity$variadic(G__33527,new cljs.core.Keyword(null,"w","w",354169001),cljs.core.prim_seq.cljs$core$IFn$_invoke$arity$2([new cljs.core.Keyword(null,"h","h",1109658740)], 0));
if(cljs.core.record_QMARK_(G__33527)){
return cljs.core.into.cljs$core$IFn$_invoke$arity$2(cljs.core.PersistentArrayMap.EMPTY,G__33551);
} else {
return G__33551;
}
})();
return (new shadow.dom.Size(new cljs.core.Keyword(null,"w","w",354169001).cljs$core$IFn$_invoke$arity$1(G__33527),new cljs.core.Keyword(null,"h","h",1109658740).cljs$core$IFn$_invoke$arity$1(G__33527),null,cljs.core.not_empty(extmap__5342__auto__),null));
});

shadow.dom.size__GT_clj = (function shadow$dom$size__GT_clj(size){
return (new shadow.dom.Size(size.width,size.height,null,null,null));
});
shadow.dom.get_size = (function shadow$dom$get_size(el){
return shadow.dom.size__GT_clj(goog.style.getSize(shadow.dom.dom_node(el)));
});
shadow.dom.get_height = (function shadow$dom$get_height(el){
return shadow.dom.get_size(el).h;
});
shadow.dom.get_viewport_size = (function shadow$dom$get_viewport_size(){
return shadow.dom.size__GT_clj(goog.dom.getViewportSize());
});
shadow.dom.first_child = (function shadow$dom$first_child(el){
return (shadow.dom.dom_node(el).children[(0)]);
});
shadow.dom.select_option_values = (function shadow$dom$select_option_values(el){
var native$ = shadow.dom.dom_node(el);
var opts = (native$["options"]);
var a__5590__auto__ = opts;
var l__5591__auto__ = a__5590__auto__.length;
var i = (0);
var ret = cljs.core.PersistentVector.EMPTY;
while(true){
if((i < l__5591__auto__)){
var G__34164 = (i + (1));
var G__34165 = cljs.core.conj.cljs$core$IFn$_invoke$arity$2(ret,(opts[i]["value"]));
i = G__34164;
ret = G__34165;
continue;
} else {
return ret;
}
break;
}
});
shadow.dom.build_url = (function shadow$dom$build_url(path,query_params){
if(cljs.core.empty_QMARK_(query_params)){
return path;
} else {
return [cljs.core.str.cljs$core$IFn$_invoke$arity$1(path),"?",clojure.string.join.cljs$core$IFn$_invoke$arity$2("&",cljs.core.map.cljs$core$IFn$_invoke$arity$2((function (p__33618){
var vec__33619 = p__33618;
var k = cljs.core.nth.cljs$core$IFn$_invoke$arity$3(vec__33619,(0),null);
var v = cljs.core.nth.cljs$core$IFn$_invoke$arity$3(vec__33619,(1),null);
return [cljs.core.name(k),"=",cljs.core.str.cljs$core$IFn$_invoke$arity$1(encodeURIComponent(cljs.core.str.cljs$core$IFn$_invoke$arity$1(v)))].join('');
}),query_params))].join('');
}
});
shadow.dom.redirect = (function shadow$dom$redirect(var_args){
var G__33630 = arguments.length;
switch (G__33630) {
case 1:
return shadow.dom.redirect.cljs$core$IFn$_invoke$arity$1((arguments[(0)]));

break;
case 2:
return shadow.dom.redirect.cljs$core$IFn$_invoke$arity$2((arguments[(0)]),(arguments[(1)]));

break;
default:
throw (new Error(["Invalid arity: ",cljs.core.str.cljs$core$IFn$_invoke$arity$1(arguments.length)].join('')));

}
});

(shadow.dom.redirect.cljs$core$IFn$_invoke$arity$1 = (function (path){
return shadow.dom.redirect.cljs$core$IFn$_invoke$arity$2(path,cljs.core.PersistentArrayMap.EMPTY);
}));

(shadow.dom.redirect.cljs$core$IFn$_invoke$arity$2 = (function (path,query_params){
return (document["location"]["href"] = shadow.dom.build_url(path,query_params));
}));

(shadow.dom.redirect.cljs$lang$maxFixedArity = 2);

shadow.dom.reload_BANG_ = (function shadow$dom$reload_BANG_(){
return (document.location.href = document.location.href);
});
shadow.dom.tag_name = (function shadow$dom$tag_name(el){
var dom = shadow.dom.dom_node(el);
return dom.tagName;
});
shadow.dom.insert_after = (function shadow$dom$insert_after(ref,new$){
var new_node = shadow.dom.dom_node(new$);
goog.dom.insertSiblingAfter(new_node,shadow.dom.dom_node(ref));

return new_node;
});
shadow.dom.insert_before = (function shadow$dom$insert_before(ref,new$){
var new_node = shadow.dom.dom_node(new$);
goog.dom.insertSiblingBefore(new_node,shadow.dom.dom_node(ref));

return new_node;
});
shadow.dom.insert_first = (function shadow$dom$insert_first(ref,new$){
var temp__5802__auto__ = shadow.dom.dom_node(ref).firstChild;
if(cljs.core.truth_(temp__5802__auto__)){
var child = temp__5802__auto__;
return shadow.dom.insert_before(child,new$);
} else {
return shadow.dom.append.cljs$core$IFn$_invoke$arity$2(ref,new$);
}
});
shadow.dom.index_of = (function shadow$dom$index_of(el){
var el__$1 = shadow.dom.dom_node(el);
var i = (0);
while(true){
var ps = el__$1.previousSibling;
if((ps == null)){
return i;
} else {
var G__34169 = ps;
var G__34170 = (i + (1));
el__$1 = G__34169;
i = G__34170;
continue;
}
break;
}
});
shadow.dom.get_parent = (function shadow$dom$get_parent(el){
return goog.dom.getParentElement(shadow.dom.dom_node(el));
});
shadow.dom.parents = (function shadow$dom$parents(el){
var parent = shadow.dom.get_parent(el);
if(cljs.core.truth_(parent)){
return cljs.core.cons(parent,(new cljs.core.LazySeq(null,(function (){
return (shadow.dom.parents.cljs$core$IFn$_invoke$arity$1 ? shadow.dom.parents.cljs$core$IFn$_invoke$arity$1(parent) : shadow.dom.parents.call(null, parent));
}),null,null)));
} else {
return null;
}
});
shadow.dom.matches = (function shadow$dom$matches(el,sel){
return shadow.dom.dom_node(el).matches(sel);
});
shadow.dom.get_next_sibling = (function shadow$dom$get_next_sibling(el){
return goog.dom.getNextElementSibling(shadow.dom.dom_node(el));
});
shadow.dom.get_previous_sibling = (function shadow$dom$get_previous_sibling(el){
return goog.dom.getPreviousElementSibling(shadow.dom.dom_node(el));
});
shadow.dom.xmlns = cljs.core.atom.cljs$core$IFn$_invoke$arity$1(new cljs.core.PersistentArrayMap(null, 2, ["svg","http://www.w3.org/2000/svg","xlink","http://www.w3.org/1999/xlink"], null));
shadow.dom.create_svg_node = (function shadow$dom$create_svg_node(tag_def,props){
var vec__33655 = shadow.dom.parse_tag(tag_def);
var tag_name = cljs.core.nth.cljs$core$IFn$_invoke$arity$3(vec__33655,(0),null);
var tag_id = cljs.core.nth.cljs$core$IFn$_invoke$arity$3(vec__33655,(1),null);
var tag_classes = cljs.core.nth.cljs$core$IFn$_invoke$arity$3(vec__33655,(2),null);
var el = document.createElementNS("http://www.w3.org/2000/svg",tag_name);
if(cljs.core.truth_(tag_id)){
el.setAttribute("id",tag_id);
} else {
}

if(cljs.core.truth_(tag_classes)){
el.setAttribute("class",shadow.dom.merge_class_string(new cljs.core.Keyword(null,"class","class",-2030961996).cljs$core$IFn$_invoke$arity$1(props),tag_classes));
} else {
}

var seq__33660_34176 = cljs.core.seq(props);
var chunk__33661_34177 = null;
var count__33662_34178 = (0);
var i__33663_34179 = (0);
while(true){
if((i__33663_34179 < count__33662_34178)){
var vec__33675_34180 = chunk__33661_34177.cljs$core$IIndexed$_nth$arity$2(null, i__33663_34179);
var k_34181 = cljs.core.nth.cljs$core$IFn$_invoke$arity$3(vec__33675_34180,(0),null);
var v_34182 = cljs.core.nth.cljs$core$IFn$_invoke$arity$3(vec__33675_34180,(1),null);
el.setAttributeNS((function (){var temp__5804__auto__ = cljs.core.namespace(k_34181);
if(cljs.core.truth_(temp__5804__auto__)){
var ns = temp__5804__auto__;
return cljs.core.get.cljs$core$IFn$_invoke$arity$2(cljs.core.deref(shadow.dom.xmlns),ns);
} else {
return null;
}
})(),cljs.core.name(k_34181),v_34182);


var G__34183 = seq__33660_34176;
var G__34184 = chunk__33661_34177;
var G__34185 = count__33662_34178;
var G__34186 = (i__33663_34179 + (1));
seq__33660_34176 = G__34183;
chunk__33661_34177 = G__34184;
count__33662_34178 = G__34185;
i__33663_34179 = G__34186;
continue;
} else {
var temp__5804__auto___34187 = cljs.core.seq(seq__33660_34176);
if(temp__5804__auto___34187){
var seq__33660_34188__$1 = temp__5804__auto___34187;
if(cljs.core.chunked_seq_QMARK_(seq__33660_34188__$1)){
var c__5525__auto___34189 = cljs.core.chunk_first(seq__33660_34188__$1);
var G__34190 = cljs.core.chunk_rest(seq__33660_34188__$1);
var G__34191 = c__5525__auto___34189;
var G__34192 = cljs.core.count(c__5525__auto___34189);
var G__34193 = (0);
seq__33660_34176 = G__34190;
chunk__33661_34177 = G__34191;
count__33662_34178 = G__34192;
i__33663_34179 = G__34193;
continue;
} else {
var vec__33680_34194 = cljs.core.first(seq__33660_34188__$1);
var k_34195 = cljs.core.nth.cljs$core$IFn$_invoke$arity$3(vec__33680_34194,(0),null);
var v_34196 = cljs.core.nth.cljs$core$IFn$_invoke$arity$3(vec__33680_34194,(1),null);
el.setAttributeNS((function (){var temp__5804__auto____$1 = cljs.core.namespace(k_34195);
if(cljs.core.truth_(temp__5804__auto____$1)){
var ns = temp__5804__auto____$1;
return cljs.core.get.cljs$core$IFn$_invoke$arity$2(cljs.core.deref(shadow.dom.xmlns),ns);
} else {
return null;
}
})(),cljs.core.name(k_34195),v_34196);


var G__34197 = cljs.core.next(seq__33660_34188__$1);
var G__34198 = null;
var G__34199 = (0);
var G__34200 = (0);
seq__33660_34176 = G__34197;
chunk__33661_34177 = G__34198;
count__33662_34178 = G__34199;
i__33663_34179 = G__34200;
continue;
}
} else {
}
}
break;
}

return el;
});
shadow.dom.svg_node = (function shadow$dom$svg_node(el){
if((el == null)){
return null;
} else {
if((((!((el == null))))?((((false) || ((cljs.core.PROTOCOL_SENTINEL === el.shadow$dom$SVGElement$))))?true:false):false)){
return el.shadow$dom$SVGElement$_to_svg$arity$1(null, );
} else {
return el;

}
}
});
shadow.dom.make_svg_node = (function shadow$dom$make_svg_node(structure){
var vec__33690 = shadow.dom.destructure_node(shadow.dom.create_svg_node,structure);
var node = cljs.core.nth.cljs$core$IFn$_invoke$arity$3(vec__33690,(0),null);
var node_children = cljs.core.nth.cljs$core$IFn$_invoke$arity$3(vec__33690,(1),null);
var seq__33693_34201 = cljs.core.seq(node_children);
var chunk__33695_34202 = null;
var count__33696_34203 = (0);
var i__33697_34204 = (0);
while(true){
if((i__33697_34204 < count__33696_34203)){
var child_struct_34205 = chunk__33695_34202.cljs$core$IIndexed$_nth$arity$2(null, i__33697_34204);
if((!((child_struct_34205 == null)))){
if(typeof child_struct_34205 === 'string'){
var text_34206 = (node["textContent"]);
(node["textContent"] = [cljs.core.str.cljs$core$IFn$_invoke$arity$1(text_34206),child_struct_34205].join(''));
} else {
var children_34207 = shadow.dom.svg_node(child_struct_34205);
if(cljs.core.seq_QMARK_(children_34207)){
var seq__33728_34211 = cljs.core.seq(children_34207);
var chunk__33730_34212 = null;
var count__33731_34213 = (0);
var i__33732_34214 = (0);
while(true){
if((i__33732_34214 < count__33731_34213)){
var child_34215 = chunk__33730_34212.cljs$core$IIndexed$_nth$arity$2(null, i__33732_34214);
if(cljs.core.truth_(child_34215)){
node.appendChild(child_34215);


var G__34216 = seq__33728_34211;
var G__34217 = chunk__33730_34212;
var G__34218 = count__33731_34213;
var G__34219 = (i__33732_34214 + (1));
seq__33728_34211 = G__34216;
chunk__33730_34212 = G__34217;
count__33731_34213 = G__34218;
i__33732_34214 = G__34219;
continue;
} else {
var G__34220 = seq__33728_34211;
var G__34221 = chunk__33730_34212;
var G__34222 = count__33731_34213;
var G__34223 = (i__33732_34214 + (1));
seq__33728_34211 = G__34220;
chunk__33730_34212 = G__34221;
count__33731_34213 = G__34222;
i__33732_34214 = G__34223;
continue;
}
} else {
var temp__5804__auto___34227 = cljs.core.seq(seq__33728_34211);
if(temp__5804__auto___34227){
var seq__33728_34228__$1 = temp__5804__auto___34227;
if(cljs.core.chunked_seq_QMARK_(seq__33728_34228__$1)){
var c__5525__auto___34229 = cljs.core.chunk_first(seq__33728_34228__$1);
var G__34230 = cljs.core.chunk_rest(seq__33728_34228__$1);
var G__34231 = c__5525__auto___34229;
var G__34232 = cljs.core.count(c__5525__auto___34229);
var G__34233 = (0);
seq__33728_34211 = G__34230;
chunk__33730_34212 = G__34231;
count__33731_34213 = G__34232;
i__33732_34214 = G__34233;
continue;
} else {
var child_34234 = cljs.core.first(seq__33728_34228__$1);
if(cljs.core.truth_(child_34234)){
node.appendChild(child_34234);


var G__34235 = cljs.core.next(seq__33728_34228__$1);
var G__34236 = null;
var G__34237 = (0);
var G__34238 = (0);
seq__33728_34211 = G__34235;
chunk__33730_34212 = G__34236;
count__33731_34213 = G__34237;
i__33732_34214 = G__34238;
continue;
} else {
var G__34239 = cljs.core.next(seq__33728_34228__$1);
var G__34240 = null;
var G__34241 = (0);
var G__34242 = (0);
seq__33728_34211 = G__34239;
chunk__33730_34212 = G__34240;
count__33731_34213 = G__34241;
i__33732_34214 = G__34242;
continue;
}
}
} else {
}
}
break;
}
} else {
node.appendChild(children_34207);
}
}


var G__34243 = seq__33693_34201;
var G__34244 = chunk__33695_34202;
var G__34245 = count__33696_34203;
var G__34246 = (i__33697_34204 + (1));
seq__33693_34201 = G__34243;
chunk__33695_34202 = G__34244;
count__33696_34203 = G__34245;
i__33697_34204 = G__34246;
continue;
} else {
var G__34247 = seq__33693_34201;
var G__34248 = chunk__33695_34202;
var G__34249 = count__33696_34203;
var G__34250 = (i__33697_34204 + (1));
seq__33693_34201 = G__34247;
chunk__33695_34202 = G__34248;
count__33696_34203 = G__34249;
i__33697_34204 = G__34250;
continue;
}
} else {
var temp__5804__auto___34251 = cljs.core.seq(seq__33693_34201);
if(temp__5804__auto___34251){
var seq__33693_34252__$1 = temp__5804__auto___34251;
if(cljs.core.chunked_seq_QMARK_(seq__33693_34252__$1)){
var c__5525__auto___34253 = cljs.core.chunk_first(seq__33693_34252__$1);
var G__34254 = cljs.core.chunk_rest(seq__33693_34252__$1);
var G__34255 = c__5525__auto___34253;
var G__34256 = cljs.core.count(c__5525__auto___34253);
var G__34257 = (0);
seq__33693_34201 = G__34254;
chunk__33695_34202 = G__34255;
count__33696_34203 = G__34256;
i__33697_34204 = G__34257;
continue;
} else {
var child_struct_34258 = cljs.core.first(seq__33693_34252__$1);
if((!((child_struct_34258 == null)))){
if(typeof child_struct_34258 === 'string'){
var text_34259 = (node["textContent"]);
(node["textContent"] = [cljs.core.str.cljs$core$IFn$_invoke$arity$1(text_34259),child_struct_34258].join(''));
} else {
var children_34260 = shadow.dom.svg_node(child_struct_34258);
if(cljs.core.seq_QMARK_(children_34260)){
var seq__33738_34261 = cljs.core.seq(children_34260);
var chunk__33740_34262 = null;
var count__33741_34263 = (0);
var i__33742_34264 = (0);
while(true){
if((i__33742_34264 < count__33741_34263)){
var child_34265 = chunk__33740_34262.cljs$core$IIndexed$_nth$arity$2(null, i__33742_34264);
if(cljs.core.truth_(child_34265)){
node.appendChild(child_34265);


var G__34266 = seq__33738_34261;
var G__34267 = chunk__33740_34262;
var G__34268 = count__33741_34263;
var G__34269 = (i__33742_34264 + (1));
seq__33738_34261 = G__34266;
chunk__33740_34262 = G__34267;
count__33741_34263 = G__34268;
i__33742_34264 = G__34269;
continue;
} else {
var G__34270 = seq__33738_34261;
var G__34271 = chunk__33740_34262;
var G__34272 = count__33741_34263;
var G__34273 = (i__33742_34264 + (1));
seq__33738_34261 = G__34270;
chunk__33740_34262 = G__34271;
count__33741_34263 = G__34272;
i__33742_34264 = G__34273;
continue;
}
} else {
var temp__5804__auto___34274__$1 = cljs.core.seq(seq__33738_34261);
if(temp__5804__auto___34274__$1){
var seq__33738_34275__$1 = temp__5804__auto___34274__$1;
if(cljs.core.chunked_seq_QMARK_(seq__33738_34275__$1)){
var c__5525__auto___34276 = cljs.core.chunk_first(seq__33738_34275__$1);
var G__34277 = cljs.core.chunk_rest(seq__33738_34275__$1);
var G__34278 = c__5525__auto___34276;
var G__34279 = cljs.core.count(c__5525__auto___34276);
var G__34280 = (0);
seq__33738_34261 = G__34277;
chunk__33740_34262 = G__34278;
count__33741_34263 = G__34279;
i__33742_34264 = G__34280;
continue;
} else {
var child_34281 = cljs.core.first(seq__33738_34275__$1);
if(cljs.core.truth_(child_34281)){
node.appendChild(child_34281);


var G__34282 = cljs.core.next(seq__33738_34275__$1);
var G__34283 = null;
var G__34284 = (0);
var G__34285 = (0);
seq__33738_34261 = G__34282;
chunk__33740_34262 = G__34283;
count__33741_34263 = G__34284;
i__33742_34264 = G__34285;
continue;
} else {
var G__34286 = cljs.core.next(seq__33738_34275__$1);
var G__34287 = null;
var G__34288 = (0);
var G__34289 = (0);
seq__33738_34261 = G__34286;
chunk__33740_34262 = G__34287;
count__33741_34263 = G__34288;
i__33742_34264 = G__34289;
continue;
}
}
} else {
}
}
break;
}
} else {
node.appendChild(children_34260);
}
}


var G__34290 = cljs.core.next(seq__33693_34252__$1);
var G__34291 = null;
var G__34292 = (0);
var G__34293 = (0);
seq__33693_34201 = G__34290;
chunk__33695_34202 = G__34291;
count__33696_34203 = G__34292;
i__33697_34204 = G__34293;
continue;
} else {
var G__34294 = cljs.core.next(seq__33693_34252__$1);
var G__34295 = null;
var G__34296 = (0);
var G__34297 = (0);
seq__33693_34201 = G__34294;
chunk__33695_34202 = G__34295;
count__33696_34203 = G__34296;
i__33697_34204 = G__34297;
continue;
}
}
} else {
}
}
break;
}

return node;
});
(shadow.dom.SVGElement["string"] = true);

(shadow.dom._to_svg["string"] = (function (this$){
if((this$ instanceof cljs.core.Keyword)){
return shadow.dom.make_svg_node(new cljs.core.PersistentVector(null, 1, 5, cljs.core.PersistentVector.EMPTY_NODE, [this$], null));
} else {
throw cljs.core.ex_info.cljs$core$IFn$_invoke$arity$2("strings cannot be in svgs",new cljs.core.PersistentArrayMap(null, 1, [new cljs.core.Keyword(null,"this","this",-611633625),this$], null));
}
}));

(cljs.core.PersistentVector.prototype.shadow$dom$SVGElement$ = cljs.core.PROTOCOL_SENTINEL);

(cljs.core.PersistentVector.prototype.shadow$dom$SVGElement$_to_svg$arity$1 = (function (this$){
var this$__$1 = this;
return shadow.dom.make_svg_node(this$__$1);
}));

(cljs.core.LazySeq.prototype.shadow$dom$SVGElement$ = cljs.core.PROTOCOL_SENTINEL);

(cljs.core.LazySeq.prototype.shadow$dom$SVGElement$_to_svg$arity$1 = (function (this$){
var this$__$1 = this;
return cljs.core.map.cljs$core$IFn$_invoke$arity$2(shadow.dom._to_svg,this$__$1);
}));

(shadow.dom.SVGElement["null"] = true);

(shadow.dom._to_svg["null"] = (function (_){
return null;
}));
shadow.dom.svg = (function shadow$dom$svg(var_args){
var args__5732__auto__ = [];
var len__5726__auto___34298 = arguments.length;
var i__5727__auto___34299 = (0);
while(true){
if((i__5727__auto___34299 < len__5726__auto___34298)){
args__5732__auto__.push((arguments[i__5727__auto___34299]));

var G__34300 = (i__5727__auto___34299 + (1));
i__5727__auto___34299 = G__34300;
continue;
} else {
}
break;
}

var argseq__5733__auto__ = ((((1) < args__5732__auto__.length))?(new cljs.core.IndexedSeq(args__5732__auto__.slice((1)),(0),null)):null);
return shadow.dom.svg.cljs$core$IFn$_invoke$arity$variadic((arguments[(0)]),argseq__5733__auto__);
});

(shadow.dom.svg.cljs$core$IFn$_invoke$arity$variadic = (function (attrs,children){
return shadow.dom._to_svg(cljs.core.vec(cljs.core.concat.cljs$core$IFn$_invoke$arity$2(new cljs.core.PersistentVector(null, 2, 5, cljs.core.PersistentVector.EMPTY_NODE, [new cljs.core.Keyword(null,"svg","svg",856789142),attrs], null),children)));
}));

(shadow.dom.svg.cljs$lang$maxFixedArity = (1));

/** @this {Function} */
(shadow.dom.svg.cljs$lang$applyTo = (function (seq33748){
var G__33749 = cljs.core.first(seq33748);
var seq33748__$1 = cljs.core.next(seq33748);
var self__5711__auto__ = this;
return self__5711__auto__.cljs$core$IFn$_invoke$arity$variadic(G__33749,seq33748__$1);
}));


//# sourceMappingURL=shadow.dom.js.map
