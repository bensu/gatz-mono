var $CLJS = require("./cljs_env");
var $jscomp = $CLJS.$jscomp;
var COMPILED = false;
require("./cljs.core.js");
var cognitect=$CLJS.cognitect || ($CLJS.cognitect = {});
var clojure=$CLJS.clojure || ($CLJS.clojure = {});
var crdt=$CLJS.crdt || ($CLJS.crdt = {});
var cljs=$CLJS.cljs || ($CLJS.cljs = {});
var shadow=$CLJS.shadow || ($CLJS.shadow = {});
var goog=$CLJS.goog || ($CLJS.goog = {});
var gatz=$CLJS.gatz || ($CLJS.gatz = {});
var medley=$CLJS.medley || ($CLJS.medley = {});
var com=$CLJS.com || ($CLJS.com = {});

$CLJS.SHADOW_ENV.setLoaded("medley.core.js");

goog.provide('medley.core');
/**
 * Finds the first item in a collection that matches a predicate. Returns a
 *   transducer when no collection is provided.
 */
medley.core.find_first = (function medley$core$find_first(var_args){
var G__42668 = arguments.length;
switch (G__42668) {
case 1:
return medley.core.find_first.cljs$core$IFn$_invoke$arity$1((arguments[(0)]));

break;
case 2:
return medley.core.find_first.cljs$core$IFn$_invoke$arity$2((arguments[(0)]),(arguments[(1)]));

break;
default:
throw (new Error(["Invalid arity: ",cljs.core.str.cljs$core$IFn$_invoke$arity$1(arguments.length)].join('')));

}
});

(medley.core.find_first.cljs$core$IFn$_invoke$arity$1 = (function (pred){
return (function (rf){
return (function() {
var G__43145 = null;
var G__43145__0 = (function (){
return (rf.cljs$core$IFn$_invoke$arity$0 ? rf.cljs$core$IFn$_invoke$arity$0() : rf.call(null, ));
});
var G__43145__1 = (function (result){
return (rf.cljs$core$IFn$_invoke$arity$1 ? rf.cljs$core$IFn$_invoke$arity$1(result) : rf.call(null, result));
});
var G__43145__2 = (function (result,x){
if(cljs.core.truth_((pred.cljs$core$IFn$_invoke$arity$1 ? pred.cljs$core$IFn$_invoke$arity$1(x) : pred.call(null, x)))){
return cljs.core.ensure_reduced((rf.cljs$core$IFn$_invoke$arity$2 ? rf.cljs$core$IFn$_invoke$arity$2(result,x) : rf.call(null, result,x)));
} else {
return result;
}
});
G__43145 = function(result,x){
switch(arguments.length){
case 0:
return G__43145__0.call(this);
case 1:
return G__43145__1.call(this,result);
case 2:
return G__43145__2.call(this,result,x);
}
throw(new Error('Invalid arity: ' + arguments.length));
};
G__43145.cljs$core$IFn$_invoke$arity$0 = G__43145__0;
G__43145.cljs$core$IFn$_invoke$arity$1 = G__43145__1;
G__43145.cljs$core$IFn$_invoke$arity$2 = G__43145__2;
return G__43145;
})()
});
}));

(medley.core.find_first.cljs$core$IFn$_invoke$arity$2 = (function (pred,coll){
return cljs.core.reduce.cljs$core$IFn$_invoke$arity$3((function (_,x){
if(cljs.core.truth_((pred.cljs$core$IFn$_invoke$arity$1 ? pred.cljs$core$IFn$_invoke$arity$1(x) : pred.call(null, x)))){
return cljs.core.reduced(x);
} else {
return null;
}
}),null,coll);
}));

(medley.core.find_first.cljs$lang$maxFixedArity = 2);

/**
 * Dissociate a value in a nested associative structure, identified by a sequence
 *   of keys. Any collections left empty by the operation will be dissociated from
 *   their containing structures.
 */
medley.core.dissoc_in = (function medley$core$dissoc_in(var_args){
var G__42673 = arguments.length;
switch (G__42673) {
case 2:
return medley.core.dissoc_in.cljs$core$IFn$_invoke$arity$2((arguments[(0)]),(arguments[(1)]));

break;
default:
var args_arr__5751__auto__ = [];
var len__5726__auto___43148 = arguments.length;
var i__5727__auto___43149 = (0);
while(true){
if((i__5727__auto___43149 < len__5726__auto___43148)){
args_arr__5751__auto__.push((arguments[i__5727__auto___43149]));

var G__43150 = (i__5727__auto___43149 + (1));
i__5727__auto___43149 = G__43150;
continue;
} else {
}
break;
}

var argseq__5752__auto__ = ((((2) < args_arr__5751__auto__.length))?(new cljs.core.IndexedSeq(args_arr__5751__auto__.slice((2)),(0),null)):null);
return medley.core.dissoc_in.cljs$core$IFn$_invoke$arity$variadic((arguments[(0)]),(arguments[(1)]),argseq__5752__auto__);

}
});

(medley.core.dissoc_in.cljs$core$IFn$_invoke$arity$2 = (function (m,ks){
var temp__5802__auto__ = cljs.core.seq(ks);
if(temp__5802__auto__){
var vec__42674 = temp__5802__auto__;
var seq__42675 = cljs.core.seq(vec__42674);
var first__42676 = cljs.core.first(seq__42675);
var seq__42675__$1 = cljs.core.next(seq__42675);
var k = first__42676;
var ks__$1 = seq__42675__$1;
if(cljs.core.seq(ks__$1)){
var v = medley.core.dissoc_in.cljs$core$IFn$_invoke$arity$2(cljs.core.get.cljs$core$IFn$_invoke$arity$2(m,k),ks__$1);
if(cljs.core.empty_QMARK_(v)){
return cljs.core.dissoc.cljs$core$IFn$_invoke$arity$2(m,k);
} else {
return cljs.core.assoc.cljs$core$IFn$_invoke$arity$3(m,k,v);
}
} else {
return cljs.core.dissoc.cljs$core$IFn$_invoke$arity$2(m,k);
}
} else {
return m;
}
}));

(medley.core.dissoc_in.cljs$core$IFn$_invoke$arity$variadic = (function (m,ks,kss){
while(true){
var temp__5802__auto__ = cljs.core.seq(kss);
if(temp__5802__auto__){
var vec__42677 = temp__5802__auto__;
var seq__42678 = cljs.core.seq(vec__42677);
var first__42679 = cljs.core.first(seq__42678);
var seq__42678__$1 = cljs.core.next(seq__42678);
var ks_SINGLEQUOTE_ = first__42679;
var kss__$1 = seq__42678__$1;
var G__43151 = medley.core.dissoc_in.cljs$core$IFn$_invoke$arity$2(m,ks);
var G__43152 = ks_SINGLEQUOTE_;
var G__43153 = kss__$1;
m = G__43151;
ks = G__43152;
kss = G__43153;
continue;
} else {
return medley.core.dissoc_in.cljs$core$IFn$_invoke$arity$2(m,ks);
}
break;
}
}));

/** @this {Function} */
(medley.core.dissoc_in.cljs$lang$applyTo = (function (seq42670){
var G__42671 = cljs.core.first(seq42670);
var seq42670__$1 = cljs.core.next(seq42670);
var G__42672 = cljs.core.first(seq42670__$1);
var seq42670__$2 = cljs.core.next(seq42670__$1);
var self__5711__auto__ = this;
return self__5711__auto__.cljs$core$IFn$_invoke$arity$variadic(G__42671,G__42672,seq42670__$2);
}));

(medley.core.dissoc_in.cljs$lang$maxFixedArity = (2));

medley.core.assoc_some_transient_BANG_ = (function medley$core$assoc_some_transient_BANG_(m,k,v){
if((v == null)){
return m;
} else {
return cljs.core.assoc_BANG_.cljs$core$IFn$_invoke$arity$3(m,k,v);
}
});
/**
 * Associates a key k, with a value v in a map m, if and only if v is not nil.
 */
medley.core.assoc_some = (function medley$core$assoc_some(var_args){
var G__42685 = arguments.length;
switch (G__42685) {
case 3:
return medley.core.assoc_some.cljs$core$IFn$_invoke$arity$3((arguments[(0)]),(arguments[(1)]),(arguments[(2)]));

break;
default:
var args_arr__5751__auto__ = [];
var len__5726__auto___43157 = arguments.length;
var i__5727__auto___43158 = (0);
while(true){
if((i__5727__auto___43158 < len__5726__auto___43157)){
args_arr__5751__auto__.push((arguments[i__5727__auto___43158]));

var G__43159 = (i__5727__auto___43158 + (1));
i__5727__auto___43158 = G__43159;
continue;
} else {
}
break;
}

var argseq__5752__auto__ = ((((3) < args_arr__5751__auto__.length))?(new cljs.core.IndexedSeq(args_arr__5751__auto__.slice((3)),(0),null)):null);
return medley.core.assoc_some.cljs$core$IFn$_invoke$arity$variadic((arguments[(0)]),(arguments[(1)]),(arguments[(2)]),argseq__5752__auto__);

}
});

(medley.core.assoc_some.cljs$core$IFn$_invoke$arity$3 = (function (m,k,v){
if((v == null)){
return m;
} else {
return cljs.core.assoc.cljs$core$IFn$_invoke$arity$3(m,k,v);
}
}));

(medley.core.assoc_some.cljs$core$IFn$_invoke$arity$variadic = (function (m,k,v,kvs){
var acc = medley.core.assoc_some_transient_BANG_(cljs.core.transient$((function (){var or__5002__auto__ = m;
if(cljs.core.truth_(or__5002__auto__)){
return or__5002__auto__;
} else {
return cljs.core.PersistentArrayMap.EMPTY;
}
})()),k,v);
var kvs__$1 = kvs;
while(true){
if(cljs.core.next(kvs__$1)){
var G__43160 = medley.core.assoc_some_transient_BANG_(acc,cljs.core.first(kvs__$1),cljs.core.second(kvs__$1));
var G__43161 = cljs.core.nnext(kvs__$1);
acc = G__43160;
kvs__$1 = G__43161;
continue;
} else {
if((cljs.core.count(acc) === (0))){
return m;
} else {
return cljs.core.persistent_BANG_(acc);
}
}
break;
}
}));

/** @this {Function} */
(medley.core.assoc_some.cljs$lang$applyTo = (function (seq42681){
var G__42682 = cljs.core.first(seq42681);
var seq42681__$1 = cljs.core.next(seq42681);
var G__42683 = cljs.core.first(seq42681__$1);
var seq42681__$2 = cljs.core.next(seq42681__$1);
var G__42684 = cljs.core.first(seq42681__$2);
var seq42681__$3 = cljs.core.next(seq42681__$2);
var self__5711__auto__ = this;
return self__5711__auto__.cljs$core$IFn$_invoke$arity$variadic(G__42682,G__42683,G__42684,seq42681__$3);
}));

(medley.core.assoc_some.cljs$lang$maxFixedArity = (3));

/**
 * Updates a value in a map given a key and a function, if and only if the key
 *   exists in the map. See: `clojure.core/update`.
 */
medley.core.update_existing = (function medley$core$update_existing(var_args){
var G__42711 = arguments.length;
switch (G__42711) {
case 3:
return medley.core.update_existing.cljs$core$IFn$_invoke$arity$3((arguments[(0)]),(arguments[(1)]),(arguments[(2)]));

break;
case 4:
return medley.core.update_existing.cljs$core$IFn$_invoke$arity$4((arguments[(0)]),(arguments[(1)]),(arguments[(2)]),(arguments[(3)]));

break;
case 5:
return medley.core.update_existing.cljs$core$IFn$_invoke$arity$5((arguments[(0)]),(arguments[(1)]),(arguments[(2)]),(arguments[(3)]),(arguments[(4)]));

break;
case 6:
return medley.core.update_existing.cljs$core$IFn$_invoke$arity$6((arguments[(0)]),(arguments[(1)]),(arguments[(2)]),(arguments[(3)]),(arguments[(4)]),(arguments[(5)]));

break;
default:
var args_arr__5751__auto__ = [];
var len__5726__auto___43165 = arguments.length;
var i__5727__auto___43166 = (0);
while(true){
if((i__5727__auto___43166 < len__5726__auto___43165)){
args_arr__5751__auto__.push((arguments[i__5727__auto___43166]));

var G__43167 = (i__5727__auto___43166 + (1));
i__5727__auto___43166 = G__43167;
continue;
} else {
}
break;
}

var argseq__5752__auto__ = ((((6) < args_arr__5751__auto__.length))?(new cljs.core.IndexedSeq(args_arr__5751__auto__.slice((6)),(0),null)):null);
return medley.core.update_existing.cljs$core$IFn$_invoke$arity$variadic((arguments[(0)]),(arguments[(1)]),(arguments[(2)]),(arguments[(3)]),(arguments[(4)]),(arguments[(5)]),argseq__5752__auto__);

}
});

(medley.core.update_existing.cljs$core$IFn$_invoke$arity$3 = (function (m,k,f){
var temp__5802__auto__ = cljs.core.find(m,k);
if(cljs.core.truth_(temp__5802__auto__)){
var kv = temp__5802__auto__;
return cljs.core.assoc.cljs$core$IFn$_invoke$arity$3(m,k,(function (){var G__42712 = cljs.core.val(kv);
return (f.cljs$core$IFn$_invoke$arity$1 ? f.cljs$core$IFn$_invoke$arity$1(G__42712) : f.call(null, G__42712));
})());
} else {
return m;
}
}));

(medley.core.update_existing.cljs$core$IFn$_invoke$arity$4 = (function (m,k,f,x){
var temp__5802__auto__ = cljs.core.find(m,k);
if(cljs.core.truth_(temp__5802__auto__)){
var kv = temp__5802__auto__;
return cljs.core.assoc.cljs$core$IFn$_invoke$arity$3(m,k,(function (){var G__42725 = cljs.core.val(kv);
var G__42726 = x;
return (f.cljs$core$IFn$_invoke$arity$2 ? f.cljs$core$IFn$_invoke$arity$2(G__42725,G__42726) : f.call(null, G__42725,G__42726));
})());
} else {
return m;
}
}));

(medley.core.update_existing.cljs$core$IFn$_invoke$arity$5 = (function (m,k,f,x,y){
var temp__5802__auto__ = cljs.core.find(m,k);
if(cljs.core.truth_(temp__5802__auto__)){
var kv = temp__5802__auto__;
return cljs.core.assoc.cljs$core$IFn$_invoke$arity$3(m,k,(function (){var G__42735 = cljs.core.val(kv);
var G__42736 = x;
var G__42737 = y;
return (f.cljs$core$IFn$_invoke$arity$3 ? f.cljs$core$IFn$_invoke$arity$3(G__42735,G__42736,G__42737) : f.call(null, G__42735,G__42736,G__42737));
})());
} else {
return m;
}
}));

(medley.core.update_existing.cljs$core$IFn$_invoke$arity$6 = (function (m,k,f,x,y,z){
var temp__5802__auto__ = cljs.core.find(m,k);
if(cljs.core.truth_(temp__5802__auto__)){
var kv = temp__5802__auto__;
return cljs.core.assoc.cljs$core$IFn$_invoke$arity$3(m,k,(function (){var G__42742 = cljs.core.val(kv);
var G__42743 = x;
var G__42744 = y;
var G__42745 = z;
return (f.cljs$core$IFn$_invoke$arity$4 ? f.cljs$core$IFn$_invoke$arity$4(G__42742,G__42743,G__42744,G__42745) : f.call(null, G__42742,G__42743,G__42744,G__42745));
})());
} else {
return m;
}
}));

(medley.core.update_existing.cljs$core$IFn$_invoke$arity$variadic = (function (m,k,f,x,y,z,more){
var temp__5802__auto__ = cljs.core.find(m,k);
if(cljs.core.truth_(temp__5802__auto__)){
var kv = temp__5802__auto__;
return cljs.core.assoc.cljs$core$IFn$_invoke$arity$3(m,k,cljs.core.apply.cljs$core$IFn$_invoke$arity$variadic(f,cljs.core.val(kv),x,y,z,cljs.core.prim_seq.cljs$core$IFn$_invoke$arity$2([more], 0)));
} else {
return m;
}
}));

/** @this {Function} */
(medley.core.update_existing.cljs$lang$applyTo = (function (seq42704){
var G__42705 = cljs.core.first(seq42704);
var seq42704__$1 = cljs.core.next(seq42704);
var G__42706 = cljs.core.first(seq42704__$1);
var seq42704__$2 = cljs.core.next(seq42704__$1);
var G__42707 = cljs.core.first(seq42704__$2);
var seq42704__$3 = cljs.core.next(seq42704__$2);
var G__42708 = cljs.core.first(seq42704__$3);
var seq42704__$4 = cljs.core.next(seq42704__$3);
var G__42709 = cljs.core.first(seq42704__$4);
var seq42704__$5 = cljs.core.next(seq42704__$4);
var G__42710 = cljs.core.first(seq42704__$5);
var seq42704__$6 = cljs.core.next(seq42704__$5);
var self__5711__auto__ = this;
return self__5711__auto__.cljs$core$IFn$_invoke$arity$variadic(G__42705,G__42706,G__42707,G__42708,G__42709,G__42710,seq42704__$6);
}));

(medley.core.update_existing.cljs$lang$maxFixedArity = (6));

/**
 * Updates a value in a nested associative structure, if and only if the key
 *   path exists. See: `clojure.core/update-in`.
 */
medley.core.update_existing_in = (function medley$core$update_existing_in(var_args){
var args__5732__auto__ = [];
var len__5726__auto___43168 = arguments.length;
var i__5727__auto___43169 = (0);
while(true){
if((i__5727__auto___43169 < len__5726__auto___43168)){
args__5732__auto__.push((arguments[i__5727__auto___43169]));

var G__43172 = (i__5727__auto___43169 + (1));
i__5727__auto___43169 = G__43172;
continue;
} else {
}
break;
}

var argseq__5733__auto__ = ((((3) < args__5732__auto__.length))?(new cljs.core.IndexedSeq(args__5732__auto__.slice((3)),(0),null)):null);
return medley.core.update_existing_in.cljs$core$IFn$_invoke$arity$variadic((arguments[(0)]),(arguments[(1)]),(arguments[(2)]),argseq__5733__auto__);
});

(medley.core.update_existing_in.cljs$core$IFn$_invoke$arity$variadic = (function (m,ks,f,args){
var up = (function medley$core$up(m__$1,ks__$1,f__$1,args__$1){
var vec__42751 = ks__$1;
var seq__42752 = cljs.core.seq(vec__42751);
var first__42753 = cljs.core.first(seq__42752);
var seq__42752__$1 = cljs.core.next(seq__42752);
var k = first__42753;
var ks__$2 = seq__42752__$1;
var temp__5802__auto__ = cljs.core.find(m__$1,k);
if(cljs.core.truth_(temp__5802__auto__)){
var kv = temp__5802__auto__;
if(ks__$2){
return cljs.core.assoc.cljs$core$IFn$_invoke$arity$3(m__$1,k,medley$core$up(cljs.core.val(kv),ks__$2,f__$1,args__$1));
} else {
return cljs.core.assoc.cljs$core$IFn$_invoke$arity$3(m__$1,k,cljs.core.apply.cljs$core$IFn$_invoke$arity$3(f__$1,cljs.core.val(kv),args__$1));
}
} else {
return m__$1;
}
});
return up(m,ks,f,args);
}));

(medley.core.update_existing_in.cljs$lang$maxFixedArity = (3));

/** @this {Function} */
(medley.core.update_existing_in.cljs$lang$applyTo = (function (seq42747){
var G__42748 = cljs.core.first(seq42747);
var seq42747__$1 = cljs.core.next(seq42747);
var G__42749 = cljs.core.first(seq42747__$1);
var seq42747__$2 = cljs.core.next(seq42747__$1);
var G__42750 = cljs.core.first(seq42747__$2);
var seq42747__$3 = cljs.core.next(seq42747__$2);
var self__5711__auto__ = this;
return self__5711__auto__.cljs$core$IFn$_invoke$arity$variadic(G__42748,G__42749,G__42750,seq42747__$3);
}));

medley.core.editable_QMARK_ = (function medley$core$editable_QMARK_(coll){
if((!((coll == null)))){
if((((coll.cljs$lang$protocol_mask$partition1$ & (4))) || ((cljs.core.PROTOCOL_SENTINEL === coll.cljs$core$IEditableCollection$)))){
return true;
} else {
if((!coll.cljs$lang$protocol_mask$partition1$)){
return cljs.core.native_satisfies_QMARK_(cljs.core.IEditableCollection,coll);
} else {
return false;
}
}
} else {
return cljs.core.native_satisfies_QMARK_(cljs.core.IEditableCollection,coll);
}
});
medley.core.reduce_map = (function medley$core$reduce_map(f,coll){
var coll_SINGLEQUOTE_ = ((cljs.core.record_QMARK_(coll))?cljs.core.into.cljs$core$IFn$_invoke$arity$2(cljs.core.PersistentArrayMap.EMPTY,coll):coll);
if(medley.core.editable_QMARK_(coll_SINGLEQUOTE_)){
return cljs.core.persistent_BANG_(cljs.core.reduce_kv((f.cljs$core$IFn$_invoke$arity$1 ? f.cljs$core$IFn$_invoke$arity$1(cljs.core.assoc_BANG_) : f.call(null, cljs.core.assoc_BANG_)),cljs.core.transient$(cljs.core.empty(coll_SINGLEQUOTE_)),coll_SINGLEQUOTE_));
} else {
return cljs.core.reduce_kv((f.cljs$core$IFn$_invoke$arity$1 ? f.cljs$core$IFn$_invoke$arity$1(cljs.core.assoc) : f.call(null, cljs.core.assoc)),cljs.core.empty(coll_SINGLEQUOTE_),coll_SINGLEQUOTE_);
}
});
/**
 * Create a map entry for a key and value pair.
 */
medley.core.map_entry = (function medley$core$map_entry(k,v){
return (new cljs.core.MapEntry(k,v,null));
});
/**
 * Maps a function over the key/value pairs of an associative collection. Expects
 *   a function that takes two arguments, the key and value, and returns the new
 *   key and value as a collection of two elements.
 */
medley.core.map_kv = (function medley$core$map_kv(f,coll){
return medley.core.reduce_map((function (xf){
return (function (m,k,v){
var vec__42757 = (f.cljs$core$IFn$_invoke$arity$2 ? f.cljs$core$IFn$_invoke$arity$2(k,v) : f.call(null, k,v));
var k__$1 = cljs.core.nth.cljs$core$IFn$_invoke$arity$3(vec__42757,(0),null);
var v__$1 = cljs.core.nth.cljs$core$IFn$_invoke$arity$3(vec__42757,(1),null);
return (xf.cljs$core$IFn$_invoke$arity$3 ? xf.cljs$core$IFn$_invoke$arity$3(m,k__$1,v__$1) : xf.call(null, m,k__$1,v__$1));
});
}),coll);
});
/**
 * Maps a function over the keys of an associative collection.
 */
medley.core.map_keys = (function medley$core$map_keys(f,coll){
return medley.core.reduce_map((function (xf){
return (function (m,k,v){
var G__42760 = m;
var G__42761 = (f.cljs$core$IFn$_invoke$arity$1 ? f.cljs$core$IFn$_invoke$arity$1(k) : f.call(null, k));
var G__42762 = v;
return (xf.cljs$core$IFn$_invoke$arity$3 ? xf.cljs$core$IFn$_invoke$arity$3(G__42760,G__42761,G__42762) : xf.call(null, G__42760,G__42761,G__42762));
});
}),coll);
});
/**
 * Maps a function over the values of one or more associative collections.
 *   The function should accept number-of-colls arguments. Any keys which are not
 *   shared among all collections are ignored.
 */
medley.core.map_vals = (function medley$core$map_vals(var_args){
var G__42769 = arguments.length;
switch (G__42769) {
case 2:
return medley.core.map_vals.cljs$core$IFn$_invoke$arity$2((arguments[(0)]),(arguments[(1)]));

break;
default:
var args_arr__5751__auto__ = [];
var len__5726__auto___43180 = arguments.length;
var i__5727__auto___43181 = (0);
while(true){
if((i__5727__auto___43181 < len__5726__auto___43180)){
args_arr__5751__auto__.push((arguments[i__5727__auto___43181]));

var G__43182 = (i__5727__auto___43181 + (1));
i__5727__auto___43181 = G__43182;
continue;
} else {
}
break;
}

var argseq__5752__auto__ = ((((2) < args_arr__5751__auto__.length))?(new cljs.core.IndexedSeq(args_arr__5751__auto__.slice((2)),(0),null)):null);
return medley.core.map_vals.cljs$core$IFn$_invoke$arity$variadic((arguments[(0)]),(arguments[(1)]),argseq__5752__auto__);

}
});

(medley.core.map_vals.cljs$core$IFn$_invoke$arity$2 = (function (f,coll){
return medley.core.reduce_map((function (xf){
return (function (m,k,v){
var G__42771 = m;
var G__42772 = k;
var G__42773 = (f.cljs$core$IFn$_invoke$arity$1 ? f.cljs$core$IFn$_invoke$arity$1(v) : f.call(null, v));
return (xf.cljs$core$IFn$_invoke$arity$3 ? xf.cljs$core$IFn$_invoke$arity$3(G__42771,G__42772,G__42773) : xf.call(null, G__42771,G__42772,G__42773));
});
}),coll);
}));

(medley.core.map_vals.cljs$core$IFn$_invoke$arity$variadic = (function (f,c1,colls){
return medley.core.reduce_map((function (xf){
return (function (m,k,v){
if(cljs.core.every_QMARK_((function (p1__42763_SHARP_){
return cljs.core.contains_QMARK_(p1__42763_SHARP_,k);
}),colls)){
var G__42774 = m;
var G__42775 = k;
var G__42776 = cljs.core.apply.cljs$core$IFn$_invoke$arity$3(f,v,cljs.core.map.cljs$core$IFn$_invoke$arity$2((function (p1__42764_SHARP_){
return cljs.core.get.cljs$core$IFn$_invoke$arity$2(p1__42764_SHARP_,k);
}),colls));
return (xf.cljs$core$IFn$_invoke$arity$3 ? xf.cljs$core$IFn$_invoke$arity$3(G__42774,G__42775,G__42776) : xf.call(null, G__42774,G__42775,G__42776));
} else {
return m;
}
});
}),c1);
}));

/** @this {Function} */
(medley.core.map_vals.cljs$lang$applyTo = (function (seq42766){
var G__42767 = cljs.core.first(seq42766);
var seq42766__$1 = cljs.core.next(seq42766);
var G__42768 = cljs.core.first(seq42766__$1);
var seq42766__$2 = cljs.core.next(seq42766__$1);
var self__5711__auto__ = this;
return self__5711__auto__.cljs$core$IFn$_invoke$arity$variadic(G__42767,G__42768,seq42766__$2);
}));

(medley.core.map_vals.cljs$lang$maxFixedArity = (2));

/**
 * Maps a function over the key/value pairs of an associative collection, using
 *   the return of the function as the new key.
 */
medley.core.map_kv_keys = (function medley$core$map_kv_keys(f,coll){
return medley.core.reduce_map((function (xf){
return (function (m,k,v){
var G__42859 = m;
var G__42860 = (f.cljs$core$IFn$_invoke$arity$2 ? f.cljs$core$IFn$_invoke$arity$2(k,v) : f.call(null, k,v));
var G__42861 = v;
return (xf.cljs$core$IFn$_invoke$arity$3 ? xf.cljs$core$IFn$_invoke$arity$3(G__42859,G__42860,G__42861) : xf.call(null, G__42859,G__42860,G__42861));
});
}),coll);
});
/**
 * Maps a function over the key/value pairs of an associative collection, using
 *   the return of the function as the new value.
 */
medley.core.map_kv_vals = (function medley$core$map_kv_vals(f,coll){
return medley.core.reduce_map((function (xf){
return (function (m,k,v){
var G__42863 = m;
var G__42864 = k;
var G__42865 = (f.cljs$core$IFn$_invoke$arity$2 ? f.cljs$core$IFn$_invoke$arity$2(k,v) : f.call(null, k,v));
return (xf.cljs$core$IFn$_invoke$arity$3 ? xf.cljs$core$IFn$_invoke$arity$3(G__42863,G__42864,G__42865) : xf.call(null, G__42863,G__42864,G__42865));
});
}),coll);
});
/**
 * Returns a new associative collection of the items in coll for which
 *   `(pred (key item) (val item))` returns true.
 */
medley.core.filter_kv = (function medley$core$filter_kv(pred,coll){
return medley.core.reduce_map((function (xf){
return (function (m,k,v){
if(cljs.core.truth_((pred.cljs$core$IFn$_invoke$arity$2 ? pred.cljs$core$IFn$_invoke$arity$2(k,v) : pred.call(null, k,v)))){
return (xf.cljs$core$IFn$_invoke$arity$3 ? xf.cljs$core$IFn$_invoke$arity$3(m,k,v) : xf.call(null, m,k,v));
} else {
return m;
}
});
}),coll);
});
/**
 * Returns a new associative collection of the items in coll for which
 *   `(pred (key item))` returns true.
 */
medley.core.filter_keys = (function medley$core$filter_keys(pred,coll){
return medley.core.reduce_map((function (xf){
return (function (m,k,v){
if(cljs.core.truth_((pred.cljs$core$IFn$_invoke$arity$1 ? pred.cljs$core$IFn$_invoke$arity$1(k) : pred.call(null, k)))){
return (xf.cljs$core$IFn$_invoke$arity$3 ? xf.cljs$core$IFn$_invoke$arity$3(m,k,v) : xf.call(null, m,k,v));
} else {
return m;
}
});
}),coll);
});
/**
 * Returns a new associative collection of the items in coll for which
 *   `(pred (val item))` returns true.
 */
medley.core.filter_vals = (function medley$core$filter_vals(pred,coll){
return medley.core.reduce_map((function (xf){
return (function (m,k,v){
if(cljs.core.truth_((pred.cljs$core$IFn$_invoke$arity$1 ? pred.cljs$core$IFn$_invoke$arity$1(v) : pred.call(null, v)))){
return (xf.cljs$core$IFn$_invoke$arity$3 ? xf.cljs$core$IFn$_invoke$arity$3(m,k,v) : xf.call(null, m,k,v));
} else {
return m;
}
});
}),coll);
});
/**
 * Returns a new associative collection of the items in coll for which
 *   `(pred (key item) (val item))` returns false.
 */
medley.core.remove_kv = (function medley$core$remove_kv(pred,coll){
return medley.core.filter_kv(cljs.core.complement(pred),coll);
});
/**
 * Returns a new associative collection of the items in coll for which
 *   `(pred (key item))` returns false.
 */
medley.core.remove_keys = (function medley$core$remove_keys(pred,coll){
return medley.core.filter_keys(cljs.core.complement(pred),coll);
});
/**
 * Returns a new associative collection of the items in coll for which
 *   `(pred (val item))` returns false.
 */
medley.core.remove_vals = (function medley$core$remove_vals(pred,coll){
return medley.core.filter_vals(cljs.core.complement(pred),coll);
});
/**
 * Creates an empty persistent queue, or one populated with a collection.
 */
medley.core.queue = (function medley$core$queue(var_args){
var G__42890 = arguments.length;
switch (G__42890) {
case 0:
return medley.core.queue.cljs$core$IFn$_invoke$arity$0();

break;
case 1:
return medley.core.queue.cljs$core$IFn$_invoke$arity$1((arguments[(0)]));

break;
default:
throw (new Error(["Invalid arity: ",cljs.core.str.cljs$core$IFn$_invoke$arity$1(arguments.length)].join('')));

}
});

(medley.core.queue.cljs$core$IFn$_invoke$arity$0 = (function (){
return cljs.core.PersistentQueue.EMPTY;
}));

(medley.core.queue.cljs$core$IFn$_invoke$arity$1 = (function (coll){
return cljs.core.into.cljs$core$IFn$_invoke$arity$2(medley.core.queue.cljs$core$IFn$_invoke$arity$0(),coll);
}));

(medley.core.queue.cljs$lang$maxFixedArity = 1);

/**
 * Returns true if x implements clojure.lang.PersistentQueue.
 */
medley.core.queue_QMARK_ = (function medley$core$queue_QMARK_(x){
return (x instanceof cljs.core.PersistentQueue);
});
/**
 * Returns true if x is a boolean.
 */
medley.core.boolean_QMARK_ = (function medley$core$boolean_QMARK_(x){
return ((x === true) || (x === false));
});
/**
 * Return the least argument (as defined by the compare function) in O(n) time.
 */
medley.core.least = (function medley$core$least(var_args){
var G__42895 = arguments.length;
switch (G__42895) {
case 0:
return medley.core.least.cljs$core$IFn$_invoke$arity$0();

break;
case 1:
return medley.core.least.cljs$core$IFn$_invoke$arity$1((arguments[(0)]));

break;
case 2:
return medley.core.least.cljs$core$IFn$_invoke$arity$2((arguments[(0)]),(arguments[(1)]));

break;
default:
var args_arr__5751__auto__ = [];
var len__5726__auto___43186 = arguments.length;
var i__5727__auto___43187 = (0);
while(true){
if((i__5727__auto___43187 < len__5726__auto___43186)){
args_arr__5751__auto__.push((arguments[i__5727__auto___43187]));

var G__43188 = (i__5727__auto___43187 + (1));
i__5727__auto___43187 = G__43188;
continue;
} else {
}
break;
}

var argseq__5752__auto__ = ((((2) < args_arr__5751__auto__.length))?(new cljs.core.IndexedSeq(args_arr__5751__auto__.slice((2)),(0),null)):null);
return medley.core.least.cljs$core$IFn$_invoke$arity$variadic((arguments[(0)]),(arguments[(1)]),argseq__5752__auto__);

}
});

(medley.core.least.cljs$core$IFn$_invoke$arity$0 = (function (){
return null;
}));

(medley.core.least.cljs$core$IFn$_invoke$arity$1 = (function (a){
return a;
}));

(medley.core.least.cljs$core$IFn$_invoke$arity$2 = (function (a,b){
if((cljs.core.compare(a,b) < (0))){
return a;
} else {
return b;
}
}));

(medley.core.least.cljs$core$IFn$_invoke$arity$variadic = (function (a,b,more){
return cljs.core.reduce.cljs$core$IFn$_invoke$arity$3(medley.core.least,medley.core.least.cljs$core$IFn$_invoke$arity$2(a,b),more);
}));

/** @this {Function} */
(medley.core.least.cljs$lang$applyTo = (function (seq42892){
var G__42893 = cljs.core.first(seq42892);
var seq42892__$1 = cljs.core.next(seq42892);
var G__42894 = cljs.core.first(seq42892__$1);
var seq42892__$2 = cljs.core.next(seq42892__$1);
var self__5711__auto__ = this;
return self__5711__auto__.cljs$core$IFn$_invoke$arity$variadic(G__42893,G__42894,seq42892__$2);
}));

(medley.core.least.cljs$lang$maxFixedArity = (2));

/**
 * Return the argument for which (keyfn x) is least. Determined by the compare
 *   function in O(n) time. Prefer `clojure.core/min-key` if keyfn returns numbers.
 */
medley.core.least_by = (function medley$core$least_by(var_args){
var G__42970 = arguments.length;
switch (G__42970) {
case 1:
return medley.core.least_by.cljs$core$IFn$_invoke$arity$1((arguments[(0)]));

break;
case 2:
return medley.core.least_by.cljs$core$IFn$_invoke$arity$2((arguments[(0)]),(arguments[(1)]));

break;
case 3:
return medley.core.least_by.cljs$core$IFn$_invoke$arity$3((arguments[(0)]),(arguments[(1)]),(arguments[(2)]));

break;
default:
var args_arr__5751__auto__ = [];
var len__5726__auto___43190 = arguments.length;
var i__5727__auto___43191 = (0);
while(true){
if((i__5727__auto___43191 < len__5726__auto___43190)){
args_arr__5751__auto__.push((arguments[i__5727__auto___43191]));

var G__43192 = (i__5727__auto___43191 + (1));
i__5727__auto___43191 = G__43192;
continue;
} else {
}
break;
}

var argseq__5752__auto__ = ((((3) < args_arr__5751__auto__.length))?(new cljs.core.IndexedSeq(args_arr__5751__auto__.slice((3)),(0),null)):null);
return medley.core.least_by.cljs$core$IFn$_invoke$arity$variadic((arguments[(0)]),(arguments[(1)]),(arguments[(2)]),argseq__5752__auto__);

}
});

(medley.core.least_by.cljs$core$IFn$_invoke$arity$1 = (function (_){
return null;
}));

(medley.core.least_by.cljs$core$IFn$_invoke$arity$2 = (function (_,x){
return x;
}));

(medley.core.least_by.cljs$core$IFn$_invoke$arity$3 = (function (keyfn,x,y){
if((cljs.core.compare((keyfn.cljs$core$IFn$_invoke$arity$1 ? keyfn.cljs$core$IFn$_invoke$arity$1(x) : keyfn.call(null, x)),(keyfn.cljs$core$IFn$_invoke$arity$1 ? keyfn.cljs$core$IFn$_invoke$arity$1(y) : keyfn.call(null, y))) < (0))){
return x;
} else {
return y;
}
}));

(medley.core.least_by.cljs$core$IFn$_invoke$arity$variadic = (function (keyfn,x,y,more){
var kx = (keyfn.cljs$core$IFn$_invoke$arity$1 ? keyfn.cljs$core$IFn$_invoke$arity$1(x) : keyfn.call(null, x));
var ky = (keyfn.cljs$core$IFn$_invoke$arity$1 ? keyfn.cljs$core$IFn$_invoke$arity$1(y) : keyfn.call(null, y));
var vec__42980 = (((cljs.core.compare(kx,ky) < (0)))?new cljs.core.PersistentVector(null, 2, 5, cljs.core.PersistentVector.EMPTY_NODE, [x,kx], null):new cljs.core.PersistentVector(null, 2, 5, cljs.core.PersistentVector.EMPTY_NODE, [y,ky], null));
var v = cljs.core.nth.cljs$core$IFn$_invoke$arity$3(vec__42980,(0),null);
var kv = cljs.core.nth.cljs$core$IFn$_invoke$arity$3(vec__42980,(1),null);
var v__$1 = v;
var kv__$1 = kv;
var more__$1 = more;
while(true){
if(cljs.core.truth_(more__$1)){
var w = cljs.core.first(more__$1);
var kw = (keyfn.cljs$core$IFn$_invoke$arity$1 ? keyfn.cljs$core$IFn$_invoke$arity$1(w) : keyfn.call(null, w));
if((cljs.core.compare(kw,kv__$1) > (0))){
var G__43193 = v__$1;
var G__43194 = kv__$1;
var G__43195 = cljs.core.next(more__$1);
v__$1 = G__43193;
kv__$1 = G__43194;
more__$1 = G__43195;
continue;
} else {
var G__43196 = w;
var G__43197 = kw;
var G__43198 = cljs.core.next(more__$1);
v__$1 = G__43196;
kv__$1 = G__43197;
more__$1 = G__43198;
continue;
}
} else {
return v__$1;
}
break;
}
}));

/** @this {Function} */
(medley.core.least_by.cljs$lang$applyTo = (function (seq42954){
var G__42955 = cljs.core.first(seq42954);
var seq42954__$1 = cljs.core.next(seq42954);
var G__42956 = cljs.core.first(seq42954__$1);
var seq42954__$2 = cljs.core.next(seq42954__$1);
var G__42957 = cljs.core.first(seq42954__$2);
var seq42954__$3 = cljs.core.next(seq42954__$2);
var self__5711__auto__ = this;
return self__5711__auto__.cljs$core$IFn$_invoke$arity$variadic(G__42955,G__42956,G__42957,seq42954__$3);
}));

(medley.core.least_by.cljs$lang$maxFixedArity = (3));

/**
 * Find the greatest argument (as defined by the compare function) in O(n) time.
 */
medley.core.greatest = (function medley$core$greatest(var_args){
var G__42987 = arguments.length;
switch (G__42987) {
case 0:
return medley.core.greatest.cljs$core$IFn$_invoke$arity$0();

break;
case 1:
return medley.core.greatest.cljs$core$IFn$_invoke$arity$1((arguments[(0)]));

break;
case 2:
return medley.core.greatest.cljs$core$IFn$_invoke$arity$2((arguments[(0)]),(arguments[(1)]));

break;
default:
var args_arr__5751__auto__ = [];
var len__5726__auto___43200 = arguments.length;
var i__5727__auto___43201 = (0);
while(true){
if((i__5727__auto___43201 < len__5726__auto___43200)){
args_arr__5751__auto__.push((arguments[i__5727__auto___43201]));

var G__43202 = (i__5727__auto___43201 + (1));
i__5727__auto___43201 = G__43202;
continue;
} else {
}
break;
}

var argseq__5752__auto__ = ((((2) < args_arr__5751__auto__.length))?(new cljs.core.IndexedSeq(args_arr__5751__auto__.slice((2)),(0),null)):null);
return medley.core.greatest.cljs$core$IFn$_invoke$arity$variadic((arguments[(0)]),(arguments[(1)]),argseq__5752__auto__);

}
});

(medley.core.greatest.cljs$core$IFn$_invoke$arity$0 = (function (){
return null;
}));

(medley.core.greatest.cljs$core$IFn$_invoke$arity$1 = (function (a){
return a;
}));

(medley.core.greatest.cljs$core$IFn$_invoke$arity$2 = (function (a,b){
if((cljs.core.compare(a,b) > (0))){
return a;
} else {
return b;
}
}));

(medley.core.greatest.cljs$core$IFn$_invoke$arity$variadic = (function (a,b,more){
return cljs.core.reduce.cljs$core$IFn$_invoke$arity$3(medley.core.greatest,medley.core.greatest.cljs$core$IFn$_invoke$arity$2(a,b),more);
}));

/** @this {Function} */
(medley.core.greatest.cljs$lang$applyTo = (function (seq42984){
var G__42985 = cljs.core.first(seq42984);
var seq42984__$1 = cljs.core.next(seq42984);
var G__42986 = cljs.core.first(seq42984__$1);
var seq42984__$2 = cljs.core.next(seq42984__$1);
var self__5711__auto__ = this;
return self__5711__auto__.cljs$core$IFn$_invoke$arity$variadic(G__42985,G__42986,seq42984__$2);
}));

(medley.core.greatest.cljs$lang$maxFixedArity = (2));

/**
 * Return the argument for which (keyfn x) is greatest. Determined by the compare
 *   function in O(n) time. Prefer `clojure.core/max-key` if keyfn returns numbers.
 */
medley.core.greatest_by = (function medley$core$greatest_by(var_args){
var G__42993 = arguments.length;
switch (G__42993) {
case 1:
return medley.core.greatest_by.cljs$core$IFn$_invoke$arity$1((arguments[(0)]));

break;
case 2:
return medley.core.greatest_by.cljs$core$IFn$_invoke$arity$2((arguments[(0)]),(arguments[(1)]));

break;
case 3:
return medley.core.greatest_by.cljs$core$IFn$_invoke$arity$3((arguments[(0)]),(arguments[(1)]),(arguments[(2)]));

break;
default:
var args_arr__5751__auto__ = [];
var len__5726__auto___43204 = arguments.length;
var i__5727__auto___43205 = (0);
while(true){
if((i__5727__auto___43205 < len__5726__auto___43204)){
args_arr__5751__auto__.push((arguments[i__5727__auto___43205]));

var G__43206 = (i__5727__auto___43205 + (1));
i__5727__auto___43205 = G__43206;
continue;
} else {
}
break;
}

var argseq__5752__auto__ = ((((3) < args_arr__5751__auto__.length))?(new cljs.core.IndexedSeq(args_arr__5751__auto__.slice((3)),(0),null)):null);
return medley.core.greatest_by.cljs$core$IFn$_invoke$arity$variadic((arguments[(0)]),(arguments[(1)]),(arguments[(2)]),argseq__5752__auto__);

}
});

(medley.core.greatest_by.cljs$core$IFn$_invoke$arity$1 = (function (_){
return null;
}));

(medley.core.greatest_by.cljs$core$IFn$_invoke$arity$2 = (function (_,x){
return x;
}));

(medley.core.greatest_by.cljs$core$IFn$_invoke$arity$3 = (function (keyfn,x,y){
if((cljs.core.compare((keyfn.cljs$core$IFn$_invoke$arity$1 ? keyfn.cljs$core$IFn$_invoke$arity$1(x) : keyfn.call(null, x)),(keyfn.cljs$core$IFn$_invoke$arity$1 ? keyfn.cljs$core$IFn$_invoke$arity$1(y) : keyfn.call(null, y))) > (0))){
return x;
} else {
return y;
}
}));

(medley.core.greatest_by.cljs$core$IFn$_invoke$arity$variadic = (function (keyfn,x,y,more){
var kx = (keyfn.cljs$core$IFn$_invoke$arity$1 ? keyfn.cljs$core$IFn$_invoke$arity$1(x) : keyfn.call(null, x));
var ky = (keyfn.cljs$core$IFn$_invoke$arity$1 ? keyfn.cljs$core$IFn$_invoke$arity$1(y) : keyfn.call(null, y));
var vec__42999 = (((cljs.core.compare(kx,ky) > (0)))?new cljs.core.PersistentVector(null, 2, 5, cljs.core.PersistentVector.EMPTY_NODE, [x,kx], null):new cljs.core.PersistentVector(null, 2, 5, cljs.core.PersistentVector.EMPTY_NODE, [y,ky], null));
var v = cljs.core.nth.cljs$core$IFn$_invoke$arity$3(vec__42999,(0),null);
var kv = cljs.core.nth.cljs$core$IFn$_invoke$arity$3(vec__42999,(1),null);
var v__$1 = v;
var kv__$1 = kv;
var more__$1 = more;
while(true){
if(cljs.core.truth_(more__$1)){
var w = cljs.core.first(more__$1);
var kw = (keyfn.cljs$core$IFn$_invoke$arity$1 ? keyfn.cljs$core$IFn$_invoke$arity$1(w) : keyfn.call(null, w));
if((cljs.core.compare(kw,kv__$1) < (0))){
var G__43208 = v__$1;
var G__43209 = kv__$1;
var G__43210 = cljs.core.next(more__$1);
v__$1 = G__43208;
kv__$1 = G__43209;
more__$1 = G__43210;
continue;
} else {
var G__43211 = w;
var G__43212 = kw;
var G__43213 = cljs.core.next(more__$1);
v__$1 = G__43211;
kv__$1 = G__43212;
more__$1 = G__43213;
continue;
}
} else {
return v__$1;
}
break;
}
}));

/** @this {Function} */
(medley.core.greatest_by.cljs$lang$applyTo = (function (seq42989){
var G__42990 = cljs.core.first(seq42989);
var seq42989__$1 = cljs.core.next(seq42989);
var G__42991 = cljs.core.first(seq42989__$1);
var seq42989__$2 = cljs.core.next(seq42989__$1);
var G__42992 = cljs.core.first(seq42989__$2);
var seq42989__$3 = cljs.core.next(seq42989__$2);
var self__5711__auto__ = this;
return self__5711__auto__.cljs$core$IFn$_invoke$arity$variadic(G__42990,G__42991,G__42992,seq42989__$3);
}));

(medley.core.greatest_by.cljs$lang$maxFixedArity = (3));

/**
 * Lazily concatenates a collection of collections into a flat sequence.
 */
medley.core.join = (function medley$core$join(colls){
return (new cljs.core.LazySeq(null,(function (){
var temp__5804__auto__ = cljs.core.seq(colls);
if(temp__5804__auto__){
var s = temp__5804__auto__;
return cljs.core.concat.cljs$core$IFn$_invoke$arity$2(cljs.core.first(s),(function (){var G__43002 = cljs.core.rest(s);
return (medley.core.join.cljs$core$IFn$_invoke$arity$1 ? medley.core.join.cljs$core$IFn$_invoke$arity$1(G__43002) : medley.core.join.call(null, G__43002));
})());
} else {
return null;
}
}),null,null));
});
/**
 * Recursively merges maps together. If all the maps supplied have nested maps
 *   under the same keys, these nested maps are merged. Otherwise the value is
 *   overwritten, as in `clojure.core/merge`.
 */
medley.core.deep_merge = (function medley$core$deep_merge(var_args){
var G__43008 = arguments.length;
switch (G__43008) {
case 0:
return medley.core.deep_merge.cljs$core$IFn$_invoke$arity$0();

break;
case 1:
return medley.core.deep_merge.cljs$core$IFn$_invoke$arity$1((arguments[(0)]));

break;
case 2:
return medley.core.deep_merge.cljs$core$IFn$_invoke$arity$2((arguments[(0)]),(arguments[(1)]));

break;
default:
var args_arr__5751__auto__ = [];
var len__5726__auto___43216 = arguments.length;
var i__5727__auto___43217 = (0);
while(true){
if((i__5727__auto___43217 < len__5726__auto___43216)){
args_arr__5751__auto__.push((arguments[i__5727__auto___43217]));

var G__43218 = (i__5727__auto___43217 + (1));
i__5727__auto___43217 = G__43218;
continue;
} else {
}
break;
}

var argseq__5752__auto__ = ((((2) < args_arr__5751__auto__.length))?(new cljs.core.IndexedSeq(args_arr__5751__auto__.slice((2)),(0),null)):null);
return medley.core.deep_merge.cljs$core$IFn$_invoke$arity$variadic((arguments[(0)]),(arguments[(1)]),argseq__5752__auto__);

}
});

(medley.core.deep_merge.cljs$core$IFn$_invoke$arity$0 = (function (){
return null;
}));

(medley.core.deep_merge.cljs$core$IFn$_invoke$arity$1 = (function (a){
return a;
}));

(medley.core.deep_merge.cljs$core$IFn$_invoke$arity$2 = (function (a,b){
if(cljs.core.truth_((function (){var or__5002__auto__ = a;
if(cljs.core.truth_(or__5002__auto__)){
return or__5002__auto__;
} else {
return b;
}
})())){
var merge_entry = (function medley$core$merge_entry(m,e){
var k = cljs.core.key(e);
var v_SINGLEQUOTE_ = cljs.core.val(e);
if(cljs.core.contains_QMARK_(m,k)){
return cljs.core.assoc.cljs$core$IFn$_invoke$arity$3(m,k,(function (){var v = cljs.core.get.cljs$core$IFn$_invoke$arity$2(m,k);
if(((cljs.core.map_QMARK_(v)) && (cljs.core.map_QMARK_(v_SINGLEQUOTE_)))){
return medley.core.deep_merge.cljs$core$IFn$_invoke$arity$2(v,v_SINGLEQUOTE_);
} else {
return v_SINGLEQUOTE_;
}
})());
} else {
return cljs.core.assoc.cljs$core$IFn$_invoke$arity$3(m,k,v_SINGLEQUOTE_);
}
});
return cljs.core.reduce.cljs$core$IFn$_invoke$arity$3(merge_entry,(function (){var or__5002__auto__ = a;
if(cljs.core.truth_(or__5002__auto__)){
return or__5002__auto__;
} else {
return cljs.core.PersistentArrayMap.EMPTY;
}
})(),cljs.core.seq(b));
} else {
return null;
}
}));

(medley.core.deep_merge.cljs$core$IFn$_invoke$arity$variadic = (function (a,b,more){
return cljs.core.reduce.cljs$core$IFn$_invoke$arity$3(medley.core.deep_merge,(function (){var or__5002__auto__ = a;
if(cljs.core.truth_(or__5002__auto__)){
return or__5002__auto__;
} else {
return cljs.core.PersistentArrayMap.EMPTY;
}
})(),cljs.core.cons(b,more));
}));

/** @this {Function} */
(medley.core.deep_merge.cljs$lang$applyTo = (function (seq43005){
var G__43006 = cljs.core.first(seq43005);
var seq43005__$1 = cljs.core.next(seq43005);
var G__43007 = cljs.core.first(seq43005__$1);
var seq43005__$2 = cljs.core.next(seq43005__$1);
var self__5711__auto__ = this;
return self__5711__auto__.cljs$core$IFn$_invoke$arity$variadic(G__43006,G__43007,seq43005__$2);
}));

(medley.core.deep_merge.cljs$lang$maxFixedArity = (2));

/**
 * Applies a function f to the argument list formed by concatenating
 *   everything but the last element of args with the last element of
 *   args. This is useful for applying a function that accepts keyword
 *   arguments to a map.
 */
medley.core.mapply = (function medley$core$mapply(var_args){
var G__43014 = arguments.length;
switch (G__43014) {
case 2:
return medley.core.mapply.cljs$core$IFn$_invoke$arity$2((arguments[(0)]),(arguments[(1)]));

break;
default:
var args_arr__5751__auto__ = [];
var len__5726__auto___43220 = arguments.length;
var i__5727__auto___43221 = (0);
while(true){
if((i__5727__auto___43221 < len__5726__auto___43220)){
args_arr__5751__auto__.push((arguments[i__5727__auto___43221]));

var G__43222 = (i__5727__auto___43221 + (1));
i__5727__auto___43221 = G__43222;
continue;
} else {
}
break;
}

var argseq__5752__auto__ = ((((2) < args_arr__5751__auto__.length))?(new cljs.core.IndexedSeq(args_arr__5751__auto__.slice((2)),(0),null)):null);
return medley.core.mapply.cljs$core$IFn$_invoke$arity$variadic((arguments[(0)]),(arguments[(1)]),argseq__5752__auto__);

}
});

(medley.core.mapply.cljs$core$IFn$_invoke$arity$2 = (function (f,m){
return cljs.core.apply.cljs$core$IFn$_invoke$arity$2(f,cljs.core.apply.cljs$core$IFn$_invoke$arity$2(cljs.core.concat,m));
}));

(medley.core.mapply.cljs$core$IFn$_invoke$arity$variadic = (function (f,a,args){
return cljs.core.apply.cljs$core$IFn$_invoke$arity$3(f,a,cljs.core.apply.cljs$core$IFn$_invoke$arity$3(cljs.core.concat,cljs.core.butlast(args),cljs.core.last(args)));
}));

/** @this {Function} */
(medley.core.mapply.cljs$lang$applyTo = (function (seq43011){
var G__43012 = cljs.core.first(seq43011);
var seq43011__$1 = cljs.core.next(seq43011);
var G__43013 = cljs.core.first(seq43011__$1);
var seq43011__$2 = cljs.core.next(seq43011__$1);
var self__5711__auto__ = this;
return self__5711__auto__.cljs$core$IFn$_invoke$arity$variadic(G__43012,G__43013,seq43011__$2);
}));

(medley.core.mapply.cljs$lang$maxFixedArity = (2));

/**
 * Returns a map of the elements of coll keyed by the result of f on each
 *   element. The value at each key will be the last element in coll associated
 *   with that key. This function is similar to `clojure.core/group-by`, except
 *   that elements with the same key are overwritten, rather than added to a
 *   vector of values.
 */
medley.core.index_by = (function medley$core$index_by(f,coll){
return cljs.core.persistent_BANG_(cljs.core.reduce.cljs$core$IFn$_invoke$arity$3((function (p1__43015_SHARP_,p2__43016_SHARP_){
return cljs.core.assoc_BANG_.cljs$core$IFn$_invoke$arity$3(p1__43015_SHARP_,(f.cljs$core$IFn$_invoke$arity$1 ? f.cljs$core$IFn$_invoke$arity$1(p2__43016_SHARP_) : f.call(null, p2__43016_SHARP_)),p2__43016_SHARP_);
}),cljs.core.transient$(cljs.core.PersistentArrayMap.EMPTY),coll));
});
/**
 * Returns a lazy seq of the first item in each coll, then the second, etc.
 *   Unlike `clojure.core/interleave`, the returned seq contains all items in the
 *   supplied collections, even if the collections are different sizes.
 */
medley.core.interleave_all = (function medley$core$interleave_all(var_args){
var G__43021 = arguments.length;
switch (G__43021) {
case 0:
return medley.core.interleave_all.cljs$core$IFn$_invoke$arity$0();

break;
case 1:
return medley.core.interleave_all.cljs$core$IFn$_invoke$arity$1((arguments[(0)]));

break;
case 2:
return medley.core.interleave_all.cljs$core$IFn$_invoke$arity$2((arguments[(0)]),(arguments[(1)]));

break;
default:
var args_arr__5751__auto__ = [];
var len__5726__auto___43225 = arguments.length;
var i__5727__auto___43226 = (0);
while(true){
if((i__5727__auto___43226 < len__5726__auto___43225)){
args_arr__5751__auto__.push((arguments[i__5727__auto___43226]));

var G__43227 = (i__5727__auto___43226 + (1));
i__5727__auto___43226 = G__43227;
continue;
} else {
}
break;
}

var argseq__5752__auto__ = ((((2) < args_arr__5751__auto__.length))?(new cljs.core.IndexedSeq(args_arr__5751__auto__.slice((2)),(0),null)):null);
return medley.core.interleave_all.cljs$core$IFn$_invoke$arity$variadic((arguments[(0)]),(arguments[(1)]),argseq__5752__auto__);

}
});

(medley.core.interleave_all.cljs$core$IFn$_invoke$arity$0 = (function (){
return cljs.core.List.EMPTY;
}));

(medley.core.interleave_all.cljs$core$IFn$_invoke$arity$1 = (function (c1){
return (new cljs.core.LazySeq(null,(function (){
return c1;
}),null,null));
}));

(medley.core.interleave_all.cljs$core$IFn$_invoke$arity$2 = (function (c1,c2){
return (new cljs.core.LazySeq(null,(function (){
var s1 = cljs.core.seq(c1);
var s2 = cljs.core.seq(c2);
if(((s1) && (s2))){
return cljs.core.cons(cljs.core.first(s1),cljs.core.cons(cljs.core.first(s2),medley.core.interleave_all.cljs$core$IFn$_invoke$arity$2(cljs.core.rest(s1),cljs.core.rest(s2))));
} else {
return ((s1) || (s2));
}
}),null,null));
}));

(medley.core.interleave_all.cljs$core$IFn$_invoke$arity$variadic = (function (c1,c2,colls){
return (new cljs.core.LazySeq(null,(function (){
var ss = cljs.core.keep.cljs$core$IFn$_invoke$arity$2(cljs.core.seq,cljs.core.conj.cljs$core$IFn$_invoke$arity$variadic(colls,c2,cljs.core.prim_seq.cljs$core$IFn$_invoke$arity$2([c1], 0)));
if(cljs.core.seq(ss)){
return cljs.core.concat.cljs$core$IFn$_invoke$arity$2(cljs.core.map.cljs$core$IFn$_invoke$arity$2(cljs.core.first,ss),cljs.core.apply.cljs$core$IFn$_invoke$arity$2(medley.core.interleave_all,cljs.core.map.cljs$core$IFn$_invoke$arity$2(cljs.core.rest,ss)));
} else {
return null;
}
}),null,null));
}));

/** @this {Function} */
(medley.core.interleave_all.cljs$lang$applyTo = (function (seq43018){
var G__43019 = cljs.core.first(seq43018);
var seq43018__$1 = cljs.core.next(seq43018);
var G__43020 = cljs.core.first(seq43018__$1);
var seq43018__$2 = cljs.core.next(seq43018__$1);
var self__5711__auto__ = this;
return self__5711__auto__.cljs$core$IFn$_invoke$arity$variadic(G__43019,G__43020,seq43018__$2);
}));

(medley.core.interleave_all.cljs$lang$maxFixedArity = (2));

/**
 * Returns a lazy sequence of the elements of coll, removing any elements that
 *   return duplicate values when passed to a function f. Returns a transducer
 *   when no collection is provided.
 */
medley.core.distinct_by = (function medley$core$distinct_by(var_args){
var G__43023 = arguments.length;
switch (G__43023) {
case 1:
return medley.core.distinct_by.cljs$core$IFn$_invoke$arity$1((arguments[(0)]));

break;
case 2:
return medley.core.distinct_by.cljs$core$IFn$_invoke$arity$2((arguments[(0)]),(arguments[(1)]));

break;
default:
throw (new Error(["Invalid arity: ",cljs.core.str.cljs$core$IFn$_invoke$arity$1(arguments.length)].join('')));

}
});

(medley.core.distinct_by.cljs$core$IFn$_invoke$arity$1 = (function (f){
return (function (rf){
var seen = cljs.core.volatile_BANG_(cljs.core.PersistentHashSet.EMPTY);
return (function() {
var G__43229 = null;
var G__43229__0 = (function (){
return (rf.cljs$core$IFn$_invoke$arity$0 ? rf.cljs$core$IFn$_invoke$arity$0() : rf.call(null, ));
});
var G__43229__1 = (function (result){
return (rf.cljs$core$IFn$_invoke$arity$1 ? rf.cljs$core$IFn$_invoke$arity$1(result) : rf.call(null, result));
});
var G__43229__2 = (function (result,x){
var fx = (f.cljs$core$IFn$_invoke$arity$1 ? f.cljs$core$IFn$_invoke$arity$1(x) : f.call(null, x));
if(cljs.core.contains_QMARK_(cljs.core.deref(seen),fx)){
return result;
} else {
seen.cljs$core$IVolatile$_vreset_BANG_$arity$2(null, cljs.core.conj.cljs$core$IFn$_invoke$arity$2(seen.cljs$core$IDeref$_deref$arity$1(null, ),fx));

return (rf.cljs$core$IFn$_invoke$arity$2 ? rf.cljs$core$IFn$_invoke$arity$2(result,x) : rf.call(null, result,x));
}
});
G__43229 = function(result,x){
switch(arguments.length){
case 0:
return G__43229__0.call(this);
case 1:
return G__43229__1.call(this,result);
case 2:
return G__43229__2.call(this,result,x);
}
throw(new Error('Invalid arity: ' + arguments.length));
};
G__43229.cljs$core$IFn$_invoke$arity$0 = G__43229__0;
G__43229.cljs$core$IFn$_invoke$arity$1 = G__43229__1;
G__43229.cljs$core$IFn$_invoke$arity$2 = G__43229__2;
return G__43229;
})()
});
}));

(medley.core.distinct_by.cljs$core$IFn$_invoke$arity$2 = (function (f,coll){
var step = (function medley$core$step(xs,seen){
return (new cljs.core.LazySeq(null,(function (){
return (function (p__43027,seen__$1){
while(true){
var vec__43028 = p__43027;
var x = cljs.core.nth.cljs$core$IFn$_invoke$arity$3(vec__43028,(0),null);
var xs__$1 = vec__43028;
var temp__5804__auto__ = cljs.core.seq(xs__$1);
if(temp__5804__auto__){
var s = temp__5804__auto__;
var fx = (f.cljs$core$IFn$_invoke$arity$1 ? f.cljs$core$IFn$_invoke$arity$1(x) : f.call(null, x));
if(cljs.core.contains_QMARK_(seen__$1,fx)){
var G__43232 = cljs.core.rest(s);
var G__43233 = seen__$1;
p__43027 = G__43232;
seen__$1 = G__43233;
continue;
} else {
return cljs.core.cons(x,medley$core$step(cljs.core.rest(s),cljs.core.conj.cljs$core$IFn$_invoke$arity$2(seen__$1,fx)));
}
} else {
return null;
}
break;
}
})(xs,seen);
}),null,null));
});
return step(coll,cljs.core.PersistentHashSet.EMPTY);
}));

(medley.core.distinct_by.cljs$lang$maxFixedArity = 2);

/**
 * Returns a lazy sequence of the elements of coll, removing any **consecutive**
 *   elements that return duplicate values when passed to a function f. Returns a
 *   transducer when no collection is provided.
 */
medley.core.dedupe_by = (function medley$core$dedupe_by(var_args){
var G__43040 = arguments.length;
switch (G__43040) {
case 1:
return medley.core.dedupe_by.cljs$core$IFn$_invoke$arity$1((arguments[(0)]));

break;
case 2:
return medley.core.dedupe_by.cljs$core$IFn$_invoke$arity$2((arguments[(0)]),(arguments[(1)]));

break;
default:
throw (new Error(["Invalid arity: ",cljs.core.str.cljs$core$IFn$_invoke$arity$1(arguments.length)].join('')));

}
});

(medley.core.dedupe_by.cljs$core$IFn$_invoke$arity$1 = (function (f){
return (function (rf){
var pv = cljs.core.volatile_BANG_(new cljs.core.Keyword("medley.core","none","medley.core/none",60848325));
return (function() {
var G__43235 = null;
var G__43235__0 = (function (){
return (rf.cljs$core$IFn$_invoke$arity$0 ? rf.cljs$core$IFn$_invoke$arity$0() : rf.call(null, ));
});
var G__43235__1 = (function (result){
return (rf.cljs$core$IFn$_invoke$arity$1 ? rf.cljs$core$IFn$_invoke$arity$1(result) : rf.call(null, result));
});
var G__43235__2 = (function (result,x){
var prior = cljs.core.deref(pv);
var fx = (f.cljs$core$IFn$_invoke$arity$1 ? f.cljs$core$IFn$_invoke$arity$1(x) : f.call(null, x));
cljs.core.vreset_BANG_(pv,fx);

if(cljs.core._EQ_.cljs$core$IFn$_invoke$arity$2(prior,fx)){
return result;
} else {
return (rf.cljs$core$IFn$_invoke$arity$2 ? rf.cljs$core$IFn$_invoke$arity$2(result,x) : rf.call(null, result,x));
}
});
G__43235 = function(result,x){
switch(arguments.length){
case 0:
return G__43235__0.call(this);
case 1:
return G__43235__1.call(this,result);
case 2:
return G__43235__2.call(this,result,x);
}
throw(new Error('Invalid arity: ' + arguments.length));
};
G__43235.cljs$core$IFn$_invoke$arity$0 = G__43235__0;
G__43235.cljs$core$IFn$_invoke$arity$1 = G__43235__1;
G__43235.cljs$core$IFn$_invoke$arity$2 = G__43235__2;
return G__43235;
})()
});
}));

(medley.core.dedupe_by.cljs$core$IFn$_invoke$arity$2 = (function (f,coll){
return cljs.core.sequence.cljs$core$IFn$_invoke$arity$2(medley.core.dedupe_by.cljs$core$IFn$_invoke$arity$1(f),coll);
}));

(medley.core.dedupe_by.cljs$lang$maxFixedArity = 2);

/**
 * Returns a lazy sequence of successive items from coll up to and including
 *   the first item for which `(pred item)` returns true. Returns a transducer
 *   when no collection is provided.
 */
medley.core.take_upto = (function medley$core$take_upto(var_args){
var G__43048 = arguments.length;
switch (G__43048) {
case 1:
return medley.core.take_upto.cljs$core$IFn$_invoke$arity$1((arguments[(0)]));

break;
case 2:
return medley.core.take_upto.cljs$core$IFn$_invoke$arity$2((arguments[(0)]),(arguments[(1)]));

break;
default:
throw (new Error(["Invalid arity: ",cljs.core.str.cljs$core$IFn$_invoke$arity$1(arguments.length)].join('')));

}
});

(medley.core.take_upto.cljs$core$IFn$_invoke$arity$1 = (function (pred){
return (function (rf){
return (function() {
var G__43240 = null;
var G__43240__0 = (function (){
return (rf.cljs$core$IFn$_invoke$arity$0 ? rf.cljs$core$IFn$_invoke$arity$0() : rf.call(null, ));
});
var G__43240__1 = (function (result){
return (rf.cljs$core$IFn$_invoke$arity$1 ? rf.cljs$core$IFn$_invoke$arity$1(result) : rf.call(null, result));
});
var G__43240__2 = (function (result,x){
var result__$1 = (rf.cljs$core$IFn$_invoke$arity$2 ? rf.cljs$core$IFn$_invoke$arity$2(result,x) : rf.call(null, result,x));
if(cljs.core.truth_((pred.cljs$core$IFn$_invoke$arity$1 ? pred.cljs$core$IFn$_invoke$arity$1(x) : pred.call(null, x)))){
return cljs.core.ensure_reduced(result__$1);
} else {
return result__$1;
}
});
G__43240 = function(result,x){
switch(arguments.length){
case 0:
return G__43240__0.call(this);
case 1:
return G__43240__1.call(this,result);
case 2:
return G__43240__2.call(this,result,x);
}
throw(new Error('Invalid arity: ' + arguments.length));
};
G__43240.cljs$core$IFn$_invoke$arity$0 = G__43240__0;
G__43240.cljs$core$IFn$_invoke$arity$1 = G__43240__1;
G__43240.cljs$core$IFn$_invoke$arity$2 = G__43240__2;
return G__43240;
})()
});
}));

(medley.core.take_upto.cljs$core$IFn$_invoke$arity$2 = (function (pred,coll){
return (new cljs.core.LazySeq(null,(function (){
var temp__5804__auto__ = cljs.core.seq(coll);
if(temp__5804__auto__){
var s = temp__5804__auto__;
var x = cljs.core.first(s);
return cljs.core.cons(x,(cljs.core.truth_((pred.cljs$core$IFn$_invoke$arity$1 ? pred.cljs$core$IFn$_invoke$arity$1(x) : pred.call(null, x)))?null:medley.core.take_upto.cljs$core$IFn$_invoke$arity$2(pred,cljs.core.rest(s))));
} else {
return null;
}
}),null,null));
}));

(medley.core.take_upto.cljs$lang$maxFixedArity = 2);

/**
 * Returns a lazy sequence of the items in coll starting *after* the first item
 *   for which `(pred item)` returns true. Returns a transducer when no collection
 *   is provided.
 */
medley.core.drop_upto = (function medley$core$drop_upto(var_args){
var G__43058 = arguments.length;
switch (G__43058) {
case 1:
return medley.core.drop_upto.cljs$core$IFn$_invoke$arity$1((arguments[(0)]));

break;
case 2:
return medley.core.drop_upto.cljs$core$IFn$_invoke$arity$2((arguments[(0)]),(arguments[(1)]));

break;
default:
throw (new Error(["Invalid arity: ",cljs.core.str.cljs$core$IFn$_invoke$arity$1(arguments.length)].join('')));

}
});

(medley.core.drop_upto.cljs$core$IFn$_invoke$arity$1 = (function (pred){
return (function (rf){
var dv = cljs.core.volatile_BANG_(true);
return (function() {
var G__43244 = null;
var G__43244__0 = (function (){
return (rf.cljs$core$IFn$_invoke$arity$0 ? rf.cljs$core$IFn$_invoke$arity$0() : rf.call(null, ));
});
var G__43244__1 = (function (result){
return (rf.cljs$core$IFn$_invoke$arity$1 ? rf.cljs$core$IFn$_invoke$arity$1(result) : rf.call(null, result));
});
var G__43244__2 = (function (result,x){
if(cljs.core.truth_(cljs.core.deref(dv))){
if(cljs.core.truth_((pred.cljs$core$IFn$_invoke$arity$1 ? pred.cljs$core$IFn$_invoke$arity$1(x) : pred.call(null, x)))){
cljs.core.vreset_BANG_(dv,false);
} else {
}

return result;
} else {
return (rf.cljs$core$IFn$_invoke$arity$2 ? rf.cljs$core$IFn$_invoke$arity$2(result,x) : rf.call(null, result,x));
}
});
G__43244 = function(result,x){
switch(arguments.length){
case 0:
return G__43244__0.call(this);
case 1:
return G__43244__1.call(this,result);
case 2:
return G__43244__2.call(this,result,x);
}
throw(new Error('Invalid arity: ' + arguments.length));
};
G__43244.cljs$core$IFn$_invoke$arity$0 = G__43244__0;
G__43244.cljs$core$IFn$_invoke$arity$1 = G__43244__1;
G__43244.cljs$core$IFn$_invoke$arity$2 = G__43244__2;
return G__43244;
})()
});
}));

(medley.core.drop_upto.cljs$core$IFn$_invoke$arity$2 = (function (pred,coll){
return cljs.core.rest(cljs.core.drop_while.cljs$core$IFn$_invoke$arity$2(cljs.core.complement(pred),coll));
}));

(medley.core.drop_upto.cljs$lang$maxFixedArity = 2);

/**
 * Applies pred to successive values in coll, splitting it each time `(pred
 *   prev-item item)` returns logical true. Returns a lazy seq of partitions.
 *   Returns a stateful transducer when no collection is provided.
 */
medley.core.partition_between = (function medley$core$partition_between(var_args){
var G__43063 = arguments.length;
switch (G__43063) {
case 1:
return medley.core.partition_between.cljs$core$IFn$_invoke$arity$1((arguments[(0)]));

break;
case 2:
return medley.core.partition_between.cljs$core$IFn$_invoke$arity$2((arguments[(0)]),(arguments[(1)]));

break;
default:
throw (new Error(["Invalid arity: ",cljs.core.str.cljs$core$IFn$_invoke$arity$1(arguments.length)].join('')));

}
});

(medley.core.partition_between.cljs$core$IFn$_invoke$arity$1 = (function (pred){
return (function (rf){
var part = cljs.core.array_list();
var prev = cljs.core.volatile_BANG_(new cljs.core.Keyword("medley.core","none","medley.core/none",60848325));
return (function() {
var G__43249 = null;
var G__43249__0 = (function (){
return (rf.cljs$core$IFn$_invoke$arity$0 ? rf.cljs$core$IFn$_invoke$arity$0() : rf.call(null, ));
});
var G__43249__1 = (function (result){
var G__43065 = (cljs.core.truth_(part.isEmpty())?result:(function (){var v = cljs.core.vec(part.toArray());
part.clear();

return cljs.core.unreduced((rf.cljs$core$IFn$_invoke$arity$2 ? rf.cljs$core$IFn$_invoke$arity$2(result,v) : rf.call(null, result,v)));
})());
return (rf.cljs$core$IFn$_invoke$arity$1 ? rf.cljs$core$IFn$_invoke$arity$1(G__43065) : rf.call(null, G__43065));
});
var G__43249__2 = (function (result,input){
var p = cljs.core.deref(prev);
cljs.core.vreset_BANG_(prev,input);

if(((cljs.core.keyword_identical_QMARK_(p,new cljs.core.Keyword("medley.core","none","medley.core/none",60848325))) || (cljs.core.not((pred.cljs$core$IFn$_invoke$arity$2 ? pred.cljs$core$IFn$_invoke$arity$2(p,input) : pred.call(null, p,input)))))){
part.add(input);

return result;
} else {
var v = cljs.core.vec(part.toArray());
part.clear();

var ret = (rf.cljs$core$IFn$_invoke$arity$2 ? rf.cljs$core$IFn$_invoke$arity$2(result,v) : rf.call(null, result,v));
if(cljs.core.reduced_QMARK_(ret)){
} else {
part.add(input);
}

return ret;
}
});
G__43249 = function(result,input){
switch(arguments.length){
case 0:
return G__43249__0.call(this);
case 1:
return G__43249__1.call(this,result);
case 2:
return G__43249__2.call(this,result,input);
}
throw(new Error('Invalid arity: ' + arguments.length));
};
G__43249.cljs$core$IFn$_invoke$arity$0 = G__43249__0;
G__43249.cljs$core$IFn$_invoke$arity$1 = G__43249__1;
G__43249.cljs$core$IFn$_invoke$arity$2 = G__43249__2;
return G__43249;
})()
});
}));

(medley.core.partition_between.cljs$core$IFn$_invoke$arity$2 = (function (pred,coll){
return (new cljs.core.LazySeq(null,(function (){
var take_part = (function medley$core$take_part(prev,coll__$1){
return (new cljs.core.LazySeq(null,(function (){
var temp__5804__auto__ = cljs.core.seq(coll__$1);
if(temp__5804__auto__){
var vec__43076 = temp__5804__auto__;
var seq__43077 = cljs.core.seq(vec__43076);
var first__43078 = cljs.core.first(seq__43077);
var seq__43077__$1 = cljs.core.next(seq__43077);
var x = first__43078;
var xs = seq__43077__$1;
if(cljs.core.truth_((pred.cljs$core$IFn$_invoke$arity$2 ? pred.cljs$core$IFn$_invoke$arity$2(prev,x) : pred.call(null, prev,x)))){
return null;
} else {
return cljs.core.cons(x,medley$core$take_part(x,xs));
}
} else {
return null;
}
}),null,null));
});
return (new cljs.core.LazySeq(null,(function (){
var temp__5804__auto__ = cljs.core.seq(coll);
if(temp__5804__auto__){
var vec__43079 = temp__5804__auto__;
var seq__43080 = cljs.core.seq(vec__43079);
var first__43081 = cljs.core.first(seq__43080);
var seq__43080__$1 = cljs.core.next(seq__43080);
var x = first__43081;
var xs = seq__43080__$1;
var run = take_part(x,xs);
return cljs.core.cons(cljs.core.cons(x,run),medley.core.partition_between.cljs$core$IFn$_invoke$arity$2(pred,(new cljs.core.LazySeq(null,(function (){
return cljs.core.drop.cljs$core$IFn$_invoke$arity$2(cljs.core.count(run),xs);
}),null,null))));
} else {
return null;
}
}),null,null));
}),null,null));
}));

(medley.core.partition_between.cljs$lang$maxFixedArity = 2);

/**
 * Returns a lazy sequence of partitions, splitting after `(pred item)` returns
 *   true. Returns a transducer when no collection is provided.
 */
medley.core.partition_after = (function medley$core$partition_after(var_args){
var G__43083 = arguments.length;
switch (G__43083) {
case 1:
return medley.core.partition_after.cljs$core$IFn$_invoke$arity$1((arguments[(0)]));

break;
case 2:
return medley.core.partition_after.cljs$core$IFn$_invoke$arity$2((arguments[(0)]),(arguments[(1)]));

break;
default:
throw (new Error(["Invalid arity: ",cljs.core.str.cljs$core$IFn$_invoke$arity$1(arguments.length)].join('')));

}
});

(medley.core.partition_after.cljs$core$IFn$_invoke$arity$1 = (function (pred){
return medley.core.partition_between.cljs$core$IFn$_invoke$arity$1((function (x,_){
return (pred.cljs$core$IFn$_invoke$arity$1 ? pred.cljs$core$IFn$_invoke$arity$1(x) : pred.call(null, x));
}));
}));

(medley.core.partition_after.cljs$core$IFn$_invoke$arity$2 = (function (pred,coll){
return medley.core.partition_between.cljs$core$IFn$_invoke$arity$2((function (x,_){
return (pred.cljs$core$IFn$_invoke$arity$1 ? pred.cljs$core$IFn$_invoke$arity$1(x) : pred.call(null, x));
}),coll);
}));

(medley.core.partition_after.cljs$lang$maxFixedArity = 2);

/**
 * Returns a lazy sequence of partitions, splitting before `(pred item)` returns
 *   true. Returns a transducer when no collection is provided.
 */
medley.core.partition_before = (function medley$core$partition_before(var_args){
var G__43085 = arguments.length;
switch (G__43085) {
case 1:
return medley.core.partition_before.cljs$core$IFn$_invoke$arity$1((arguments[(0)]));

break;
case 2:
return medley.core.partition_before.cljs$core$IFn$_invoke$arity$2((arguments[(0)]),(arguments[(1)]));

break;
default:
throw (new Error(["Invalid arity: ",cljs.core.str.cljs$core$IFn$_invoke$arity$1(arguments.length)].join('')));

}
});

(medley.core.partition_before.cljs$core$IFn$_invoke$arity$1 = (function (pred){
return medley.core.partition_between.cljs$core$IFn$_invoke$arity$1((function (_,x){
return (pred.cljs$core$IFn$_invoke$arity$1 ? pred.cljs$core$IFn$_invoke$arity$1(x) : pred.call(null, x));
}));
}));

(medley.core.partition_before.cljs$core$IFn$_invoke$arity$2 = (function (pred,coll){
return medley.core.partition_between.cljs$core$IFn$_invoke$arity$2((function (_,x){
return (pred.cljs$core$IFn$_invoke$arity$1 ? pred.cljs$core$IFn$_invoke$arity$1(x) : pred.call(null, x));
}),coll);
}));

(medley.core.partition_before.cljs$lang$maxFixedArity = 2);

/**
 * Returns an ordered, lazy sequence of vectors `[index item]`, where item is a
 *   value in coll, and index its position starting from zero. Returns a transducer
 *   when no collection is provided.
 */
medley.core.indexed = (function medley$core$indexed(var_args){
var G__43091 = arguments.length;
switch (G__43091) {
case 0:
return medley.core.indexed.cljs$core$IFn$_invoke$arity$0();

break;
case 1:
return medley.core.indexed.cljs$core$IFn$_invoke$arity$1((arguments[(0)]));

break;
default:
throw (new Error(["Invalid arity: ",cljs.core.str.cljs$core$IFn$_invoke$arity$1(arguments.length)].join('')));

}
});

(medley.core.indexed.cljs$core$IFn$_invoke$arity$0 = (function (){
return (function (rf){
var i = cljs.core.volatile_BANG_((-1));
return (function() {
var G__43255 = null;
var G__43255__0 = (function (){
return (rf.cljs$core$IFn$_invoke$arity$0 ? rf.cljs$core$IFn$_invoke$arity$0() : rf.call(null, ));
});
var G__43255__1 = (function (result){
return (rf.cljs$core$IFn$_invoke$arity$1 ? rf.cljs$core$IFn$_invoke$arity$1(result) : rf.call(null, result));
});
var G__43255__2 = (function (result,x){
var G__43097 = result;
var G__43098 = new cljs.core.PersistentVector(null, 2, 5, cljs.core.PersistentVector.EMPTY_NODE, [i.cljs$core$IVolatile$_vreset_BANG_$arity$2(null, (i.cljs$core$IDeref$_deref$arity$1(null, ) + (1))),x], null);
return (rf.cljs$core$IFn$_invoke$arity$2 ? rf.cljs$core$IFn$_invoke$arity$2(G__43097,G__43098) : rf.call(null, G__43097,G__43098));
});
G__43255 = function(result,x){
switch(arguments.length){
case 0:
return G__43255__0.call(this);
case 1:
return G__43255__1.call(this,result);
case 2:
return G__43255__2.call(this,result,x);
}
throw(new Error('Invalid arity: ' + arguments.length));
};
G__43255.cljs$core$IFn$_invoke$arity$0 = G__43255__0;
G__43255.cljs$core$IFn$_invoke$arity$1 = G__43255__1;
G__43255.cljs$core$IFn$_invoke$arity$2 = G__43255__2;
return G__43255;
})()
});
}));

(medley.core.indexed.cljs$core$IFn$_invoke$arity$1 = (function (coll){
return cljs.core.map_indexed.cljs$core$IFn$_invoke$arity$2(cljs.core.vector,coll);
}));

(medley.core.indexed.cljs$lang$maxFixedArity = 1);

/**
 * Returns a lazy sequence of the items in coll, with a new item inserted at
 *   the supplied index, followed by all subsequent items of the collection. Runs
 *   in O(n) time. Returns a transducer when no collection is provided.
 */
medley.core.insert_nth = (function medley$core$insert_nth(var_args){
var G__43101 = arguments.length;
switch (G__43101) {
case 2:
return medley.core.insert_nth.cljs$core$IFn$_invoke$arity$2((arguments[(0)]),(arguments[(1)]));

break;
case 3:
return medley.core.insert_nth.cljs$core$IFn$_invoke$arity$3((arguments[(0)]),(arguments[(1)]),(arguments[(2)]));

break;
default:
throw (new Error(["Invalid arity: ",cljs.core.str.cljs$core$IFn$_invoke$arity$1(arguments.length)].join('')));

}
});

(medley.core.insert_nth.cljs$core$IFn$_invoke$arity$2 = (function (index,item){
return (function (rf){
var idx = cljs.core.volatile_BANG_((index + (1)));
return (function() {
var G__43257 = null;
var G__43257__0 = (function (){
return (rf.cljs$core$IFn$_invoke$arity$0 ? rf.cljs$core$IFn$_invoke$arity$0() : rf.call(null, ));
});
var G__43257__1 = (function (result){
if(cljs.core._EQ_.cljs$core$IFn$_invoke$arity$2(cljs.core.deref(idx),(1))){
var G__43108 = (rf.cljs$core$IFn$_invoke$arity$2 ? rf.cljs$core$IFn$_invoke$arity$2(result,item) : rf.call(null, result,item));
return (rf.cljs$core$IFn$_invoke$arity$1 ? rf.cljs$core$IFn$_invoke$arity$1(G__43108) : rf.call(null, G__43108));
} else {
return (rf.cljs$core$IFn$_invoke$arity$1 ? rf.cljs$core$IFn$_invoke$arity$1(result) : rf.call(null, result));
}
});
var G__43257__2 = (function (result,x){
if((idx.cljs$core$IVolatile$_vreset_BANG_$arity$2(null, (idx.cljs$core$IDeref$_deref$arity$1(null, ) - (1))) === (0))){
var G__43109 = (rf.cljs$core$IFn$_invoke$arity$2 ? rf.cljs$core$IFn$_invoke$arity$2(result,item) : rf.call(null, result,item));
var G__43110 = x;
return (rf.cljs$core$IFn$_invoke$arity$2 ? rf.cljs$core$IFn$_invoke$arity$2(G__43109,G__43110) : rf.call(null, G__43109,G__43110));
} else {
return (rf.cljs$core$IFn$_invoke$arity$2 ? rf.cljs$core$IFn$_invoke$arity$2(result,x) : rf.call(null, result,x));
}
});
G__43257 = function(result,x){
switch(arguments.length){
case 0:
return G__43257__0.call(this);
case 1:
return G__43257__1.call(this,result);
case 2:
return G__43257__2.call(this,result,x);
}
throw(new Error('Invalid arity: ' + arguments.length));
};
G__43257.cljs$core$IFn$_invoke$arity$0 = G__43257__0;
G__43257.cljs$core$IFn$_invoke$arity$1 = G__43257__1;
G__43257.cljs$core$IFn$_invoke$arity$2 = G__43257__2;
return G__43257;
})()
});
}));

(medley.core.insert_nth.cljs$core$IFn$_invoke$arity$3 = (function (index,item,coll){
return (new cljs.core.LazySeq(null,(function (){
if((index === (0))){
return cljs.core.cons(item,coll);
} else {
if(cljs.core.seq(coll)){
return cljs.core.cons(cljs.core.first(coll),medley.core.insert_nth.cljs$core$IFn$_invoke$arity$3((index - (1)),item,cljs.core.rest(coll)));
} else {
return null;
}
}
}),null,null));
}));

(medley.core.insert_nth.cljs$lang$maxFixedArity = 3);

/**
 * Returns a lazy sequence of the items in coll, except for the item at the
 *   supplied index. Runs in O(n) time. Returns a transducer when no collection is
 *   provided.
 */
medley.core.remove_nth = (function medley$core$remove_nth(var_args){
var G__43112 = arguments.length;
switch (G__43112) {
case 1:
return medley.core.remove_nth.cljs$core$IFn$_invoke$arity$1((arguments[(0)]));

break;
case 2:
return medley.core.remove_nth.cljs$core$IFn$_invoke$arity$2((arguments[(0)]),(arguments[(1)]));

break;
default:
throw (new Error(["Invalid arity: ",cljs.core.str.cljs$core$IFn$_invoke$arity$1(arguments.length)].join('')));

}
});

(medley.core.remove_nth.cljs$core$IFn$_invoke$arity$1 = (function (index){
return (function (rf){
var idx = cljs.core.volatile_BANG_((index + (1)));
return (function() {
var G__43262 = null;
var G__43262__0 = (function (){
return (rf.cljs$core$IFn$_invoke$arity$0 ? rf.cljs$core$IFn$_invoke$arity$0() : rf.call(null, ));
});
var G__43262__1 = (function (result){
return (rf.cljs$core$IFn$_invoke$arity$1 ? rf.cljs$core$IFn$_invoke$arity$1(result) : rf.call(null, result));
});
var G__43262__2 = (function (result,x){
if((idx.cljs$core$IVolatile$_vreset_BANG_$arity$2(null, (idx.cljs$core$IDeref$_deref$arity$1(null, ) - (1))) === (0))){
return result;
} else {
return (rf.cljs$core$IFn$_invoke$arity$2 ? rf.cljs$core$IFn$_invoke$arity$2(result,x) : rf.call(null, result,x));
}
});
G__43262 = function(result,x){
switch(arguments.length){
case 0:
return G__43262__0.call(this);
case 1:
return G__43262__1.call(this,result);
case 2:
return G__43262__2.call(this,result,x);
}
throw(new Error('Invalid arity: ' + arguments.length));
};
G__43262.cljs$core$IFn$_invoke$arity$0 = G__43262__0;
G__43262.cljs$core$IFn$_invoke$arity$1 = G__43262__1;
G__43262.cljs$core$IFn$_invoke$arity$2 = G__43262__2;
return G__43262;
})()
});
}));

(medley.core.remove_nth.cljs$core$IFn$_invoke$arity$2 = (function (index,coll){
return (new cljs.core.LazySeq(null,(function (){
if((index === (0))){
return cljs.core.rest(coll);
} else {
if(cljs.core.seq(coll)){
return cljs.core.cons(cljs.core.first(coll),medley.core.remove_nth.cljs$core$IFn$_invoke$arity$2((index - (1)),cljs.core.rest(coll)));
} else {
return null;
}
}
}),null,null));
}));

(medley.core.remove_nth.cljs$lang$maxFixedArity = 2);

/**
 * Returns a lazy sequence of the items in coll, with a new item replacing the
 *   item at the supplied index. Runs in O(n) time. Returns a transducer when no
 *   collection is provided.
 */
medley.core.replace_nth = (function medley$core$replace_nth(var_args){
var G__43114 = arguments.length;
switch (G__43114) {
case 2:
return medley.core.replace_nth.cljs$core$IFn$_invoke$arity$2((arguments[(0)]),(arguments[(1)]));

break;
case 3:
return medley.core.replace_nth.cljs$core$IFn$_invoke$arity$3((arguments[(0)]),(arguments[(1)]),(arguments[(2)]));

break;
default:
throw (new Error(["Invalid arity: ",cljs.core.str.cljs$core$IFn$_invoke$arity$1(arguments.length)].join('')));

}
});

(medley.core.replace_nth.cljs$core$IFn$_invoke$arity$2 = (function (index,item){
return (function (rf){
var idx = cljs.core.volatile_BANG_((index + (1)));
return (function() {
var G__43264 = null;
var G__43264__0 = (function (){
return (rf.cljs$core$IFn$_invoke$arity$0 ? rf.cljs$core$IFn$_invoke$arity$0() : rf.call(null, ));
});
var G__43264__1 = (function (result){
return (rf.cljs$core$IFn$_invoke$arity$1 ? rf.cljs$core$IFn$_invoke$arity$1(result) : rf.call(null, result));
});
var G__43264__2 = (function (result,x){
if((idx.cljs$core$IVolatile$_vreset_BANG_$arity$2(null, (idx.cljs$core$IDeref$_deref$arity$1(null, ) - (1))) === (0))){
return (rf.cljs$core$IFn$_invoke$arity$2 ? rf.cljs$core$IFn$_invoke$arity$2(result,item) : rf.call(null, result,item));
} else {
return (rf.cljs$core$IFn$_invoke$arity$2 ? rf.cljs$core$IFn$_invoke$arity$2(result,x) : rf.call(null, result,x));
}
});
G__43264 = function(result,x){
switch(arguments.length){
case 0:
return G__43264__0.call(this);
case 1:
return G__43264__1.call(this,result);
case 2:
return G__43264__2.call(this,result,x);
}
throw(new Error('Invalid arity: ' + arguments.length));
};
G__43264.cljs$core$IFn$_invoke$arity$0 = G__43264__0;
G__43264.cljs$core$IFn$_invoke$arity$1 = G__43264__1;
G__43264.cljs$core$IFn$_invoke$arity$2 = G__43264__2;
return G__43264;
})()
});
}));

(medley.core.replace_nth.cljs$core$IFn$_invoke$arity$3 = (function (index,item,coll){
return (new cljs.core.LazySeq(null,(function (){
if((index === (0))){
return cljs.core.cons(item,cljs.core.rest(coll));
} else {
if(cljs.core.seq(coll)){
return cljs.core.cons(cljs.core.first(coll),medley.core.replace_nth.cljs$core$IFn$_invoke$arity$3((index - (1)),item,cljs.core.rest(coll)));
} else {
return null;
}
}
}),null,null));
}));

(medley.core.replace_nth.cljs$lang$maxFixedArity = 3);

/**
 * Returns the absolute value of a number.
 */
medley.core.abs = (function medley$core$abs(x){
if((x < (0))){
return (- x);
} else {
return x;
}
});
/**
 * Atomically swaps the value of the atom to be `(apply f x args)`, where x is
 *   the current value of the atom, then returns the original value of the atom.
 *   This function therefore acts like an atomic `deref` then `swap!`.
 */
medley.core.deref_swap_BANG_ = (function medley$core$deref_swap_BANG_(var_args){
var G__43121 = arguments.length;
switch (G__43121) {
case 2:
return medley.core.deref_swap_BANG_.cljs$core$IFn$_invoke$arity$2((arguments[(0)]),(arguments[(1)]));

break;
default:
var args_arr__5751__auto__ = [];
var len__5726__auto___43266 = arguments.length;
var i__5727__auto___43267 = (0);
while(true){
if((i__5727__auto___43267 < len__5726__auto___43266)){
args_arr__5751__auto__.push((arguments[i__5727__auto___43267]));

var G__43268 = (i__5727__auto___43267 + (1));
i__5727__auto___43267 = G__43268;
continue;
} else {
}
break;
}

var argseq__5752__auto__ = ((((2) < args_arr__5751__auto__.length))?(new cljs.core.IndexedSeq(args_arr__5751__auto__.slice((2)),(0),null)):null);
return medley.core.deref_swap_BANG_.cljs$core$IFn$_invoke$arity$variadic((arguments[(0)]),(arguments[(1)]),argseq__5752__auto__);

}
});

(medley.core.deref_swap_BANG_.cljs$core$IFn$_invoke$arity$2 = (function (atom,f){
var value = cljs.core.deref(atom);
cljs.core.reset_BANG_(atom,(f.cljs$core$IFn$_invoke$arity$1 ? f.cljs$core$IFn$_invoke$arity$1(value) : f.call(null, value)));

return value;
}));

(medley.core.deref_swap_BANG_.cljs$core$IFn$_invoke$arity$variadic = (function (atom,f,args){
return medley.core.deref_swap_BANG_.cljs$core$IFn$_invoke$arity$2(atom,(function (p1__43115_SHARP_){
return cljs.core.apply.cljs$core$IFn$_invoke$arity$3(f,p1__43115_SHARP_,args);
}));
}));

/** @this {Function} */
(medley.core.deref_swap_BANG_.cljs$lang$applyTo = (function (seq43117){
var G__43118 = cljs.core.first(seq43117);
var seq43117__$1 = cljs.core.next(seq43117);
var G__43119 = cljs.core.first(seq43117__$1);
var seq43117__$2 = cljs.core.next(seq43117__$1);
var self__5711__auto__ = this;
return self__5711__auto__.cljs$core$IFn$_invoke$arity$variadic(G__43118,G__43119,seq43117__$2);
}));

(medley.core.deref_swap_BANG_.cljs$lang$maxFixedArity = (2));

/**
 * Sets the value of the atom without regard for the current value, then returns
 *   the original value of the atom. See also: [[deref-swap!]].
 */
medley.core.deref_reset_BANG_ = (function medley$core$deref_reset_BANG_(atom,newval){
return medley.core.deref_swap_BANG_.cljs$core$IFn$_invoke$arity$2(atom,cljs.core.constantly(newval));
});
/**
 * Returns the message attached to the given Error/Throwable object. For all
 *   other types returns nil. Same as `cljs.core/ex-message` except it works for
 *   Clojure as well as ClojureScript.
 */
medley.core.ex_message = (function medley$core$ex_message(ex){
return cljs.core.ex_message(ex);
});
/**
 * Returns the cause attached to the given ExceptionInfo/Throwable object. For
 *   all other types returns nil. Same as `cljs.core/ex-cause` except it works for
 *   Clojure as well as ClojureScript.
 */
medley.core.ex_cause = (function medley$core$ex_cause(ex){
return cljs.core.ex_cause(ex);
});
/**
 * Returns true if the value is a UUID.
 */
medley.core.uuid_QMARK_ = (function medley$core$uuid_QMARK_(x){
return (x instanceof cljs.core.UUID);
});
/**
 * Returns a UUID generated from the supplied string. Same as `cljs.core/uuid`
 *   in ClojureScript, while in Clojure it returns a `java.util.UUID` object.
 */
medley.core.uuid = (function medley$core$uuid(s){
return cljs.core.uuid(s);
});
/**
 * Generates a new random UUID. Same as `cljs.core/random-uuid` except it works
 *   for Clojure as well as ClojureScript.
 */
medley.core.random_uuid = (function medley$core$random_uuid(){
return cljs.core.random_uuid();
});
/**
 * Returns true if the value is a regular expression.
 */
medley.core.regexp_QMARK_ = (function medley$core$regexp_QMARK_(x){
return (x instanceof RegExp);
});

//# sourceMappingURL=medley.core.js.map
