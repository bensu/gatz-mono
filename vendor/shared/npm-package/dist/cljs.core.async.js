var $CLJS = require("./cljs_env");
var $jscomp = $CLJS.$jscomp;
var COMPILED = false;
require("./cljs.core.js");
require("./cljs.core.async.impl.protocols.js");
require("./cljs.core.async.impl.channels.js");
require("./cljs.core.async.impl.buffers.js");
require("./cljs.core.async.impl.timers.js");
require("./cljs.core.async.impl.dispatch.js");
require("./cljs.core.async.impl.ioc_helpers.js");
var cognitect=$CLJS.cognitect || ($CLJS.cognitect = {});
var clojure=$CLJS.clojure || ($CLJS.clojure = {});
var crdt=$CLJS.crdt || ($CLJS.crdt = {});
var cljs=$CLJS.cljs || ($CLJS.cljs = {});
var shadow=$CLJS.shadow || ($CLJS.shadow = {});
var goog=$CLJS.goog || ($CLJS.goog = {});
var gatz=$CLJS.gatz || ($CLJS.gatz = {});
var medley=$CLJS.medley || ($CLJS.medley = {});
var com=$CLJS.com || ($CLJS.com = {});

$CLJS.SHADOW_ENV.setLoaded("cljs.core.async.js");

goog.provide('cljs.core.async');
goog.scope(function(){
  cljs.core.async.goog$module$goog$array = goog.module.get('goog.array');
});

/**
* @constructor
 * @implements {cljs.core.async.impl.protocols.Handler}
 * @implements {cljs.core.IMeta}
 * @implements {cljs.core.IWithMeta}
*/
cljs.core.async.t_cljs$core$async36065 = (function (f,blockable,meta36066){
this.f = f;
this.blockable = blockable;
this.meta36066 = meta36066;
this.cljs$lang$protocol_mask$partition0$ = 393216;
this.cljs$lang$protocol_mask$partition1$ = 0;
});
(cljs.core.async.t_cljs$core$async36065.prototype.cljs$core$IWithMeta$_with_meta$arity$2 = (function (_36067,meta36066__$1){
var self__ = this;
var _36067__$1 = this;
return (new cljs.core.async.t_cljs$core$async36065(self__.f,self__.blockable,meta36066__$1));
}));

(cljs.core.async.t_cljs$core$async36065.prototype.cljs$core$IMeta$_meta$arity$1 = (function (_36067){
var self__ = this;
var _36067__$1 = this;
return self__.meta36066;
}));

(cljs.core.async.t_cljs$core$async36065.prototype.cljs$core$async$impl$protocols$Handler$ = cljs.core.PROTOCOL_SENTINEL);

(cljs.core.async.t_cljs$core$async36065.prototype.cljs$core$async$impl$protocols$Handler$active_QMARK_$arity$1 = (function (_){
var self__ = this;
var ___$1 = this;
return true;
}));

(cljs.core.async.t_cljs$core$async36065.prototype.cljs$core$async$impl$protocols$Handler$blockable_QMARK_$arity$1 = (function (_){
var self__ = this;
var ___$1 = this;
return self__.blockable;
}));

(cljs.core.async.t_cljs$core$async36065.prototype.cljs$core$async$impl$protocols$Handler$commit$arity$1 = (function (_){
var self__ = this;
var ___$1 = this;
return self__.f;
}));

(cljs.core.async.t_cljs$core$async36065.getBasis = (function (){
return new cljs.core.PersistentVector(null, 3, 5, cljs.core.PersistentVector.EMPTY_NODE, [new cljs.core.Symbol(null,"f","f",43394975,null),new cljs.core.Symbol(null,"blockable","blockable",-28395259,null),new cljs.core.Symbol(null,"meta36066","meta36066",159882619,null)], null);
}));

(cljs.core.async.t_cljs$core$async36065.cljs$lang$type = true);

(cljs.core.async.t_cljs$core$async36065.cljs$lang$ctorStr = "cljs.core.async/t_cljs$core$async36065");

(cljs.core.async.t_cljs$core$async36065.cljs$lang$ctorPrWriter = (function (this__5287__auto__,writer__5288__auto__,opt__5289__auto__){
return cljs.core._write(writer__5288__auto__,"cljs.core.async/t_cljs$core$async36065");
}));

/**
 * Positional factory function for cljs.core.async/t_cljs$core$async36065.
 */
cljs.core.async.__GT_t_cljs$core$async36065 = (function cljs$core$async$__GT_t_cljs$core$async36065(f,blockable,meta36066){
return (new cljs.core.async.t_cljs$core$async36065(f,blockable,meta36066));
});


cljs.core.async.fn_handler = (function cljs$core$async$fn_handler(var_args){
var G__36041 = arguments.length;
switch (G__36041) {
case 1:
return cljs.core.async.fn_handler.cljs$core$IFn$_invoke$arity$1((arguments[(0)]));

break;
case 2:
return cljs.core.async.fn_handler.cljs$core$IFn$_invoke$arity$2((arguments[(0)]),(arguments[(1)]));

break;
default:
throw (new Error(["Invalid arity: ",cljs.core.str.cljs$core$IFn$_invoke$arity$1(arguments.length)].join('')));

}
});

(cljs.core.async.fn_handler.cljs$core$IFn$_invoke$arity$1 = (function (f){
return cljs.core.async.fn_handler.cljs$core$IFn$_invoke$arity$2(f,true);
}));

(cljs.core.async.fn_handler.cljs$core$IFn$_invoke$arity$2 = (function (f,blockable){
return (new cljs.core.async.t_cljs$core$async36065(f,blockable,cljs.core.PersistentArrayMap.EMPTY));
}));

(cljs.core.async.fn_handler.cljs$lang$maxFixedArity = 2);

/**
 * Returns a fixed buffer of size n. When full, puts will block/park.
 */
cljs.core.async.buffer = (function cljs$core$async$buffer(n){
return cljs.core.async.impl.buffers.fixed_buffer(n);
});
/**
 * Returns a buffer of size n. When full, puts will complete but
 *   val will be dropped (no transfer).
 */
cljs.core.async.dropping_buffer = (function cljs$core$async$dropping_buffer(n){
return cljs.core.async.impl.buffers.dropping_buffer(n);
});
/**
 * Returns a buffer of size n. When full, puts will complete, and be
 *   buffered, but oldest elements in buffer will be dropped (not
 *   transferred).
 */
cljs.core.async.sliding_buffer = (function cljs$core$async$sliding_buffer(n){
return cljs.core.async.impl.buffers.sliding_buffer(n);
});
/**
 * Returns true if a channel created with buff will never block. That is to say,
 * puts into this buffer will never cause the buffer to be full. 
 */
cljs.core.async.unblocking_buffer_QMARK_ = (function cljs$core$async$unblocking_buffer_QMARK_(buff){
if((!((buff == null)))){
if(((false) || ((cljs.core.PROTOCOL_SENTINEL === buff.cljs$core$async$impl$protocols$UnblockingBuffer$)))){
return true;
} else {
if((!buff.cljs$lang$protocol_mask$partition$)){
return cljs.core.native_satisfies_QMARK_(cljs.core.async.impl.protocols.UnblockingBuffer,buff);
} else {
return false;
}
}
} else {
return cljs.core.native_satisfies_QMARK_(cljs.core.async.impl.protocols.UnblockingBuffer,buff);
}
});
/**
 * Creates a channel with an optional buffer, an optional transducer (like (map f),
 *   (filter p) etc or a composition thereof), and an optional exception handler.
 *   If buf-or-n is a number, will create and use a fixed buffer of that size. If a
 *   transducer is supplied a buffer must be specified. ex-handler must be a
 *   fn of one argument - if an exception occurs during transformation it will be called
 *   with the thrown value as an argument, and any non-nil return value will be placed
 *   in the channel.
 */
cljs.core.async.chan = (function cljs$core$async$chan(var_args){
var G__36086 = arguments.length;
switch (G__36086) {
case 0:
return cljs.core.async.chan.cljs$core$IFn$_invoke$arity$0();

break;
case 1:
return cljs.core.async.chan.cljs$core$IFn$_invoke$arity$1((arguments[(0)]));

break;
case 2:
return cljs.core.async.chan.cljs$core$IFn$_invoke$arity$2((arguments[(0)]),(arguments[(1)]));

break;
case 3:
return cljs.core.async.chan.cljs$core$IFn$_invoke$arity$3((arguments[(0)]),(arguments[(1)]),(arguments[(2)]));

break;
default:
throw (new Error(["Invalid arity: ",cljs.core.str.cljs$core$IFn$_invoke$arity$1(arguments.length)].join('')));

}
});

(cljs.core.async.chan.cljs$core$IFn$_invoke$arity$0 = (function (){
return cljs.core.async.chan.cljs$core$IFn$_invoke$arity$1(null);
}));

(cljs.core.async.chan.cljs$core$IFn$_invoke$arity$1 = (function (buf_or_n){
return cljs.core.async.chan.cljs$core$IFn$_invoke$arity$3(buf_or_n,null,null);
}));

(cljs.core.async.chan.cljs$core$IFn$_invoke$arity$2 = (function (buf_or_n,xform){
return cljs.core.async.chan.cljs$core$IFn$_invoke$arity$3(buf_or_n,xform,null);
}));

(cljs.core.async.chan.cljs$core$IFn$_invoke$arity$3 = (function (buf_or_n,xform,ex_handler){
var buf_or_n__$1 = ((cljs.core._EQ_.cljs$core$IFn$_invoke$arity$2(buf_or_n,(0)))?null:buf_or_n);
if(cljs.core.truth_(xform)){
if(cljs.core.truth_(buf_or_n__$1)){
} else {
throw (new Error(["Assert failed: ","buffer must be supplied when transducer is","\n","buf-or-n"].join('')));
}
} else {
}

return cljs.core.async.impl.channels.chan.cljs$core$IFn$_invoke$arity$3(((typeof buf_or_n__$1 === 'number')?cljs.core.async.buffer(buf_or_n__$1):buf_or_n__$1),xform,ex_handler);
}));

(cljs.core.async.chan.cljs$lang$maxFixedArity = 3);

/**
 * Creates a promise channel with an optional transducer, and an optional
 *   exception-handler. A promise channel can take exactly one value that consumers
 *   will receive. Once full, puts complete but val is dropped (no transfer).
 *   Consumers will block until either a value is placed in the channel or the
 *   channel is closed. See chan for the semantics of xform and ex-handler.
 */
cljs.core.async.promise_chan = (function cljs$core$async$promise_chan(var_args){
var G__36090 = arguments.length;
switch (G__36090) {
case 0:
return cljs.core.async.promise_chan.cljs$core$IFn$_invoke$arity$0();

break;
case 1:
return cljs.core.async.promise_chan.cljs$core$IFn$_invoke$arity$1((arguments[(0)]));

break;
case 2:
return cljs.core.async.promise_chan.cljs$core$IFn$_invoke$arity$2((arguments[(0)]),(arguments[(1)]));

break;
default:
throw (new Error(["Invalid arity: ",cljs.core.str.cljs$core$IFn$_invoke$arity$1(arguments.length)].join('')));

}
});

(cljs.core.async.promise_chan.cljs$core$IFn$_invoke$arity$0 = (function (){
return cljs.core.async.promise_chan.cljs$core$IFn$_invoke$arity$1(null);
}));

(cljs.core.async.promise_chan.cljs$core$IFn$_invoke$arity$1 = (function (xform){
return cljs.core.async.promise_chan.cljs$core$IFn$_invoke$arity$2(xform,null);
}));

(cljs.core.async.promise_chan.cljs$core$IFn$_invoke$arity$2 = (function (xform,ex_handler){
return cljs.core.async.chan.cljs$core$IFn$_invoke$arity$3(cljs.core.async.impl.buffers.promise_buffer(),xform,ex_handler);
}));

(cljs.core.async.promise_chan.cljs$lang$maxFixedArity = 2);

/**
 * Returns a channel that will close after msecs
 */
cljs.core.async.timeout = (function cljs$core$async$timeout(msecs){
return cljs.core.async.impl.timers.timeout(msecs);
});
/**
 * takes a val from port. Must be called inside a (go ...) block. Will
 *   return nil if closed. Will park if nothing is available.
 *   Returns true unless port is already closed
 */
cljs.core.async._LT__BANG_ = (function cljs$core$async$_LT__BANG_(port){
throw (new Error("<! used not in (go ...) block"));
});
/**
 * Asynchronously takes a val from port, passing to fn1. Will pass nil
 * if closed. If on-caller? (default true) is true, and value is
 * immediately available, will call fn1 on calling thread.
 * Returns nil.
 */
cljs.core.async.take_BANG_ = (function cljs$core$async$take_BANG_(var_args){
var G__36094 = arguments.length;
switch (G__36094) {
case 2:
return cljs.core.async.take_BANG_.cljs$core$IFn$_invoke$arity$2((arguments[(0)]),(arguments[(1)]));

break;
case 3:
return cljs.core.async.take_BANG_.cljs$core$IFn$_invoke$arity$3((arguments[(0)]),(arguments[(1)]),(arguments[(2)]));

break;
default:
throw (new Error(["Invalid arity: ",cljs.core.str.cljs$core$IFn$_invoke$arity$1(arguments.length)].join('')));

}
});

(cljs.core.async.take_BANG_.cljs$core$IFn$_invoke$arity$2 = (function (port,fn1){
return cljs.core.async.take_BANG_.cljs$core$IFn$_invoke$arity$3(port,fn1,true);
}));

(cljs.core.async.take_BANG_.cljs$core$IFn$_invoke$arity$3 = (function (port,fn1,on_caller_QMARK_){
var ret = cljs.core.async.impl.protocols.take_BANG_(port,cljs.core.async.fn_handler.cljs$core$IFn$_invoke$arity$1(fn1));
if(cljs.core.truth_(ret)){
var val_39632 = cljs.core.deref(ret);
if(cljs.core.truth_(on_caller_QMARK_)){
(fn1.cljs$core$IFn$_invoke$arity$1 ? fn1.cljs$core$IFn$_invoke$arity$1(val_39632) : fn1.call(null, val_39632));
} else {
cljs.core.async.impl.dispatch.run((function (){
return (fn1.cljs$core$IFn$_invoke$arity$1 ? fn1.cljs$core$IFn$_invoke$arity$1(val_39632) : fn1.call(null, val_39632));
}));
}
} else {
}

return null;
}));

(cljs.core.async.take_BANG_.cljs$lang$maxFixedArity = 3);

cljs.core.async.nop = (function cljs$core$async$nop(_){
return null;
});
cljs.core.async.fhnop = cljs.core.async.fn_handler.cljs$core$IFn$_invoke$arity$1(cljs.core.async.nop);
/**
 * puts a val into port. nil values are not allowed. Must be called
 *   inside a (go ...) block. Will park if no buffer space is available.
 *   Returns true unless port is already closed.
 */
cljs.core.async._GT__BANG_ = (function cljs$core$async$_GT__BANG_(port,val){
throw (new Error(">! used not in (go ...) block"));
});
/**
 * Asynchronously puts a val into port, calling fn1 (if supplied) when
 * complete. nil values are not allowed. Will throw if closed. If
 * on-caller? (default true) is true, and the put is immediately
 * accepted, will call fn1 on calling thread.  Returns nil.
 */
cljs.core.async.put_BANG_ = (function cljs$core$async$put_BANG_(var_args){
var G__36097 = arguments.length;
switch (G__36097) {
case 2:
return cljs.core.async.put_BANG_.cljs$core$IFn$_invoke$arity$2((arguments[(0)]),(arguments[(1)]));

break;
case 3:
return cljs.core.async.put_BANG_.cljs$core$IFn$_invoke$arity$3((arguments[(0)]),(arguments[(1)]),(arguments[(2)]));

break;
case 4:
return cljs.core.async.put_BANG_.cljs$core$IFn$_invoke$arity$4((arguments[(0)]),(arguments[(1)]),(arguments[(2)]),(arguments[(3)]));

break;
default:
throw (new Error(["Invalid arity: ",cljs.core.str.cljs$core$IFn$_invoke$arity$1(arguments.length)].join('')));

}
});

(cljs.core.async.put_BANG_.cljs$core$IFn$_invoke$arity$2 = (function (port,val){
var temp__5802__auto__ = cljs.core.async.impl.protocols.put_BANG_(port,val,cljs.core.async.fhnop);
if(cljs.core.truth_(temp__5802__auto__)){
var ret = temp__5802__auto__;
return cljs.core.deref(ret);
} else {
return true;
}
}));

(cljs.core.async.put_BANG_.cljs$core$IFn$_invoke$arity$3 = (function (port,val,fn1){
return cljs.core.async.put_BANG_.cljs$core$IFn$_invoke$arity$4(port,val,fn1,true);
}));

(cljs.core.async.put_BANG_.cljs$core$IFn$_invoke$arity$4 = (function (port,val,fn1,on_caller_QMARK_){
var temp__5802__auto__ = cljs.core.async.impl.protocols.put_BANG_(port,val,cljs.core.async.fn_handler.cljs$core$IFn$_invoke$arity$1(fn1));
if(cljs.core.truth_(temp__5802__auto__)){
var retb = temp__5802__auto__;
var ret = cljs.core.deref(retb);
if(cljs.core.truth_(on_caller_QMARK_)){
(fn1.cljs$core$IFn$_invoke$arity$1 ? fn1.cljs$core$IFn$_invoke$arity$1(ret) : fn1.call(null, ret));
} else {
cljs.core.async.impl.dispatch.run((function (){
return (fn1.cljs$core$IFn$_invoke$arity$1 ? fn1.cljs$core$IFn$_invoke$arity$1(ret) : fn1.call(null, ret));
}));
}

return ret;
} else {
return true;
}
}));

(cljs.core.async.put_BANG_.cljs$lang$maxFixedArity = 4);

cljs.core.async.close_BANG_ = (function cljs$core$async$close_BANG_(port){
return cljs.core.async.impl.protocols.close_BANG_(port);
});
cljs.core.async.random_array = (function cljs$core$async$random_array(n){
var a = (new Array(n));
var n__5593__auto___39638 = n;
var x_39639 = (0);
while(true){
if((x_39639 < n__5593__auto___39638)){
(a[x_39639] = x_39639);

var G__39640 = (x_39639 + (1));
x_39639 = G__39640;
continue;
} else {
}
break;
}

cljs.core.async.goog$module$goog$array.shuffle(a);

return a;
});

/**
* @constructor
 * @implements {cljs.core.async.impl.protocols.Handler}
 * @implements {cljs.core.IMeta}
 * @implements {cljs.core.IWithMeta}
*/
cljs.core.async.t_cljs$core$async36100 = (function (flag,meta36101){
this.flag = flag;
this.meta36101 = meta36101;
this.cljs$lang$protocol_mask$partition0$ = 393216;
this.cljs$lang$protocol_mask$partition1$ = 0;
});
(cljs.core.async.t_cljs$core$async36100.prototype.cljs$core$IWithMeta$_with_meta$arity$2 = (function (_36102,meta36101__$1){
var self__ = this;
var _36102__$1 = this;
return (new cljs.core.async.t_cljs$core$async36100(self__.flag,meta36101__$1));
}));

(cljs.core.async.t_cljs$core$async36100.prototype.cljs$core$IMeta$_meta$arity$1 = (function (_36102){
var self__ = this;
var _36102__$1 = this;
return self__.meta36101;
}));

(cljs.core.async.t_cljs$core$async36100.prototype.cljs$core$async$impl$protocols$Handler$ = cljs.core.PROTOCOL_SENTINEL);

(cljs.core.async.t_cljs$core$async36100.prototype.cljs$core$async$impl$protocols$Handler$active_QMARK_$arity$1 = (function (_){
var self__ = this;
var ___$1 = this;
return cljs.core.deref(self__.flag);
}));

(cljs.core.async.t_cljs$core$async36100.prototype.cljs$core$async$impl$protocols$Handler$blockable_QMARK_$arity$1 = (function (_){
var self__ = this;
var ___$1 = this;
return true;
}));

(cljs.core.async.t_cljs$core$async36100.prototype.cljs$core$async$impl$protocols$Handler$commit$arity$1 = (function (_){
var self__ = this;
var ___$1 = this;
cljs.core.reset_BANG_(self__.flag,null);

return true;
}));

(cljs.core.async.t_cljs$core$async36100.getBasis = (function (){
return new cljs.core.PersistentVector(null, 2, 5, cljs.core.PersistentVector.EMPTY_NODE, [new cljs.core.Symbol(null,"flag","flag",-1565787888,null),new cljs.core.Symbol(null,"meta36101","meta36101",-465625283,null)], null);
}));

(cljs.core.async.t_cljs$core$async36100.cljs$lang$type = true);

(cljs.core.async.t_cljs$core$async36100.cljs$lang$ctorStr = "cljs.core.async/t_cljs$core$async36100");

(cljs.core.async.t_cljs$core$async36100.cljs$lang$ctorPrWriter = (function (this__5287__auto__,writer__5288__auto__,opt__5289__auto__){
return cljs.core._write(writer__5288__auto__,"cljs.core.async/t_cljs$core$async36100");
}));

/**
 * Positional factory function for cljs.core.async/t_cljs$core$async36100.
 */
cljs.core.async.__GT_t_cljs$core$async36100 = (function cljs$core$async$__GT_t_cljs$core$async36100(flag,meta36101){
return (new cljs.core.async.t_cljs$core$async36100(flag,meta36101));
});


cljs.core.async.alt_flag = (function cljs$core$async$alt_flag(){
var flag = cljs.core.atom.cljs$core$IFn$_invoke$arity$1(true);
return (new cljs.core.async.t_cljs$core$async36100(flag,cljs.core.PersistentArrayMap.EMPTY));
});

/**
* @constructor
 * @implements {cljs.core.async.impl.protocols.Handler}
 * @implements {cljs.core.IMeta}
 * @implements {cljs.core.IWithMeta}
*/
cljs.core.async.t_cljs$core$async36103 = (function (flag,cb,meta36104){
this.flag = flag;
this.cb = cb;
this.meta36104 = meta36104;
this.cljs$lang$protocol_mask$partition0$ = 393216;
this.cljs$lang$protocol_mask$partition1$ = 0;
});
(cljs.core.async.t_cljs$core$async36103.prototype.cljs$core$IWithMeta$_with_meta$arity$2 = (function (_36105,meta36104__$1){
var self__ = this;
var _36105__$1 = this;
return (new cljs.core.async.t_cljs$core$async36103(self__.flag,self__.cb,meta36104__$1));
}));

(cljs.core.async.t_cljs$core$async36103.prototype.cljs$core$IMeta$_meta$arity$1 = (function (_36105){
var self__ = this;
var _36105__$1 = this;
return self__.meta36104;
}));

(cljs.core.async.t_cljs$core$async36103.prototype.cljs$core$async$impl$protocols$Handler$ = cljs.core.PROTOCOL_SENTINEL);

(cljs.core.async.t_cljs$core$async36103.prototype.cljs$core$async$impl$protocols$Handler$active_QMARK_$arity$1 = (function (_){
var self__ = this;
var ___$1 = this;
return cljs.core.async.impl.protocols.active_QMARK_(self__.flag);
}));

(cljs.core.async.t_cljs$core$async36103.prototype.cljs$core$async$impl$protocols$Handler$blockable_QMARK_$arity$1 = (function (_){
var self__ = this;
var ___$1 = this;
return true;
}));

(cljs.core.async.t_cljs$core$async36103.prototype.cljs$core$async$impl$protocols$Handler$commit$arity$1 = (function (_){
var self__ = this;
var ___$1 = this;
cljs.core.async.impl.protocols.commit(self__.flag);

return self__.cb;
}));

(cljs.core.async.t_cljs$core$async36103.getBasis = (function (){
return new cljs.core.PersistentVector(null, 3, 5, cljs.core.PersistentVector.EMPTY_NODE, [new cljs.core.Symbol(null,"flag","flag",-1565787888,null),new cljs.core.Symbol(null,"cb","cb",-2064487928,null),new cljs.core.Symbol(null,"meta36104","meta36104",561110540,null)], null);
}));

(cljs.core.async.t_cljs$core$async36103.cljs$lang$type = true);

(cljs.core.async.t_cljs$core$async36103.cljs$lang$ctorStr = "cljs.core.async/t_cljs$core$async36103");

(cljs.core.async.t_cljs$core$async36103.cljs$lang$ctorPrWriter = (function (this__5287__auto__,writer__5288__auto__,opt__5289__auto__){
return cljs.core._write(writer__5288__auto__,"cljs.core.async/t_cljs$core$async36103");
}));

/**
 * Positional factory function for cljs.core.async/t_cljs$core$async36103.
 */
cljs.core.async.__GT_t_cljs$core$async36103 = (function cljs$core$async$__GT_t_cljs$core$async36103(flag,cb,meta36104){
return (new cljs.core.async.t_cljs$core$async36103(flag,cb,meta36104));
});


cljs.core.async.alt_handler = (function cljs$core$async$alt_handler(flag,cb){
return (new cljs.core.async.t_cljs$core$async36103(flag,cb,cljs.core.PersistentArrayMap.EMPTY));
});
/**
 * returns derefable [val port] if immediate, nil if enqueued
 */
cljs.core.async.do_alts = (function cljs$core$async$do_alts(fret,ports,opts){
if((cljs.core.count(ports) > (0))){
} else {
throw (new Error(["Assert failed: ","alts must have at least one channel operation","\n","(pos? (count ports))"].join('')));
}

var flag = cljs.core.async.alt_flag();
var ports__$1 = cljs.core.vec(ports);
var n = cljs.core.count(ports__$1);
var idxs = cljs.core.async.random_array(n);
var priority = new cljs.core.Keyword(null,"priority","priority",1431093715).cljs$core$IFn$_invoke$arity$1(opts);
var ret = (function (){var i = (0);
while(true){
if((i < n)){
var idx = (cljs.core.truth_(priority)?i:(idxs[i]));
var port = cljs.core.nth.cljs$core$IFn$_invoke$arity$2(ports__$1,idx);
var wport = ((cljs.core.vector_QMARK_(port))?(port.cljs$core$IFn$_invoke$arity$1 ? port.cljs$core$IFn$_invoke$arity$1((0)) : port.call(null, (0))):null);
var vbox = (cljs.core.truth_(wport)?(function (){var val = (port.cljs$core$IFn$_invoke$arity$1 ? port.cljs$core$IFn$_invoke$arity$1((1)) : port.call(null, (1)));
return cljs.core.async.impl.protocols.put_BANG_(wport,val,cljs.core.async.alt_handler(flag,((function (i,val,idx,port,wport,flag,ports__$1,n,idxs,priority){
return (function (p1__36108_SHARP_){
var G__36110 = new cljs.core.PersistentVector(null, 2, 5, cljs.core.PersistentVector.EMPTY_NODE, [p1__36108_SHARP_,wport], null);
return (fret.cljs$core$IFn$_invoke$arity$1 ? fret.cljs$core$IFn$_invoke$arity$1(G__36110) : fret.call(null, G__36110));
});})(i,val,idx,port,wport,flag,ports__$1,n,idxs,priority))
));
})():cljs.core.async.impl.protocols.take_BANG_(port,cljs.core.async.alt_handler(flag,((function (i,idx,port,wport,flag,ports__$1,n,idxs,priority){
return (function (p1__36109_SHARP_){
var G__36111 = new cljs.core.PersistentVector(null, 2, 5, cljs.core.PersistentVector.EMPTY_NODE, [p1__36109_SHARP_,port], null);
return (fret.cljs$core$IFn$_invoke$arity$1 ? fret.cljs$core$IFn$_invoke$arity$1(G__36111) : fret.call(null, G__36111));
});})(i,idx,port,wport,flag,ports__$1,n,idxs,priority))
)));
if(cljs.core.truth_(vbox)){
return cljs.core.async.impl.channels.box(new cljs.core.PersistentVector(null, 2, 5, cljs.core.PersistentVector.EMPTY_NODE, [cljs.core.deref(vbox),(function (){var or__5002__auto__ = wport;
if(cljs.core.truth_(or__5002__auto__)){
return or__5002__auto__;
} else {
return port;
}
})()], null));
} else {
var G__39661 = (i + (1));
i = G__39661;
continue;
}
} else {
return null;
}
break;
}
})();
var or__5002__auto__ = ret;
if(cljs.core.truth_(or__5002__auto__)){
return or__5002__auto__;
} else {
if(cljs.core.contains_QMARK_(opts,new cljs.core.Keyword(null,"default","default",-1987822328))){
var temp__5804__auto__ = (function (){var and__5000__auto__ = flag.cljs$core$async$impl$protocols$Handler$active_QMARK_$arity$1(null, );
if(cljs.core.truth_(and__5000__auto__)){
return flag.cljs$core$async$impl$protocols$Handler$commit$arity$1(null, );
} else {
return and__5000__auto__;
}
})();
if(cljs.core.truth_(temp__5804__auto__)){
var got = temp__5804__auto__;
return cljs.core.async.impl.channels.box(new cljs.core.PersistentVector(null, 2, 5, cljs.core.PersistentVector.EMPTY_NODE, [new cljs.core.Keyword(null,"default","default",-1987822328).cljs$core$IFn$_invoke$arity$1(opts),new cljs.core.Keyword(null,"default","default",-1987822328)], null));
} else {
return null;
}
} else {
return null;
}
}
});
/**
 * Completes at most one of several channel operations. Must be called
 * inside a (go ...) block. ports is a vector of channel endpoints,
 * which can be either a channel to take from or a vector of
 *   [channel-to-put-to val-to-put], in any combination. Takes will be
 *   made as if by <!, and puts will be made as if by >!. Unless
 *   the :priority option is true, if more than one port operation is
 *   ready a non-deterministic choice will be made. If no operation is
 *   ready and a :default value is supplied, [default-val :default] will
 *   be returned, otherwise alts! will park until the first operation to
 *   become ready completes. Returns [val port] of the completed
 *   operation, where val is the value taken for takes, and a
 *   boolean (true unless already closed, as per put!) for puts.
 * 
 *   opts are passed as :key val ... Supported options:
 * 
 *   :default val - the value to use if none of the operations are immediately ready
 *   :priority true - (default nil) when true, the operations will be tried in order.
 * 
 *   Note: there is no guarantee that the port exps or val exprs will be
 *   used, nor in what order should they be, so they should not be
 *   depended upon for side effects.
 */
cljs.core.async.alts_BANG_ = (function cljs$core$async$alts_BANG_(var_args){
var args__5732__auto__ = [];
var len__5726__auto___39662 = arguments.length;
var i__5727__auto___39663 = (0);
while(true){
if((i__5727__auto___39663 < len__5726__auto___39662)){
args__5732__auto__.push((arguments[i__5727__auto___39663]));

var G__39664 = (i__5727__auto___39663 + (1));
i__5727__auto___39663 = G__39664;
continue;
} else {
}
break;
}

var argseq__5733__auto__ = ((((1) < args__5732__auto__.length))?(new cljs.core.IndexedSeq(args__5732__auto__.slice((1)),(0),null)):null);
return cljs.core.async.alts_BANG_.cljs$core$IFn$_invoke$arity$variadic((arguments[(0)]),argseq__5733__auto__);
});

(cljs.core.async.alts_BANG_.cljs$core$IFn$_invoke$arity$variadic = (function (ports,p__36114){
var map__36115 = p__36114;
var map__36115__$1 = cljs.core.__destructure_map(map__36115);
var opts = map__36115__$1;
throw (new Error("alts! used not in (go ...) block"));
}));

(cljs.core.async.alts_BANG_.cljs$lang$maxFixedArity = (1));

/** @this {Function} */
(cljs.core.async.alts_BANG_.cljs$lang$applyTo = (function (seq36112){
var G__36113 = cljs.core.first(seq36112);
var seq36112__$1 = cljs.core.next(seq36112);
var self__5711__auto__ = this;
return self__5711__auto__.cljs$core$IFn$_invoke$arity$variadic(G__36113,seq36112__$1);
}));

/**
 * Puts a val into port if it's possible to do so immediately.
 *   nil values are not allowed. Never blocks. Returns true if offer succeeds.
 */
cljs.core.async.offer_BANG_ = (function cljs$core$async$offer_BANG_(port,val){
var ret = cljs.core.async.impl.protocols.put_BANG_(port,val,cljs.core.async.fn_handler.cljs$core$IFn$_invoke$arity$2(cljs.core.async.nop,false));
if(cljs.core.truth_(ret)){
return cljs.core.deref(ret);
} else {
return null;
}
});
/**
 * Takes a val from port if it's possible to do so immediately.
 *   Never blocks. Returns value if successful, nil otherwise.
 */
cljs.core.async.poll_BANG_ = (function cljs$core$async$poll_BANG_(port){
var ret = cljs.core.async.impl.protocols.take_BANG_(port,cljs.core.async.fn_handler.cljs$core$IFn$_invoke$arity$2(cljs.core.async.nop,false));
if(cljs.core.truth_(ret)){
return cljs.core.deref(ret);
} else {
return null;
}
});
/**
 * Takes elements from the from channel and supplies them to the to
 * channel. By default, the to channel will be closed when the from
 * channel closes, but can be determined by the close?  parameter. Will
 * stop consuming the from channel if the to channel closes
 */
cljs.core.async.pipe = (function cljs$core$async$pipe(var_args){
var G__36117 = arguments.length;
switch (G__36117) {
case 2:
return cljs.core.async.pipe.cljs$core$IFn$_invoke$arity$2((arguments[(0)]),(arguments[(1)]));

break;
case 3:
return cljs.core.async.pipe.cljs$core$IFn$_invoke$arity$3((arguments[(0)]),(arguments[(1)]),(arguments[(2)]));

break;
default:
throw (new Error(["Invalid arity: ",cljs.core.str.cljs$core$IFn$_invoke$arity$1(arguments.length)].join('')));

}
});

(cljs.core.async.pipe.cljs$core$IFn$_invoke$arity$2 = (function (from,to){
return cljs.core.async.pipe.cljs$core$IFn$_invoke$arity$3(from,to,true);
}));

(cljs.core.async.pipe.cljs$core$IFn$_invoke$arity$3 = (function (from,to,close_QMARK_){
var c__35925__auto___39666 = cljs.core.async.chan.cljs$core$IFn$_invoke$arity$1((1));
cljs.core.async.impl.dispatch.run((function (){
var f__35926__auto__ = (function (){var switch__35496__auto__ = (function (state_36254){
var state_val_36255 = (state_36254[(1)]);
if((state_val_36255 === (7))){
var inst_36250 = (state_36254[(2)]);
var state_36254__$1 = state_36254;
var statearr_36277_39667 = state_36254__$1;
(statearr_36277_39667[(2)] = inst_36250);

(statearr_36277_39667[(1)] = (3));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_36255 === (1))){
var state_36254__$1 = state_36254;
var statearr_36278_39668 = state_36254__$1;
(statearr_36278_39668[(2)] = null);

(statearr_36278_39668[(1)] = (2));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_36255 === (4))){
var inst_36221 = (state_36254[(7)]);
var inst_36221__$1 = (state_36254[(2)]);
var inst_36222 = (inst_36221__$1 == null);
var state_36254__$1 = (function (){var statearr_36279 = state_36254;
(statearr_36279[(7)] = inst_36221__$1);

return statearr_36279;
})();
if(cljs.core.truth_(inst_36222)){
var statearr_36280_39669 = state_36254__$1;
(statearr_36280_39669[(1)] = (5));

} else {
var statearr_36281_39670 = state_36254__$1;
(statearr_36281_39670[(1)] = (6));

}

return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_36255 === (13))){
var state_36254__$1 = state_36254;
var statearr_36282_39674 = state_36254__$1;
(statearr_36282_39674[(2)] = null);

(statearr_36282_39674[(1)] = (14));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_36255 === (6))){
var inst_36221 = (state_36254[(7)]);
var state_36254__$1 = state_36254;
return cljs.core.async.impl.ioc_helpers.put_BANG_(state_36254__$1,(11),to,inst_36221);
} else {
if((state_val_36255 === (3))){
var inst_36252 = (state_36254[(2)]);
var state_36254__$1 = state_36254;
return cljs.core.async.impl.ioc_helpers.return_chan(state_36254__$1,inst_36252);
} else {
if((state_val_36255 === (12))){
var state_36254__$1 = state_36254;
var statearr_36296_39675 = state_36254__$1;
(statearr_36296_39675[(2)] = null);

(statearr_36296_39675[(1)] = (2));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_36255 === (2))){
var state_36254__$1 = state_36254;
return cljs.core.async.impl.ioc_helpers.take_BANG_(state_36254__$1,(4),from);
} else {
if((state_val_36255 === (11))){
var inst_36239 = (state_36254[(2)]);
var state_36254__$1 = state_36254;
if(cljs.core.truth_(inst_36239)){
var statearr_36297_39676 = state_36254__$1;
(statearr_36297_39676[(1)] = (12));

} else {
var statearr_36298_39677 = state_36254__$1;
(statearr_36298_39677[(1)] = (13));

}

return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_36255 === (9))){
var state_36254__$1 = state_36254;
var statearr_36305_39678 = state_36254__$1;
(statearr_36305_39678[(2)] = null);

(statearr_36305_39678[(1)] = (10));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_36255 === (5))){
var state_36254__$1 = state_36254;
if(cljs.core.truth_(close_QMARK_)){
var statearr_36306_39679 = state_36254__$1;
(statearr_36306_39679[(1)] = (8));

} else {
var statearr_36308_39680 = state_36254__$1;
(statearr_36308_39680[(1)] = (9));

}

return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_36255 === (14))){
var inst_36248 = (state_36254[(2)]);
var state_36254__$1 = state_36254;
var statearr_36317_39682 = state_36254__$1;
(statearr_36317_39682[(2)] = inst_36248);

(statearr_36317_39682[(1)] = (7));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_36255 === (10))){
var inst_36236 = (state_36254[(2)]);
var state_36254__$1 = state_36254;
var statearr_36318_39687 = state_36254__$1;
(statearr_36318_39687[(2)] = inst_36236);

(statearr_36318_39687[(1)] = (7));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_36255 === (8))){
var inst_36225 = cljs.core.async.close_BANG_(to);
var state_36254__$1 = state_36254;
var statearr_36319_39688 = state_36254__$1;
(statearr_36319_39688[(2)] = inst_36225);

(statearr_36319_39688[(1)] = (10));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
return null;
}
}
}
}
}
}
}
}
}
}
}
}
}
}
});
return (function() {
var cljs$core$async$state_machine__35497__auto__ = null;
var cljs$core$async$state_machine__35497__auto____0 = (function (){
var statearr_36320 = [null,null,null,null,null,null,null,null];
(statearr_36320[(0)] = cljs$core$async$state_machine__35497__auto__);

(statearr_36320[(1)] = (1));

return statearr_36320;
});
var cljs$core$async$state_machine__35497__auto____1 = (function (state_36254){
while(true){
var ret_value__35499__auto__ = (function (){try{while(true){
var result__35500__auto__ = switch__35496__auto__(state_36254);
if(cljs.core.keyword_identical_QMARK_(result__35500__auto__,new cljs.core.Keyword(null,"recur","recur",-437573268))){
continue;
} else {
return result__35500__auto__;
}
break;
}
}catch (e36321){var ex__35501__auto__ = e36321;
var statearr_36322_39689 = state_36254;
(statearr_36322_39689[(2)] = ex__35501__auto__);


if(cljs.core.seq((state_36254[(4)]))){
var statearr_36323_39690 = state_36254;
(statearr_36323_39690[(1)] = cljs.core.first((state_36254[(4)])));

} else {
throw ex__35501__auto__;
}

return new cljs.core.Keyword(null,"recur","recur",-437573268);
}})();
if(cljs.core.keyword_identical_QMARK_(ret_value__35499__auto__,new cljs.core.Keyword(null,"recur","recur",-437573268))){
var G__39691 = state_36254;
state_36254 = G__39691;
continue;
} else {
return ret_value__35499__auto__;
}
break;
}
});
cljs$core$async$state_machine__35497__auto__ = function(state_36254){
switch(arguments.length){
case 0:
return cljs$core$async$state_machine__35497__auto____0.call(this);
case 1:
return cljs$core$async$state_machine__35497__auto____1.call(this,state_36254);
}
throw(new Error('Invalid arity: ' + arguments.length));
};
cljs$core$async$state_machine__35497__auto__.cljs$core$IFn$_invoke$arity$0 = cljs$core$async$state_machine__35497__auto____0;
cljs$core$async$state_machine__35497__auto__.cljs$core$IFn$_invoke$arity$1 = cljs$core$async$state_machine__35497__auto____1;
return cljs$core$async$state_machine__35497__auto__;
})()
})();
var state__35927__auto__ = (function (){var statearr_36328 = f__35926__auto__();
(statearr_36328[(6)] = c__35925__auto___39666);

return statearr_36328;
})();
return cljs.core.async.impl.ioc_helpers.run_state_machine_wrapped(state__35927__auto__);
}));


return to;
}));

(cljs.core.async.pipe.cljs$lang$maxFixedArity = 3);

cljs.core.async.pipeline_STAR_ = (function cljs$core$async$pipeline_STAR_(n,to,xf,from,close_QMARK_,ex_handler,type){
if((n > (0))){
} else {
throw (new Error("Assert failed: (pos? n)"));
}

var jobs = cljs.core.async.chan.cljs$core$IFn$_invoke$arity$1(n);
var results = cljs.core.async.chan.cljs$core$IFn$_invoke$arity$1(n);
var process__$1 = (function (p__36329){
var vec__36330 = p__36329;
var v = cljs.core.nth.cljs$core$IFn$_invoke$arity$3(vec__36330,(0),null);
var p = cljs.core.nth.cljs$core$IFn$_invoke$arity$3(vec__36330,(1),null);
var job = vec__36330;
if((job == null)){
cljs.core.async.close_BANG_(results);

return null;
} else {
var res = cljs.core.async.chan.cljs$core$IFn$_invoke$arity$3((1),xf,ex_handler);
var c__35925__auto___39695 = cljs.core.async.chan.cljs$core$IFn$_invoke$arity$1((1));
cljs.core.async.impl.dispatch.run((function (){
var f__35926__auto__ = (function (){var switch__35496__auto__ = (function (state_36337){
var state_val_36338 = (state_36337[(1)]);
if((state_val_36338 === (1))){
var state_36337__$1 = state_36337;
return cljs.core.async.impl.ioc_helpers.put_BANG_(state_36337__$1,(2),res,v);
} else {
if((state_val_36338 === (2))){
var inst_36334 = (state_36337[(2)]);
var inst_36335 = cljs.core.async.close_BANG_(res);
var state_36337__$1 = (function (){var statearr_36339 = state_36337;
(statearr_36339[(7)] = inst_36334);

return statearr_36339;
})();
return cljs.core.async.impl.ioc_helpers.return_chan(state_36337__$1,inst_36335);
} else {
return null;
}
}
});
return (function() {
var cljs$core$async$pipeline_STAR__$_state_machine__35497__auto__ = null;
var cljs$core$async$pipeline_STAR__$_state_machine__35497__auto____0 = (function (){
var statearr_36340 = [null,null,null,null,null,null,null,null];
(statearr_36340[(0)] = cljs$core$async$pipeline_STAR__$_state_machine__35497__auto__);

(statearr_36340[(1)] = (1));

return statearr_36340;
});
var cljs$core$async$pipeline_STAR__$_state_machine__35497__auto____1 = (function (state_36337){
while(true){
var ret_value__35499__auto__ = (function (){try{while(true){
var result__35500__auto__ = switch__35496__auto__(state_36337);
if(cljs.core.keyword_identical_QMARK_(result__35500__auto__,new cljs.core.Keyword(null,"recur","recur",-437573268))){
continue;
} else {
return result__35500__auto__;
}
break;
}
}catch (e36341){var ex__35501__auto__ = e36341;
var statearr_36342_39705 = state_36337;
(statearr_36342_39705[(2)] = ex__35501__auto__);


if(cljs.core.seq((state_36337[(4)]))){
var statearr_36346_39709 = state_36337;
(statearr_36346_39709[(1)] = cljs.core.first((state_36337[(4)])));

} else {
throw ex__35501__auto__;
}

return new cljs.core.Keyword(null,"recur","recur",-437573268);
}})();
if(cljs.core.keyword_identical_QMARK_(ret_value__35499__auto__,new cljs.core.Keyword(null,"recur","recur",-437573268))){
var G__39713 = state_36337;
state_36337 = G__39713;
continue;
} else {
return ret_value__35499__auto__;
}
break;
}
});
cljs$core$async$pipeline_STAR__$_state_machine__35497__auto__ = function(state_36337){
switch(arguments.length){
case 0:
return cljs$core$async$pipeline_STAR__$_state_machine__35497__auto____0.call(this);
case 1:
return cljs$core$async$pipeline_STAR__$_state_machine__35497__auto____1.call(this,state_36337);
}
throw(new Error('Invalid arity: ' + arguments.length));
};
cljs$core$async$pipeline_STAR__$_state_machine__35497__auto__.cljs$core$IFn$_invoke$arity$0 = cljs$core$async$pipeline_STAR__$_state_machine__35497__auto____0;
cljs$core$async$pipeline_STAR__$_state_machine__35497__auto__.cljs$core$IFn$_invoke$arity$1 = cljs$core$async$pipeline_STAR__$_state_machine__35497__auto____1;
return cljs$core$async$pipeline_STAR__$_state_machine__35497__auto__;
})()
})();
var state__35927__auto__ = (function (){var statearr_36347 = f__35926__auto__();
(statearr_36347[(6)] = c__35925__auto___39695);

return statearr_36347;
})();
return cljs.core.async.impl.ioc_helpers.run_state_machine_wrapped(state__35927__auto__);
}));


cljs.core.async.put_BANG_.cljs$core$IFn$_invoke$arity$2(p,res);

return true;
}
});
var async = (function (p__36352){
var vec__36353 = p__36352;
var v = cljs.core.nth.cljs$core$IFn$_invoke$arity$3(vec__36353,(0),null);
var p = cljs.core.nth.cljs$core$IFn$_invoke$arity$3(vec__36353,(1),null);
var job = vec__36353;
if((job == null)){
cljs.core.async.close_BANG_(results);

return null;
} else {
var res = cljs.core.async.chan.cljs$core$IFn$_invoke$arity$1((1));
(xf.cljs$core$IFn$_invoke$arity$2 ? xf.cljs$core$IFn$_invoke$arity$2(v,res) : xf.call(null, v,res));

cljs.core.async.put_BANG_.cljs$core$IFn$_invoke$arity$2(p,res);

return true;
}
});
var n__5593__auto___39729 = n;
var __39732 = (0);
while(true){
if((__39732 < n__5593__auto___39729)){
var G__36356_39734 = type;
var G__36356_39735__$1 = (((G__36356_39734 instanceof cljs.core.Keyword))?G__36356_39734.fqn:null);
switch (G__36356_39735__$1) {
case "compute":
var c__35925__auto___39737 = cljs.core.async.chan.cljs$core$IFn$_invoke$arity$1((1));
cljs.core.async.impl.dispatch.run(((function (__39732,c__35925__auto___39737,G__36356_39734,G__36356_39735__$1,n__5593__auto___39729,jobs,results,process__$1,async){
return (function (){
var f__35926__auto__ = (function (){var switch__35496__auto__ = ((function (__39732,c__35925__auto___39737,G__36356_39734,G__36356_39735__$1,n__5593__auto___39729,jobs,results,process__$1,async){
return (function (state_36387){
var state_val_36388 = (state_36387[(1)]);
if((state_val_36388 === (1))){
var state_36387__$1 = state_36387;
var statearr_36462_39738 = state_36387__$1;
(statearr_36462_39738[(2)] = null);

(statearr_36462_39738[(1)] = (2));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_36388 === (2))){
var state_36387__$1 = state_36387;
return cljs.core.async.impl.ioc_helpers.take_BANG_(state_36387__$1,(4),jobs);
} else {
if((state_val_36388 === (3))){
var inst_36385 = (state_36387[(2)]);
var state_36387__$1 = state_36387;
return cljs.core.async.impl.ioc_helpers.return_chan(state_36387__$1,inst_36385);
} else {
if((state_val_36388 === (4))){
var inst_36364 = (state_36387[(2)]);
var inst_36365 = process__$1(inst_36364);
var state_36387__$1 = state_36387;
if(cljs.core.truth_(inst_36365)){
var statearr_36464_39739 = state_36387__$1;
(statearr_36464_39739[(1)] = (5));

} else {
var statearr_36465_39743 = state_36387__$1;
(statearr_36465_39743[(1)] = (6));

}

return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_36388 === (5))){
var state_36387__$1 = state_36387;
var statearr_36466_39744 = state_36387__$1;
(statearr_36466_39744[(2)] = null);

(statearr_36466_39744[(1)] = (2));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_36388 === (6))){
var state_36387__$1 = state_36387;
var statearr_36467_39751 = state_36387__$1;
(statearr_36467_39751[(2)] = null);

(statearr_36467_39751[(1)] = (7));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_36388 === (7))){
var inst_36383 = (state_36387[(2)]);
var state_36387__$1 = state_36387;
var statearr_36470_39752 = state_36387__$1;
(statearr_36470_39752[(2)] = inst_36383);

(statearr_36470_39752[(1)] = (3));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
return null;
}
}
}
}
}
}
}
});})(__39732,c__35925__auto___39737,G__36356_39734,G__36356_39735__$1,n__5593__auto___39729,jobs,results,process__$1,async))
;
return ((function (__39732,switch__35496__auto__,c__35925__auto___39737,G__36356_39734,G__36356_39735__$1,n__5593__auto___39729,jobs,results,process__$1,async){
return (function() {
var cljs$core$async$pipeline_STAR__$_state_machine__35497__auto__ = null;
var cljs$core$async$pipeline_STAR__$_state_machine__35497__auto____0 = (function (){
var statearr_36471 = [null,null,null,null,null,null,null];
(statearr_36471[(0)] = cljs$core$async$pipeline_STAR__$_state_machine__35497__auto__);

(statearr_36471[(1)] = (1));

return statearr_36471;
});
var cljs$core$async$pipeline_STAR__$_state_machine__35497__auto____1 = (function (state_36387){
while(true){
var ret_value__35499__auto__ = (function (){try{while(true){
var result__35500__auto__ = switch__35496__auto__(state_36387);
if(cljs.core.keyword_identical_QMARK_(result__35500__auto__,new cljs.core.Keyword(null,"recur","recur",-437573268))){
continue;
} else {
return result__35500__auto__;
}
break;
}
}catch (e36472){var ex__35501__auto__ = e36472;
var statearr_36473_39756 = state_36387;
(statearr_36473_39756[(2)] = ex__35501__auto__);


if(cljs.core.seq((state_36387[(4)]))){
var statearr_36474_39757 = state_36387;
(statearr_36474_39757[(1)] = cljs.core.first((state_36387[(4)])));

} else {
throw ex__35501__auto__;
}

return new cljs.core.Keyword(null,"recur","recur",-437573268);
}})();
if(cljs.core.keyword_identical_QMARK_(ret_value__35499__auto__,new cljs.core.Keyword(null,"recur","recur",-437573268))){
var G__39758 = state_36387;
state_36387 = G__39758;
continue;
} else {
return ret_value__35499__auto__;
}
break;
}
});
cljs$core$async$pipeline_STAR__$_state_machine__35497__auto__ = function(state_36387){
switch(arguments.length){
case 0:
return cljs$core$async$pipeline_STAR__$_state_machine__35497__auto____0.call(this);
case 1:
return cljs$core$async$pipeline_STAR__$_state_machine__35497__auto____1.call(this,state_36387);
}
throw(new Error('Invalid arity: ' + arguments.length));
};
cljs$core$async$pipeline_STAR__$_state_machine__35497__auto__.cljs$core$IFn$_invoke$arity$0 = cljs$core$async$pipeline_STAR__$_state_machine__35497__auto____0;
cljs$core$async$pipeline_STAR__$_state_machine__35497__auto__.cljs$core$IFn$_invoke$arity$1 = cljs$core$async$pipeline_STAR__$_state_machine__35497__auto____1;
return cljs$core$async$pipeline_STAR__$_state_machine__35497__auto__;
})()
;})(__39732,switch__35496__auto__,c__35925__auto___39737,G__36356_39734,G__36356_39735__$1,n__5593__auto___39729,jobs,results,process__$1,async))
})();
var state__35927__auto__ = (function (){var statearr_36475 = f__35926__auto__();
(statearr_36475[(6)] = c__35925__auto___39737);

return statearr_36475;
})();
return cljs.core.async.impl.ioc_helpers.run_state_machine_wrapped(state__35927__auto__);
});})(__39732,c__35925__auto___39737,G__36356_39734,G__36356_39735__$1,n__5593__auto___39729,jobs,results,process__$1,async))
);


break;
case "async":
var c__35925__auto___39759 = cljs.core.async.chan.cljs$core$IFn$_invoke$arity$1((1));
cljs.core.async.impl.dispatch.run(((function (__39732,c__35925__auto___39759,G__36356_39734,G__36356_39735__$1,n__5593__auto___39729,jobs,results,process__$1,async){
return (function (){
var f__35926__auto__ = (function (){var switch__35496__auto__ = ((function (__39732,c__35925__auto___39759,G__36356_39734,G__36356_39735__$1,n__5593__auto___39729,jobs,results,process__$1,async){
return (function (state_36488){
var state_val_36489 = (state_36488[(1)]);
if((state_val_36489 === (1))){
var state_36488__$1 = state_36488;
var statearr_36490_39760 = state_36488__$1;
(statearr_36490_39760[(2)] = null);

(statearr_36490_39760[(1)] = (2));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_36489 === (2))){
var state_36488__$1 = state_36488;
return cljs.core.async.impl.ioc_helpers.take_BANG_(state_36488__$1,(4),jobs);
} else {
if((state_val_36489 === (3))){
var inst_36486 = (state_36488[(2)]);
var state_36488__$1 = state_36488;
return cljs.core.async.impl.ioc_helpers.return_chan(state_36488__$1,inst_36486);
} else {
if((state_val_36489 === (4))){
var inst_36478 = (state_36488[(2)]);
var inst_36479 = async(inst_36478);
var state_36488__$1 = state_36488;
if(cljs.core.truth_(inst_36479)){
var statearr_36491_39761 = state_36488__$1;
(statearr_36491_39761[(1)] = (5));

} else {
var statearr_36492_39762 = state_36488__$1;
(statearr_36492_39762[(1)] = (6));

}

return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_36489 === (5))){
var state_36488__$1 = state_36488;
var statearr_36493_39763 = state_36488__$1;
(statearr_36493_39763[(2)] = null);

(statearr_36493_39763[(1)] = (2));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_36489 === (6))){
var state_36488__$1 = state_36488;
var statearr_36558_39764 = state_36488__$1;
(statearr_36558_39764[(2)] = null);

(statearr_36558_39764[(1)] = (7));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_36489 === (7))){
var inst_36484 = (state_36488[(2)]);
var state_36488__$1 = state_36488;
var statearr_36576_39765 = state_36488__$1;
(statearr_36576_39765[(2)] = inst_36484);

(statearr_36576_39765[(1)] = (3));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
return null;
}
}
}
}
}
}
}
});})(__39732,c__35925__auto___39759,G__36356_39734,G__36356_39735__$1,n__5593__auto___39729,jobs,results,process__$1,async))
;
return ((function (__39732,switch__35496__auto__,c__35925__auto___39759,G__36356_39734,G__36356_39735__$1,n__5593__auto___39729,jobs,results,process__$1,async){
return (function() {
var cljs$core$async$pipeline_STAR__$_state_machine__35497__auto__ = null;
var cljs$core$async$pipeline_STAR__$_state_machine__35497__auto____0 = (function (){
var statearr_36596 = [null,null,null,null,null,null,null];
(statearr_36596[(0)] = cljs$core$async$pipeline_STAR__$_state_machine__35497__auto__);

(statearr_36596[(1)] = (1));

return statearr_36596;
});
var cljs$core$async$pipeline_STAR__$_state_machine__35497__auto____1 = (function (state_36488){
while(true){
var ret_value__35499__auto__ = (function (){try{while(true){
var result__35500__auto__ = switch__35496__auto__(state_36488);
if(cljs.core.keyword_identical_QMARK_(result__35500__auto__,new cljs.core.Keyword(null,"recur","recur",-437573268))){
continue;
} else {
return result__35500__auto__;
}
break;
}
}catch (e36598){var ex__35501__auto__ = e36598;
var statearr_36599_39766 = state_36488;
(statearr_36599_39766[(2)] = ex__35501__auto__);


if(cljs.core.seq((state_36488[(4)]))){
var statearr_36600_39767 = state_36488;
(statearr_36600_39767[(1)] = cljs.core.first((state_36488[(4)])));

} else {
throw ex__35501__auto__;
}

return new cljs.core.Keyword(null,"recur","recur",-437573268);
}})();
if(cljs.core.keyword_identical_QMARK_(ret_value__35499__auto__,new cljs.core.Keyword(null,"recur","recur",-437573268))){
var G__39769 = state_36488;
state_36488 = G__39769;
continue;
} else {
return ret_value__35499__auto__;
}
break;
}
});
cljs$core$async$pipeline_STAR__$_state_machine__35497__auto__ = function(state_36488){
switch(arguments.length){
case 0:
return cljs$core$async$pipeline_STAR__$_state_machine__35497__auto____0.call(this);
case 1:
return cljs$core$async$pipeline_STAR__$_state_machine__35497__auto____1.call(this,state_36488);
}
throw(new Error('Invalid arity: ' + arguments.length));
};
cljs$core$async$pipeline_STAR__$_state_machine__35497__auto__.cljs$core$IFn$_invoke$arity$0 = cljs$core$async$pipeline_STAR__$_state_machine__35497__auto____0;
cljs$core$async$pipeline_STAR__$_state_machine__35497__auto__.cljs$core$IFn$_invoke$arity$1 = cljs$core$async$pipeline_STAR__$_state_machine__35497__auto____1;
return cljs$core$async$pipeline_STAR__$_state_machine__35497__auto__;
})()
;})(__39732,switch__35496__auto__,c__35925__auto___39759,G__36356_39734,G__36356_39735__$1,n__5593__auto___39729,jobs,results,process__$1,async))
})();
var state__35927__auto__ = (function (){var statearr_36603 = f__35926__auto__();
(statearr_36603[(6)] = c__35925__auto___39759);

return statearr_36603;
})();
return cljs.core.async.impl.ioc_helpers.run_state_machine_wrapped(state__35927__auto__);
});})(__39732,c__35925__auto___39759,G__36356_39734,G__36356_39735__$1,n__5593__auto___39729,jobs,results,process__$1,async))
);


break;
default:
throw (new Error(["No matching clause: ",cljs.core.str.cljs$core$IFn$_invoke$arity$1(G__36356_39735__$1)].join('')));

}

var G__39770 = (__39732 + (1));
__39732 = G__39770;
continue;
} else {
}
break;
}

var c__35925__auto___39771 = cljs.core.async.chan.cljs$core$IFn$_invoke$arity$1((1));
cljs.core.async.impl.dispatch.run((function (){
var f__35926__auto__ = (function (){var switch__35496__auto__ = (function (state_36633){
var state_val_36634 = (state_36633[(1)]);
if((state_val_36634 === (7))){
var inst_36628 = (state_36633[(2)]);
var state_36633__$1 = state_36633;
var statearr_36643_39772 = state_36633__$1;
(statearr_36643_39772[(2)] = inst_36628);

(statearr_36643_39772[(1)] = (3));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_36634 === (1))){
var state_36633__$1 = state_36633;
var statearr_36644_39773 = state_36633__$1;
(statearr_36644_39773[(2)] = null);

(statearr_36644_39773[(1)] = (2));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_36634 === (4))){
var inst_36609 = (state_36633[(7)]);
var inst_36609__$1 = (state_36633[(2)]);
var inst_36610 = (inst_36609__$1 == null);
var state_36633__$1 = (function (){var statearr_36645 = state_36633;
(statearr_36645[(7)] = inst_36609__$1);

return statearr_36645;
})();
if(cljs.core.truth_(inst_36610)){
var statearr_36646_39774 = state_36633__$1;
(statearr_36646_39774[(1)] = (5));

} else {
var statearr_36648_39775 = state_36633__$1;
(statearr_36648_39775[(1)] = (6));

}

return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_36634 === (6))){
var inst_36609 = (state_36633[(7)]);
var inst_36615 = (state_36633[(8)]);
var inst_36615__$1 = cljs.core.async.chan.cljs$core$IFn$_invoke$arity$1((1));
var inst_36619 = cljs.core.PersistentVector.EMPTY_NODE;
var inst_36620 = [inst_36609,inst_36615__$1];
var inst_36621 = (new cljs.core.PersistentVector(null,2,(5),inst_36619,inst_36620,null));
var state_36633__$1 = (function (){var statearr_36658 = state_36633;
(statearr_36658[(8)] = inst_36615__$1);

return statearr_36658;
})();
return cljs.core.async.impl.ioc_helpers.put_BANG_(state_36633__$1,(8),jobs,inst_36621);
} else {
if((state_val_36634 === (3))){
var inst_36630 = (state_36633[(2)]);
var state_36633__$1 = state_36633;
return cljs.core.async.impl.ioc_helpers.return_chan(state_36633__$1,inst_36630);
} else {
if((state_val_36634 === (2))){
var state_36633__$1 = state_36633;
return cljs.core.async.impl.ioc_helpers.take_BANG_(state_36633__$1,(4),from);
} else {
if((state_val_36634 === (9))){
var inst_36625 = (state_36633[(2)]);
var state_36633__$1 = (function (){var statearr_36665 = state_36633;
(statearr_36665[(9)] = inst_36625);

return statearr_36665;
})();
var statearr_36666_39777 = state_36633__$1;
(statearr_36666_39777[(2)] = null);

(statearr_36666_39777[(1)] = (2));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_36634 === (5))){
var inst_36613 = cljs.core.async.close_BANG_(jobs);
var state_36633__$1 = state_36633;
var statearr_36671_39778 = state_36633__$1;
(statearr_36671_39778[(2)] = inst_36613);

(statearr_36671_39778[(1)] = (7));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_36634 === (8))){
var inst_36615 = (state_36633[(8)]);
var inst_36623 = (state_36633[(2)]);
var state_36633__$1 = (function (){var statearr_36672 = state_36633;
(statearr_36672[(10)] = inst_36623);

return statearr_36672;
})();
return cljs.core.async.impl.ioc_helpers.put_BANG_(state_36633__$1,(9),results,inst_36615);
} else {
return null;
}
}
}
}
}
}
}
}
}
});
return (function() {
var cljs$core$async$pipeline_STAR__$_state_machine__35497__auto__ = null;
var cljs$core$async$pipeline_STAR__$_state_machine__35497__auto____0 = (function (){
var statearr_36673 = [null,null,null,null,null,null,null,null,null,null,null];
(statearr_36673[(0)] = cljs$core$async$pipeline_STAR__$_state_machine__35497__auto__);

(statearr_36673[(1)] = (1));

return statearr_36673;
});
var cljs$core$async$pipeline_STAR__$_state_machine__35497__auto____1 = (function (state_36633){
while(true){
var ret_value__35499__auto__ = (function (){try{while(true){
var result__35500__auto__ = switch__35496__auto__(state_36633);
if(cljs.core.keyword_identical_QMARK_(result__35500__auto__,new cljs.core.Keyword(null,"recur","recur",-437573268))){
continue;
} else {
return result__35500__auto__;
}
break;
}
}catch (e36681){var ex__35501__auto__ = e36681;
var statearr_36682_39780 = state_36633;
(statearr_36682_39780[(2)] = ex__35501__auto__);


if(cljs.core.seq((state_36633[(4)]))){
var statearr_36683_39781 = state_36633;
(statearr_36683_39781[(1)] = cljs.core.first((state_36633[(4)])));

} else {
throw ex__35501__auto__;
}

return new cljs.core.Keyword(null,"recur","recur",-437573268);
}})();
if(cljs.core.keyword_identical_QMARK_(ret_value__35499__auto__,new cljs.core.Keyword(null,"recur","recur",-437573268))){
var G__39782 = state_36633;
state_36633 = G__39782;
continue;
} else {
return ret_value__35499__auto__;
}
break;
}
});
cljs$core$async$pipeline_STAR__$_state_machine__35497__auto__ = function(state_36633){
switch(arguments.length){
case 0:
return cljs$core$async$pipeline_STAR__$_state_machine__35497__auto____0.call(this);
case 1:
return cljs$core$async$pipeline_STAR__$_state_machine__35497__auto____1.call(this,state_36633);
}
throw(new Error('Invalid arity: ' + arguments.length));
};
cljs$core$async$pipeline_STAR__$_state_machine__35497__auto__.cljs$core$IFn$_invoke$arity$0 = cljs$core$async$pipeline_STAR__$_state_machine__35497__auto____0;
cljs$core$async$pipeline_STAR__$_state_machine__35497__auto__.cljs$core$IFn$_invoke$arity$1 = cljs$core$async$pipeline_STAR__$_state_machine__35497__auto____1;
return cljs$core$async$pipeline_STAR__$_state_machine__35497__auto__;
})()
})();
var state__35927__auto__ = (function (){var statearr_36690 = f__35926__auto__();
(statearr_36690[(6)] = c__35925__auto___39771);

return statearr_36690;
})();
return cljs.core.async.impl.ioc_helpers.run_state_machine_wrapped(state__35927__auto__);
}));


var c__35925__auto__ = cljs.core.async.chan.cljs$core$IFn$_invoke$arity$1((1));
cljs.core.async.impl.dispatch.run((function (){
var f__35926__auto__ = (function (){var switch__35496__auto__ = (function (state_36735){
var state_val_36739 = (state_36735[(1)]);
if((state_val_36739 === (7))){
var inst_36731 = (state_36735[(2)]);
var state_36735__$1 = state_36735;
var statearr_36746_39783 = state_36735__$1;
(statearr_36746_39783[(2)] = inst_36731);

(statearr_36746_39783[(1)] = (3));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_36739 === (20))){
var state_36735__$1 = state_36735;
var statearr_36748_39784 = state_36735__$1;
(statearr_36748_39784[(2)] = null);

(statearr_36748_39784[(1)] = (21));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_36739 === (1))){
var state_36735__$1 = state_36735;
var statearr_36749_39785 = state_36735__$1;
(statearr_36749_39785[(2)] = null);

(statearr_36749_39785[(1)] = (2));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_36739 === (4))){
var inst_36693 = (state_36735[(7)]);
var inst_36693__$1 = (state_36735[(2)]);
var inst_36694 = (inst_36693__$1 == null);
var state_36735__$1 = (function (){var statearr_36753 = state_36735;
(statearr_36753[(7)] = inst_36693__$1);

return statearr_36753;
})();
if(cljs.core.truth_(inst_36694)){
var statearr_36754_39786 = state_36735__$1;
(statearr_36754_39786[(1)] = (5));

} else {
var statearr_36755_39787 = state_36735__$1;
(statearr_36755_39787[(1)] = (6));

}

return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_36739 === (15))){
var inst_36711 = (state_36735[(8)]);
var state_36735__$1 = state_36735;
return cljs.core.async.impl.ioc_helpers.put_BANG_(state_36735__$1,(18),to,inst_36711);
} else {
if((state_val_36739 === (21))){
var inst_36726 = (state_36735[(2)]);
var state_36735__$1 = state_36735;
var statearr_36756_39788 = state_36735__$1;
(statearr_36756_39788[(2)] = inst_36726);

(statearr_36756_39788[(1)] = (13));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_36739 === (13))){
var inst_36728 = (state_36735[(2)]);
var state_36735__$1 = (function (){var statearr_36757 = state_36735;
(statearr_36757[(9)] = inst_36728);

return statearr_36757;
})();
var statearr_36758_39789 = state_36735__$1;
(statearr_36758_39789[(2)] = null);

(statearr_36758_39789[(1)] = (2));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_36739 === (6))){
var inst_36693 = (state_36735[(7)]);
var state_36735__$1 = state_36735;
return cljs.core.async.impl.ioc_helpers.take_BANG_(state_36735__$1,(11),inst_36693);
} else {
if((state_val_36739 === (17))){
var inst_36721 = (state_36735[(2)]);
var state_36735__$1 = state_36735;
if(cljs.core.truth_(inst_36721)){
var statearr_36759_39790 = state_36735__$1;
(statearr_36759_39790[(1)] = (19));

} else {
var statearr_36760_39791 = state_36735__$1;
(statearr_36760_39791[(1)] = (20));

}

return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_36739 === (3))){
var inst_36733 = (state_36735[(2)]);
var state_36735__$1 = state_36735;
return cljs.core.async.impl.ioc_helpers.return_chan(state_36735__$1,inst_36733);
} else {
if((state_val_36739 === (12))){
var inst_36703 = (state_36735[(10)]);
var state_36735__$1 = state_36735;
return cljs.core.async.impl.ioc_helpers.take_BANG_(state_36735__$1,(14),inst_36703);
} else {
if((state_val_36739 === (2))){
var state_36735__$1 = state_36735;
return cljs.core.async.impl.ioc_helpers.take_BANG_(state_36735__$1,(4),results);
} else {
if((state_val_36739 === (19))){
var state_36735__$1 = state_36735;
var statearr_36761_39795 = state_36735__$1;
(statearr_36761_39795[(2)] = null);

(statearr_36761_39795[(1)] = (12));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_36739 === (11))){
var inst_36703 = (state_36735[(2)]);
var state_36735__$1 = (function (){var statearr_36762 = state_36735;
(statearr_36762[(10)] = inst_36703);

return statearr_36762;
})();
var statearr_36763_39796 = state_36735__$1;
(statearr_36763_39796[(2)] = null);

(statearr_36763_39796[(1)] = (12));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_36739 === (9))){
var state_36735__$1 = state_36735;
var statearr_36764_39797 = state_36735__$1;
(statearr_36764_39797[(2)] = null);

(statearr_36764_39797[(1)] = (10));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_36739 === (5))){
var state_36735__$1 = state_36735;
if(cljs.core.truth_(close_QMARK_)){
var statearr_36765_39798 = state_36735__$1;
(statearr_36765_39798[(1)] = (8));

} else {
var statearr_36766_39799 = state_36735__$1;
(statearr_36766_39799[(1)] = (9));

}

return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_36739 === (14))){
var inst_36711 = (state_36735[(8)]);
var inst_36713 = (state_36735[(11)]);
var inst_36711__$1 = (state_36735[(2)]);
var inst_36712 = (inst_36711__$1 == null);
var inst_36713__$1 = cljs.core.not(inst_36712);
var state_36735__$1 = (function (){var statearr_36767 = state_36735;
(statearr_36767[(8)] = inst_36711__$1);

(statearr_36767[(11)] = inst_36713__$1);

return statearr_36767;
})();
if(inst_36713__$1){
var statearr_36769_39800 = state_36735__$1;
(statearr_36769_39800[(1)] = (15));

} else {
var statearr_36770_39801 = state_36735__$1;
(statearr_36770_39801[(1)] = (16));

}

return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_36739 === (16))){
var inst_36713 = (state_36735[(11)]);
var state_36735__$1 = state_36735;
var statearr_36772_39802 = state_36735__$1;
(statearr_36772_39802[(2)] = inst_36713);

(statearr_36772_39802[(1)] = (17));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_36739 === (10))){
var inst_36700 = (state_36735[(2)]);
var state_36735__$1 = state_36735;
var statearr_36773_39803 = state_36735__$1;
(statearr_36773_39803[(2)] = inst_36700);

(statearr_36773_39803[(1)] = (7));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_36739 === (18))){
var inst_36718 = (state_36735[(2)]);
var state_36735__$1 = state_36735;
var statearr_36774_39804 = state_36735__$1;
(statearr_36774_39804[(2)] = inst_36718);

(statearr_36774_39804[(1)] = (17));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_36739 === (8))){
var inst_36697 = cljs.core.async.close_BANG_(to);
var state_36735__$1 = state_36735;
var statearr_36775_39805 = state_36735__$1;
(statearr_36775_39805[(2)] = inst_36697);

(statearr_36775_39805[(1)] = (10));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
return null;
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
});
return (function() {
var cljs$core$async$pipeline_STAR__$_state_machine__35497__auto__ = null;
var cljs$core$async$pipeline_STAR__$_state_machine__35497__auto____0 = (function (){
var statearr_36776 = [null,null,null,null,null,null,null,null,null,null,null,null];
(statearr_36776[(0)] = cljs$core$async$pipeline_STAR__$_state_machine__35497__auto__);

(statearr_36776[(1)] = (1));

return statearr_36776;
});
var cljs$core$async$pipeline_STAR__$_state_machine__35497__auto____1 = (function (state_36735){
while(true){
var ret_value__35499__auto__ = (function (){try{while(true){
var result__35500__auto__ = switch__35496__auto__(state_36735);
if(cljs.core.keyword_identical_QMARK_(result__35500__auto__,new cljs.core.Keyword(null,"recur","recur",-437573268))){
continue;
} else {
return result__35500__auto__;
}
break;
}
}catch (e36777){var ex__35501__auto__ = e36777;
var statearr_36778_39806 = state_36735;
(statearr_36778_39806[(2)] = ex__35501__auto__);


if(cljs.core.seq((state_36735[(4)]))){
var statearr_36779_39807 = state_36735;
(statearr_36779_39807[(1)] = cljs.core.first((state_36735[(4)])));

} else {
throw ex__35501__auto__;
}

return new cljs.core.Keyword(null,"recur","recur",-437573268);
}})();
if(cljs.core.keyword_identical_QMARK_(ret_value__35499__auto__,new cljs.core.Keyword(null,"recur","recur",-437573268))){
var G__39808 = state_36735;
state_36735 = G__39808;
continue;
} else {
return ret_value__35499__auto__;
}
break;
}
});
cljs$core$async$pipeline_STAR__$_state_machine__35497__auto__ = function(state_36735){
switch(arguments.length){
case 0:
return cljs$core$async$pipeline_STAR__$_state_machine__35497__auto____0.call(this);
case 1:
return cljs$core$async$pipeline_STAR__$_state_machine__35497__auto____1.call(this,state_36735);
}
throw(new Error('Invalid arity: ' + arguments.length));
};
cljs$core$async$pipeline_STAR__$_state_machine__35497__auto__.cljs$core$IFn$_invoke$arity$0 = cljs$core$async$pipeline_STAR__$_state_machine__35497__auto____0;
cljs$core$async$pipeline_STAR__$_state_machine__35497__auto__.cljs$core$IFn$_invoke$arity$1 = cljs$core$async$pipeline_STAR__$_state_machine__35497__auto____1;
return cljs$core$async$pipeline_STAR__$_state_machine__35497__auto__;
})()
})();
var state__35927__auto__ = (function (){var statearr_36781 = f__35926__auto__();
(statearr_36781[(6)] = c__35925__auto__);

return statearr_36781;
})();
return cljs.core.async.impl.ioc_helpers.run_state_machine_wrapped(state__35927__auto__);
}));

return c__35925__auto__;
});
/**
 * Takes elements from the from channel and supplies them to the to
 *   channel, subject to the async function af, with parallelism n. af
 *   must be a function of two arguments, the first an input value and
 *   the second a channel on which to place the result(s). The
 *   presumption is that af will return immediately, having launched some
 *   asynchronous operation whose completion/callback will put results on
 *   the channel, then close! it. Outputs will be returned in order
 *   relative to the inputs. By default, the to channel will be closed
 *   when the from channel closes, but can be determined by the close?
 *   parameter. Will stop consuming the from channel if the to channel
 *   closes. See also pipeline, pipeline-blocking.
 */
cljs.core.async.pipeline_async = (function cljs$core$async$pipeline_async(var_args){
var G__36784 = arguments.length;
switch (G__36784) {
case 4:
return cljs.core.async.pipeline_async.cljs$core$IFn$_invoke$arity$4((arguments[(0)]),(arguments[(1)]),(arguments[(2)]),(arguments[(3)]));

break;
case 5:
return cljs.core.async.pipeline_async.cljs$core$IFn$_invoke$arity$5((arguments[(0)]),(arguments[(1)]),(arguments[(2)]),(arguments[(3)]),(arguments[(4)]));

break;
default:
throw (new Error(["Invalid arity: ",cljs.core.str.cljs$core$IFn$_invoke$arity$1(arguments.length)].join('')));

}
});

(cljs.core.async.pipeline_async.cljs$core$IFn$_invoke$arity$4 = (function (n,to,af,from){
return cljs.core.async.pipeline_async.cljs$core$IFn$_invoke$arity$5(n,to,af,from,true);
}));

(cljs.core.async.pipeline_async.cljs$core$IFn$_invoke$arity$5 = (function (n,to,af,from,close_QMARK_){
return cljs.core.async.pipeline_STAR_(n,to,af,from,close_QMARK_,null,new cljs.core.Keyword(null,"async","async",1050769601));
}));

(cljs.core.async.pipeline_async.cljs$lang$maxFixedArity = 5);

/**
 * Takes elements from the from channel and supplies them to the to
 *   channel, subject to the transducer xf, with parallelism n. Because
 *   it is parallel, the transducer will be applied independently to each
 *   element, not across elements, and may produce zero or more outputs
 *   per input.  Outputs will be returned in order relative to the
 *   inputs. By default, the to channel will be closed when the from
 *   channel closes, but can be determined by the close?  parameter. Will
 *   stop consuming the from channel if the to channel closes.
 * 
 *   Note this is supplied for API compatibility with the Clojure version.
 *   Values of N > 1 will not result in actual concurrency in a
 *   single-threaded runtime.
 */
cljs.core.async.pipeline = (function cljs$core$async$pipeline(var_args){
var G__36790 = arguments.length;
switch (G__36790) {
case 4:
return cljs.core.async.pipeline.cljs$core$IFn$_invoke$arity$4((arguments[(0)]),(arguments[(1)]),(arguments[(2)]),(arguments[(3)]));

break;
case 5:
return cljs.core.async.pipeline.cljs$core$IFn$_invoke$arity$5((arguments[(0)]),(arguments[(1)]),(arguments[(2)]),(arguments[(3)]),(arguments[(4)]));

break;
case 6:
return cljs.core.async.pipeline.cljs$core$IFn$_invoke$arity$6((arguments[(0)]),(arguments[(1)]),(arguments[(2)]),(arguments[(3)]),(arguments[(4)]),(arguments[(5)]));

break;
default:
throw (new Error(["Invalid arity: ",cljs.core.str.cljs$core$IFn$_invoke$arity$1(arguments.length)].join('')));

}
});

(cljs.core.async.pipeline.cljs$core$IFn$_invoke$arity$4 = (function (n,to,xf,from){
return cljs.core.async.pipeline.cljs$core$IFn$_invoke$arity$5(n,to,xf,from,true);
}));

(cljs.core.async.pipeline.cljs$core$IFn$_invoke$arity$5 = (function (n,to,xf,from,close_QMARK_){
return cljs.core.async.pipeline.cljs$core$IFn$_invoke$arity$6(n,to,xf,from,close_QMARK_,null);
}));

(cljs.core.async.pipeline.cljs$core$IFn$_invoke$arity$6 = (function (n,to,xf,from,close_QMARK_,ex_handler){
return cljs.core.async.pipeline_STAR_(n,to,xf,from,close_QMARK_,ex_handler,new cljs.core.Keyword(null,"compute","compute",1555393130));
}));

(cljs.core.async.pipeline.cljs$lang$maxFixedArity = 6);

/**
 * Takes a predicate and a source channel and returns a vector of two
 *   channels, the first of which will contain the values for which the
 *   predicate returned true, the second those for which it returned
 *   false.
 * 
 *   The out channels will be unbuffered by default, or two buf-or-ns can
 *   be supplied. The channels will close after the source channel has
 *   closed.
 */
cljs.core.async.split = (function cljs$core$async$split(var_args){
var G__36798 = arguments.length;
switch (G__36798) {
case 2:
return cljs.core.async.split.cljs$core$IFn$_invoke$arity$2((arguments[(0)]),(arguments[(1)]));

break;
case 4:
return cljs.core.async.split.cljs$core$IFn$_invoke$arity$4((arguments[(0)]),(arguments[(1)]),(arguments[(2)]),(arguments[(3)]));

break;
default:
throw (new Error(["Invalid arity: ",cljs.core.str.cljs$core$IFn$_invoke$arity$1(arguments.length)].join('')));

}
});

(cljs.core.async.split.cljs$core$IFn$_invoke$arity$2 = (function (p,ch){
return cljs.core.async.split.cljs$core$IFn$_invoke$arity$4(p,ch,null,null);
}));

(cljs.core.async.split.cljs$core$IFn$_invoke$arity$4 = (function (p,ch,t_buf_or_n,f_buf_or_n){
var tc = cljs.core.async.chan.cljs$core$IFn$_invoke$arity$1(t_buf_or_n);
var fc = cljs.core.async.chan.cljs$core$IFn$_invoke$arity$1(f_buf_or_n);
var c__35925__auto___39819 = cljs.core.async.chan.cljs$core$IFn$_invoke$arity$1((1));
cljs.core.async.impl.dispatch.run((function (){
var f__35926__auto__ = (function (){var switch__35496__auto__ = (function (state_36828){
var state_val_36829 = (state_36828[(1)]);
if((state_val_36829 === (7))){
var inst_36824 = (state_36828[(2)]);
var state_36828__$1 = state_36828;
var statearr_36839_39820 = state_36828__$1;
(statearr_36839_39820[(2)] = inst_36824);

(statearr_36839_39820[(1)] = (3));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_36829 === (1))){
var state_36828__$1 = state_36828;
var statearr_36840_39821 = state_36828__$1;
(statearr_36840_39821[(2)] = null);

(statearr_36840_39821[(1)] = (2));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_36829 === (4))){
var inst_36804 = (state_36828[(7)]);
var inst_36804__$1 = (state_36828[(2)]);
var inst_36806 = (inst_36804__$1 == null);
var state_36828__$1 = (function (){var statearr_36841 = state_36828;
(statearr_36841[(7)] = inst_36804__$1);

return statearr_36841;
})();
if(cljs.core.truth_(inst_36806)){
var statearr_36842_39823 = state_36828__$1;
(statearr_36842_39823[(1)] = (5));

} else {
var statearr_36844_39824 = state_36828__$1;
(statearr_36844_39824[(1)] = (6));

}

return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_36829 === (13))){
var state_36828__$1 = state_36828;
var statearr_36845_39825 = state_36828__$1;
(statearr_36845_39825[(2)] = null);

(statearr_36845_39825[(1)] = (14));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_36829 === (6))){
var inst_36804 = (state_36828[(7)]);
var inst_36811 = (p.cljs$core$IFn$_invoke$arity$1 ? p.cljs$core$IFn$_invoke$arity$1(inst_36804) : p.call(null, inst_36804));
var state_36828__$1 = state_36828;
if(cljs.core.truth_(inst_36811)){
var statearr_36846_39827 = state_36828__$1;
(statearr_36846_39827[(1)] = (9));

} else {
var statearr_36847_39832 = state_36828__$1;
(statearr_36847_39832[(1)] = (10));

}

return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_36829 === (3))){
var inst_36826 = (state_36828[(2)]);
var state_36828__$1 = state_36828;
return cljs.core.async.impl.ioc_helpers.return_chan(state_36828__$1,inst_36826);
} else {
if((state_val_36829 === (12))){
var state_36828__$1 = state_36828;
var statearr_36852_39843 = state_36828__$1;
(statearr_36852_39843[(2)] = null);

(statearr_36852_39843[(1)] = (2));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_36829 === (2))){
var state_36828__$1 = state_36828;
return cljs.core.async.impl.ioc_helpers.take_BANG_(state_36828__$1,(4),ch);
} else {
if((state_val_36829 === (11))){
var inst_36804 = (state_36828[(7)]);
var inst_36815 = (state_36828[(2)]);
var state_36828__$1 = state_36828;
return cljs.core.async.impl.ioc_helpers.put_BANG_(state_36828__$1,(8),inst_36815,inst_36804);
} else {
if((state_val_36829 === (9))){
var state_36828__$1 = state_36828;
var statearr_36853_39848 = state_36828__$1;
(statearr_36853_39848[(2)] = tc);

(statearr_36853_39848[(1)] = (11));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_36829 === (5))){
var inst_36808 = cljs.core.async.close_BANG_(tc);
var inst_36809 = cljs.core.async.close_BANG_(fc);
var state_36828__$1 = (function (){var statearr_36854 = state_36828;
(statearr_36854[(8)] = inst_36808);

return statearr_36854;
})();
var statearr_36855_39851 = state_36828__$1;
(statearr_36855_39851[(2)] = inst_36809);

(statearr_36855_39851[(1)] = (7));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_36829 === (14))){
var inst_36822 = (state_36828[(2)]);
var state_36828__$1 = state_36828;
var statearr_36856_39852 = state_36828__$1;
(statearr_36856_39852[(2)] = inst_36822);

(statearr_36856_39852[(1)] = (7));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_36829 === (10))){
var state_36828__$1 = state_36828;
var statearr_36857_39853 = state_36828__$1;
(statearr_36857_39853[(2)] = fc);

(statearr_36857_39853[(1)] = (11));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_36829 === (8))){
var inst_36817 = (state_36828[(2)]);
var state_36828__$1 = state_36828;
if(cljs.core.truth_(inst_36817)){
var statearr_36858_39854 = state_36828__$1;
(statearr_36858_39854[(1)] = (12));

} else {
var statearr_36859_39855 = state_36828__$1;
(statearr_36859_39855[(1)] = (13));

}

return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
return null;
}
}
}
}
}
}
}
}
}
}
}
}
}
}
});
return (function() {
var cljs$core$async$state_machine__35497__auto__ = null;
var cljs$core$async$state_machine__35497__auto____0 = (function (){
var statearr_36860 = [null,null,null,null,null,null,null,null,null];
(statearr_36860[(0)] = cljs$core$async$state_machine__35497__auto__);

(statearr_36860[(1)] = (1));

return statearr_36860;
});
var cljs$core$async$state_machine__35497__auto____1 = (function (state_36828){
while(true){
var ret_value__35499__auto__ = (function (){try{while(true){
var result__35500__auto__ = switch__35496__auto__(state_36828);
if(cljs.core.keyword_identical_QMARK_(result__35500__auto__,new cljs.core.Keyword(null,"recur","recur",-437573268))){
continue;
} else {
return result__35500__auto__;
}
break;
}
}catch (e36862){var ex__35501__auto__ = e36862;
var statearr_36863_39856 = state_36828;
(statearr_36863_39856[(2)] = ex__35501__auto__);


if(cljs.core.seq((state_36828[(4)]))){
var statearr_36864_39857 = state_36828;
(statearr_36864_39857[(1)] = cljs.core.first((state_36828[(4)])));

} else {
throw ex__35501__auto__;
}

return new cljs.core.Keyword(null,"recur","recur",-437573268);
}})();
if(cljs.core.keyword_identical_QMARK_(ret_value__35499__auto__,new cljs.core.Keyword(null,"recur","recur",-437573268))){
var G__39861 = state_36828;
state_36828 = G__39861;
continue;
} else {
return ret_value__35499__auto__;
}
break;
}
});
cljs$core$async$state_machine__35497__auto__ = function(state_36828){
switch(arguments.length){
case 0:
return cljs$core$async$state_machine__35497__auto____0.call(this);
case 1:
return cljs$core$async$state_machine__35497__auto____1.call(this,state_36828);
}
throw(new Error('Invalid arity: ' + arguments.length));
};
cljs$core$async$state_machine__35497__auto__.cljs$core$IFn$_invoke$arity$0 = cljs$core$async$state_machine__35497__auto____0;
cljs$core$async$state_machine__35497__auto__.cljs$core$IFn$_invoke$arity$1 = cljs$core$async$state_machine__35497__auto____1;
return cljs$core$async$state_machine__35497__auto__;
})()
})();
var state__35927__auto__ = (function (){var statearr_36865 = f__35926__auto__();
(statearr_36865[(6)] = c__35925__auto___39819);

return statearr_36865;
})();
return cljs.core.async.impl.ioc_helpers.run_state_machine_wrapped(state__35927__auto__);
}));


return new cljs.core.PersistentVector(null, 2, 5, cljs.core.PersistentVector.EMPTY_NODE, [tc,fc], null);
}));

(cljs.core.async.split.cljs$lang$maxFixedArity = 4);

/**
 * f should be a function of 2 arguments. Returns a channel containing
 *   the single result of applying f to init and the first item from the
 *   channel, then applying f to that result and the 2nd item, etc. If
 *   the channel closes without yielding items, returns init and f is not
 *   called. ch must close before reduce produces a result.
 */
cljs.core.async.reduce = (function cljs$core$async$reduce(f,init,ch){
var c__35925__auto__ = cljs.core.async.chan.cljs$core$IFn$_invoke$arity$1((1));
cljs.core.async.impl.dispatch.run((function (){
var f__35926__auto__ = (function (){var switch__35496__auto__ = (function (state_36889){
var state_val_36890 = (state_36889[(1)]);
if((state_val_36890 === (7))){
var inst_36885 = (state_36889[(2)]);
var state_36889__$1 = state_36889;
var statearr_36891_39874 = state_36889__$1;
(statearr_36891_39874[(2)] = inst_36885);

(statearr_36891_39874[(1)] = (3));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_36890 === (1))){
var inst_36868 = init;
var inst_36869 = inst_36868;
var state_36889__$1 = (function (){var statearr_36892 = state_36889;
(statearr_36892[(7)] = inst_36869);

return statearr_36892;
})();
var statearr_36893_39875 = state_36889__$1;
(statearr_36893_39875[(2)] = null);

(statearr_36893_39875[(1)] = (2));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_36890 === (4))){
var inst_36872 = (state_36889[(8)]);
var inst_36872__$1 = (state_36889[(2)]);
var inst_36873 = (inst_36872__$1 == null);
var state_36889__$1 = (function (){var statearr_36894 = state_36889;
(statearr_36894[(8)] = inst_36872__$1);

return statearr_36894;
})();
if(cljs.core.truth_(inst_36873)){
var statearr_36895_39876 = state_36889__$1;
(statearr_36895_39876[(1)] = (5));

} else {
var statearr_36896_39877 = state_36889__$1;
(statearr_36896_39877[(1)] = (6));

}

return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_36890 === (6))){
var inst_36869 = (state_36889[(7)]);
var inst_36872 = (state_36889[(8)]);
var inst_36876 = (state_36889[(9)]);
var inst_36876__$1 = (f.cljs$core$IFn$_invoke$arity$2 ? f.cljs$core$IFn$_invoke$arity$2(inst_36869,inst_36872) : f.call(null, inst_36869,inst_36872));
var inst_36877 = cljs.core.reduced_QMARK_(inst_36876__$1);
var state_36889__$1 = (function (){var statearr_36897 = state_36889;
(statearr_36897[(9)] = inst_36876__$1);

return statearr_36897;
})();
if(inst_36877){
var statearr_36900_39878 = state_36889__$1;
(statearr_36900_39878[(1)] = (8));

} else {
var statearr_36901_39879 = state_36889__$1;
(statearr_36901_39879[(1)] = (9));

}

return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_36890 === (3))){
var inst_36887 = (state_36889[(2)]);
var state_36889__$1 = state_36889;
return cljs.core.async.impl.ioc_helpers.return_chan(state_36889__$1,inst_36887);
} else {
if((state_val_36890 === (2))){
var state_36889__$1 = state_36889;
return cljs.core.async.impl.ioc_helpers.take_BANG_(state_36889__$1,(4),ch);
} else {
if((state_val_36890 === (9))){
var inst_36876 = (state_36889[(9)]);
var inst_36869 = inst_36876;
var state_36889__$1 = (function (){var statearr_36902 = state_36889;
(statearr_36902[(7)] = inst_36869);

return statearr_36902;
})();
var statearr_36905_39884 = state_36889__$1;
(statearr_36905_39884[(2)] = null);

(statearr_36905_39884[(1)] = (2));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_36890 === (5))){
var inst_36869 = (state_36889[(7)]);
var state_36889__$1 = state_36889;
var statearr_36906_39885 = state_36889__$1;
(statearr_36906_39885[(2)] = inst_36869);

(statearr_36906_39885[(1)] = (7));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_36890 === (10))){
var inst_36883 = (state_36889[(2)]);
var state_36889__$1 = state_36889;
var statearr_36907_39886 = state_36889__$1;
(statearr_36907_39886[(2)] = inst_36883);

(statearr_36907_39886[(1)] = (7));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_36890 === (8))){
var inst_36876 = (state_36889[(9)]);
var inst_36879 = cljs.core.deref(inst_36876);
var state_36889__$1 = state_36889;
var statearr_36908_39887 = state_36889__$1;
(statearr_36908_39887[(2)] = inst_36879);

(statearr_36908_39887[(1)] = (10));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
return null;
}
}
}
}
}
}
}
}
}
}
});
return (function() {
var cljs$core$async$reduce_$_state_machine__35497__auto__ = null;
var cljs$core$async$reduce_$_state_machine__35497__auto____0 = (function (){
var statearr_36909 = [null,null,null,null,null,null,null,null,null,null];
(statearr_36909[(0)] = cljs$core$async$reduce_$_state_machine__35497__auto__);

(statearr_36909[(1)] = (1));

return statearr_36909;
});
var cljs$core$async$reduce_$_state_machine__35497__auto____1 = (function (state_36889){
while(true){
var ret_value__35499__auto__ = (function (){try{while(true){
var result__35500__auto__ = switch__35496__auto__(state_36889);
if(cljs.core.keyword_identical_QMARK_(result__35500__auto__,new cljs.core.Keyword(null,"recur","recur",-437573268))){
continue;
} else {
return result__35500__auto__;
}
break;
}
}catch (e36910){var ex__35501__auto__ = e36910;
var statearr_36911_39892 = state_36889;
(statearr_36911_39892[(2)] = ex__35501__auto__);


if(cljs.core.seq((state_36889[(4)]))){
var statearr_36912_39893 = state_36889;
(statearr_36912_39893[(1)] = cljs.core.first((state_36889[(4)])));

} else {
throw ex__35501__auto__;
}

return new cljs.core.Keyword(null,"recur","recur",-437573268);
}})();
if(cljs.core.keyword_identical_QMARK_(ret_value__35499__auto__,new cljs.core.Keyword(null,"recur","recur",-437573268))){
var G__39894 = state_36889;
state_36889 = G__39894;
continue;
} else {
return ret_value__35499__auto__;
}
break;
}
});
cljs$core$async$reduce_$_state_machine__35497__auto__ = function(state_36889){
switch(arguments.length){
case 0:
return cljs$core$async$reduce_$_state_machine__35497__auto____0.call(this);
case 1:
return cljs$core$async$reduce_$_state_machine__35497__auto____1.call(this,state_36889);
}
throw(new Error('Invalid arity: ' + arguments.length));
};
cljs$core$async$reduce_$_state_machine__35497__auto__.cljs$core$IFn$_invoke$arity$0 = cljs$core$async$reduce_$_state_machine__35497__auto____0;
cljs$core$async$reduce_$_state_machine__35497__auto__.cljs$core$IFn$_invoke$arity$1 = cljs$core$async$reduce_$_state_machine__35497__auto____1;
return cljs$core$async$reduce_$_state_machine__35497__auto__;
})()
})();
var state__35927__auto__ = (function (){var statearr_36914 = f__35926__auto__();
(statearr_36914[(6)] = c__35925__auto__);

return statearr_36914;
})();
return cljs.core.async.impl.ioc_helpers.run_state_machine_wrapped(state__35927__auto__);
}));

return c__35925__auto__;
});
/**
 * async/reduces a channel with a transformation (xform f).
 *   Returns a channel containing the result.  ch must close before
 *   transduce produces a result.
 */
cljs.core.async.transduce = (function cljs$core$async$transduce(xform,f,init,ch){
var f__$1 = (xform.cljs$core$IFn$_invoke$arity$1 ? xform.cljs$core$IFn$_invoke$arity$1(f) : xform.call(null, f));
var c__35925__auto__ = cljs.core.async.chan.cljs$core$IFn$_invoke$arity$1((1));
cljs.core.async.impl.dispatch.run((function (){
var f__35926__auto__ = (function (){var switch__35496__auto__ = (function (state_36923){
var state_val_36924 = (state_36923[(1)]);
if((state_val_36924 === (1))){
var inst_36918 = cljs.core.async.reduce(f__$1,init,ch);
var state_36923__$1 = state_36923;
return cljs.core.async.impl.ioc_helpers.take_BANG_(state_36923__$1,(2),inst_36918);
} else {
if((state_val_36924 === (2))){
var inst_36920 = (state_36923[(2)]);
var inst_36921 = (f__$1.cljs$core$IFn$_invoke$arity$1 ? f__$1.cljs$core$IFn$_invoke$arity$1(inst_36920) : f__$1.call(null, inst_36920));
var state_36923__$1 = state_36923;
return cljs.core.async.impl.ioc_helpers.return_chan(state_36923__$1,inst_36921);
} else {
return null;
}
}
});
return (function() {
var cljs$core$async$transduce_$_state_machine__35497__auto__ = null;
var cljs$core$async$transduce_$_state_machine__35497__auto____0 = (function (){
var statearr_36925 = [null,null,null,null,null,null,null];
(statearr_36925[(0)] = cljs$core$async$transduce_$_state_machine__35497__auto__);

(statearr_36925[(1)] = (1));

return statearr_36925;
});
var cljs$core$async$transduce_$_state_machine__35497__auto____1 = (function (state_36923){
while(true){
var ret_value__35499__auto__ = (function (){try{while(true){
var result__35500__auto__ = switch__35496__auto__(state_36923);
if(cljs.core.keyword_identical_QMARK_(result__35500__auto__,new cljs.core.Keyword(null,"recur","recur",-437573268))){
continue;
} else {
return result__35500__auto__;
}
break;
}
}catch (e36926){var ex__35501__auto__ = e36926;
var statearr_36927_39895 = state_36923;
(statearr_36927_39895[(2)] = ex__35501__auto__);


if(cljs.core.seq((state_36923[(4)]))){
var statearr_36928_39896 = state_36923;
(statearr_36928_39896[(1)] = cljs.core.first((state_36923[(4)])));

} else {
throw ex__35501__auto__;
}

return new cljs.core.Keyword(null,"recur","recur",-437573268);
}})();
if(cljs.core.keyword_identical_QMARK_(ret_value__35499__auto__,new cljs.core.Keyword(null,"recur","recur",-437573268))){
var G__39897 = state_36923;
state_36923 = G__39897;
continue;
} else {
return ret_value__35499__auto__;
}
break;
}
});
cljs$core$async$transduce_$_state_machine__35497__auto__ = function(state_36923){
switch(arguments.length){
case 0:
return cljs$core$async$transduce_$_state_machine__35497__auto____0.call(this);
case 1:
return cljs$core$async$transduce_$_state_machine__35497__auto____1.call(this,state_36923);
}
throw(new Error('Invalid arity: ' + arguments.length));
};
cljs$core$async$transduce_$_state_machine__35497__auto__.cljs$core$IFn$_invoke$arity$0 = cljs$core$async$transduce_$_state_machine__35497__auto____0;
cljs$core$async$transduce_$_state_machine__35497__auto__.cljs$core$IFn$_invoke$arity$1 = cljs$core$async$transduce_$_state_machine__35497__auto____1;
return cljs$core$async$transduce_$_state_machine__35497__auto__;
})()
})();
var state__35927__auto__ = (function (){var statearr_36930 = f__35926__auto__();
(statearr_36930[(6)] = c__35925__auto__);

return statearr_36930;
})();
return cljs.core.async.impl.ioc_helpers.run_state_machine_wrapped(state__35927__auto__);
}));

return c__35925__auto__;
});
/**
 * Puts the contents of coll into the supplied channel.
 * 
 *   By default the channel will be closed after the items are copied,
 *   but can be determined by the close? parameter.
 * 
 *   Returns a channel which will close after the items are copied.
 */
cljs.core.async.onto_chan_BANG_ = (function cljs$core$async$onto_chan_BANG_(var_args){
var G__36943 = arguments.length;
switch (G__36943) {
case 2:
return cljs.core.async.onto_chan_BANG_.cljs$core$IFn$_invoke$arity$2((arguments[(0)]),(arguments[(1)]));

break;
case 3:
return cljs.core.async.onto_chan_BANG_.cljs$core$IFn$_invoke$arity$3((arguments[(0)]),(arguments[(1)]),(arguments[(2)]));

break;
default:
throw (new Error(["Invalid arity: ",cljs.core.str.cljs$core$IFn$_invoke$arity$1(arguments.length)].join('')));

}
});

(cljs.core.async.onto_chan_BANG_.cljs$core$IFn$_invoke$arity$2 = (function (ch,coll){
return cljs.core.async.onto_chan_BANG_.cljs$core$IFn$_invoke$arity$3(ch,coll,true);
}));

(cljs.core.async.onto_chan_BANG_.cljs$core$IFn$_invoke$arity$3 = (function (ch,coll,close_QMARK_){
var c__35925__auto__ = cljs.core.async.chan.cljs$core$IFn$_invoke$arity$1((1));
cljs.core.async.impl.dispatch.run((function (){
var f__35926__auto__ = (function (){var switch__35496__auto__ = (function (state_36970){
var state_val_36971 = (state_36970[(1)]);
if((state_val_36971 === (7))){
var inst_36950 = (state_36970[(2)]);
var state_36970__$1 = state_36970;
var statearr_36972_39903 = state_36970__$1;
(statearr_36972_39903[(2)] = inst_36950);

(statearr_36972_39903[(1)] = (6));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_36971 === (1))){
var inst_36944 = cljs.core.seq(coll);
var inst_36945 = inst_36944;
var state_36970__$1 = (function (){var statearr_36975 = state_36970;
(statearr_36975[(7)] = inst_36945);

return statearr_36975;
})();
var statearr_36976_39904 = state_36970__$1;
(statearr_36976_39904[(2)] = null);

(statearr_36976_39904[(1)] = (2));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_36971 === (4))){
var inst_36945 = (state_36970[(7)]);
var inst_36948 = cljs.core.first(inst_36945);
var state_36970__$1 = state_36970;
return cljs.core.async.impl.ioc_helpers.put_BANG_(state_36970__$1,(7),ch,inst_36948);
} else {
if((state_val_36971 === (13))){
var inst_36962 = (state_36970[(2)]);
var state_36970__$1 = state_36970;
var statearr_36977_39905 = state_36970__$1;
(statearr_36977_39905[(2)] = inst_36962);

(statearr_36977_39905[(1)] = (10));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_36971 === (6))){
var inst_36953 = (state_36970[(2)]);
var state_36970__$1 = state_36970;
if(cljs.core.truth_(inst_36953)){
var statearr_36978_39906 = state_36970__$1;
(statearr_36978_39906[(1)] = (8));

} else {
var statearr_36979_39907 = state_36970__$1;
(statearr_36979_39907[(1)] = (9));

}

return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_36971 === (3))){
var inst_36966 = (state_36970[(2)]);
var state_36970__$1 = state_36970;
return cljs.core.async.impl.ioc_helpers.return_chan(state_36970__$1,inst_36966);
} else {
if((state_val_36971 === (12))){
var state_36970__$1 = state_36970;
var statearr_36980_39908 = state_36970__$1;
(statearr_36980_39908[(2)] = null);

(statearr_36980_39908[(1)] = (13));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_36971 === (2))){
var inst_36945 = (state_36970[(7)]);
var state_36970__$1 = state_36970;
if(cljs.core.truth_(inst_36945)){
var statearr_36981_39910 = state_36970__$1;
(statearr_36981_39910[(1)] = (4));

} else {
var statearr_36982_39911 = state_36970__$1;
(statearr_36982_39911[(1)] = (5));

}

return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_36971 === (11))){
var inst_36959 = cljs.core.async.close_BANG_(ch);
var state_36970__$1 = state_36970;
var statearr_36988_39918 = state_36970__$1;
(statearr_36988_39918[(2)] = inst_36959);

(statearr_36988_39918[(1)] = (13));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_36971 === (9))){
var state_36970__$1 = state_36970;
if(cljs.core.truth_(close_QMARK_)){
var statearr_36990_39919 = state_36970__$1;
(statearr_36990_39919[(1)] = (11));

} else {
var statearr_36991_39920 = state_36970__$1;
(statearr_36991_39920[(1)] = (12));

}

return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_36971 === (5))){
var inst_36945 = (state_36970[(7)]);
var state_36970__$1 = state_36970;
var statearr_36992_39921 = state_36970__$1;
(statearr_36992_39921[(2)] = inst_36945);

(statearr_36992_39921[(1)] = (6));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_36971 === (10))){
var inst_36964 = (state_36970[(2)]);
var state_36970__$1 = state_36970;
var statearr_36993_39922 = state_36970__$1;
(statearr_36993_39922[(2)] = inst_36964);

(statearr_36993_39922[(1)] = (3));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_36971 === (8))){
var inst_36945 = (state_36970[(7)]);
var inst_36955 = cljs.core.next(inst_36945);
var inst_36945__$1 = inst_36955;
var state_36970__$1 = (function (){var statearr_36994 = state_36970;
(statearr_36994[(7)] = inst_36945__$1);

return statearr_36994;
})();
var statearr_36997_39923 = state_36970__$1;
(statearr_36997_39923[(2)] = null);

(statearr_36997_39923[(1)] = (2));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
return null;
}
}
}
}
}
}
}
}
}
}
}
}
}
});
return (function() {
var cljs$core$async$state_machine__35497__auto__ = null;
var cljs$core$async$state_machine__35497__auto____0 = (function (){
var statearr_37000 = [null,null,null,null,null,null,null,null];
(statearr_37000[(0)] = cljs$core$async$state_machine__35497__auto__);

(statearr_37000[(1)] = (1));

return statearr_37000;
});
var cljs$core$async$state_machine__35497__auto____1 = (function (state_36970){
while(true){
var ret_value__35499__auto__ = (function (){try{while(true){
var result__35500__auto__ = switch__35496__auto__(state_36970);
if(cljs.core.keyword_identical_QMARK_(result__35500__auto__,new cljs.core.Keyword(null,"recur","recur",-437573268))){
continue;
} else {
return result__35500__auto__;
}
break;
}
}catch (e37005){var ex__35501__auto__ = e37005;
var statearr_37006_39924 = state_36970;
(statearr_37006_39924[(2)] = ex__35501__auto__);


if(cljs.core.seq((state_36970[(4)]))){
var statearr_37008_39925 = state_36970;
(statearr_37008_39925[(1)] = cljs.core.first((state_36970[(4)])));

} else {
throw ex__35501__auto__;
}

return new cljs.core.Keyword(null,"recur","recur",-437573268);
}})();
if(cljs.core.keyword_identical_QMARK_(ret_value__35499__auto__,new cljs.core.Keyword(null,"recur","recur",-437573268))){
var G__39926 = state_36970;
state_36970 = G__39926;
continue;
} else {
return ret_value__35499__auto__;
}
break;
}
});
cljs$core$async$state_machine__35497__auto__ = function(state_36970){
switch(arguments.length){
case 0:
return cljs$core$async$state_machine__35497__auto____0.call(this);
case 1:
return cljs$core$async$state_machine__35497__auto____1.call(this,state_36970);
}
throw(new Error('Invalid arity: ' + arguments.length));
};
cljs$core$async$state_machine__35497__auto__.cljs$core$IFn$_invoke$arity$0 = cljs$core$async$state_machine__35497__auto____0;
cljs$core$async$state_machine__35497__auto__.cljs$core$IFn$_invoke$arity$1 = cljs$core$async$state_machine__35497__auto____1;
return cljs$core$async$state_machine__35497__auto__;
})()
})();
var state__35927__auto__ = (function (){var statearr_37034 = f__35926__auto__();
(statearr_37034[(6)] = c__35925__auto__);

return statearr_37034;
})();
return cljs.core.async.impl.ioc_helpers.run_state_machine_wrapped(state__35927__auto__);
}));

return c__35925__auto__;
}));

(cljs.core.async.onto_chan_BANG_.cljs$lang$maxFixedArity = 3);

/**
 * Creates and returns a channel which contains the contents of coll,
 *   closing when exhausted.
 */
cljs.core.async.to_chan_BANG_ = (function cljs$core$async$to_chan_BANG_(coll){
var ch = cljs.core.async.chan.cljs$core$IFn$_invoke$arity$1(cljs.core.bounded_count((100),coll));
cljs.core.async.onto_chan_BANG_.cljs$core$IFn$_invoke$arity$2(ch,coll);

return ch;
});
/**
 * Deprecated - use onto-chan!
 */
cljs.core.async.onto_chan = (function cljs$core$async$onto_chan(var_args){
var G__37039 = arguments.length;
switch (G__37039) {
case 2:
return cljs.core.async.onto_chan.cljs$core$IFn$_invoke$arity$2((arguments[(0)]),(arguments[(1)]));

break;
case 3:
return cljs.core.async.onto_chan.cljs$core$IFn$_invoke$arity$3((arguments[(0)]),(arguments[(1)]),(arguments[(2)]));

break;
default:
throw (new Error(["Invalid arity: ",cljs.core.str.cljs$core$IFn$_invoke$arity$1(arguments.length)].join('')));

}
});

(cljs.core.async.onto_chan.cljs$core$IFn$_invoke$arity$2 = (function (ch,coll){
return cljs.core.async.onto_chan_BANG_.cljs$core$IFn$_invoke$arity$3(ch,coll,true);
}));

(cljs.core.async.onto_chan.cljs$core$IFn$_invoke$arity$3 = (function (ch,coll,close_QMARK_){
return cljs.core.async.onto_chan_BANG_.cljs$core$IFn$_invoke$arity$3(ch,coll,close_QMARK_);
}));

(cljs.core.async.onto_chan.cljs$lang$maxFixedArity = 3);

/**
 * Deprecated - use to-chan!
 */
cljs.core.async.to_chan = (function cljs$core$async$to_chan(coll){
return cljs.core.async.to_chan_BANG_(coll);
});

/**
 * @interface
 */
cljs.core.async.Mux = function(){};

var cljs$core$async$Mux$muxch_STAR_$dyn_39933 = (function (_){
var x__5350__auto__ = (((_ == null))?null:_);
var m__5351__auto__ = (cljs.core.async.muxch_STAR_[goog.typeOf(x__5350__auto__)]);
if((!((m__5351__auto__ == null)))){
return (m__5351__auto__.cljs$core$IFn$_invoke$arity$1 ? m__5351__auto__.cljs$core$IFn$_invoke$arity$1(_) : m__5351__auto__.call(null, _));
} else {
var m__5349__auto__ = (cljs.core.async.muxch_STAR_["_"]);
if((!((m__5349__auto__ == null)))){
return (m__5349__auto__.cljs$core$IFn$_invoke$arity$1 ? m__5349__auto__.cljs$core$IFn$_invoke$arity$1(_) : m__5349__auto__.call(null, _));
} else {
throw cljs.core.missing_protocol("Mux.muxch*",_);
}
}
});
cljs.core.async.muxch_STAR_ = (function cljs$core$async$muxch_STAR_(_){
if((((!((_ == null)))) && ((!((_.cljs$core$async$Mux$muxch_STAR_$arity$1 == null)))))){
return _.cljs$core$async$Mux$muxch_STAR_$arity$1(_);
} else {
return cljs$core$async$Mux$muxch_STAR_$dyn_39933(_);
}
});


/**
 * @interface
 */
cljs.core.async.Mult = function(){};

var cljs$core$async$Mult$tap_STAR_$dyn_39938 = (function (m,ch,close_QMARK_){
var x__5350__auto__ = (((m == null))?null:m);
var m__5351__auto__ = (cljs.core.async.tap_STAR_[goog.typeOf(x__5350__auto__)]);
if((!((m__5351__auto__ == null)))){
return (m__5351__auto__.cljs$core$IFn$_invoke$arity$3 ? m__5351__auto__.cljs$core$IFn$_invoke$arity$3(m,ch,close_QMARK_) : m__5351__auto__.call(null, m,ch,close_QMARK_));
} else {
var m__5349__auto__ = (cljs.core.async.tap_STAR_["_"]);
if((!((m__5349__auto__ == null)))){
return (m__5349__auto__.cljs$core$IFn$_invoke$arity$3 ? m__5349__auto__.cljs$core$IFn$_invoke$arity$3(m,ch,close_QMARK_) : m__5349__auto__.call(null, m,ch,close_QMARK_));
} else {
throw cljs.core.missing_protocol("Mult.tap*",m);
}
}
});
cljs.core.async.tap_STAR_ = (function cljs$core$async$tap_STAR_(m,ch,close_QMARK_){
if((((!((m == null)))) && ((!((m.cljs$core$async$Mult$tap_STAR_$arity$3 == null)))))){
return m.cljs$core$async$Mult$tap_STAR_$arity$3(m,ch,close_QMARK_);
} else {
return cljs$core$async$Mult$tap_STAR_$dyn_39938(m,ch,close_QMARK_);
}
});

var cljs$core$async$Mult$untap_STAR_$dyn_39939 = (function (m,ch){
var x__5350__auto__ = (((m == null))?null:m);
var m__5351__auto__ = (cljs.core.async.untap_STAR_[goog.typeOf(x__5350__auto__)]);
if((!((m__5351__auto__ == null)))){
return (m__5351__auto__.cljs$core$IFn$_invoke$arity$2 ? m__5351__auto__.cljs$core$IFn$_invoke$arity$2(m,ch) : m__5351__auto__.call(null, m,ch));
} else {
var m__5349__auto__ = (cljs.core.async.untap_STAR_["_"]);
if((!((m__5349__auto__ == null)))){
return (m__5349__auto__.cljs$core$IFn$_invoke$arity$2 ? m__5349__auto__.cljs$core$IFn$_invoke$arity$2(m,ch) : m__5349__auto__.call(null, m,ch));
} else {
throw cljs.core.missing_protocol("Mult.untap*",m);
}
}
});
cljs.core.async.untap_STAR_ = (function cljs$core$async$untap_STAR_(m,ch){
if((((!((m == null)))) && ((!((m.cljs$core$async$Mult$untap_STAR_$arity$2 == null)))))){
return m.cljs$core$async$Mult$untap_STAR_$arity$2(m,ch);
} else {
return cljs$core$async$Mult$untap_STAR_$dyn_39939(m,ch);
}
});

var cljs$core$async$Mult$untap_all_STAR_$dyn_39943 = (function (m){
var x__5350__auto__ = (((m == null))?null:m);
var m__5351__auto__ = (cljs.core.async.untap_all_STAR_[goog.typeOf(x__5350__auto__)]);
if((!((m__5351__auto__ == null)))){
return (m__5351__auto__.cljs$core$IFn$_invoke$arity$1 ? m__5351__auto__.cljs$core$IFn$_invoke$arity$1(m) : m__5351__auto__.call(null, m));
} else {
var m__5349__auto__ = (cljs.core.async.untap_all_STAR_["_"]);
if((!((m__5349__auto__ == null)))){
return (m__5349__auto__.cljs$core$IFn$_invoke$arity$1 ? m__5349__auto__.cljs$core$IFn$_invoke$arity$1(m) : m__5349__auto__.call(null, m));
} else {
throw cljs.core.missing_protocol("Mult.untap-all*",m);
}
}
});
cljs.core.async.untap_all_STAR_ = (function cljs$core$async$untap_all_STAR_(m){
if((((!((m == null)))) && ((!((m.cljs$core$async$Mult$untap_all_STAR_$arity$1 == null)))))){
return m.cljs$core$async$Mult$untap_all_STAR_$arity$1(m);
} else {
return cljs$core$async$Mult$untap_all_STAR_$dyn_39943(m);
}
});


/**
* @constructor
 * @implements {cljs.core.async.Mult}
 * @implements {cljs.core.IMeta}
 * @implements {cljs.core.async.Mux}
 * @implements {cljs.core.IWithMeta}
*/
cljs.core.async.t_cljs$core$async37067 = (function (ch,cs,meta37068){
this.ch = ch;
this.cs = cs;
this.meta37068 = meta37068;
this.cljs$lang$protocol_mask$partition0$ = 393216;
this.cljs$lang$protocol_mask$partition1$ = 0;
});
(cljs.core.async.t_cljs$core$async37067.prototype.cljs$core$IWithMeta$_with_meta$arity$2 = (function (_37069,meta37068__$1){
var self__ = this;
var _37069__$1 = this;
return (new cljs.core.async.t_cljs$core$async37067(self__.ch,self__.cs,meta37068__$1));
}));

(cljs.core.async.t_cljs$core$async37067.prototype.cljs$core$IMeta$_meta$arity$1 = (function (_37069){
var self__ = this;
var _37069__$1 = this;
return self__.meta37068;
}));

(cljs.core.async.t_cljs$core$async37067.prototype.cljs$core$async$Mux$ = cljs.core.PROTOCOL_SENTINEL);

(cljs.core.async.t_cljs$core$async37067.prototype.cljs$core$async$Mux$muxch_STAR_$arity$1 = (function (_){
var self__ = this;
var ___$1 = this;
return self__.ch;
}));

(cljs.core.async.t_cljs$core$async37067.prototype.cljs$core$async$Mult$ = cljs.core.PROTOCOL_SENTINEL);

(cljs.core.async.t_cljs$core$async37067.prototype.cljs$core$async$Mult$tap_STAR_$arity$3 = (function (_,ch__$1,close_QMARK_){
var self__ = this;
var ___$1 = this;
cljs.core.swap_BANG_.cljs$core$IFn$_invoke$arity$4(self__.cs,cljs.core.assoc,ch__$1,close_QMARK_);

return null;
}));

(cljs.core.async.t_cljs$core$async37067.prototype.cljs$core$async$Mult$untap_STAR_$arity$2 = (function (_,ch__$1){
var self__ = this;
var ___$1 = this;
cljs.core.swap_BANG_.cljs$core$IFn$_invoke$arity$3(self__.cs,cljs.core.dissoc,ch__$1);

return null;
}));

(cljs.core.async.t_cljs$core$async37067.prototype.cljs$core$async$Mult$untap_all_STAR_$arity$1 = (function (_){
var self__ = this;
var ___$1 = this;
cljs.core.reset_BANG_(self__.cs,cljs.core.PersistentArrayMap.EMPTY);

return null;
}));

(cljs.core.async.t_cljs$core$async37067.getBasis = (function (){
return new cljs.core.PersistentVector(null, 3, 5, cljs.core.PersistentVector.EMPTY_NODE, [new cljs.core.Symbol(null,"ch","ch",1085813622,null),new cljs.core.Symbol(null,"cs","cs",-117024463,null),new cljs.core.Symbol(null,"meta37068","meta37068",1139862911,null)], null);
}));

(cljs.core.async.t_cljs$core$async37067.cljs$lang$type = true);

(cljs.core.async.t_cljs$core$async37067.cljs$lang$ctorStr = "cljs.core.async/t_cljs$core$async37067");

(cljs.core.async.t_cljs$core$async37067.cljs$lang$ctorPrWriter = (function (this__5287__auto__,writer__5288__auto__,opt__5289__auto__){
return cljs.core._write(writer__5288__auto__,"cljs.core.async/t_cljs$core$async37067");
}));

/**
 * Positional factory function for cljs.core.async/t_cljs$core$async37067.
 */
cljs.core.async.__GT_t_cljs$core$async37067 = (function cljs$core$async$__GT_t_cljs$core$async37067(ch,cs,meta37068){
return (new cljs.core.async.t_cljs$core$async37067(ch,cs,meta37068));
});


/**
 * Creates and returns a mult(iple) of the supplied channel. Channels
 *   containing copies of the channel can be created with 'tap', and
 *   detached with 'untap'.
 * 
 *   Each item is distributed to all taps in parallel and synchronously,
 *   i.e. each tap must accept before the next item is distributed. Use
 *   buffering/windowing to prevent slow taps from holding up the mult.
 * 
 *   Items received when there are no taps get dropped.
 * 
 *   If a tap puts to a closed channel, it will be removed from the mult.
 */
cljs.core.async.mult = (function cljs$core$async$mult(ch){
var cs = cljs.core.atom.cljs$core$IFn$_invoke$arity$1(cljs.core.PersistentArrayMap.EMPTY);
var m = (new cljs.core.async.t_cljs$core$async37067(ch,cs,cljs.core.PersistentArrayMap.EMPTY));
var dchan = cljs.core.async.chan.cljs$core$IFn$_invoke$arity$1((1));
var dctr = cljs.core.atom.cljs$core$IFn$_invoke$arity$1(null);
var done = (function (_){
if((cljs.core.swap_BANG_.cljs$core$IFn$_invoke$arity$2(dctr,cljs.core.dec) === (0))){
return cljs.core.async.put_BANG_.cljs$core$IFn$_invoke$arity$2(dchan,true);
} else {
return null;
}
});
var c__35925__auto___39944 = cljs.core.async.chan.cljs$core$IFn$_invoke$arity$1((1));
cljs.core.async.impl.dispatch.run((function (){
var f__35926__auto__ = (function (){var switch__35496__auto__ = (function (state_37246){
var state_val_37247 = (state_37246[(1)]);
if((state_val_37247 === (7))){
var inst_37242 = (state_37246[(2)]);
var state_37246__$1 = state_37246;
var statearr_37249_39945 = state_37246__$1;
(statearr_37249_39945[(2)] = inst_37242);

(statearr_37249_39945[(1)] = (3));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_37247 === (20))){
var inst_37137 = (state_37246[(7)]);
var inst_37154 = cljs.core.first(inst_37137);
var inst_37155 = cljs.core.nth.cljs$core$IFn$_invoke$arity$3(inst_37154,(0),null);
var inst_37156 = cljs.core.nth.cljs$core$IFn$_invoke$arity$3(inst_37154,(1),null);
var state_37246__$1 = (function (){var statearr_37250 = state_37246;
(statearr_37250[(8)] = inst_37155);

return statearr_37250;
})();
if(cljs.core.truth_(inst_37156)){
var statearr_37252_39946 = state_37246__$1;
(statearr_37252_39946[(1)] = (22));

} else {
var statearr_37253_39947 = state_37246__$1;
(statearr_37253_39947[(1)] = (23));

}

return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_37247 === (27))){
var inst_37186 = (state_37246[(9)]);
var inst_37188 = (state_37246[(10)]);
var inst_37193 = (state_37246[(11)]);
var inst_37095 = (state_37246[(12)]);
var inst_37193__$1 = cljs.core._nth(inst_37186,inst_37188);
var inst_37194 = cljs.core.async.put_BANG_.cljs$core$IFn$_invoke$arity$3(inst_37193__$1,inst_37095,done);
var state_37246__$1 = (function (){var statearr_37257 = state_37246;
(statearr_37257[(11)] = inst_37193__$1);

return statearr_37257;
})();
if(cljs.core.truth_(inst_37194)){
var statearr_37258_39949 = state_37246__$1;
(statearr_37258_39949[(1)] = (30));

} else {
var statearr_37259_39950 = state_37246__$1;
(statearr_37259_39950[(1)] = (31));

}

return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_37247 === (1))){
var state_37246__$1 = state_37246;
var statearr_37261_39951 = state_37246__$1;
(statearr_37261_39951[(2)] = null);

(statearr_37261_39951[(1)] = (2));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_37247 === (24))){
var inst_37137 = (state_37246[(7)]);
var inst_37163 = (state_37246[(2)]);
var inst_37164 = cljs.core.next(inst_37137);
var inst_37104 = inst_37164;
var inst_37105 = null;
var inst_37106 = (0);
var inst_37107 = (0);
var state_37246__$1 = (function (){var statearr_37263 = state_37246;
(statearr_37263[(13)] = inst_37163);

(statearr_37263[(14)] = inst_37104);

(statearr_37263[(15)] = inst_37105);

(statearr_37263[(16)] = inst_37106);

(statearr_37263[(17)] = inst_37107);

return statearr_37263;
})();
var statearr_37265_39952 = state_37246__$1;
(statearr_37265_39952[(2)] = null);

(statearr_37265_39952[(1)] = (8));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_37247 === (39))){
var state_37246__$1 = state_37246;
var statearr_37271_39953 = state_37246__$1;
(statearr_37271_39953[(2)] = null);

(statearr_37271_39953[(1)] = (41));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_37247 === (4))){
var inst_37095 = (state_37246[(12)]);
var inst_37095__$1 = (state_37246[(2)]);
var inst_37096 = (inst_37095__$1 == null);
var state_37246__$1 = (function (){var statearr_37274 = state_37246;
(statearr_37274[(12)] = inst_37095__$1);

return statearr_37274;
})();
if(cljs.core.truth_(inst_37096)){
var statearr_37275_39954 = state_37246__$1;
(statearr_37275_39954[(1)] = (5));

} else {
var statearr_37276_39955 = state_37246__$1;
(statearr_37276_39955[(1)] = (6));

}

return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_37247 === (15))){
var inst_37107 = (state_37246[(17)]);
var inst_37104 = (state_37246[(14)]);
var inst_37105 = (state_37246[(15)]);
var inst_37106 = (state_37246[(16)]);
var inst_37133 = (state_37246[(2)]);
var inst_37134 = (inst_37107 + (1));
var tmp37267 = inst_37104;
var tmp37268 = inst_37106;
var tmp37269 = inst_37105;
var inst_37104__$1 = tmp37267;
var inst_37105__$1 = tmp37269;
var inst_37106__$1 = tmp37268;
var inst_37107__$1 = inst_37134;
var state_37246__$1 = (function (){var statearr_37280 = state_37246;
(statearr_37280[(18)] = inst_37133);

(statearr_37280[(14)] = inst_37104__$1);

(statearr_37280[(15)] = inst_37105__$1);

(statearr_37280[(16)] = inst_37106__$1);

(statearr_37280[(17)] = inst_37107__$1);

return statearr_37280;
})();
var statearr_37281_39978 = state_37246__$1;
(statearr_37281_39978[(2)] = null);

(statearr_37281_39978[(1)] = (8));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_37247 === (21))){
var inst_37167 = (state_37246[(2)]);
var state_37246__$1 = state_37246;
var statearr_37286_39991 = state_37246__$1;
(statearr_37286_39991[(2)] = inst_37167);

(statearr_37286_39991[(1)] = (18));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_37247 === (31))){
var inst_37193 = (state_37246[(11)]);
var inst_37198 = m.cljs$core$async$Mult$untap_STAR_$arity$2(null, inst_37193);
var state_37246__$1 = state_37246;
var statearr_37288_39993 = state_37246__$1;
(statearr_37288_39993[(2)] = inst_37198);

(statearr_37288_39993[(1)] = (32));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_37247 === (32))){
var inst_37188 = (state_37246[(10)]);
var inst_37185 = (state_37246[(19)]);
var inst_37186 = (state_37246[(9)]);
var inst_37187 = (state_37246[(20)]);
var inst_37200 = (state_37246[(2)]);
var inst_37201 = (inst_37188 + (1));
var tmp37282 = inst_37187;
var tmp37283 = inst_37185;
var tmp37284 = inst_37186;
var inst_37185__$1 = tmp37283;
var inst_37186__$1 = tmp37284;
var inst_37187__$1 = tmp37282;
var inst_37188__$1 = inst_37201;
var state_37246__$1 = (function (){var statearr_37290 = state_37246;
(statearr_37290[(21)] = inst_37200);

(statearr_37290[(19)] = inst_37185__$1);

(statearr_37290[(9)] = inst_37186__$1);

(statearr_37290[(20)] = inst_37187__$1);

(statearr_37290[(10)] = inst_37188__$1);

return statearr_37290;
})();
var statearr_37295_39997 = state_37246__$1;
(statearr_37295_39997[(2)] = null);

(statearr_37295_39997[(1)] = (25));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_37247 === (40))){
var inst_37215 = (state_37246[(22)]);
var inst_37219 = m.cljs$core$async$Mult$untap_STAR_$arity$2(null, inst_37215);
var state_37246__$1 = state_37246;
var statearr_37297_39998 = state_37246__$1;
(statearr_37297_39998[(2)] = inst_37219);

(statearr_37297_39998[(1)] = (41));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_37247 === (33))){
var inst_37204 = (state_37246[(23)]);
var inst_37207 = cljs.core.chunked_seq_QMARK_(inst_37204);
var state_37246__$1 = state_37246;
if(inst_37207){
var statearr_37299_39999 = state_37246__$1;
(statearr_37299_39999[(1)] = (36));

} else {
var statearr_37300_40000 = state_37246__$1;
(statearr_37300_40000[(1)] = (37));

}

return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_37247 === (13))){
var inst_37124 = (state_37246[(24)]);
var inst_37130 = cljs.core.async.close_BANG_(inst_37124);
var state_37246__$1 = state_37246;
var statearr_37301_40002 = state_37246__$1;
(statearr_37301_40002[(2)] = inst_37130);

(statearr_37301_40002[(1)] = (15));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_37247 === (22))){
var inst_37155 = (state_37246[(8)]);
var inst_37160 = cljs.core.async.close_BANG_(inst_37155);
var state_37246__$1 = state_37246;
var statearr_37302_40004 = state_37246__$1;
(statearr_37302_40004[(2)] = inst_37160);

(statearr_37302_40004[(1)] = (24));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_37247 === (36))){
var inst_37204 = (state_37246[(23)]);
var inst_37210 = cljs.core.chunk_first(inst_37204);
var inst_37211 = cljs.core.chunk_rest(inst_37204);
var inst_37212 = cljs.core.count(inst_37210);
var inst_37185 = inst_37211;
var inst_37186 = inst_37210;
var inst_37187 = inst_37212;
var inst_37188 = (0);
var state_37246__$1 = (function (){var statearr_37304 = state_37246;
(statearr_37304[(19)] = inst_37185);

(statearr_37304[(9)] = inst_37186);

(statearr_37304[(20)] = inst_37187);

(statearr_37304[(10)] = inst_37188);

return statearr_37304;
})();
var statearr_37305_40006 = state_37246__$1;
(statearr_37305_40006[(2)] = null);

(statearr_37305_40006[(1)] = (25));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_37247 === (41))){
var inst_37204 = (state_37246[(23)]);
var inst_37221 = (state_37246[(2)]);
var inst_37222 = cljs.core.next(inst_37204);
var inst_37185 = inst_37222;
var inst_37186 = null;
var inst_37187 = (0);
var inst_37188 = (0);
var state_37246__$1 = (function (){var statearr_37306 = state_37246;
(statearr_37306[(25)] = inst_37221);

(statearr_37306[(19)] = inst_37185);

(statearr_37306[(9)] = inst_37186);

(statearr_37306[(20)] = inst_37187);

(statearr_37306[(10)] = inst_37188);

return statearr_37306;
})();
var statearr_37308_40014 = state_37246__$1;
(statearr_37308_40014[(2)] = null);

(statearr_37308_40014[(1)] = (25));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_37247 === (43))){
var state_37246__$1 = state_37246;
var statearr_37313_40019 = state_37246__$1;
(statearr_37313_40019[(2)] = null);

(statearr_37313_40019[(1)] = (44));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_37247 === (29))){
var inst_37230 = (state_37246[(2)]);
var state_37246__$1 = state_37246;
var statearr_37314_40023 = state_37246__$1;
(statearr_37314_40023[(2)] = inst_37230);

(statearr_37314_40023[(1)] = (26));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_37247 === (44))){
var inst_37239 = (state_37246[(2)]);
var state_37246__$1 = (function (){var statearr_37315 = state_37246;
(statearr_37315[(26)] = inst_37239);

return statearr_37315;
})();
var statearr_37316_40024 = state_37246__$1;
(statearr_37316_40024[(2)] = null);

(statearr_37316_40024[(1)] = (2));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_37247 === (6))){
var inst_37177 = (state_37246[(27)]);
var inst_37176 = cljs.core.deref(cs);
var inst_37177__$1 = cljs.core.keys(inst_37176);
var inst_37178 = cljs.core.count(inst_37177__$1);
var inst_37179 = cljs.core.reset_BANG_(dctr,inst_37178);
var inst_37184 = cljs.core.seq(inst_37177__$1);
var inst_37185 = inst_37184;
var inst_37186 = null;
var inst_37187 = (0);
var inst_37188 = (0);
var state_37246__$1 = (function (){var statearr_37317 = state_37246;
(statearr_37317[(27)] = inst_37177__$1);

(statearr_37317[(28)] = inst_37179);

(statearr_37317[(19)] = inst_37185);

(statearr_37317[(9)] = inst_37186);

(statearr_37317[(20)] = inst_37187);

(statearr_37317[(10)] = inst_37188);

return statearr_37317;
})();
var statearr_37318_40036 = state_37246__$1;
(statearr_37318_40036[(2)] = null);

(statearr_37318_40036[(1)] = (25));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_37247 === (28))){
var inst_37185 = (state_37246[(19)]);
var inst_37204 = (state_37246[(23)]);
var inst_37204__$1 = cljs.core.seq(inst_37185);
var state_37246__$1 = (function (){var statearr_37319 = state_37246;
(statearr_37319[(23)] = inst_37204__$1);

return statearr_37319;
})();
if(inst_37204__$1){
var statearr_37322_40047 = state_37246__$1;
(statearr_37322_40047[(1)] = (33));

} else {
var statearr_37323_40048 = state_37246__$1;
(statearr_37323_40048[(1)] = (34));

}

return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_37247 === (25))){
var inst_37188 = (state_37246[(10)]);
var inst_37187 = (state_37246[(20)]);
var inst_37190 = (inst_37188 < inst_37187);
var inst_37191 = inst_37190;
var state_37246__$1 = state_37246;
if(cljs.core.truth_(inst_37191)){
var statearr_37325_40049 = state_37246__$1;
(statearr_37325_40049[(1)] = (27));

} else {
var statearr_37326_40050 = state_37246__$1;
(statearr_37326_40050[(1)] = (28));

}

return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_37247 === (34))){
var state_37246__$1 = state_37246;
var statearr_37327_40051 = state_37246__$1;
(statearr_37327_40051[(2)] = null);

(statearr_37327_40051[(1)] = (35));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_37247 === (17))){
var state_37246__$1 = state_37246;
var statearr_37328_40055 = state_37246__$1;
(statearr_37328_40055[(2)] = null);

(statearr_37328_40055[(1)] = (18));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_37247 === (3))){
var inst_37244 = (state_37246[(2)]);
var state_37246__$1 = state_37246;
return cljs.core.async.impl.ioc_helpers.return_chan(state_37246__$1,inst_37244);
} else {
if((state_val_37247 === (12))){
var inst_37172 = (state_37246[(2)]);
var state_37246__$1 = state_37246;
var statearr_37330_40056 = state_37246__$1;
(statearr_37330_40056[(2)] = inst_37172);

(statearr_37330_40056[(1)] = (9));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_37247 === (2))){
var state_37246__$1 = state_37246;
return cljs.core.async.impl.ioc_helpers.take_BANG_(state_37246__$1,(4),ch);
} else {
if((state_val_37247 === (23))){
var state_37246__$1 = state_37246;
var statearr_37331_40057 = state_37246__$1;
(statearr_37331_40057[(2)] = null);

(statearr_37331_40057[(1)] = (24));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_37247 === (35))){
var inst_37228 = (state_37246[(2)]);
var state_37246__$1 = state_37246;
var statearr_37332_40058 = state_37246__$1;
(statearr_37332_40058[(2)] = inst_37228);

(statearr_37332_40058[(1)] = (29));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_37247 === (19))){
var inst_37137 = (state_37246[(7)]);
var inst_37145 = cljs.core.chunk_first(inst_37137);
var inst_37146 = cljs.core.chunk_rest(inst_37137);
var inst_37147 = cljs.core.count(inst_37145);
var inst_37104 = inst_37146;
var inst_37105 = inst_37145;
var inst_37106 = inst_37147;
var inst_37107 = (0);
var state_37246__$1 = (function (){var statearr_37333 = state_37246;
(statearr_37333[(14)] = inst_37104);

(statearr_37333[(15)] = inst_37105);

(statearr_37333[(16)] = inst_37106);

(statearr_37333[(17)] = inst_37107);

return statearr_37333;
})();
var statearr_37334_40059 = state_37246__$1;
(statearr_37334_40059[(2)] = null);

(statearr_37334_40059[(1)] = (8));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_37247 === (11))){
var inst_37104 = (state_37246[(14)]);
var inst_37137 = (state_37246[(7)]);
var inst_37137__$1 = cljs.core.seq(inst_37104);
var state_37246__$1 = (function (){var statearr_37420 = state_37246;
(statearr_37420[(7)] = inst_37137__$1);

return statearr_37420;
})();
if(inst_37137__$1){
var statearr_37421_40063 = state_37246__$1;
(statearr_37421_40063[(1)] = (16));

} else {
var statearr_37422_40064 = state_37246__$1;
(statearr_37422_40064[(1)] = (17));

}

return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_37247 === (9))){
var inst_37174 = (state_37246[(2)]);
var state_37246__$1 = state_37246;
var statearr_37423_40065 = state_37246__$1;
(statearr_37423_40065[(2)] = inst_37174);

(statearr_37423_40065[(1)] = (7));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_37247 === (5))){
var inst_37102 = cljs.core.deref(cs);
var inst_37103 = cljs.core.seq(inst_37102);
var inst_37104 = inst_37103;
var inst_37105 = null;
var inst_37106 = (0);
var inst_37107 = (0);
var state_37246__$1 = (function (){var statearr_37428 = state_37246;
(statearr_37428[(14)] = inst_37104);

(statearr_37428[(15)] = inst_37105);

(statearr_37428[(16)] = inst_37106);

(statearr_37428[(17)] = inst_37107);

return statearr_37428;
})();
var statearr_37435_40072 = state_37246__$1;
(statearr_37435_40072[(2)] = null);

(statearr_37435_40072[(1)] = (8));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_37247 === (14))){
var state_37246__$1 = state_37246;
var statearr_37437_40073 = state_37246__$1;
(statearr_37437_40073[(2)] = null);

(statearr_37437_40073[(1)] = (15));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_37247 === (45))){
var inst_37236 = (state_37246[(2)]);
var state_37246__$1 = state_37246;
var statearr_37438_40074 = state_37246__$1;
(statearr_37438_40074[(2)] = inst_37236);

(statearr_37438_40074[(1)] = (44));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_37247 === (26))){
var inst_37177 = (state_37246[(27)]);
var inst_37232 = (state_37246[(2)]);
var inst_37233 = cljs.core.seq(inst_37177);
var state_37246__$1 = (function (){var statearr_37440 = state_37246;
(statearr_37440[(29)] = inst_37232);

return statearr_37440;
})();
if(inst_37233){
var statearr_37441_40079 = state_37246__$1;
(statearr_37441_40079[(1)] = (42));

} else {
var statearr_37443_40080 = state_37246__$1;
(statearr_37443_40080[(1)] = (43));

}

return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_37247 === (16))){
var inst_37137 = (state_37246[(7)]);
var inst_37143 = cljs.core.chunked_seq_QMARK_(inst_37137);
var state_37246__$1 = state_37246;
if(inst_37143){
var statearr_37445_40081 = state_37246__$1;
(statearr_37445_40081[(1)] = (19));

} else {
var statearr_37446_40082 = state_37246__$1;
(statearr_37446_40082[(1)] = (20));

}

return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_37247 === (38))){
var inst_37225 = (state_37246[(2)]);
var state_37246__$1 = state_37246;
var statearr_37450_40083 = state_37246__$1;
(statearr_37450_40083[(2)] = inst_37225);

(statearr_37450_40083[(1)] = (35));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_37247 === (30))){
var state_37246__$1 = state_37246;
var statearr_37451_40084 = state_37246__$1;
(statearr_37451_40084[(2)] = null);

(statearr_37451_40084[(1)] = (32));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_37247 === (10))){
var inst_37105 = (state_37246[(15)]);
var inst_37107 = (state_37246[(17)]);
var inst_37121 = cljs.core._nth(inst_37105,inst_37107);
var inst_37124 = cljs.core.nth.cljs$core$IFn$_invoke$arity$3(inst_37121,(0),null);
var inst_37125 = cljs.core.nth.cljs$core$IFn$_invoke$arity$3(inst_37121,(1),null);
var state_37246__$1 = (function (){var statearr_37455 = state_37246;
(statearr_37455[(24)] = inst_37124);

return statearr_37455;
})();
if(cljs.core.truth_(inst_37125)){
var statearr_37456_40085 = state_37246__$1;
(statearr_37456_40085[(1)] = (13));

} else {
var statearr_37459_40086 = state_37246__$1;
(statearr_37459_40086[(1)] = (14));

}

return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_37247 === (18))){
var inst_37170 = (state_37246[(2)]);
var state_37246__$1 = state_37246;
var statearr_37461_40087 = state_37246__$1;
(statearr_37461_40087[(2)] = inst_37170);

(statearr_37461_40087[(1)] = (12));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_37247 === (42))){
var state_37246__$1 = state_37246;
return cljs.core.async.impl.ioc_helpers.take_BANG_(state_37246__$1,(45),dchan);
} else {
if((state_val_37247 === (37))){
var inst_37204 = (state_37246[(23)]);
var inst_37215 = (state_37246[(22)]);
var inst_37095 = (state_37246[(12)]);
var inst_37215__$1 = cljs.core.first(inst_37204);
var inst_37216 = cljs.core.async.put_BANG_.cljs$core$IFn$_invoke$arity$3(inst_37215__$1,inst_37095,done);
var state_37246__$1 = (function (){var statearr_37463 = state_37246;
(statearr_37463[(22)] = inst_37215__$1);

return statearr_37463;
})();
if(cljs.core.truth_(inst_37216)){
var statearr_37466_40088 = state_37246__$1;
(statearr_37466_40088[(1)] = (39));

} else {
var statearr_37468_40091 = state_37246__$1;
(statearr_37468_40091[(1)] = (40));

}

return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_37247 === (8))){
var inst_37107 = (state_37246[(17)]);
var inst_37106 = (state_37246[(16)]);
var inst_37109 = (inst_37107 < inst_37106);
var inst_37110 = inst_37109;
var state_37246__$1 = state_37246;
if(cljs.core.truth_(inst_37110)){
var statearr_37469_40092 = state_37246__$1;
(statearr_37469_40092[(1)] = (10));

} else {
var statearr_37470_40093 = state_37246__$1;
(statearr_37470_40093[(1)] = (11));

}

return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
return null;
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
});
return (function() {
var cljs$core$async$mult_$_state_machine__35497__auto__ = null;
var cljs$core$async$mult_$_state_machine__35497__auto____0 = (function (){
var statearr_37472 = [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null];
(statearr_37472[(0)] = cljs$core$async$mult_$_state_machine__35497__auto__);

(statearr_37472[(1)] = (1));

return statearr_37472;
});
var cljs$core$async$mult_$_state_machine__35497__auto____1 = (function (state_37246){
while(true){
var ret_value__35499__auto__ = (function (){try{while(true){
var result__35500__auto__ = switch__35496__auto__(state_37246);
if(cljs.core.keyword_identical_QMARK_(result__35500__auto__,new cljs.core.Keyword(null,"recur","recur",-437573268))){
continue;
} else {
return result__35500__auto__;
}
break;
}
}catch (e37473){var ex__35501__auto__ = e37473;
var statearr_37475_40098 = state_37246;
(statearr_37475_40098[(2)] = ex__35501__auto__);


if(cljs.core.seq((state_37246[(4)]))){
var statearr_37477_40099 = state_37246;
(statearr_37477_40099[(1)] = cljs.core.first((state_37246[(4)])));

} else {
throw ex__35501__auto__;
}

return new cljs.core.Keyword(null,"recur","recur",-437573268);
}})();
if(cljs.core.keyword_identical_QMARK_(ret_value__35499__auto__,new cljs.core.Keyword(null,"recur","recur",-437573268))){
var G__40100 = state_37246;
state_37246 = G__40100;
continue;
} else {
return ret_value__35499__auto__;
}
break;
}
});
cljs$core$async$mult_$_state_machine__35497__auto__ = function(state_37246){
switch(arguments.length){
case 0:
return cljs$core$async$mult_$_state_machine__35497__auto____0.call(this);
case 1:
return cljs$core$async$mult_$_state_machine__35497__auto____1.call(this,state_37246);
}
throw(new Error('Invalid arity: ' + arguments.length));
};
cljs$core$async$mult_$_state_machine__35497__auto__.cljs$core$IFn$_invoke$arity$0 = cljs$core$async$mult_$_state_machine__35497__auto____0;
cljs$core$async$mult_$_state_machine__35497__auto__.cljs$core$IFn$_invoke$arity$1 = cljs$core$async$mult_$_state_machine__35497__auto____1;
return cljs$core$async$mult_$_state_machine__35497__auto__;
})()
})();
var state__35927__auto__ = (function (){var statearr_37492 = f__35926__auto__();
(statearr_37492[(6)] = c__35925__auto___39944);

return statearr_37492;
})();
return cljs.core.async.impl.ioc_helpers.run_state_machine_wrapped(state__35927__auto__);
}));


return m;
});
/**
 * Copies the mult source onto the supplied channel.
 * 
 *   By default the channel will be closed when the source closes,
 *   but can be determined by the close? parameter.
 */
cljs.core.async.tap = (function cljs$core$async$tap(var_args){
var G__37500 = arguments.length;
switch (G__37500) {
case 2:
return cljs.core.async.tap.cljs$core$IFn$_invoke$arity$2((arguments[(0)]),(arguments[(1)]));

break;
case 3:
return cljs.core.async.tap.cljs$core$IFn$_invoke$arity$3((arguments[(0)]),(arguments[(1)]),(arguments[(2)]));

break;
default:
throw (new Error(["Invalid arity: ",cljs.core.str.cljs$core$IFn$_invoke$arity$1(arguments.length)].join('')));

}
});

(cljs.core.async.tap.cljs$core$IFn$_invoke$arity$2 = (function (mult,ch){
return cljs.core.async.tap.cljs$core$IFn$_invoke$arity$3(mult,ch,true);
}));

(cljs.core.async.tap.cljs$core$IFn$_invoke$arity$3 = (function (mult,ch,close_QMARK_){
cljs.core.async.tap_STAR_(mult,ch,close_QMARK_);

return ch;
}));

(cljs.core.async.tap.cljs$lang$maxFixedArity = 3);

/**
 * Disconnects a target channel from a mult
 */
cljs.core.async.untap = (function cljs$core$async$untap(mult,ch){
return cljs.core.async.untap_STAR_(mult,ch);
});
/**
 * Disconnects all target channels from a mult
 */
cljs.core.async.untap_all = (function cljs$core$async$untap_all(mult){
return cljs.core.async.untap_all_STAR_(mult);
});

/**
 * @interface
 */
cljs.core.async.Mix = function(){};

var cljs$core$async$Mix$admix_STAR_$dyn_40104 = (function (m,ch){
var x__5350__auto__ = (((m == null))?null:m);
var m__5351__auto__ = (cljs.core.async.admix_STAR_[goog.typeOf(x__5350__auto__)]);
if((!((m__5351__auto__ == null)))){
return (m__5351__auto__.cljs$core$IFn$_invoke$arity$2 ? m__5351__auto__.cljs$core$IFn$_invoke$arity$2(m,ch) : m__5351__auto__.call(null, m,ch));
} else {
var m__5349__auto__ = (cljs.core.async.admix_STAR_["_"]);
if((!((m__5349__auto__ == null)))){
return (m__5349__auto__.cljs$core$IFn$_invoke$arity$2 ? m__5349__auto__.cljs$core$IFn$_invoke$arity$2(m,ch) : m__5349__auto__.call(null, m,ch));
} else {
throw cljs.core.missing_protocol("Mix.admix*",m);
}
}
});
cljs.core.async.admix_STAR_ = (function cljs$core$async$admix_STAR_(m,ch){
if((((!((m == null)))) && ((!((m.cljs$core$async$Mix$admix_STAR_$arity$2 == null)))))){
return m.cljs$core$async$Mix$admix_STAR_$arity$2(m,ch);
} else {
return cljs$core$async$Mix$admix_STAR_$dyn_40104(m,ch);
}
});

var cljs$core$async$Mix$unmix_STAR_$dyn_40106 = (function (m,ch){
var x__5350__auto__ = (((m == null))?null:m);
var m__5351__auto__ = (cljs.core.async.unmix_STAR_[goog.typeOf(x__5350__auto__)]);
if((!((m__5351__auto__ == null)))){
return (m__5351__auto__.cljs$core$IFn$_invoke$arity$2 ? m__5351__auto__.cljs$core$IFn$_invoke$arity$2(m,ch) : m__5351__auto__.call(null, m,ch));
} else {
var m__5349__auto__ = (cljs.core.async.unmix_STAR_["_"]);
if((!((m__5349__auto__ == null)))){
return (m__5349__auto__.cljs$core$IFn$_invoke$arity$2 ? m__5349__auto__.cljs$core$IFn$_invoke$arity$2(m,ch) : m__5349__auto__.call(null, m,ch));
} else {
throw cljs.core.missing_protocol("Mix.unmix*",m);
}
}
});
cljs.core.async.unmix_STAR_ = (function cljs$core$async$unmix_STAR_(m,ch){
if((((!((m == null)))) && ((!((m.cljs$core$async$Mix$unmix_STAR_$arity$2 == null)))))){
return m.cljs$core$async$Mix$unmix_STAR_$arity$2(m,ch);
} else {
return cljs$core$async$Mix$unmix_STAR_$dyn_40106(m,ch);
}
});

var cljs$core$async$Mix$unmix_all_STAR_$dyn_40107 = (function (m){
var x__5350__auto__ = (((m == null))?null:m);
var m__5351__auto__ = (cljs.core.async.unmix_all_STAR_[goog.typeOf(x__5350__auto__)]);
if((!((m__5351__auto__ == null)))){
return (m__5351__auto__.cljs$core$IFn$_invoke$arity$1 ? m__5351__auto__.cljs$core$IFn$_invoke$arity$1(m) : m__5351__auto__.call(null, m));
} else {
var m__5349__auto__ = (cljs.core.async.unmix_all_STAR_["_"]);
if((!((m__5349__auto__ == null)))){
return (m__5349__auto__.cljs$core$IFn$_invoke$arity$1 ? m__5349__auto__.cljs$core$IFn$_invoke$arity$1(m) : m__5349__auto__.call(null, m));
} else {
throw cljs.core.missing_protocol("Mix.unmix-all*",m);
}
}
});
cljs.core.async.unmix_all_STAR_ = (function cljs$core$async$unmix_all_STAR_(m){
if((((!((m == null)))) && ((!((m.cljs$core$async$Mix$unmix_all_STAR_$arity$1 == null)))))){
return m.cljs$core$async$Mix$unmix_all_STAR_$arity$1(m);
} else {
return cljs$core$async$Mix$unmix_all_STAR_$dyn_40107(m);
}
});

var cljs$core$async$Mix$toggle_STAR_$dyn_40112 = (function (m,state_map){
var x__5350__auto__ = (((m == null))?null:m);
var m__5351__auto__ = (cljs.core.async.toggle_STAR_[goog.typeOf(x__5350__auto__)]);
if((!((m__5351__auto__ == null)))){
return (m__5351__auto__.cljs$core$IFn$_invoke$arity$2 ? m__5351__auto__.cljs$core$IFn$_invoke$arity$2(m,state_map) : m__5351__auto__.call(null, m,state_map));
} else {
var m__5349__auto__ = (cljs.core.async.toggle_STAR_["_"]);
if((!((m__5349__auto__ == null)))){
return (m__5349__auto__.cljs$core$IFn$_invoke$arity$2 ? m__5349__auto__.cljs$core$IFn$_invoke$arity$2(m,state_map) : m__5349__auto__.call(null, m,state_map));
} else {
throw cljs.core.missing_protocol("Mix.toggle*",m);
}
}
});
cljs.core.async.toggle_STAR_ = (function cljs$core$async$toggle_STAR_(m,state_map){
if((((!((m == null)))) && ((!((m.cljs$core$async$Mix$toggle_STAR_$arity$2 == null)))))){
return m.cljs$core$async$Mix$toggle_STAR_$arity$2(m,state_map);
} else {
return cljs$core$async$Mix$toggle_STAR_$dyn_40112(m,state_map);
}
});

var cljs$core$async$Mix$solo_mode_STAR_$dyn_40121 = (function (m,mode){
var x__5350__auto__ = (((m == null))?null:m);
var m__5351__auto__ = (cljs.core.async.solo_mode_STAR_[goog.typeOf(x__5350__auto__)]);
if((!((m__5351__auto__ == null)))){
return (m__5351__auto__.cljs$core$IFn$_invoke$arity$2 ? m__5351__auto__.cljs$core$IFn$_invoke$arity$2(m,mode) : m__5351__auto__.call(null, m,mode));
} else {
var m__5349__auto__ = (cljs.core.async.solo_mode_STAR_["_"]);
if((!((m__5349__auto__ == null)))){
return (m__5349__auto__.cljs$core$IFn$_invoke$arity$2 ? m__5349__auto__.cljs$core$IFn$_invoke$arity$2(m,mode) : m__5349__auto__.call(null, m,mode));
} else {
throw cljs.core.missing_protocol("Mix.solo-mode*",m);
}
}
});
cljs.core.async.solo_mode_STAR_ = (function cljs$core$async$solo_mode_STAR_(m,mode){
if((((!((m == null)))) && ((!((m.cljs$core$async$Mix$solo_mode_STAR_$arity$2 == null)))))){
return m.cljs$core$async$Mix$solo_mode_STAR_$arity$2(m,mode);
} else {
return cljs$core$async$Mix$solo_mode_STAR_$dyn_40121(m,mode);
}
});

cljs.core.async.ioc_alts_BANG_ = (function cljs$core$async$ioc_alts_BANG_(var_args){
var args__5732__auto__ = [];
var len__5726__auto___40122 = arguments.length;
var i__5727__auto___40123 = (0);
while(true){
if((i__5727__auto___40123 < len__5726__auto___40122)){
args__5732__auto__.push((arguments[i__5727__auto___40123]));

var G__40124 = (i__5727__auto___40123 + (1));
i__5727__auto___40123 = G__40124;
continue;
} else {
}
break;
}

var argseq__5733__auto__ = ((((3) < args__5732__auto__.length))?(new cljs.core.IndexedSeq(args__5732__auto__.slice((3)),(0),null)):null);
return cljs.core.async.ioc_alts_BANG_.cljs$core$IFn$_invoke$arity$variadic((arguments[(0)]),(arguments[(1)]),(arguments[(2)]),argseq__5733__auto__);
});

(cljs.core.async.ioc_alts_BANG_.cljs$core$IFn$_invoke$arity$variadic = (function (state,cont_block,ports,p__37579){
var map__37580 = p__37579;
var map__37580__$1 = cljs.core.__destructure_map(map__37580);
var opts = map__37580__$1;
var statearr_37582_40125 = state;
(statearr_37582_40125[(1)] = cont_block);


var temp__5804__auto__ = cljs.core.async.do_alts((function (val){
var statearr_37583_40126 = state;
(statearr_37583_40126[(2)] = val);


return cljs.core.async.impl.ioc_helpers.run_state_machine_wrapped(state);
}),ports,opts);
if(cljs.core.truth_(temp__5804__auto__)){
var cb = temp__5804__auto__;
var statearr_37586_40127 = state;
(statearr_37586_40127[(2)] = cljs.core.deref(cb));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
return null;
}
}));

(cljs.core.async.ioc_alts_BANG_.cljs$lang$maxFixedArity = (3));

/** @this {Function} */
(cljs.core.async.ioc_alts_BANG_.cljs$lang$applyTo = (function (seq37551){
var G__37552 = cljs.core.first(seq37551);
var seq37551__$1 = cljs.core.next(seq37551);
var G__37553 = cljs.core.first(seq37551__$1);
var seq37551__$2 = cljs.core.next(seq37551__$1);
var G__37554 = cljs.core.first(seq37551__$2);
var seq37551__$3 = cljs.core.next(seq37551__$2);
var self__5711__auto__ = this;
return self__5711__auto__.cljs$core$IFn$_invoke$arity$variadic(G__37552,G__37553,G__37554,seq37551__$3);
}));


/**
* @constructor
 * @implements {cljs.core.IMeta}
 * @implements {cljs.core.async.Mix}
 * @implements {cljs.core.async.Mux}
 * @implements {cljs.core.IWithMeta}
*/
cljs.core.async.t_cljs$core$async37623 = (function (change,solo_mode,pick,cs,calc_state,out,changed,solo_modes,attrs,meta37624){
this.change = change;
this.solo_mode = solo_mode;
this.pick = pick;
this.cs = cs;
this.calc_state = calc_state;
this.out = out;
this.changed = changed;
this.solo_modes = solo_modes;
this.attrs = attrs;
this.meta37624 = meta37624;
this.cljs$lang$protocol_mask$partition0$ = 393216;
this.cljs$lang$protocol_mask$partition1$ = 0;
});
(cljs.core.async.t_cljs$core$async37623.prototype.cljs$core$IWithMeta$_with_meta$arity$2 = (function (_37625,meta37624__$1){
var self__ = this;
var _37625__$1 = this;
return (new cljs.core.async.t_cljs$core$async37623(self__.change,self__.solo_mode,self__.pick,self__.cs,self__.calc_state,self__.out,self__.changed,self__.solo_modes,self__.attrs,meta37624__$1));
}));

(cljs.core.async.t_cljs$core$async37623.prototype.cljs$core$IMeta$_meta$arity$1 = (function (_37625){
var self__ = this;
var _37625__$1 = this;
return self__.meta37624;
}));

(cljs.core.async.t_cljs$core$async37623.prototype.cljs$core$async$Mux$ = cljs.core.PROTOCOL_SENTINEL);

(cljs.core.async.t_cljs$core$async37623.prototype.cljs$core$async$Mux$muxch_STAR_$arity$1 = (function (_){
var self__ = this;
var ___$1 = this;
return self__.out;
}));

(cljs.core.async.t_cljs$core$async37623.prototype.cljs$core$async$Mix$ = cljs.core.PROTOCOL_SENTINEL);

(cljs.core.async.t_cljs$core$async37623.prototype.cljs$core$async$Mix$admix_STAR_$arity$2 = (function (_,ch){
var self__ = this;
var ___$1 = this;
cljs.core.swap_BANG_.cljs$core$IFn$_invoke$arity$4(self__.cs,cljs.core.assoc,ch,cljs.core.PersistentArrayMap.EMPTY);

return (self__.changed.cljs$core$IFn$_invoke$arity$0 ? self__.changed.cljs$core$IFn$_invoke$arity$0() : self__.changed.call(null, ));
}));

(cljs.core.async.t_cljs$core$async37623.prototype.cljs$core$async$Mix$unmix_STAR_$arity$2 = (function (_,ch){
var self__ = this;
var ___$1 = this;
cljs.core.swap_BANG_.cljs$core$IFn$_invoke$arity$3(self__.cs,cljs.core.dissoc,ch);

return (self__.changed.cljs$core$IFn$_invoke$arity$0 ? self__.changed.cljs$core$IFn$_invoke$arity$0() : self__.changed.call(null, ));
}));

(cljs.core.async.t_cljs$core$async37623.prototype.cljs$core$async$Mix$unmix_all_STAR_$arity$1 = (function (_){
var self__ = this;
var ___$1 = this;
cljs.core.reset_BANG_(self__.cs,cljs.core.PersistentArrayMap.EMPTY);

return (self__.changed.cljs$core$IFn$_invoke$arity$0 ? self__.changed.cljs$core$IFn$_invoke$arity$0() : self__.changed.call(null, ));
}));

(cljs.core.async.t_cljs$core$async37623.prototype.cljs$core$async$Mix$toggle_STAR_$arity$2 = (function (_,state_map){
var self__ = this;
var ___$1 = this;
cljs.core.swap_BANG_.cljs$core$IFn$_invoke$arity$3(self__.cs,cljs.core.partial.cljs$core$IFn$_invoke$arity$2(cljs.core.merge_with,cljs.core.merge),state_map);

return (self__.changed.cljs$core$IFn$_invoke$arity$0 ? self__.changed.cljs$core$IFn$_invoke$arity$0() : self__.changed.call(null, ));
}));

(cljs.core.async.t_cljs$core$async37623.prototype.cljs$core$async$Mix$solo_mode_STAR_$arity$2 = (function (_,mode){
var self__ = this;
var ___$1 = this;
if(cljs.core.truth_((self__.solo_modes.cljs$core$IFn$_invoke$arity$1 ? self__.solo_modes.cljs$core$IFn$_invoke$arity$1(mode) : self__.solo_modes.call(null, mode)))){
} else {
throw (new Error(["Assert failed: ",["mode must be one of: ",cljs.core.str.cljs$core$IFn$_invoke$arity$1(self__.solo_modes)].join(''),"\n","(solo-modes mode)"].join('')));
}

cljs.core.reset_BANG_(self__.solo_mode,mode);

return (self__.changed.cljs$core$IFn$_invoke$arity$0 ? self__.changed.cljs$core$IFn$_invoke$arity$0() : self__.changed.call(null, ));
}));

(cljs.core.async.t_cljs$core$async37623.getBasis = (function (){
return new cljs.core.PersistentVector(null, 10, 5, cljs.core.PersistentVector.EMPTY_NODE, [new cljs.core.Symbol(null,"change","change",477485025,null),new cljs.core.Symbol(null,"solo-mode","solo-mode",2031788074,null),new cljs.core.Symbol(null,"pick","pick",1300068175,null),new cljs.core.Symbol(null,"cs","cs",-117024463,null),new cljs.core.Symbol(null,"calc-state","calc-state",-349968968,null),new cljs.core.Symbol(null,"out","out",729986010,null),new cljs.core.Symbol(null,"changed","changed",-2083710852,null),new cljs.core.Symbol(null,"solo-modes","solo-modes",882180540,null),new cljs.core.Symbol(null,"attrs","attrs",-450137186,null),new cljs.core.Symbol(null,"meta37624","meta37624",365852845,null)], null);
}));

(cljs.core.async.t_cljs$core$async37623.cljs$lang$type = true);

(cljs.core.async.t_cljs$core$async37623.cljs$lang$ctorStr = "cljs.core.async/t_cljs$core$async37623");

(cljs.core.async.t_cljs$core$async37623.cljs$lang$ctorPrWriter = (function (this__5287__auto__,writer__5288__auto__,opt__5289__auto__){
return cljs.core._write(writer__5288__auto__,"cljs.core.async/t_cljs$core$async37623");
}));

/**
 * Positional factory function for cljs.core.async/t_cljs$core$async37623.
 */
cljs.core.async.__GT_t_cljs$core$async37623 = (function cljs$core$async$__GT_t_cljs$core$async37623(change,solo_mode,pick,cs,calc_state,out,changed,solo_modes,attrs,meta37624){
return (new cljs.core.async.t_cljs$core$async37623(change,solo_mode,pick,cs,calc_state,out,changed,solo_modes,attrs,meta37624));
});


/**
 * Creates and returns a mix of one or more input channels which will
 *   be put on the supplied out channel. Input sources can be added to
 *   the mix with 'admix', and removed with 'unmix'. A mix supports
 *   soloing, muting and pausing multiple inputs atomically using
 *   'toggle', and can solo using either muting or pausing as determined
 *   by 'solo-mode'.
 * 
 *   Each channel can have zero or more boolean modes set via 'toggle':
 * 
 *   :solo - when true, only this (ond other soloed) channel(s) will appear
 *        in the mix output channel. :mute and :pause states of soloed
 *        channels are ignored. If solo-mode is :mute, non-soloed
 *        channels are muted, if :pause, non-soloed channels are
 *        paused.
 * 
 *   :mute - muted channels will have their contents consumed but not included in the mix
 *   :pause - paused channels will not have their contents consumed (and thus also not included in the mix)
 */
cljs.core.async.mix = (function cljs$core$async$mix(out){
var cs = cljs.core.atom.cljs$core$IFn$_invoke$arity$1(cljs.core.PersistentArrayMap.EMPTY);
var solo_modes = new cljs.core.PersistentHashSet(null, new cljs.core.PersistentArrayMap(null, 2, [new cljs.core.Keyword(null,"pause","pause",-2095325672),null,new cljs.core.Keyword(null,"mute","mute",1151223646),null], null), null);
var attrs = cljs.core.conj.cljs$core$IFn$_invoke$arity$2(solo_modes,new cljs.core.Keyword(null,"solo","solo",-316350075));
var solo_mode = cljs.core.atom.cljs$core$IFn$_invoke$arity$1(new cljs.core.Keyword(null,"mute","mute",1151223646));
var change = cljs.core.async.chan.cljs$core$IFn$_invoke$arity$1(cljs.core.async.sliding_buffer((1)));
var changed = (function (){
return cljs.core.async.put_BANG_.cljs$core$IFn$_invoke$arity$2(change,true);
});
var pick = (function (attr,chs){
return cljs.core.reduce_kv((function (ret,c,v){
if(cljs.core.truth_((attr.cljs$core$IFn$_invoke$arity$1 ? attr.cljs$core$IFn$_invoke$arity$1(v) : attr.call(null, v)))){
return cljs.core.conj.cljs$core$IFn$_invoke$arity$2(ret,c);
} else {
return ret;
}
}),cljs.core.PersistentHashSet.EMPTY,chs);
});
var calc_state = (function (){
var chs = cljs.core.deref(cs);
var mode = cljs.core.deref(solo_mode);
var solos = pick(new cljs.core.Keyword(null,"solo","solo",-316350075),chs);
var pauses = pick(new cljs.core.Keyword(null,"pause","pause",-2095325672),chs);
return new cljs.core.PersistentArrayMap(null, 3, [new cljs.core.Keyword(null,"solos","solos",1441458643),solos,new cljs.core.Keyword(null,"mutes","mutes",1068806309),pick(new cljs.core.Keyword(null,"mute","mute",1151223646),chs),new cljs.core.Keyword(null,"reads","reads",-1215067361),cljs.core.conj.cljs$core$IFn$_invoke$arity$2(((((cljs.core._EQ_.cljs$core$IFn$_invoke$arity$2(mode,new cljs.core.Keyword(null,"pause","pause",-2095325672))) && (cljs.core.seq(solos))))?cljs.core.vec(solos):cljs.core.vec(cljs.core.remove.cljs$core$IFn$_invoke$arity$2(pauses,cljs.core.keys(chs)))),change)], null);
});
var m = (new cljs.core.async.t_cljs$core$async37623(change,solo_mode,pick,cs,calc_state,out,changed,solo_modes,attrs,cljs.core.PersistentArrayMap.EMPTY));
var c__35925__auto___40151 = cljs.core.async.chan.cljs$core$IFn$_invoke$arity$1((1));
cljs.core.async.impl.dispatch.run((function (){
var f__35926__auto__ = (function (){var switch__35496__auto__ = (function (state_37753){
var state_val_37754 = (state_37753[(1)]);
if((state_val_37754 === (7))){
var inst_37689 = (state_37753[(2)]);
var state_37753__$1 = state_37753;
if(cljs.core.truth_(inst_37689)){
var statearr_37757_40157 = state_37753__$1;
(statearr_37757_40157[(1)] = (8));

} else {
var statearr_37758_40158 = state_37753__$1;
(statearr_37758_40158[(1)] = (9));

}

return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_37754 === (20))){
var inst_37681 = (state_37753[(7)]);
var state_37753__$1 = state_37753;
return cljs.core.async.impl.ioc_helpers.put_BANG_(state_37753__$1,(23),out,inst_37681);
} else {
if((state_val_37754 === (1))){
var inst_37664 = calc_state();
var inst_37665 = cljs.core.__destructure_map(inst_37664);
var inst_37666 = cljs.core.get.cljs$core$IFn$_invoke$arity$2(inst_37665,new cljs.core.Keyword(null,"solos","solos",1441458643));
var inst_37667 = cljs.core.get.cljs$core$IFn$_invoke$arity$2(inst_37665,new cljs.core.Keyword(null,"mutes","mutes",1068806309));
var inst_37668 = cljs.core.get.cljs$core$IFn$_invoke$arity$2(inst_37665,new cljs.core.Keyword(null,"reads","reads",-1215067361));
var inst_37669 = inst_37664;
var state_37753__$1 = (function (){var statearr_37761 = state_37753;
(statearr_37761[(8)] = inst_37666);

(statearr_37761[(9)] = inst_37667);

(statearr_37761[(10)] = inst_37668);

(statearr_37761[(11)] = inst_37669);

return statearr_37761;
})();
var statearr_37762_40168 = state_37753__$1;
(statearr_37762_40168[(2)] = null);

(statearr_37762_40168[(1)] = (2));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_37754 === (24))){
var inst_37672 = (state_37753[(12)]);
var inst_37669 = inst_37672;
var state_37753__$1 = (function (){var statearr_37763 = state_37753;
(statearr_37763[(11)] = inst_37669);

return statearr_37763;
})();
var statearr_37765_40170 = state_37753__$1;
(statearr_37765_40170[(2)] = null);

(statearr_37765_40170[(1)] = (2));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_37754 === (4))){
var inst_37681 = (state_37753[(7)]);
var inst_37684 = (state_37753[(13)]);
var inst_37680 = (state_37753[(2)]);
var inst_37681__$1 = cljs.core.nth.cljs$core$IFn$_invoke$arity$3(inst_37680,(0),null);
var inst_37682 = cljs.core.nth.cljs$core$IFn$_invoke$arity$3(inst_37680,(1),null);
var inst_37684__$1 = (inst_37681__$1 == null);
var state_37753__$1 = (function (){var statearr_37769 = state_37753;
(statearr_37769[(7)] = inst_37681__$1);

(statearr_37769[(14)] = inst_37682);

(statearr_37769[(13)] = inst_37684__$1);

return statearr_37769;
})();
if(cljs.core.truth_(inst_37684__$1)){
var statearr_37770_40175 = state_37753__$1;
(statearr_37770_40175[(1)] = (5));

} else {
var statearr_37771_40176 = state_37753__$1;
(statearr_37771_40176[(1)] = (6));

}

return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_37754 === (15))){
var inst_37673 = (state_37753[(15)]);
var inst_37703 = (state_37753[(16)]);
var inst_37703__$1 = cljs.core.empty_QMARK_(inst_37673);
var state_37753__$1 = (function (){var statearr_37773 = state_37753;
(statearr_37773[(16)] = inst_37703__$1);

return statearr_37773;
})();
if(inst_37703__$1){
var statearr_37774_40177 = state_37753__$1;
(statearr_37774_40177[(1)] = (17));

} else {
var statearr_37775_40178 = state_37753__$1;
(statearr_37775_40178[(1)] = (18));

}

return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_37754 === (21))){
var inst_37672 = (state_37753[(12)]);
var inst_37669 = inst_37672;
var state_37753__$1 = (function (){var statearr_37778 = state_37753;
(statearr_37778[(11)] = inst_37669);

return statearr_37778;
})();
var statearr_37779_40179 = state_37753__$1;
(statearr_37779_40179[(2)] = null);

(statearr_37779_40179[(1)] = (2));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_37754 === (13))){
var inst_37696 = (state_37753[(2)]);
var inst_37697 = calc_state();
var inst_37669 = inst_37697;
var state_37753__$1 = (function (){var statearr_37783 = state_37753;
(statearr_37783[(17)] = inst_37696);

(statearr_37783[(11)] = inst_37669);

return statearr_37783;
})();
var statearr_37788_40180 = state_37753__$1;
(statearr_37788_40180[(2)] = null);

(statearr_37788_40180[(1)] = (2));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_37754 === (22))){
var inst_37747 = (state_37753[(2)]);
var state_37753__$1 = state_37753;
var statearr_37791_40184 = state_37753__$1;
(statearr_37791_40184[(2)] = inst_37747);

(statearr_37791_40184[(1)] = (10));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_37754 === (6))){
var inst_37682 = (state_37753[(14)]);
var inst_37687 = cljs.core._EQ_.cljs$core$IFn$_invoke$arity$2(inst_37682,change);
var state_37753__$1 = state_37753;
var statearr_37806_40185 = state_37753__$1;
(statearr_37806_40185[(2)] = inst_37687);

(statearr_37806_40185[(1)] = (7));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_37754 === (25))){
var state_37753__$1 = state_37753;
var statearr_37807_40186 = state_37753__$1;
(statearr_37807_40186[(2)] = null);

(statearr_37807_40186[(1)] = (26));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_37754 === (17))){
var inst_37674 = (state_37753[(18)]);
var inst_37682 = (state_37753[(14)]);
var inst_37706 = (inst_37674.cljs$core$IFn$_invoke$arity$1 ? inst_37674.cljs$core$IFn$_invoke$arity$1(inst_37682) : inst_37674.call(null, inst_37682));
var inst_37707 = cljs.core.not(inst_37706);
var state_37753__$1 = state_37753;
var statearr_37809_40189 = state_37753__$1;
(statearr_37809_40189[(2)] = inst_37707);

(statearr_37809_40189[(1)] = (19));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_37754 === (3))){
var inst_37751 = (state_37753[(2)]);
var state_37753__$1 = state_37753;
return cljs.core.async.impl.ioc_helpers.return_chan(state_37753__$1,inst_37751);
} else {
if((state_val_37754 === (12))){
var state_37753__$1 = state_37753;
var statearr_37813_40190 = state_37753__$1;
(statearr_37813_40190[(2)] = null);

(statearr_37813_40190[(1)] = (13));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_37754 === (2))){
var inst_37669 = (state_37753[(11)]);
var inst_37672 = (state_37753[(12)]);
var inst_37672__$1 = cljs.core.__destructure_map(inst_37669);
var inst_37673 = cljs.core.get.cljs$core$IFn$_invoke$arity$2(inst_37672__$1,new cljs.core.Keyword(null,"solos","solos",1441458643));
var inst_37674 = cljs.core.get.cljs$core$IFn$_invoke$arity$2(inst_37672__$1,new cljs.core.Keyword(null,"mutes","mutes",1068806309));
var inst_37675 = cljs.core.get.cljs$core$IFn$_invoke$arity$2(inst_37672__$1,new cljs.core.Keyword(null,"reads","reads",-1215067361));
var state_37753__$1 = (function (){var statearr_37815 = state_37753;
(statearr_37815[(12)] = inst_37672__$1);

(statearr_37815[(15)] = inst_37673);

(statearr_37815[(18)] = inst_37674);

return statearr_37815;
})();
return cljs.core.async.ioc_alts_BANG_(state_37753__$1,(4),inst_37675);
} else {
if((state_val_37754 === (23))){
var inst_37715 = (state_37753[(2)]);
var state_37753__$1 = state_37753;
if(cljs.core.truth_(inst_37715)){
var statearr_37816_40196 = state_37753__$1;
(statearr_37816_40196[(1)] = (24));

} else {
var statearr_37817_40197 = state_37753__$1;
(statearr_37817_40197[(1)] = (25));

}

return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_37754 === (19))){
var inst_37710 = (state_37753[(2)]);
var state_37753__$1 = state_37753;
var statearr_37818_40199 = state_37753__$1;
(statearr_37818_40199[(2)] = inst_37710);

(statearr_37818_40199[(1)] = (16));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_37754 === (11))){
var inst_37682 = (state_37753[(14)]);
var inst_37693 = cljs.core.swap_BANG_.cljs$core$IFn$_invoke$arity$3(cs,cljs.core.dissoc,inst_37682);
var state_37753__$1 = state_37753;
var statearr_37819_40200 = state_37753__$1;
(statearr_37819_40200[(2)] = inst_37693);

(statearr_37819_40200[(1)] = (13));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_37754 === (9))){
var inst_37673 = (state_37753[(15)]);
var inst_37682 = (state_37753[(14)]);
var inst_37700 = (state_37753[(19)]);
var inst_37700__$1 = (inst_37673.cljs$core$IFn$_invoke$arity$1 ? inst_37673.cljs$core$IFn$_invoke$arity$1(inst_37682) : inst_37673.call(null, inst_37682));
var state_37753__$1 = (function (){var statearr_37820 = state_37753;
(statearr_37820[(19)] = inst_37700__$1);

return statearr_37820;
})();
if(cljs.core.truth_(inst_37700__$1)){
var statearr_37821_40206 = state_37753__$1;
(statearr_37821_40206[(1)] = (14));

} else {
var statearr_37822_40207 = state_37753__$1;
(statearr_37822_40207[(1)] = (15));

}

return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_37754 === (5))){
var inst_37684 = (state_37753[(13)]);
var state_37753__$1 = state_37753;
var statearr_37834_40212 = state_37753__$1;
(statearr_37834_40212[(2)] = inst_37684);

(statearr_37834_40212[(1)] = (7));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_37754 === (14))){
var inst_37700 = (state_37753[(19)]);
var state_37753__$1 = state_37753;
var statearr_37836_40214 = state_37753__$1;
(statearr_37836_40214[(2)] = inst_37700);

(statearr_37836_40214[(1)] = (16));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_37754 === (26))){
var inst_37721 = (state_37753[(2)]);
var state_37753__$1 = state_37753;
var statearr_37838_40217 = state_37753__$1;
(statearr_37838_40217[(2)] = inst_37721);

(statearr_37838_40217[(1)] = (22));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_37754 === (16))){
var inst_37712 = (state_37753[(2)]);
var state_37753__$1 = state_37753;
if(cljs.core.truth_(inst_37712)){
var statearr_37839_40218 = state_37753__$1;
(statearr_37839_40218[(1)] = (20));

} else {
var statearr_37840_40219 = state_37753__$1;
(statearr_37840_40219[(1)] = (21));

}

return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_37754 === (10))){
var inst_37749 = (state_37753[(2)]);
var state_37753__$1 = state_37753;
var statearr_37843_40225 = state_37753__$1;
(statearr_37843_40225[(2)] = inst_37749);

(statearr_37843_40225[(1)] = (3));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_37754 === (18))){
var inst_37703 = (state_37753[(16)]);
var state_37753__$1 = state_37753;
var statearr_37844_40226 = state_37753__$1;
(statearr_37844_40226[(2)] = inst_37703);

(statearr_37844_40226[(1)] = (19));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_37754 === (8))){
var inst_37681 = (state_37753[(7)]);
var inst_37691 = (inst_37681 == null);
var state_37753__$1 = state_37753;
if(cljs.core.truth_(inst_37691)){
var statearr_37856_40229 = state_37753__$1;
(statearr_37856_40229[(1)] = (11));

} else {
var statearr_37857_40230 = state_37753__$1;
(statearr_37857_40230[(1)] = (12));

}

return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
return null;
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
});
return (function() {
var cljs$core$async$mix_$_state_machine__35497__auto__ = null;
var cljs$core$async$mix_$_state_machine__35497__auto____0 = (function (){
var statearr_37889 = [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null];
(statearr_37889[(0)] = cljs$core$async$mix_$_state_machine__35497__auto__);

(statearr_37889[(1)] = (1));

return statearr_37889;
});
var cljs$core$async$mix_$_state_machine__35497__auto____1 = (function (state_37753){
while(true){
var ret_value__35499__auto__ = (function (){try{while(true){
var result__35500__auto__ = switch__35496__auto__(state_37753);
if(cljs.core.keyword_identical_QMARK_(result__35500__auto__,new cljs.core.Keyword(null,"recur","recur",-437573268))){
continue;
} else {
return result__35500__auto__;
}
break;
}
}catch (e37923){var ex__35501__auto__ = e37923;
var statearr_37924_40236 = state_37753;
(statearr_37924_40236[(2)] = ex__35501__auto__);


if(cljs.core.seq((state_37753[(4)]))){
var statearr_37926_40238 = state_37753;
(statearr_37926_40238[(1)] = cljs.core.first((state_37753[(4)])));

} else {
throw ex__35501__auto__;
}

return new cljs.core.Keyword(null,"recur","recur",-437573268);
}})();
if(cljs.core.keyword_identical_QMARK_(ret_value__35499__auto__,new cljs.core.Keyword(null,"recur","recur",-437573268))){
var G__40239 = state_37753;
state_37753 = G__40239;
continue;
} else {
return ret_value__35499__auto__;
}
break;
}
});
cljs$core$async$mix_$_state_machine__35497__auto__ = function(state_37753){
switch(arguments.length){
case 0:
return cljs$core$async$mix_$_state_machine__35497__auto____0.call(this);
case 1:
return cljs$core$async$mix_$_state_machine__35497__auto____1.call(this,state_37753);
}
throw(new Error('Invalid arity: ' + arguments.length));
};
cljs$core$async$mix_$_state_machine__35497__auto__.cljs$core$IFn$_invoke$arity$0 = cljs$core$async$mix_$_state_machine__35497__auto____0;
cljs$core$async$mix_$_state_machine__35497__auto__.cljs$core$IFn$_invoke$arity$1 = cljs$core$async$mix_$_state_machine__35497__auto____1;
return cljs$core$async$mix_$_state_machine__35497__auto__;
})()
})();
var state__35927__auto__ = (function (){var statearr_37928 = f__35926__auto__();
(statearr_37928[(6)] = c__35925__auto___40151);

return statearr_37928;
})();
return cljs.core.async.impl.ioc_helpers.run_state_machine_wrapped(state__35927__auto__);
}));


return m;
});
/**
 * Adds ch as an input to the mix
 */
cljs.core.async.admix = (function cljs$core$async$admix(mix,ch){
return cljs.core.async.admix_STAR_(mix,ch);
});
/**
 * Removes ch as an input to the mix
 */
cljs.core.async.unmix = (function cljs$core$async$unmix(mix,ch){
return cljs.core.async.unmix_STAR_(mix,ch);
});
/**
 * removes all inputs from the mix
 */
cljs.core.async.unmix_all = (function cljs$core$async$unmix_all(mix){
return cljs.core.async.unmix_all_STAR_(mix);
});
/**
 * Atomically sets the state(s) of one or more channels in a mix. The
 *   state map is a map of channels -> channel-state-map. A
 *   channel-state-map is a map of attrs -> boolean, where attr is one or
 *   more of :mute, :pause or :solo. Any states supplied are merged with
 *   the current state.
 * 
 *   Note that channels can be added to a mix via toggle, which can be
 *   used to add channels in a particular (e.g. paused) state.
 */
cljs.core.async.toggle = (function cljs$core$async$toggle(mix,state_map){
return cljs.core.async.toggle_STAR_(mix,state_map);
});
/**
 * Sets the solo mode of the mix. mode must be one of :mute or :pause
 */
cljs.core.async.solo_mode = (function cljs$core$async$solo_mode(mix,mode){
return cljs.core.async.solo_mode_STAR_(mix,mode);
});

/**
 * @interface
 */
cljs.core.async.Pub = function(){};

var cljs$core$async$Pub$sub_STAR_$dyn_40298 = (function (p,v,ch,close_QMARK_){
var x__5350__auto__ = (((p == null))?null:p);
var m__5351__auto__ = (cljs.core.async.sub_STAR_[goog.typeOf(x__5350__auto__)]);
if((!((m__5351__auto__ == null)))){
return (m__5351__auto__.cljs$core$IFn$_invoke$arity$4 ? m__5351__auto__.cljs$core$IFn$_invoke$arity$4(p,v,ch,close_QMARK_) : m__5351__auto__.call(null, p,v,ch,close_QMARK_));
} else {
var m__5349__auto__ = (cljs.core.async.sub_STAR_["_"]);
if((!((m__5349__auto__ == null)))){
return (m__5349__auto__.cljs$core$IFn$_invoke$arity$4 ? m__5349__auto__.cljs$core$IFn$_invoke$arity$4(p,v,ch,close_QMARK_) : m__5349__auto__.call(null, p,v,ch,close_QMARK_));
} else {
throw cljs.core.missing_protocol("Pub.sub*",p);
}
}
});
cljs.core.async.sub_STAR_ = (function cljs$core$async$sub_STAR_(p,v,ch,close_QMARK_){
if((((!((p == null)))) && ((!((p.cljs$core$async$Pub$sub_STAR_$arity$4 == null)))))){
return p.cljs$core$async$Pub$sub_STAR_$arity$4(p,v,ch,close_QMARK_);
} else {
return cljs$core$async$Pub$sub_STAR_$dyn_40298(p,v,ch,close_QMARK_);
}
});

var cljs$core$async$Pub$unsub_STAR_$dyn_40309 = (function (p,v,ch){
var x__5350__auto__ = (((p == null))?null:p);
var m__5351__auto__ = (cljs.core.async.unsub_STAR_[goog.typeOf(x__5350__auto__)]);
if((!((m__5351__auto__ == null)))){
return (m__5351__auto__.cljs$core$IFn$_invoke$arity$3 ? m__5351__auto__.cljs$core$IFn$_invoke$arity$3(p,v,ch) : m__5351__auto__.call(null, p,v,ch));
} else {
var m__5349__auto__ = (cljs.core.async.unsub_STAR_["_"]);
if((!((m__5349__auto__ == null)))){
return (m__5349__auto__.cljs$core$IFn$_invoke$arity$3 ? m__5349__auto__.cljs$core$IFn$_invoke$arity$3(p,v,ch) : m__5349__auto__.call(null, p,v,ch));
} else {
throw cljs.core.missing_protocol("Pub.unsub*",p);
}
}
});
cljs.core.async.unsub_STAR_ = (function cljs$core$async$unsub_STAR_(p,v,ch){
if((((!((p == null)))) && ((!((p.cljs$core$async$Pub$unsub_STAR_$arity$3 == null)))))){
return p.cljs$core$async$Pub$unsub_STAR_$arity$3(p,v,ch);
} else {
return cljs$core$async$Pub$unsub_STAR_$dyn_40309(p,v,ch);
}
});

var cljs$core$async$Pub$unsub_all_STAR_$dyn_40312 = (function() {
var G__40313 = null;
var G__40313__1 = (function (p){
var x__5350__auto__ = (((p == null))?null:p);
var m__5351__auto__ = (cljs.core.async.unsub_all_STAR_[goog.typeOf(x__5350__auto__)]);
if((!((m__5351__auto__ == null)))){
return (m__5351__auto__.cljs$core$IFn$_invoke$arity$1 ? m__5351__auto__.cljs$core$IFn$_invoke$arity$1(p) : m__5351__auto__.call(null, p));
} else {
var m__5349__auto__ = (cljs.core.async.unsub_all_STAR_["_"]);
if((!((m__5349__auto__ == null)))){
return (m__5349__auto__.cljs$core$IFn$_invoke$arity$1 ? m__5349__auto__.cljs$core$IFn$_invoke$arity$1(p) : m__5349__auto__.call(null, p));
} else {
throw cljs.core.missing_protocol("Pub.unsub-all*",p);
}
}
});
var G__40313__2 = (function (p,v){
var x__5350__auto__ = (((p == null))?null:p);
var m__5351__auto__ = (cljs.core.async.unsub_all_STAR_[goog.typeOf(x__5350__auto__)]);
if((!((m__5351__auto__ == null)))){
return (m__5351__auto__.cljs$core$IFn$_invoke$arity$2 ? m__5351__auto__.cljs$core$IFn$_invoke$arity$2(p,v) : m__5351__auto__.call(null, p,v));
} else {
var m__5349__auto__ = (cljs.core.async.unsub_all_STAR_["_"]);
if((!((m__5349__auto__ == null)))){
return (m__5349__auto__.cljs$core$IFn$_invoke$arity$2 ? m__5349__auto__.cljs$core$IFn$_invoke$arity$2(p,v) : m__5349__auto__.call(null, p,v));
} else {
throw cljs.core.missing_protocol("Pub.unsub-all*",p);
}
}
});
G__40313 = function(p,v){
switch(arguments.length){
case 1:
return G__40313__1.call(this,p);
case 2:
return G__40313__2.call(this,p,v);
}
throw(new Error('Invalid arity: ' + arguments.length));
};
G__40313.cljs$core$IFn$_invoke$arity$1 = G__40313__1;
G__40313.cljs$core$IFn$_invoke$arity$2 = G__40313__2;
return G__40313;
})()
;
cljs.core.async.unsub_all_STAR_ = (function cljs$core$async$unsub_all_STAR_(var_args){
var G__37970 = arguments.length;
switch (G__37970) {
case 1:
return cljs.core.async.unsub_all_STAR_.cljs$core$IFn$_invoke$arity$1((arguments[(0)]));

break;
case 2:
return cljs.core.async.unsub_all_STAR_.cljs$core$IFn$_invoke$arity$2((arguments[(0)]),(arguments[(1)]));

break;
default:
throw (new Error(["Invalid arity: ",cljs.core.str.cljs$core$IFn$_invoke$arity$1(arguments.length)].join('')));

}
});

(cljs.core.async.unsub_all_STAR_.cljs$core$IFn$_invoke$arity$1 = (function (p){
if((((!((p == null)))) && ((!((p.cljs$core$async$Pub$unsub_all_STAR_$arity$1 == null)))))){
return p.cljs$core$async$Pub$unsub_all_STAR_$arity$1(p);
} else {
return cljs$core$async$Pub$unsub_all_STAR_$dyn_40312(p);
}
}));

(cljs.core.async.unsub_all_STAR_.cljs$core$IFn$_invoke$arity$2 = (function (p,v){
if((((!((p == null)))) && ((!((p.cljs$core$async$Pub$unsub_all_STAR_$arity$2 == null)))))){
return p.cljs$core$async$Pub$unsub_all_STAR_$arity$2(p,v);
} else {
return cljs$core$async$Pub$unsub_all_STAR_$dyn_40312(p,v);
}
}));

(cljs.core.async.unsub_all_STAR_.cljs$lang$maxFixedArity = 2);



/**
* @constructor
 * @implements {cljs.core.async.Pub}
 * @implements {cljs.core.IMeta}
 * @implements {cljs.core.async.Mux}
 * @implements {cljs.core.IWithMeta}
*/
cljs.core.async.t_cljs$core$async37983 = (function (ch,topic_fn,buf_fn,mults,ensure_mult,meta37984){
this.ch = ch;
this.topic_fn = topic_fn;
this.buf_fn = buf_fn;
this.mults = mults;
this.ensure_mult = ensure_mult;
this.meta37984 = meta37984;
this.cljs$lang$protocol_mask$partition0$ = 393216;
this.cljs$lang$protocol_mask$partition1$ = 0;
});
(cljs.core.async.t_cljs$core$async37983.prototype.cljs$core$IWithMeta$_with_meta$arity$2 = (function (_37985,meta37984__$1){
var self__ = this;
var _37985__$1 = this;
return (new cljs.core.async.t_cljs$core$async37983(self__.ch,self__.topic_fn,self__.buf_fn,self__.mults,self__.ensure_mult,meta37984__$1));
}));

(cljs.core.async.t_cljs$core$async37983.prototype.cljs$core$IMeta$_meta$arity$1 = (function (_37985){
var self__ = this;
var _37985__$1 = this;
return self__.meta37984;
}));

(cljs.core.async.t_cljs$core$async37983.prototype.cljs$core$async$Mux$ = cljs.core.PROTOCOL_SENTINEL);

(cljs.core.async.t_cljs$core$async37983.prototype.cljs$core$async$Mux$muxch_STAR_$arity$1 = (function (_){
var self__ = this;
var ___$1 = this;
return self__.ch;
}));

(cljs.core.async.t_cljs$core$async37983.prototype.cljs$core$async$Pub$ = cljs.core.PROTOCOL_SENTINEL);

(cljs.core.async.t_cljs$core$async37983.prototype.cljs$core$async$Pub$sub_STAR_$arity$4 = (function (p,topic,ch__$1,close_QMARK_){
var self__ = this;
var p__$1 = this;
var m = (self__.ensure_mult.cljs$core$IFn$_invoke$arity$1 ? self__.ensure_mult.cljs$core$IFn$_invoke$arity$1(topic) : self__.ensure_mult.call(null, topic));
return cljs.core.async.tap.cljs$core$IFn$_invoke$arity$3(m,ch__$1,close_QMARK_);
}));

(cljs.core.async.t_cljs$core$async37983.prototype.cljs$core$async$Pub$unsub_STAR_$arity$3 = (function (p,topic,ch__$1){
var self__ = this;
var p__$1 = this;
var temp__5804__auto__ = cljs.core.get.cljs$core$IFn$_invoke$arity$2(cljs.core.deref(self__.mults),topic);
if(cljs.core.truth_(temp__5804__auto__)){
var m = temp__5804__auto__;
return cljs.core.async.untap(m,ch__$1);
} else {
return null;
}
}));

(cljs.core.async.t_cljs$core$async37983.prototype.cljs$core$async$Pub$unsub_all_STAR_$arity$1 = (function (_){
var self__ = this;
var ___$1 = this;
return cljs.core.reset_BANG_(self__.mults,cljs.core.PersistentArrayMap.EMPTY);
}));

(cljs.core.async.t_cljs$core$async37983.prototype.cljs$core$async$Pub$unsub_all_STAR_$arity$2 = (function (_,topic){
var self__ = this;
var ___$1 = this;
return cljs.core.swap_BANG_.cljs$core$IFn$_invoke$arity$3(self__.mults,cljs.core.dissoc,topic);
}));

(cljs.core.async.t_cljs$core$async37983.getBasis = (function (){
return new cljs.core.PersistentVector(null, 6, 5, cljs.core.PersistentVector.EMPTY_NODE, [new cljs.core.Symbol(null,"ch","ch",1085813622,null),new cljs.core.Symbol(null,"topic-fn","topic-fn",-862449736,null),new cljs.core.Symbol(null,"buf-fn","buf-fn",-1200281591,null),new cljs.core.Symbol(null,"mults","mults",-461114485,null),new cljs.core.Symbol(null,"ensure-mult","ensure-mult",1796584816,null),new cljs.core.Symbol(null,"meta37984","meta37984",-965141359,null)], null);
}));

(cljs.core.async.t_cljs$core$async37983.cljs$lang$type = true);

(cljs.core.async.t_cljs$core$async37983.cljs$lang$ctorStr = "cljs.core.async/t_cljs$core$async37983");

(cljs.core.async.t_cljs$core$async37983.cljs$lang$ctorPrWriter = (function (this__5287__auto__,writer__5288__auto__,opt__5289__auto__){
return cljs.core._write(writer__5288__auto__,"cljs.core.async/t_cljs$core$async37983");
}));

/**
 * Positional factory function for cljs.core.async/t_cljs$core$async37983.
 */
cljs.core.async.__GT_t_cljs$core$async37983 = (function cljs$core$async$__GT_t_cljs$core$async37983(ch,topic_fn,buf_fn,mults,ensure_mult,meta37984){
return (new cljs.core.async.t_cljs$core$async37983(ch,topic_fn,buf_fn,mults,ensure_mult,meta37984));
});


/**
 * Creates and returns a pub(lication) of the supplied channel,
 *   partitioned into topics by the topic-fn. topic-fn will be applied to
 *   each value on the channel and the result will determine the 'topic'
 *   on which that value will be put. Channels can be subscribed to
 *   receive copies of topics using 'sub', and unsubscribed using
 *   'unsub'. Each topic will be handled by an internal mult on a
 *   dedicated channel. By default these internal channels are
 *   unbuffered, but a buf-fn can be supplied which, given a topic,
 *   creates a buffer with desired properties.
 * 
 *   Each item is distributed to all subs in parallel and synchronously,
 *   i.e. each sub must accept before the next item is distributed. Use
 *   buffering/windowing to prevent slow subs from holding up the pub.
 * 
 *   Items received when there are no matching subs get dropped.
 * 
 *   Note that if buf-fns are used then each topic is handled
 *   asynchronously, i.e. if a channel is subscribed to more than one
 *   topic it should not expect them to be interleaved identically with
 *   the source.
 */
cljs.core.async.pub = (function cljs$core$async$pub(var_args){
var G__37978 = arguments.length;
switch (G__37978) {
case 2:
return cljs.core.async.pub.cljs$core$IFn$_invoke$arity$2((arguments[(0)]),(arguments[(1)]));

break;
case 3:
return cljs.core.async.pub.cljs$core$IFn$_invoke$arity$3((arguments[(0)]),(arguments[(1)]),(arguments[(2)]));

break;
default:
throw (new Error(["Invalid arity: ",cljs.core.str.cljs$core$IFn$_invoke$arity$1(arguments.length)].join('')));

}
});

(cljs.core.async.pub.cljs$core$IFn$_invoke$arity$2 = (function (ch,topic_fn){
return cljs.core.async.pub.cljs$core$IFn$_invoke$arity$3(ch,topic_fn,cljs.core.constantly(null));
}));

(cljs.core.async.pub.cljs$core$IFn$_invoke$arity$3 = (function (ch,topic_fn,buf_fn){
var mults = cljs.core.atom.cljs$core$IFn$_invoke$arity$1(cljs.core.PersistentArrayMap.EMPTY);
var ensure_mult = (function (topic){
var or__5002__auto__ = cljs.core.get.cljs$core$IFn$_invoke$arity$2(cljs.core.deref(mults),topic);
if(cljs.core.truth_(or__5002__auto__)){
return or__5002__auto__;
} else {
return cljs.core.get.cljs$core$IFn$_invoke$arity$2(cljs.core.swap_BANG_.cljs$core$IFn$_invoke$arity$2(mults,(function (p1__37976_SHARP_){
if(cljs.core.truth_((p1__37976_SHARP_.cljs$core$IFn$_invoke$arity$1 ? p1__37976_SHARP_.cljs$core$IFn$_invoke$arity$1(topic) : p1__37976_SHARP_.call(null, topic)))){
return p1__37976_SHARP_;
} else {
return cljs.core.assoc.cljs$core$IFn$_invoke$arity$3(p1__37976_SHARP_,topic,cljs.core.async.mult(cljs.core.async.chan.cljs$core$IFn$_invoke$arity$1((buf_fn.cljs$core$IFn$_invoke$arity$1 ? buf_fn.cljs$core$IFn$_invoke$arity$1(topic) : buf_fn.call(null, topic)))));
}
})),topic);
}
});
var p = (new cljs.core.async.t_cljs$core$async37983(ch,topic_fn,buf_fn,mults,ensure_mult,cljs.core.PersistentArrayMap.EMPTY));
var c__35925__auto___40383 = cljs.core.async.chan.cljs$core$IFn$_invoke$arity$1((1));
cljs.core.async.impl.dispatch.run((function (){
var f__35926__auto__ = (function (){var switch__35496__auto__ = (function (state_38142){
var state_val_38143 = (state_38142[(1)]);
if((state_val_38143 === (7))){
var inst_38137 = (state_38142[(2)]);
var state_38142__$1 = state_38142;
var statearr_38144_40384 = state_38142__$1;
(statearr_38144_40384[(2)] = inst_38137);

(statearr_38144_40384[(1)] = (3));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_38143 === (20))){
var state_38142__$1 = state_38142;
var statearr_38146_40389 = state_38142__$1;
(statearr_38146_40389[(2)] = null);

(statearr_38146_40389[(1)] = (21));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_38143 === (1))){
var state_38142__$1 = state_38142;
var statearr_38147_40390 = state_38142__$1;
(statearr_38147_40390[(2)] = null);

(statearr_38147_40390[(1)] = (2));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_38143 === (24))){
var inst_38119 = (state_38142[(7)]);
var inst_38129 = cljs.core.swap_BANG_.cljs$core$IFn$_invoke$arity$3(mults,cljs.core.dissoc,inst_38119);
var state_38142__$1 = state_38142;
var statearr_38152_40391 = state_38142__$1;
(statearr_38152_40391[(2)] = inst_38129);

(statearr_38152_40391[(1)] = (25));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_38143 === (4))){
var inst_38047 = (state_38142[(8)]);
var inst_38047__$1 = (state_38142[(2)]);
var inst_38050 = (inst_38047__$1 == null);
var state_38142__$1 = (function (){var statearr_38164 = state_38142;
(statearr_38164[(8)] = inst_38047__$1);

return statearr_38164;
})();
if(cljs.core.truth_(inst_38050)){
var statearr_38166_40399 = state_38142__$1;
(statearr_38166_40399[(1)] = (5));

} else {
var statearr_38167_40400 = state_38142__$1;
(statearr_38167_40400[(1)] = (6));

}

return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_38143 === (15))){
var inst_38113 = (state_38142[(2)]);
var state_38142__$1 = state_38142;
var statearr_38190_40406 = state_38142__$1;
(statearr_38190_40406[(2)] = inst_38113);

(statearr_38190_40406[(1)] = (12));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_38143 === (21))){
var inst_38134 = (state_38142[(2)]);
var state_38142__$1 = (function (){var statearr_38194 = state_38142;
(statearr_38194[(9)] = inst_38134);

return statearr_38194;
})();
var statearr_38205_40413 = state_38142__$1;
(statearr_38205_40413[(2)] = null);

(statearr_38205_40413[(1)] = (2));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_38143 === (13))){
var inst_38095 = (state_38142[(10)]);
var inst_38097 = cljs.core.chunked_seq_QMARK_(inst_38095);
var state_38142__$1 = state_38142;
if(inst_38097){
var statearr_38212_40414 = state_38142__$1;
(statearr_38212_40414[(1)] = (16));

} else {
var statearr_38213_40415 = state_38142__$1;
(statearr_38213_40415[(1)] = (17));

}

return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_38143 === (22))){
var inst_38126 = (state_38142[(2)]);
var state_38142__$1 = state_38142;
if(cljs.core.truth_(inst_38126)){
var statearr_38214_40416 = state_38142__$1;
(statearr_38214_40416[(1)] = (23));

} else {
var statearr_38215_40417 = state_38142__$1;
(statearr_38215_40417[(1)] = (24));

}

return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_38143 === (6))){
var inst_38047 = (state_38142[(8)]);
var inst_38119 = (state_38142[(7)]);
var inst_38121 = (state_38142[(11)]);
var inst_38119__$1 = (topic_fn.cljs$core$IFn$_invoke$arity$1 ? topic_fn.cljs$core$IFn$_invoke$arity$1(inst_38047) : topic_fn.call(null, inst_38047));
var inst_38120 = cljs.core.deref(mults);
var inst_38121__$1 = cljs.core.get.cljs$core$IFn$_invoke$arity$2(inst_38120,inst_38119__$1);
var state_38142__$1 = (function (){var statearr_38226 = state_38142;
(statearr_38226[(7)] = inst_38119__$1);

(statearr_38226[(11)] = inst_38121__$1);

return statearr_38226;
})();
if(cljs.core.truth_(inst_38121__$1)){
var statearr_38227_40419 = state_38142__$1;
(statearr_38227_40419[(1)] = (19));

} else {
var statearr_38228_40420 = state_38142__$1;
(statearr_38228_40420[(1)] = (20));

}

return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_38143 === (25))){
var inst_38131 = (state_38142[(2)]);
var state_38142__$1 = state_38142;
var statearr_38229_40423 = state_38142__$1;
(statearr_38229_40423[(2)] = inst_38131);

(statearr_38229_40423[(1)] = (21));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_38143 === (17))){
var inst_38095 = (state_38142[(10)]);
var inst_38104 = cljs.core.first(inst_38095);
var inst_38105 = cljs.core.async.muxch_STAR_(inst_38104);
var inst_38106 = cljs.core.async.close_BANG_(inst_38105);
var inst_38107 = cljs.core.next(inst_38095);
var inst_38064 = inst_38107;
var inst_38065 = null;
var inst_38066 = (0);
var inst_38067 = (0);
var state_38142__$1 = (function (){var statearr_38233 = state_38142;
(statearr_38233[(12)] = inst_38106);

(statearr_38233[(13)] = inst_38064);

(statearr_38233[(14)] = inst_38065);

(statearr_38233[(15)] = inst_38066);

(statearr_38233[(16)] = inst_38067);

return statearr_38233;
})();
var statearr_38234_40424 = state_38142__$1;
(statearr_38234_40424[(2)] = null);

(statearr_38234_40424[(1)] = (8));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_38143 === (3))){
var inst_38140 = (state_38142[(2)]);
var state_38142__$1 = state_38142;
return cljs.core.async.impl.ioc_helpers.return_chan(state_38142__$1,inst_38140);
} else {
if((state_val_38143 === (12))){
var inst_38115 = (state_38142[(2)]);
var state_38142__$1 = state_38142;
var statearr_38235_40425 = state_38142__$1;
(statearr_38235_40425[(2)] = inst_38115);

(statearr_38235_40425[(1)] = (9));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_38143 === (2))){
var state_38142__$1 = state_38142;
return cljs.core.async.impl.ioc_helpers.take_BANG_(state_38142__$1,(4),ch);
} else {
if((state_val_38143 === (23))){
var state_38142__$1 = state_38142;
var statearr_38237_40429 = state_38142__$1;
(statearr_38237_40429[(2)] = null);

(statearr_38237_40429[(1)] = (25));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_38143 === (19))){
var inst_38121 = (state_38142[(11)]);
var inst_38047 = (state_38142[(8)]);
var inst_38124 = cljs.core.async.muxch_STAR_(inst_38121);
var state_38142__$1 = state_38142;
return cljs.core.async.impl.ioc_helpers.put_BANG_(state_38142__$1,(22),inst_38124,inst_38047);
} else {
if((state_val_38143 === (11))){
var inst_38064 = (state_38142[(13)]);
var inst_38095 = (state_38142[(10)]);
var inst_38095__$1 = cljs.core.seq(inst_38064);
var state_38142__$1 = (function (){var statearr_38246 = state_38142;
(statearr_38246[(10)] = inst_38095__$1);

return statearr_38246;
})();
if(inst_38095__$1){
var statearr_38247_40434 = state_38142__$1;
(statearr_38247_40434[(1)] = (13));

} else {
var statearr_38248_40435 = state_38142__$1;
(statearr_38248_40435[(1)] = (14));

}

return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_38143 === (9))){
var inst_38117 = (state_38142[(2)]);
var state_38142__$1 = state_38142;
var statearr_38253_40436 = state_38142__$1;
(statearr_38253_40436[(2)] = inst_38117);

(statearr_38253_40436[(1)] = (7));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_38143 === (5))){
var inst_38061 = cljs.core.deref(mults);
var inst_38062 = cljs.core.vals(inst_38061);
var inst_38063 = cljs.core.seq(inst_38062);
var inst_38064 = inst_38063;
var inst_38065 = null;
var inst_38066 = (0);
var inst_38067 = (0);
var state_38142__$1 = (function (){var statearr_38254 = state_38142;
(statearr_38254[(13)] = inst_38064);

(statearr_38254[(14)] = inst_38065);

(statearr_38254[(15)] = inst_38066);

(statearr_38254[(16)] = inst_38067);

return statearr_38254;
})();
var statearr_38259_40437 = state_38142__$1;
(statearr_38259_40437[(2)] = null);

(statearr_38259_40437[(1)] = (8));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_38143 === (14))){
var state_38142__$1 = state_38142;
var statearr_38265_40438 = state_38142__$1;
(statearr_38265_40438[(2)] = null);

(statearr_38265_40438[(1)] = (15));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_38143 === (16))){
var inst_38095 = (state_38142[(10)]);
var inst_38099 = cljs.core.chunk_first(inst_38095);
var inst_38100 = cljs.core.chunk_rest(inst_38095);
var inst_38101 = cljs.core.count(inst_38099);
var inst_38064 = inst_38100;
var inst_38065 = inst_38099;
var inst_38066 = inst_38101;
var inst_38067 = (0);
var state_38142__$1 = (function (){var statearr_38267 = state_38142;
(statearr_38267[(13)] = inst_38064);

(statearr_38267[(14)] = inst_38065);

(statearr_38267[(15)] = inst_38066);

(statearr_38267[(16)] = inst_38067);

return statearr_38267;
})();
var statearr_38269_40439 = state_38142__$1;
(statearr_38269_40439[(2)] = null);

(statearr_38269_40439[(1)] = (8));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_38143 === (10))){
var inst_38065 = (state_38142[(14)]);
var inst_38067 = (state_38142[(16)]);
var inst_38064 = (state_38142[(13)]);
var inst_38066 = (state_38142[(15)]);
var inst_38087 = cljs.core._nth(inst_38065,inst_38067);
var inst_38089 = cljs.core.async.muxch_STAR_(inst_38087);
var inst_38090 = cljs.core.async.close_BANG_(inst_38089);
var inst_38091 = (inst_38067 + (1));
var tmp38262 = inst_38066;
var tmp38263 = inst_38065;
var tmp38264 = inst_38064;
var inst_38064__$1 = tmp38264;
var inst_38065__$1 = tmp38263;
var inst_38066__$1 = tmp38262;
var inst_38067__$1 = inst_38091;
var state_38142__$1 = (function (){var statearr_38273 = state_38142;
(statearr_38273[(17)] = inst_38090);

(statearr_38273[(13)] = inst_38064__$1);

(statearr_38273[(14)] = inst_38065__$1);

(statearr_38273[(15)] = inst_38066__$1);

(statearr_38273[(16)] = inst_38067__$1);

return statearr_38273;
})();
var statearr_38277_40469 = state_38142__$1;
(statearr_38277_40469[(2)] = null);

(statearr_38277_40469[(1)] = (8));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_38143 === (18))){
var inst_38110 = (state_38142[(2)]);
var state_38142__$1 = state_38142;
var statearr_38278_40485 = state_38142__$1;
(statearr_38278_40485[(2)] = inst_38110);

(statearr_38278_40485[(1)] = (15));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_38143 === (8))){
var inst_38067 = (state_38142[(16)]);
var inst_38066 = (state_38142[(15)]);
var inst_38084 = (inst_38067 < inst_38066);
var inst_38085 = inst_38084;
var state_38142__$1 = state_38142;
if(cljs.core.truth_(inst_38085)){
var statearr_38279_40519 = state_38142__$1;
(statearr_38279_40519[(1)] = (10));

} else {
var statearr_38280_40524 = state_38142__$1;
(statearr_38280_40524[(1)] = (11));

}

return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
return null;
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
});
return (function() {
var cljs$core$async$state_machine__35497__auto__ = null;
var cljs$core$async$state_machine__35497__auto____0 = (function (){
var statearr_38304 = [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null];
(statearr_38304[(0)] = cljs$core$async$state_machine__35497__auto__);

(statearr_38304[(1)] = (1));

return statearr_38304;
});
var cljs$core$async$state_machine__35497__auto____1 = (function (state_38142){
while(true){
var ret_value__35499__auto__ = (function (){try{while(true){
var result__35500__auto__ = switch__35496__auto__(state_38142);
if(cljs.core.keyword_identical_QMARK_(result__35500__auto__,new cljs.core.Keyword(null,"recur","recur",-437573268))){
continue;
} else {
return result__35500__auto__;
}
break;
}
}catch (e38309){var ex__35501__auto__ = e38309;
var statearr_38314_40535 = state_38142;
(statearr_38314_40535[(2)] = ex__35501__auto__);


if(cljs.core.seq((state_38142[(4)]))){
var statearr_38349_40536 = state_38142;
(statearr_38349_40536[(1)] = cljs.core.first((state_38142[(4)])));

} else {
throw ex__35501__auto__;
}

return new cljs.core.Keyword(null,"recur","recur",-437573268);
}})();
if(cljs.core.keyword_identical_QMARK_(ret_value__35499__auto__,new cljs.core.Keyword(null,"recur","recur",-437573268))){
var G__40543 = state_38142;
state_38142 = G__40543;
continue;
} else {
return ret_value__35499__auto__;
}
break;
}
});
cljs$core$async$state_machine__35497__auto__ = function(state_38142){
switch(arguments.length){
case 0:
return cljs$core$async$state_machine__35497__auto____0.call(this);
case 1:
return cljs$core$async$state_machine__35497__auto____1.call(this,state_38142);
}
throw(new Error('Invalid arity: ' + arguments.length));
};
cljs$core$async$state_machine__35497__auto__.cljs$core$IFn$_invoke$arity$0 = cljs$core$async$state_machine__35497__auto____0;
cljs$core$async$state_machine__35497__auto__.cljs$core$IFn$_invoke$arity$1 = cljs$core$async$state_machine__35497__auto____1;
return cljs$core$async$state_machine__35497__auto__;
})()
})();
var state__35927__auto__ = (function (){var statearr_38350 = f__35926__auto__();
(statearr_38350[(6)] = c__35925__auto___40383);

return statearr_38350;
})();
return cljs.core.async.impl.ioc_helpers.run_state_machine_wrapped(state__35927__auto__);
}));


return p;
}));

(cljs.core.async.pub.cljs$lang$maxFixedArity = 3);

/**
 * Subscribes a channel to a topic of a pub.
 * 
 *   By default the channel will be closed when the source closes,
 *   but can be determined by the close? parameter.
 */
cljs.core.async.sub = (function cljs$core$async$sub(var_args){
var G__38356 = arguments.length;
switch (G__38356) {
case 3:
return cljs.core.async.sub.cljs$core$IFn$_invoke$arity$3((arguments[(0)]),(arguments[(1)]),(arguments[(2)]));

break;
case 4:
return cljs.core.async.sub.cljs$core$IFn$_invoke$arity$4((arguments[(0)]),(arguments[(1)]),(arguments[(2)]),(arguments[(3)]));

break;
default:
throw (new Error(["Invalid arity: ",cljs.core.str.cljs$core$IFn$_invoke$arity$1(arguments.length)].join('')));

}
});

(cljs.core.async.sub.cljs$core$IFn$_invoke$arity$3 = (function (p,topic,ch){
return cljs.core.async.sub.cljs$core$IFn$_invoke$arity$4(p,topic,ch,true);
}));

(cljs.core.async.sub.cljs$core$IFn$_invoke$arity$4 = (function (p,topic,ch,close_QMARK_){
return cljs.core.async.sub_STAR_(p,topic,ch,close_QMARK_);
}));

(cljs.core.async.sub.cljs$lang$maxFixedArity = 4);

/**
 * Unsubscribes a channel from a topic of a pub
 */
cljs.core.async.unsub = (function cljs$core$async$unsub(p,topic,ch){
return cljs.core.async.unsub_STAR_(p,topic,ch);
});
/**
 * Unsubscribes all channels from a pub, or a topic of a pub
 */
cljs.core.async.unsub_all = (function cljs$core$async$unsub_all(var_args){
var G__38365 = arguments.length;
switch (G__38365) {
case 1:
return cljs.core.async.unsub_all.cljs$core$IFn$_invoke$arity$1((arguments[(0)]));

break;
case 2:
return cljs.core.async.unsub_all.cljs$core$IFn$_invoke$arity$2((arguments[(0)]),(arguments[(1)]));

break;
default:
throw (new Error(["Invalid arity: ",cljs.core.str.cljs$core$IFn$_invoke$arity$1(arguments.length)].join('')));

}
});

(cljs.core.async.unsub_all.cljs$core$IFn$_invoke$arity$1 = (function (p){
return cljs.core.async.unsub_all_STAR_(p);
}));

(cljs.core.async.unsub_all.cljs$core$IFn$_invoke$arity$2 = (function (p,topic){
return cljs.core.async.unsub_all_STAR_(p,topic);
}));

(cljs.core.async.unsub_all.cljs$lang$maxFixedArity = 2);

/**
 * Takes a function and a collection of source channels, and returns a
 *   channel which contains the values produced by applying f to the set
 *   of first items taken from each source channel, followed by applying
 *   f to the set of second items from each channel, until any one of the
 *   channels is closed, at which point the output channel will be
 *   closed. The returned channel will be unbuffered by default, or a
 *   buf-or-n can be supplied
 */
cljs.core.async.map = (function cljs$core$async$map(var_args){
var G__38371 = arguments.length;
switch (G__38371) {
case 2:
return cljs.core.async.map.cljs$core$IFn$_invoke$arity$2((arguments[(0)]),(arguments[(1)]));

break;
case 3:
return cljs.core.async.map.cljs$core$IFn$_invoke$arity$3((arguments[(0)]),(arguments[(1)]),(arguments[(2)]));

break;
default:
throw (new Error(["Invalid arity: ",cljs.core.str.cljs$core$IFn$_invoke$arity$1(arguments.length)].join('')));

}
});

(cljs.core.async.map.cljs$core$IFn$_invoke$arity$2 = (function (f,chs){
return cljs.core.async.map.cljs$core$IFn$_invoke$arity$3(f,chs,null);
}));

(cljs.core.async.map.cljs$core$IFn$_invoke$arity$3 = (function (f,chs,buf_or_n){
var chs__$1 = cljs.core.vec(chs);
var out = cljs.core.async.chan.cljs$core$IFn$_invoke$arity$1(buf_or_n);
var cnt = cljs.core.count(chs__$1);
var rets = cljs.core.object_array.cljs$core$IFn$_invoke$arity$1(cnt);
var dchan = cljs.core.async.chan.cljs$core$IFn$_invoke$arity$1((1));
var dctr = cljs.core.atom.cljs$core$IFn$_invoke$arity$1(null);
var done = cljs.core.mapv.cljs$core$IFn$_invoke$arity$2((function (i){
return (function (ret){
(rets[i] = ret);

if((cljs.core.swap_BANG_.cljs$core$IFn$_invoke$arity$2(dctr,cljs.core.dec) === (0))){
return cljs.core.async.put_BANG_.cljs$core$IFn$_invoke$arity$2(dchan,rets.slice((0)));
} else {
return null;
}
});
}),cljs.core.range.cljs$core$IFn$_invoke$arity$1(cnt));
if((cnt === (0))){
cljs.core.async.close_BANG_(out);
} else {
var c__35925__auto___40599 = cljs.core.async.chan.cljs$core$IFn$_invoke$arity$1((1));
cljs.core.async.impl.dispatch.run((function (){
var f__35926__auto__ = (function (){var switch__35496__auto__ = (function (state_38418){
var state_val_38419 = (state_38418[(1)]);
if((state_val_38419 === (7))){
var state_38418__$1 = state_38418;
var statearr_38421_40601 = state_38418__$1;
(statearr_38421_40601[(2)] = null);

(statearr_38421_40601[(1)] = (8));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_38419 === (1))){
var state_38418__$1 = state_38418;
var statearr_38423_40604 = state_38418__$1;
(statearr_38423_40604[(2)] = null);

(statearr_38423_40604[(1)] = (2));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_38419 === (4))){
var inst_38377 = (state_38418[(7)]);
var inst_38376 = (state_38418[(8)]);
var inst_38379 = (inst_38377 < inst_38376);
var state_38418__$1 = state_38418;
if(cljs.core.truth_(inst_38379)){
var statearr_38424_40605 = state_38418__$1;
(statearr_38424_40605[(1)] = (6));

} else {
var statearr_38425_40606 = state_38418__$1;
(statearr_38425_40606[(1)] = (7));

}

return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_38419 === (15))){
var inst_38403 = (state_38418[(9)]);
var inst_38409 = cljs.core.apply.cljs$core$IFn$_invoke$arity$2(f,inst_38403);
var state_38418__$1 = state_38418;
return cljs.core.async.impl.ioc_helpers.put_BANG_(state_38418__$1,(17),out,inst_38409);
} else {
if((state_val_38419 === (13))){
var inst_38403 = (state_38418[(9)]);
var inst_38403__$1 = (state_38418[(2)]);
var inst_38404 = cljs.core.some(cljs.core.nil_QMARK_,inst_38403__$1);
var state_38418__$1 = (function (){var statearr_38430 = state_38418;
(statearr_38430[(9)] = inst_38403__$1);

return statearr_38430;
})();
if(cljs.core.truth_(inst_38404)){
var statearr_38432_40616 = state_38418__$1;
(statearr_38432_40616[(1)] = (14));

} else {
var statearr_38433_40617 = state_38418__$1;
(statearr_38433_40617[(1)] = (15));

}

return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_38419 === (6))){
var state_38418__$1 = state_38418;
var statearr_38434_40624 = state_38418__$1;
(statearr_38434_40624[(2)] = null);

(statearr_38434_40624[(1)] = (9));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_38419 === (17))){
var inst_38411 = (state_38418[(2)]);
var state_38418__$1 = (function (){var statearr_38437 = state_38418;
(statearr_38437[(10)] = inst_38411);

return statearr_38437;
})();
var statearr_38438_40626 = state_38418__$1;
(statearr_38438_40626[(2)] = null);

(statearr_38438_40626[(1)] = (2));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_38419 === (3))){
var inst_38416 = (state_38418[(2)]);
var state_38418__$1 = state_38418;
return cljs.core.async.impl.ioc_helpers.return_chan(state_38418__$1,inst_38416);
} else {
if((state_val_38419 === (12))){
var _ = (function (){var statearr_38439 = state_38418;
(statearr_38439[(4)] = cljs.core.rest((state_38418[(4)])));

return statearr_38439;
})();
var state_38418__$1 = state_38418;
var ex38436 = (state_38418__$1[(2)]);
var statearr_38440_40628 = state_38418__$1;
(statearr_38440_40628[(5)] = ex38436);


if((ex38436 instanceof Object)){
var statearr_38450_40632 = state_38418__$1;
(statearr_38450_40632[(1)] = (11));

(statearr_38450_40632[(5)] = null);

} else {
throw ex38436;

}

return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_38419 === (2))){
var inst_38375 = cljs.core.reset_BANG_(dctr,cnt);
var inst_38376 = cnt;
var inst_38377 = (0);
var state_38418__$1 = (function (){var statearr_38457 = state_38418;
(statearr_38457[(11)] = inst_38375);

(statearr_38457[(8)] = inst_38376);

(statearr_38457[(7)] = inst_38377);

return statearr_38457;
})();
var statearr_38458_40633 = state_38418__$1;
(statearr_38458_40633[(2)] = null);

(statearr_38458_40633[(1)] = (4));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_38419 === (11))){
var inst_38382 = (state_38418[(2)]);
var inst_38383 = cljs.core.swap_BANG_.cljs$core$IFn$_invoke$arity$2(dctr,cljs.core.dec);
var state_38418__$1 = (function (){var statearr_38466 = state_38418;
(statearr_38466[(12)] = inst_38382);

return statearr_38466;
})();
var statearr_38467_40639 = state_38418__$1;
(statearr_38467_40639[(2)] = inst_38383);

(statearr_38467_40639[(1)] = (10));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_38419 === (9))){
var inst_38377 = (state_38418[(7)]);
var _ = (function (){var statearr_38468 = state_38418;
(statearr_38468[(4)] = cljs.core.cons((12),(state_38418[(4)])));

return statearr_38468;
})();
var inst_38389 = (chs__$1.cljs$core$IFn$_invoke$arity$1 ? chs__$1.cljs$core$IFn$_invoke$arity$1(inst_38377) : chs__$1.call(null, inst_38377));
var inst_38390 = (done.cljs$core$IFn$_invoke$arity$1 ? done.cljs$core$IFn$_invoke$arity$1(inst_38377) : done.call(null, inst_38377));
var inst_38391 = cljs.core.async.take_BANG_.cljs$core$IFn$_invoke$arity$2(inst_38389,inst_38390);
var ___$1 = (function (){var statearr_38472 = state_38418;
(statearr_38472[(4)] = cljs.core.rest((state_38418[(4)])));

return statearr_38472;
})();
var state_38418__$1 = state_38418;
var statearr_38473_40640 = state_38418__$1;
(statearr_38473_40640[(2)] = inst_38391);

(statearr_38473_40640[(1)] = (10));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_38419 === (5))){
var inst_38401 = (state_38418[(2)]);
var state_38418__$1 = (function (){var statearr_38477 = state_38418;
(statearr_38477[(13)] = inst_38401);

return statearr_38477;
})();
return cljs.core.async.impl.ioc_helpers.take_BANG_(state_38418__$1,(13),dchan);
} else {
if((state_val_38419 === (14))){
var inst_38406 = cljs.core.async.close_BANG_(out);
var state_38418__$1 = state_38418;
var statearr_38478_40641 = state_38418__$1;
(statearr_38478_40641[(2)] = inst_38406);

(statearr_38478_40641[(1)] = (16));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_38419 === (16))){
var inst_38414 = (state_38418[(2)]);
var state_38418__$1 = state_38418;
var statearr_38480_40643 = state_38418__$1;
(statearr_38480_40643[(2)] = inst_38414);

(statearr_38480_40643[(1)] = (3));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_38419 === (10))){
var inst_38377 = (state_38418[(7)]);
var inst_38394 = (state_38418[(2)]);
var inst_38395 = (inst_38377 + (1));
var inst_38377__$1 = inst_38395;
var state_38418__$1 = (function (){var statearr_38481 = state_38418;
(statearr_38481[(14)] = inst_38394);

(statearr_38481[(7)] = inst_38377__$1);

return statearr_38481;
})();
var statearr_38482_40644 = state_38418__$1;
(statearr_38482_40644[(2)] = null);

(statearr_38482_40644[(1)] = (4));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_38419 === (8))){
var inst_38399 = (state_38418[(2)]);
var state_38418__$1 = state_38418;
var statearr_38484_40645 = state_38418__$1;
(statearr_38484_40645[(2)] = inst_38399);

(statearr_38484_40645[(1)] = (5));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
return null;
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
});
return (function() {
var cljs$core$async$state_machine__35497__auto__ = null;
var cljs$core$async$state_machine__35497__auto____0 = (function (){
var statearr_38488 = [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null];
(statearr_38488[(0)] = cljs$core$async$state_machine__35497__auto__);

(statearr_38488[(1)] = (1));

return statearr_38488;
});
var cljs$core$async$state_machine__35497__auto____1 = (function (state_38418){
while(true){
var ret_value__35499__auto__ = (function (){try{while(true){
var result__35500__auto__ = switch__35496__auto__(state_38418);
if(cljs.core.keyword_identical_QMARK_(result__35500__auto__,new cljs.core.Keyword(null,"recur","recur",-437573268))){
continue;
} else {
return result__35500__auto__;
}
break;
}
}catch (e38490){var ex__35501__auto__ = e38490;
var statearr_38491_40646 = state_38418;
(statearr_38491_40646[(2)] = ex__35501__auto__);


if(cljs.core.seq((state_38418[(4)]))){
var statearr_38493_40647 = state_38418;
(statearr_38493_40647[(1)] = cljs.core.first((state_38418[(4)])));

} else {
throw ex__35501__auto__;
}

return new cljs.core.Keyword(null,"recur","recur",-437573268);
}})();
if(cljs.core.keyword_identical_QMARK_(ret_value__35499__auto__,new cljs.core.Keyword(null,"recur","recur",-437573268))){
var G__40648 = state_38418;
state_38418 = G__40648;
continue;
} else {
return ret_value__35499__auto__;
}
break;
}
});
cljs$core$async$state_machine__35497__auto__ = function(state_38418){
switch(arguments.length){
case 0:
return cljs$core$async$state_machine__35497__auto____0.call(this);
case 1:
return cljs$core$async$state_machine__35497__auto____1.call(this,state_38418);
}
throw(new Error('Invalid arity: ' + arguments.length));
};
cljs$core$async$state_machine__35497__auto__.cljs$core$IFn$_invoke$arity$0 = cljs$core$async$state_machine__35497__auto____0;
cljs$core$async$state_machine__35497__auto__.cljs$core$IFn$_invoke$arity$1 = cljs$core$async$state_machine__35497__auto____1;
return cljs$core$async$state_machine__35497__auto__;
})()
})();
var state__35927__auto__ = (function (){var statearr_38497 = f__35926__auto__();
(statearr_38497[(6)] = c__35925__auto___40599);

return statearr_38497;
})();
return cljs.core.async.impl.ioc_helpers.run_state_machine_wrapped(state__35927__auto__);
}));

}

return out;
}));

(cljs.core.async.map.cljs$lang$maxFixedArity = 3);

/**
 * Takes a collection of source channels and returns a channel which
 *   contains all values taken from them. The returned channel will be
 *   unbuffered by default, or a buf-or-n can be supplied. The channel
 *   will close after all the source channels have closed.
 */
cljs.core.async.merge = (function cljs$core$async$merge(var_args){
var G__38503 = arguments.length;
switch (G__38503) {
case 1:
return cljs.core.async.merge.cljs$core$IFn$_invoke$arity$1((arguments[(0)]));

break;
case 2:
return cljs.core.async.merge.cljs$core$IFn$_invoke$arity$2((arguments[(0)]),(arguments[(1)]));

break;
default:
throw (new Error(["Invalid arity: ",cljs.core.str.cljs$core$IFn$_invoke$arity$1(arguments.length)].join('')));

}
});

(cljs.core.async.merge.cljs$core$IFn$_invoke$arity$1 = (function (chs){
return cljs.core.async.merge.cljs$core$IFn$_invoke$arity$2(chs,null);
}));

(cljs.core.async.merge.cljs$core$IFn$_invoke$arity$2 = (function (chs,buf_or_n){
var out = cljs.core.async.chan.cljs$core$IFn$_invoke$arity$1(buf_or_n);
var c__35925__auto___40653 = cljs.core.async.chan.cljs$core$IFn$_invoke$arity$1((1));
cljs.core.async.impl.dispatch.run((function (){
var f__35926__auto__ = (function (){var switch__35496__auto__ = (function (state_38613){
var state_val_38616 = (state_38613[(1)]);
if((state_val_38616 === (7))){
var inst_38586 = (state_38613[(7)]);
var inst_38587 = (state_38613[(8)]);
var inst_38586__$1 = (state_38613[(2)]);
var inst_38587__$1 = cljs.core.nth.cljs$core$IFn$_invoke$arity$3(inst_38586__$1,(0),null);
var inst_38588 = cljs.core.nth.cljs$core$IFn$_invoke$arity$3(inst_38586__$1,(1),null);
var inst_38589 = (inst_38587__$1 == null);
var state_38613__$1 = (function (){var statearr_38622 = state_38613;
(statearr_38622[(7)] = inst_38586__$1);

(statearr_38622[(8)] = inst_38587__$1);

(statearr_38622[(9)] = inst_38588);

return statearr_38622;
})();
if(cljs.core.truth_(inst_38589)){
var statearr_38623_40654 = state_38613__$1;
(statearr_38623_40654[(1)] = (8));

} else {
var statearr_38624_40655 = state_38613__$1;
(statearr_38624_40655[(1)] = (9));

}

return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_38616 === (1))){
var inst_38542 = cljs.core.vec(chs);
var inst_38544 = inst_38542;
var state_38613__$1 = (function (){var statearr_38625 = state_38613;
(statearr_38625[(10)] = inst_38544);

return statearr_38625;
})();
var statearr_38626_40656 = state_38613__$1;
(statearr_38626_40656[(2)] = null);

(statearr_38626_40656[(1)] = (2));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_38616 === (4))){
var inst_38544 = (state_38613[(10)]);
var state_38613__$1 = state_38613;
return cljs.core.async.ioc_alts_BANG_(state_38613__$1,(7),inst_38544);
} else {
if((state_val_38616 === (6))){
var inst_38609 = (state_38613[(2)]);
var state_38613__$1 = state_38613;
var statearr_38630_40657 = state_38613__$1;
(statearr_38630_40657[(2)] = inst_38609);

(statearr_38630_40657[(1)] = (3));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_38616 === (3))){
var inst_38611 = (state_38613[(2)]);
var state_38613__$1 = state_38613;
return cljs.core.async.impl.ioc_helpers.return_chan(state_38613__$1,inst_38611);
} else {
if((state_val_38616 === (2))){
var inst_38544 = (state_38613[(10)]);
var inst_38573 = cljs.core.count(inst_38544);
var inst_38574 = (inst_38573 > (0));
var state_38613__$1 = state_38613;
if(cljs.core.truth_(inst_38574)){
var statearr_38632_40658 = state_38613__$1;
(statearr_38632_40658[(1)] = (4));

} else {
var statearr_38633_40659 = state_38613__$1;
(statearr_38633_40659[(1)] = (5));

}

return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_38616 === (11))){
var inst_38544 = (state_38613[(10)]);
var inst_38601 = (state_38613[(2)]);
var tmp38631 = inst_38544;
var inst_38544__$1 = tmp38631;
var state_38613__$1 = (function (){var statearr_38634 = state_38613;
(statearr_38634[(11)] = inst_38601);

(statearr_38634[(10)] = inst_38544__$1);

return statearr_38634;
})();
var statearr_38635_40660 = state_38613__$1;
(statearr_38635_40660[(2)] = null);

(statearr_38635_40660[(1)] = (2));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_38616 === (9))){
var inst_38587 = (state_38613[(8)]);
var state_38613__$1 = state_38613;
return cljs.core.async.impl.ioc_helpers.put_BANG_(state_38613__$1,(11),out,inst_38587);
} else {
if((state_val_38616 === (5))){
var inst_38607 = cljs.core.async.close_BANG_(out);
var state_38613__$1 = state_38613;
var statearr_38642_40661 = state_38613__$1;
(statearr_38642_40661[(2)] = inst_38607);

(statearr_38642_40661[(1)] = (6));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_38616 === (10))){
var inst_38604 = (state_38613[(2)]);
var state_38613__$1 = state_38613;
var statearr_38646_40666 = state_38613__$1;
(statearr_38646_40666[(2)] = inst_38604);

(statearr_38646_40666[(1)] = (6));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_38616 === (8))){
var inst_38544 = (state_38613[(10)]);
var inst_38586 = (state_38613[(7)]);
var inst_38587 = (state_38613[(8)]);
var inst_38588 = (state_38613[(9)]);
var inst_38595 = (function (){var cs = inst_38544;
var vec__38576 = inst_38586;
var v = inst_38587;
var c = inst_38588;
return (function (p1__38498_SHARP_){
return cljs.core.not_EQ_.cljs$core$IFn$_invoke$arity$2(c,p1__38498_SHARP_);
});
})();
var inst_38596 = cljs.core.filterv(inst_38595,inst_38544);
var inst_38544__$1 = inst_38596;
var state_38613__$1 = (function (){var statearr_38652 = state_38613;
(statearr_38652[(10)] = inst_38544__$1);

return statearr_38652;
})();
var statearr_38654_40667 = state_38613__$1;
(statearr_38654_40667[(2)] = null);

(statearr_38654_40667[(1)] = (2));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
return null;
}
}
}
}
}
}
}
}
}
}
}
});
return (function() {
var cljs$core$async$state_machine__35497__auto__ = null;
var cljs$core$async$state_machine__35497__auto____0 = (function (){
var statearr_38655 = [null,null,null,null,null,null,null,null,null,null,null,null];
(statearr_38655[(0)] = cljs$core$async$state_machine__35497__auto__);

(statearr_38655[(1)] = (1));

return statearr_38655;
});
var cljs$core$async$state_machine__35497__auto____1 = (function (state_38613){
while(true){
var ret_value__35499__auto__ = (function (){try{while(true){
var result__35500__auto__ = switch__35496__auto__(state_38613);
if(cljs.core.keyword_identical_QMARK_(result__35500__auto__,new cljs.core.Keyword(null,"recur","recur",-437573268))){
continue;
} else {
return result__35500__auto__;
}
break;
}
}catch (e38660){var ex__35501__auto__ = e38660;
var statearr_38665_40677 = state_38613;
(statearr_38665_40677[(2)] = ex__35501__auto__);


if(cljs.core.seq((state_38613[(4)]))){
var statearr_38670_40678 = state_38613;
(statearr_38670_40678[(1)] = cljs.core.first((state_38613[(4)])));

} else {
throw ex__35501__auto__;
}

return new cljs.core.Keyword(null,"recur","recur",-437573268);
}})();
if(cljs.core.keyword_identical_QMARK_(ret_value__35499__auto__,new cljs.core.Keyword(null,"recur","recur",-437573268))){
var G__40679 = state_38613;
state_38613 = G__40679;
continue;
} else {
return ret_value__35499__auto__;
}
break;
}
});
cljs$core$async$state_machine__35497__auto__ = function(state_38613){
switch(arguments.length){
case 0:
return cljs$core$async$state_machine__35497__auto____0.call(this);
case 1:
return cljs$core$async$state_machine__35497__auto____1.call(this,state_38613);
}
throw(new Error('Invalid arity: ' + arguments.length));
};
cljs$core$async$state_machine__35497__auto__.cljs$core$IFn$_invoke$arity$0 = cljs$core$async$state_machine__35497__auto____0;
cljs$core$async$state_machine__35497__auto__.cljs$core$IFn$_invoke$arity$1 = cljs$core$async$state_machine__35497__auto____1;
return cljs$core$async$state_machine__35497__auto__;
})()
})();
var state__35927__auto__ = (function (){var statearr_38671 = f__35926__auto__();
(statearr_38671[(6)] = c__35925__auto___40653);

return statearr_38671;
})();
return cljs.core.async.impl.ioc_helpers.run_state_machine_wrapped(state__35927__auto__);
}));


return out;
}));

(cljs.core.async.merge.cljs$lang$maxFixedArity = 2);

/**
 * Returns a channel containing the single (collection) result of the
 *   items taken from the channel conjoined to the supplied
 *   collection. ch must close before into produces a result.
 */
cljs.core.async.into = (function cljs$core$async$into(coll,ch){
return cljs.core.async.reduce(cljs.core.conj,coll,ch);
});
/**
 * Returns a channel that will return, at most, n items from ch. After n items
 * have been returned, or ch has been closed, the return chanel will close.
 * 
 *   The output channel is unbuffered by default, unless buf-or-n is given.
 */
cljs.core.async.take = (function cljs$core$async$take(var_args){
var G__38676 = arguments.length;
switch (G__38676) {
case 2:
return cljs.core.async.take.cljs$core$IFn$_invoke$arity$2((arguments[(0)]),(arguments[(1)]));

break;
case 3:
return cljs.core.async.take.cljs$core$IFn$_invoke$arity$3((arguments[(0)]),(arguments[(1)]),(arguments[(2)]));

break;
default:
throw (new Error(["Invalid arity: ",cljs.core.str.cljs$core$IFn$_invoke$arity$1(arguments.length)].join('')));

}
});

(cljs.core.async.take.cljs$core$IFn$_invoke$arity$2 = (function (n,ch){
return cljs.core.async.take.cljs$core$IFn$_invoke$arity$3(n,ch,null);
}));

(cljs.core.async.take.cljs$core$IFn$_invoke$arity$3 = (function (n,ch,buf_or_n){
var out = cljs.core.async.chan.cljs$core$IFn$_invoke$arity$1(buf_or_n);
var c__35925__auto___40698 = cljs.core.async.chan.cljs$core$IFn$_invoke$arity$1((1));
cljs.core.async.impl.dispatch.run((function (){
var f__35926__auto__ = (function (){var switch__35496__auto__ = (function (state_38704){
var state_val_38705 = (state_38704[(1)]);
if((state_val_38705 === (7))){
var inst_38686 = (state_38704[(7)]);
var inst_38686__$1 = (state_38704[(2)]);
var inst_38687 = (inst_38686__$1 == null);
var inst_38688 = cljs.core.not(inst_38687);
var state_38704__$1 = (function (){var statearr_38706 = state_38704;
(statearr_38706[(7)] = inst_38686__$1);

return statearr_38706;
})();
if(inst_38688){
var statearr_38707_40699 = state_38704__$1;
(statearr_38707_40699[(1)] = (8));

} else {
var statearr_38709_40700 = state_38704__$1;
(statearr_38709_40700[(1)] = (9));

}

return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_38705 === (1))){
var inst_38681 = (0);
var state_38704__$1 = (function (){var statearr_38710 = state_38704;
(statearr_38710[(8)] = inst_38681);

return statearr_38710;
})();
var statearr_38711_40701 = state_38704__$1;
(statearr_38711_40701[(2)] = null);

(statearr_38711_40701[(1)] = (2));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_38705 === (4))){
var state_38704__$1 = state_38704;
return cljs.core.async.impl.ioc_helpers.take_BANG_(state_38704__$1,(7),ch);
} else {
if((state_val_38705 === (6))){
var inst_38699 = (state_38704[(2)]);
var state_38704__$1 = state_38704;
var statearr_38712_40703 = state_38704__$1;
(statearr_38712_40703[(2)] = inst_38699);

(statearr_38712_40703[(1)] = (3));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_38705 === (3))){
var inst_38701 = (state_38704[(2)]);
var inst_38702 = cljs.core.async.close_BANG_(out);
var state_38704__$1 = (function (){var statearr_38716 = state_38704;
(statearr_38716[(9)] = inst_38701);

return statearr_38716;
})();
return cljs.core.async.impl.ioc_helpers.return_chan(state_38704__$1,inst_38702);
} else {
if((state_val_38705 === (2))){
var inst_38681 = (state_38704[(8)]);
var inst_38683 = (inst_38681 < n);
var state_38704__$1 = state_38704;
if(cljs.core.truth_(inst_38683)){
var statearr_38722_40707 = state_38704__$1;
(statearr_38722_40707[(1)] = (4));

} else {
var statearr_38723_40708 = state_38704__$1;
(statearr_38723_40708[(1)] = (5));

}

return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_38705 === (11))){
var inst_38681 = (state_38704[(8)]);
var inst_38691 = (state_38704[(2)]);
var inst_38692 = (inst_38681 + (1));
var inst_38681__$1 = inst_38692;
var state_38704__$1 = (function (){var statearr_38727 = state_38704;
(statearr_38727[(10)] = inst_38691);

(statearr_38727[(8)] = inst_38681__$1);

return statearr_38727;
})();
var statearr_38728_40712 = state_38704__$1;
(statearr_38728_40712[(2)] = null);

(statearr_38728_40712[(1)] = (2));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_38705 === (9))){
var state_38704__$1 = state_38704;
var statearr_38733_40717 = state_38704__$1;
(statearr_38733_40717[(2)] = null);

(statearr_38733_40717[(1)] = (10));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_38705 === (5))){
var state_38704__$1 = state_38704;
var statearr_38738_40718 = state_38704__$1;
(statearr_38738_40718[(2)] = null);

(statearr_38738_40718[(1)] = (6));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_38705 === (10))){
var inst_38696 = (state_38704[(2)]);
var state_38704__$1 = state_38704;
var statearr_38743_40719 = state_38704__$1;
(statearr_38743_40719[(2)] = inst_38696);

(statearr_38743_40719[(1)] = (6));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_38705 === (8))){
var inst_38686 = (state_38704[(7)]);
var state_38704__$1 = state_38704;
return cljs.core.async.impl.ioc_helpers.put_BANG_(state_38704__$1,(11),out,inst_38686);
} else {
return null;
}
}
}
}
}
}
}
}
}
}
}
});
return (function() {
var cljs$core$async$state_machine__35497__auto__ = null;
var cljs$core$async$state_machine__35497__auto____0 = (function (){
var statearr_38744 = [null,null,null,null,null,null,null,null,null,null,null];
(statearr_38744[(0)] = cljs$core$async$state_machine__35497__auto__);

(statearr_38744[(1)] = (1));

return statearr_38744;
});
var cljs$core$async$state_machine__35497__auto____1 = (function (state_38704){
while(true){
var ret_value__35499__auto__ = (function (){try{while(true){
var result__35500__auto__ = switch__35496__auto__(state_38704);
if(cljs.core.keyword_identical_QMARK_(result__35500__auto__,new cljs.core.Keyword(null,"recur","recur",-437573268))){
continue;
} else {
return result__35500__auto__;
}
break;
}
}catch (e38745){var ex__35501__auto__ = e38745;
var statearr_38747_40727 = state_38704;
(statearr_38747_40727[(2)] = ex__35501__auto__);


if(cljs.core.seq((state_38704[(4)]))){
var statearr_38748_40728 = state_38704;
(statearr_38748_40728[(1)] = cljs.core.first((state_38704[(4)])));

} else {
throw ex__35501__auto__;
}

return new cljs.core.Keyword(null,"recur","recur",-437573268);
}})();
if(cljs.core.keyword_identical_QMARK_(ret_value__35499__auto__,new cljs.core.Keyword(null,"recur","recur",-437573268))){
var G__40732 = state_38704;
state_38704 = G__40732;
continue;
} else {
return ret_value__35499__auto__;
}
break;
}
});
cljs$core$async$state_machine__35497__auto__ = function(state_38704){
switch(arguments.length){
case 0:
return cljs$core$async$state_machine__35497__auto____0.call(this);
case 1:
return cljs$core$async$state_machine__35497__auto____1.call(this,state_38704);
}
throw(new Error('Invalid arity: ' + arguments.length));
};
cljs$core$async$state_machine__35497__auto__.cljs$core$IFn$_invoke$arity$0 = cljs$core$async$state_machine__35497__auto____0;
cljs$core$async$state_machine__35497__auto__.cljs$core$IFn$_invoke$arity$1 = cljs$core$async$state_machine__35497__auto____1;
return cljs$core$async$state_machine__35497__auto__;
})()
})();
var state__35927__auto__ = (function (){var statearr_38749 = f__35926__auto__();
(statearr_38749[(6)] = c__35925__auto___40698);

return statearr_38749;
})();
return cljs.core.async.impl.ioc_helpers.run_state_machine_wrapped(state__35927__auto__);
}));


return out;
}));

(cljs.core.async.take.cljs$lang$maxFixedArity = 3);


/**
* @constructor
 * @implements {cljs.core.async.impl.protocols.Handler}
 * @implements {cljs.core.IMeta}
 * @implements {cljs.core.IWithMeta}
*/
cljs.core.async.t_cljs$core$async38763 = (function (f,ch,meta38758,_,fn1,meta38764){
this.f = f;
this.ch = ch;
this.meta38758 = meta38758;
this._ = _;
this.fn1 = fn1;
this.meta38764 = meta38764;
this.cljs$lang$protocol_mask$partition0$ = 393216;
this.cljs$lang$protocol_mask$partition1$ = 0;
});
(cljs.core.async.t_cljs$core$async38763.prototype.cljs$core$IWithMeta$_with_meta$arity$2 = (function (_38765,meta38764__$1){
var self__ = this;
var _38765__$1 = this;
return (new cljs.core.async.t_cljs$core$async38763(self__.f,self__.ch,self__.meta38758,self__._,self__.fn1,meta38764__$1));
}));

(cljs.core.async.t_cljs$core$async38763.prototype.cljs$core$IMeta$_meta$arity$1 = (function (_38765){
var self__ = this;
var _38765__$1 = this;
return self__.meta38764;
}));

(cljs.core.async.t_cljs$core$async38763.prototype.cljs$core$async$impl$protocols$Handler$ = cljs.core.PROTOCOL_SENTINEL);

(cljs.core.async.t_cljs$core$async38763.prototype.cljs$core$async$impl$protocols$Handler$active_QMARK_$arity$1 = (function (___$1){
var self__ = this;
var ___$2 = this;
return cljs.core.async.impl.protocols.active_QMARK_(self__.fn1);
}));

(cljs.core.async.t_cljs$core$async38763.prototype.cljs$core$async$impl$protocols$Handler$blockable_QMARK_$arity$1 = (function (___$1){
var self__ = this;
var ___$2 = this;
return true;
}));

(cljs.core.async.t_cljs$core$async38763.prototype.cljs$core$async$impl$protocols$Handler$commit$arity$1 = (function (___$1){
var self__ = this;
var ___$2 = this;
var f1 = cljs.core.async.impl.protocols.commit(self__.fn1);
return (function (p1__38753_SHARP_){
var G__38777 = (((p1__38753_SHARP_ == null))?null:(self__.f.cljs$core$IFn$_invoke$arity$1 ? self__.f.cljs$core$IFn$_invoke$arity$1(p1__38753_SHARP_) : self__.f.call(null, p1__38753_SHARP_)));
return (f1.cljs$core$IFn$_invoke$arity$1 ? f1.cljs$core$IFn$_invoke$arity$1(G__38777) : f1.call(null, G__38777));
});
}));

(cljs.core.async.t_cljs$core$async38763.getBasis = (function (){
return new cljs.core.PersistentVector(null, 6, 5, cljs.core.PersistentVector.EMPTY_NODE, [new cljs.core.Symbol(null,"f","f",43394975,null),new cljs.core.Symbol(null,"ch","ch",1085813622,null),new cljs.core.Symbol(null,"meta38758","meta38758",-231709322,null),cljs.core.with_meta(new cljs.core.Symbol(null,"_","_",-1201019570,null),new cljs.core.PersistentArrayMap(null, 1, [new cljs.core.Keyword(null,"tag","tag",-1290361223),new cljs.core.Symbol("cljs.core.async","t_cljs$core$async38757","cljs.core.async/t_cljs$core$async38757",-1966657545,null)], null)),new cljs.core.Symbol(null,"fn1","fn1",895834444,null),new cljs.core.Symbol(null,"meta38764","meta38764",361808373,null)], null);
}));

(cljs.core.async.t_cljs$core$async38763.cljs$lang$type = true);

(cljs.core.async.t_cljs$core$async38763.cljs$lang$ctorStr = "cljs.core.async/t_cljs$core$async38763");

(cljs.core.async.t_cljs$core$async38763.cljs$lang$ctorPrWriter = (function (this__5287__auto__,writer__5288__auto__,opt__5289__auto__){
return cljs.core._write(writer__5288__auto__,"cljs.core.async/t_cljs$core$async38763");
}));

/**
 * Positional factory function for cljs.core.async/t_cljs$core$async38763.
 */
cljs.core.async.__GT_t_cljs$core$async38763 = (function cljs$core$async$__GT_t_cljs$core$async38763(f,ch,meta38758,_,fn1,meta38764){
return (new cljs.core.async.t_cljs$core$async38763(f,ch,meta38758,_,fn1,meta38764));
});



/**
* @constructor
 * @implements {cljs.core.async.impl.protocols.Channel}
 * @implements {cljs.core.async.impl.protocols.WritePort}
 * @implements {cljs.core.async.impl.protocols.ReadPort}
 * @implements {cljs.core.IMeta}
 * @implements {cljs.core.IWithMeta}
*/
cljs.core.async.t_cljs$core$async38757 = (function (f,ch,meta38758){
this.f = f;
this.ch = ch;
this.meta38758 = meta38758;
this.cljs$lang$protocol_mask$partition0$ = 393216;
this.cljs$lang$protocol_mask$partition1$ = 0;
});
(cljs.core.async.t_cljs$core$async38757.prototype.cljs$core$IWithMeta$_with_meta$arity$2 = (function (_38759,meta38758__$1){
var self__ = this;
var _38759__$1 = this;
return (new cljs.core.async.t_cljs$core$async38757(self__.f,self__.ch,meta38758__$1));
}));

(cljs.core.async.t_cljs$core$async38757.prototype.cljs$core$IMeta$_meta$arity$1 = (function (_38759){
var self__ = this;
var _38759__$1 = this;
return self__.meta38758;
}));

(cljs.core.async.t_cljs$core$async38757.prototype.cljs$core$async$impl$protocols$Channel$ = cljs.core.PROTOCOL_SENTINEL);

(cljs.core.async.t_cljs$core$async38757.prototype.cljs$core$async$impl$protocols$Channel$close_BANG_$arity$1 = (function (_){
var self__ = this;
var ___$1 = this;
return cljs.core.async.impl.protocols.close_BANG_(self__.ch);
}));

(cljs.core.async.t_cljs$core$async38757.prototype.cljs$core$async$impl$protocols$Channel$closed_QMARK_$arity$1 = (function (_){
var self__ = this;
var ___$1 = this;
return cljs.core.async.impl.protocols.closed_QMARK_(self__.ch);
}));

(cljs.core.async.t_cljs$core$async38757.prototype.cljs$core$async$impl$protocols$ReadPort$ = cljs.core.PROTOCOL_SENTINEL);

(cljs.core.async.t_cljs$core$async38757.prototype.cljs$core$async$impl$protocols$ReadPort$take_BANG_$arity$2 = (function (_,fn1){
var self__ = this;
var ___$1 = this;
var ret = cljs.core.async.impl.protocols.take_BANG_(self__.ch,(new cljs.core.async.t_cljs$core$async38763(self__.f,self__.ch,self__.meta38758,___$1,fn1,cljs.core.PersistentArrayMap.EMPTY)));
if(cljs.core.truth_((function (){var and__5000__auto__ = ret;
if(cljs.core.truth_(and__5000__auto__)){
return (!((cljs.core.deref(ret) == null)));
} else {
return and__5000__auto__;
}
})())){
return cljs.core.async.impl.channels.box((function (){var G__38801 = cljs.core.deref(ret);
return (self__.f.cljs$core$IFn$_invoke$arity$1 ? self__.f.cljs$core$IFn$_invoke$arity$1(G__38801) : self__.f.call(null, G__38801));
})());
} else {
return ret;
}
}));

(cljs.core.async.t_cljs$core$async38757.prototype.cljs$core$async$impl$protocols$WritePort$ = cljs.core.PROTOCOL_SENTINEL);

(cljs.core.async.t_cljs$core$async38757.prototype.cljs$core$async$impl$protocols$WritePort$put_BANG_$arity$3 = (function (_,val,fn1){
var self__ = this;
var ___$1 = this;
return cljs.core.async.impl.protocols.put_BANG_(self__.ch,val,fn1);
}));

(cljs.core.async.t_cljs$core$async38757.getBasis = (function (){
return new cljs.core.PersistentVector(null, 3, 5, cljs.core.PersistentVector.EMPTY_NODE, [new cljs.core.Symbol(null,"f","f",43394975,null),new cljs.core.Symbol(null,"ch","ch",1085813622,null),new cljs.core.Symbol(null,"meta38758","meta38758",-231709322,null)], null);
}));

(cljs.core.async.t_cljs$core$async38757.cljs$lang$type = true);

(cljs.core.async.t_cljs$core$async38757.cljs$lang$ctorStr = "cljs.core.async/t_cljs$core$async38757");

(cljs.core.async.t_cljs$core$async38757.cljs$lang$ctorPrWriter = (function (this__5287__auto__,writer__5288__auto__,opt__5289__auto__){
return cljs.core._write(writer__5288__auto__,"cljs.core.async/t_cljs$core$async38757");
}));

/**
 * Positional factory function for cljs.core.async/t_cljs$core$async38757.
 */
cljs.core.async.__GT_t_cljs$core$async38757 = (function cljs$core$async$__GT_t_cljs$core$async38757(f,ch,meta38758){
return (new cljs.core.async.t_cljs$core$async38757(f,ch,meta38758));
});


/**
 * Deprecated - this function will be removed. Use transducer instead
 */
cljs.core.async.map_LT_ = (function cljs$core$async$map_LT_(f,ch){
return (new cljs.core.async.t_cljs$core$async38757(f,ch,cljs.core.PersistentArrayMap.EMPTY));
});

/**
* @constructor
 * @implements {cljs.core.async.impl.protocols.Channel}
 * @implements {cljs.core.async.impl.protocols.WritePort}
 * @implements {cljs.core.async.impl.protocols.ReadPort}
 * @implements {cljs.core.IMeta}
 * @implements {cljs.core.IWithMeta}
*/
cljs.core.async.t_cljs$core$async38802 = (function (f,ch,meta38803){
this.f = f;
this.ch = ch;
this.meta38803 = meta38803;
this.cljs$lang$protocol_mask$partition0$ = 393216;
this.cljs$lang$protocol_mask$partition1$ = 0;
});
(cljs.core.async.t_cljs$core$async38802.prototype.cljs$core$IWithMeta$_with_meta$arity$2 = (function (_38804,meta38803__$1){
var self__ = this;
var _38804__$1 = this;
return (new cljs.core.async.t_cljs$core$async38802(self__.f,self__.ch,meta38803__$1));
}));

(cljs.core.async.t_cljs$core$async38802.prototype.cljs$core$IMeta$_meta$arity$1 = (function (_38804){
var self__ = this;
var _38804__$1 = this;
return self__.meta38803;
}));

(cljs.core.async.t_cljs$core$async38802.prototype.cljs$core$async$impl$protocols$Channel$ = cljs.core.PROTOCOL_SENTINEL);

(cljs.core.async.t_cljs$core$async38802.prototype.cljs$core$async$impl$protocols$Channel$close_BANG_$arity$1 = (function (_){
var self__ = this;
var ___$1 = this;
return cljs.core.async.impl.protocols.close_BANG_(self__.ch);
}));

(cljs.core.async.t_cljs$core$async38802.prototype.cljs$core$async$impl$protocols$ReadPort$ = cljs.core.PROTOCOL_SENTINEL);

(cljs.core.async.t_cljs$core$async38802.prototype.cljs$core$async$impl$protocols$ReadPort$take_BANG_$arity$2 = (function (_,fn1){
var self__ = this;
var ___$1 = this;
return cljs.core.async.impl.protocols.take_BANG_(self__.ch,fn1);
}));

(cljs.core.async.t_cljs$core$async38802.prototype.cljs$core$async$impl$protocols$WritePort$ = cljs.core.PROTOCOL_SENTINEL);

(cljs.core.async.t_cljs$core$async38802.prototype.cljs$core$async$impl$protocols$WritePort$put_BANG_$arity$3 = (function (_,val,fn1){
var self__ = this;
var ___$1 = this;
return cljs.core.async.impl.protocols.put_BANG_(self__.ch,(self__.f.cljs$core$IFn$_invoke$arity$1 ? self__.f.cljs$core$IFn$_invoke$arity$1(val) : self__.f.call(null, val)),fn1);
}));

(cljs.core.async.t_cljs$core$async38802.getBasis = (function (){
return new cljs.core.PersistentVector(null, 3, 5, cljs.core.PersistentVector.EMPTY_NODE, [new cljs.core.Symbol(null,"f","f",43394975,null),new cljs.core.Symbol(null,"ch","ch",1085813622,null),new cljs.core.Symbol(null,"meta38803","meta38803",1210294811,null)], null);
}));

(cljs.core.async.t_cljs$core$async38802.cljs$lang$type = true);

(cljs.core.async.t_cljs$core$async38802.cljs$lang$ctorStr = "cljs.core.async/t_cljs$core$async38802");

(cljs.core.async.t_cljs$core$async38802.cljs$lang$ctorPrWriter = (function (this__5287__auto__,writer__5288__auto__,opt__5289__auto__){
return cljs.core._write(writer__5288__auto__,"cljs.core.async/t_cljs$core$async38802");
}));

/**
 * Positional factory function for cljs.core.async/t_cljs$core$async38802.
 */
cljs.core.async.__GT_t_cljs$core$async38802 = (function cljs$core$async$__GT_t_cljs$core$async38802(f,ch,meta38803){
return (new cljs.core.async.t_cljs$core$async38802(f,ch,meta38803));
});


/**
 * Deprecated - this function will be removed. Use transducer instead
 */
cljs.core.async.map_GT_ = (function cljs$core$async$map_GT_(f,ch){
return (new cljs.core.async.t_cljs$core$async38802(f,ch,cljs.core.PersistentArrayMap.EMPTY));
});

/**
* @constructor
 * @implements {cljs.core.async.impl.protocols.Channel}
 * @implements {cljs.core.async.impl.protocols.WritePort}
 * @implements {cljs.core.async.impl.protocols.ReadPort}
 * @implements {cljs.core.IMeta}
 * @implements {cljs.core.IWithMeta}
*/
cljs.core.async.t_cljs$core$async38808 = (function (p,ch,meta38809){
this.p = p;
this.ch = ch;
this.meta38809 = meta38809;
this.cljs$lang$protocol_mask$partition0$ = 393216;
this.cljs$lang$protocol_mask$partition1$ = 0;
});
(cljs.core.async.t_cljs$core$async38808.prototype.cljs$core$IWithMeta$_with_meta$arity$2 = (function (_38810,meta38809__$1){
var self__ = this;
var _38810__$1 = this;
return (new cljs.core.async.t_cljs$core$async38808(self__.p,self__.ch,meta38809__$1));
}));

(cljs.core.async.t_cljs$core$async38808.prototype.cljs$core$IMeta$_meta$arity$1 = (function (_38810){
var self__ = this;
var _38810__$1 = this;
return self__.meta38809;
}));

(cljs.core.async.t_cljs$core$async38808.prototype.cljs$core$async$impl$protocols$Channel$ = cljs.core.PROTOCOL_SENTINEL);

(cljs.core.async.t_cljs$core$async38808.prototype.cljs$core$async$impl$protocols$Channel$close_BANG_$arity$1 = (function (_){
var self__ = this;
var ___$1 = this;
return cljs.core.async.impl.protocols.close_BANG_(self__.ch);
}));

(cljs.core.async.t_cljs$core$async38808.prototype.cljs$core$async$impl$protocols$Channel$closed_QMARK_$arity$1 = (function (_){
var self__ = this;
var ___$1 = this;
return cljs.core.async.impl.protocols.closed_QMARK_(self__.ch);
}));

(cljs.core.async.t_cljs$core$async38808.prototype.cljs$core$async$impl$protocols$ReadPort$ = cljs.core.PROTOCOL_SENTINEL);

(cljs.core.async.t_cljs$core$async38808.prototype.cljs$core$async$impl$protocols$ReadPort$take_BANG_$arity$2 = (function (_,fn1){
var self__ = this;
var ___$1 = this;
return cljs.core.async.impl.protocols.take_BANG_(self__.ch,fn1);
}));

(cljs.core.async.t_cljs$core$async38808.prototype.cljs$core$async$impl$protocols$WritePort$ = cljs.core.PROTOCOL_SENTINEL);

(cljs.core.async.t_cljs$core$async38808.prototype.cljs$core$async$impl$protocols$WritePort$put_BANG_$arity$3 = (function (_,val,fn1){
var self__ = this;
var ___$1 = this;
if(cljs.core.truth_((self__.p.cljs$core$IFn$_invoke$arity$1 ? self__.p.cljs$core$IFn$_invoke$arity$1(val) : self__.p.call(null, val)))){
return cljs.core.async.impl.protocols.put_BANG_(self__.ch,val,fn1);
} else {
return cljs.core.async.impl.channels.box(cljs.core.not(cljs.core.async.impl.protocols.closed_QMARK_(self__.ch)));
}
}));

(cljs.core.async.t_cljs$core$async38808.getBasis = (function (){
return new cljs.core.PersistentVector(null, 3, 5, cljs.core.PersistentVector.EMPTY_NODE, [new cljs.core.Symbol(null,"p","p",1791580836,null),new cljs.core.Symbol(null,"ch","ch",1085813622,null),new cljs.core.Symbol(null,"meta38809","meta38809",613745521,null)], null);
}));

(cljs.core.async.t_cljs$core$async38808.cljs$lang$type = true);

(cljs.core.async.t_cljs$core$async38808.cljs$lang$ctorStr = "cljs.core.async/t_cljs$core$async38808");

(cljs.core.async.t_cljs$core$async38808.cljs$lang$ctorPrWriter = (function (this__5287__auto__,writer__5288__auto__,opt__5289__auto__){
return cljs.core._write(writer__5288__auto__,"cljs.core.async/t_cljs$core$async38808");
}));

/**
 * Positional factory function for cljs.core.async/t_cljs$core$async38808.
 */
cljs.core.async.__GT_t_cljs$core$async38808 = (function cljs$core$async$__GT_t_cljs$core$async38808(p,ch,meta38809){
return (new cljs.core.async.t_cljs$core$async38808(p,ch,meta38809));
});


/**
 * Deprecated - this function will be removed. Use transducer instead
 */
cljs.core.async.filter_GT_ = (function cljs$core$async$filter_GT_(p,ch){
return (new cljs.core.async.t_cljs$core$async38808(p,ch,cljs.core.PersistentArrayMap.EMPTY));
});
/**
 * Deprecated - this function will be removed. Use transducer instead
 */
cljs.core.async.remove_GT_ = (function cljs$core$async$remove_GT_(p,ch){
return cljs.core.async.filter_GT_(cljs.core.complement(p),ch);
});
/**
 * Deprecated - this function will be removed. Use transducer instead
 */
cljs.core.async.filter_LT_ = (function cljs$core$async$filter_LT_(var_args){
var G__38858 = arguments.length;
switch (G__38858) {
case 2:
return cljs.core.async.filter_LT_.cljs$core$IFn$_invoke$arity$2((arguments[(0)]),(arguments[(1)]));

break;
case 3:
return cljs.core.async.filter_LT_.cljs$core$IFn$_invoke$arity$3((arguments[(0)]),(arguments[(1)]),(arguments[(2)]));

break;
default:
throw (new Error(["Invalid arity: ",cljs.core.str.cljs$core$IFn$_invoke$arity$1(arguments.length)].join('')));

}
});

(cljs.core.async.filter_LT_.cljs$core$IFn$_invoke$arity$2 = (function (p,ch){
return cljs.core.async.filter_LT_.cljs$core$IFn$_invoke$arity$3(p,ch,null);
}));

(cljs.core.async.filter_LT_.cljs$core$IFn$_invoke$arity$3 = (function (p,ch,buf_or_n){
var out = cljs.core.async.chan.cljs$core$IFn$_invoke$arity$1(buf_or_n);
var c__35925__auto___40759 = cljs.core.async.chan.cljs$core$IFn$_invoke$arity$1((1));
cljs.core.async.impl.dispatch.run((function (){
var f__35926__auto__ = (function (){var switch__35496__auto__ = (function (state_38883){
var state_val_38884 = (state_38883[(1)]);
if((state_val_38884 === (7))){
var inst_38877 = (state_38883[(2)]);
var state_38883__$1 = state_38883;
var statearr_38886_40760 = state_38883__$1;
(statearr_38886_40760[(2)] = inst_38877);

(statearr_38886_40760[(1)] = (3));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_38884 === (1))){
var state_38883__$1 = state_38883;
var statearr_38887_40761 = state_38883__$1;
(statearr_38887_40761[(2)] = null);

(statearr_38887_40761[(1)] = (2));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_38884 === (4))){
var inst_38861 = (state_38883[(7)]);
var inst_38861__$1 = (state_38883[(2)]);
var inst_38862 = (inst_38861__$1 == null);
var state_38883__$1 = (function (){var statearr_38888 = state_38883;
(statearr_38888[(7)] = inst_38861__$1);

return statearr_38888;
})();
if(cljs.core.truth_(inst_38862)){
var statearr_38890_40762 = state_38883__$1;
(statearr_38890_40762[(1)] = (5));

} else {
var statearr_38891_40763 = state_38883__$1;
(statearr_38891_40763[(1)] = (6));

}

return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_38884 === (6))){
var inst_38861 = (state_38883[(7)]);
var inst_38866 = (p.cljs$core$IFn$_invoke$arity$1 ? p.cljs$core$IFn$_invoke$arity$1(inst_38861) : p.call(null, inst_38861));
var state_38883__$1 = state_38883;
if(cljs.core.truth_(inst_38866)){
var statearr_38895_40764 = state_38883__$1;
(statearr_38895_40764[(1)] = (8));

} else {
var statearr_38896_40765 = state_38883__$1;
(statearr_38896_40765[(1)] = (9));

}

return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_38884 === (3))){
var inst_38879 = (state_38883[(2)]);
var state_38883__$1 = state_38883;
return cljs.core.async.impl.ioc_helpers.return_chan(state_38883__$1,inst_38879);
} else {
if((state_val_38884 === (2))){
var state_38883__$1 = state_38883;
return cljs.core.async.impl.ioc_helpers.take_BANG_(state_38883__$1,(4),ch);
} else {
if((state_val_38884 === (11))){
var inst_38869 = (state_38883[(2)]);
var state_38883__$1 = state_38883;
var statearr_38897_40766 = state_38883__$1;
(statearr_38897_40766[(2)] = inst_38869);

(statearr_38897_40766[(1)] = (10));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_38884 === (9))){
var state_38883__$1 = state_38883;
var statearr_38901_40768 = state_38883__$1;
(statearr_38901_40768[(2)] = null);

(statearr_38901_40768[(1)] = (10));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_38884 === (5))){
var inst_38864 = cljs.core.async.close_BANG_(out);
var state_38883__$1 = state_38883;
var statearr_38909_40769 = state_38883__$1;
(statearr_38909_40769[(2)] = inst_38864);

(statearr_38909_40769[(1)] = (7));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_38884 === (10))){
var inst_38872 = (state_38883[(2)]);
var state_38883__$1 = (function (){var statearr_38911 = state_38883;
(statearr_38911[(8)] = inst_38872);

return statearr_38911;
})();
var statearr_38912_40770 = state_38883__$1;
(statearr_38912_40770[(2)] = null);

(statearr_38912_40770[(1)] = (2));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_38884 === (8))){
var inst_38861 = (state_38883[(7)]);
var state_38883__$1 = state_38883;
return cljs.core.async.impl.ioc_helpers.put_BANG_(state_38883__$1,(11),out,inst_38861);
} else {
return null;
}
}
}
}
}
}
}
}
}
}
}
});
return (function() {
var cljs$core$async$state_machine__35497__auto__ = null;
var cljs$core$async$state_machine__35497__auto____0 = (function (){
var statearr_38932 = [null,null,null,null,null,null,null,null,null];
(statearr_38932[(0)] = cljs$core$async$state_machine__35497__auto__);

(statearr_38932[(1)] = (1));

return statearr_38932;
});
var cljs$core$async$state_machine__35497__auto____1 = (function (state_38883){
while(true){
var ret_value__35499__auto__ = (function (){try{while(true){
var result__35500__auto__ = switch__35496__auto__(state_38883);
if(cljs.core.keyword_identical_QMARK_(result__35500__auto__,new cljs.core.Keyword(null,"recur","recur",-437573268))){
continue;
} else {
return result__35500__auto__;
}
break;
}
}catch (e38936){var ex__35501__auto__ = e38936;
var statearr_38937_40773 = state_38883;
(statearr_38937_40773[(2)] = ex__35501__auto__);


if(cljs.core.seq((state_38883[(4)]))){
var statearr_38938_40774 = state_38883;
(statearr_38938_40774[(1)] = cljs.core.first((state_38883[(4)])));

} else {
throw ex__35501__auto__;
}

return new cljs.core.Keyword(null,"recur","recur",-437573268);
}})();
if(cljs.core.keyword_identical_QMARK_(ret_value__35499__auto__,new cljs.core.Keyword(null,"recur","recur",-437573268))){
var G__40775 = state_38883;
state_38883 = G__40775;
continue;
} else {
return ret_value__35499__auto__;
}
break;
}
});
cljs$core$async$state_machine__35497__auto__ = function(state_38883){
switch(arguments.length){
case 0:
return cljs$core$async$state_machine__35497__auto____0.call(this);
case 1:
return cljs$core$async$state_machine__35497__auto____1.call(this,state_38883);
}
throw(new Error('Invalid arity: ' + arguments.length));
};
cljs$core$async$state_machine__35497__auto__.cljs$core$IFn$_invoke$arity$0 = cljs$core$async$state_machine__35497__auto____0;
cljs$core$async$state_machine__35497__auto__.cljs$core$IFn$_invoke$arity$1 = cljs$core$async$state_machine__35497__auto____1;
return cljs$core$async$state_machine__35497__auto__;
})()
})();
var state__35927__auto__ = (function (){var statearr_38939 = f__35926__auto__();
(statearr_38939[(6)] = c__35925__auto___40759);

return statearr_38939;
})();
return cljs.core.async.impl.ioc_helpers.run_state_machine_wrapped(state__35927__auto__);
}));


return out;
}));

(cljs.core.async.filter_LT_.cljs$lang$maxFixedArity = 3);

/**
 * Deprecated - this function will be removed. Use transducer instead
 */
cljs.core.async.remove_LT_ = (function cljs$core$async$remove_LT_(var_args){
var G__38943 = arguments.length;
switch (G__38943) {
case 2:
return cljs.core.async.remove_LT_.cljs$core$IFn$_invoke$arity$2((arguments[(0)]),(arguments[(1)]));

break;
case 3:
return cljs.core.async.remove_LT_.cljs$core$IFn$_invoke$arity$3((arguments[(0)]),(arguments[(1)]),(arguments[(2)]));

break;
default:
throw (new Error(["Invalid arity: ",cljs.core.str.cljs$core$IFn$_invoke$arity$1(arguments.length)].join('')));

}
});

(cljs.core.async.remove_LT_.cljs$core$IFn$_invoke$arity$2 = (function (p,ch){
return cljs.core.async.remove_LT_.cljs$core$IFn$_invoke$arity$3(p,ch,null);
}));

(cljs.core.async.remove_LT_.cljs$core$IFn$_invoke$arity$3 = (function (p,ch,buf_or_n){
return cljs.core.async.filter_LT_.cljs$core$IFn$_invoke$arity$3(cljs.core.complement(p),ch,buf_or_n);
}));

(cljs.core.async.remove_LT_.cljs$lang$maxFixedArity = 3);

cljs.core.async.mapcat_STAR_ = (function cljs$core$async$mapcat_STAR_(f,in$,out){
var c__35925__auto__ = cljs.core.async.chan.cljs$core$IFn$_invoke$arity$1((1));
cljs.core.async.impl.dispatch.run((function (){
var f__35926__auto__ = (function (){var switch__35496__auto__ = (function (state_39015){
var state_val_39016 = (state_39015[(1)]);
if((state_val_39016 === (7))){
var inst_39011 = (state_39015[(2)]);
var state_39015__$1 = state_39015;
var statearr_39017_40783 = state_39015__$1;
(statearr_39017_40783[(2)] = inst_39011);

(statearr_39017_40783[(1)] = (3));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_39016 === (20))){
var inst_38978 = (state_39015[(7)]);
var inst_38992 = (state_39015[(2)]);
var inst_38993 = cljs.core.next(inst_38978);
var inst_38964 = inst_38993;
var inst_38965 = null;
var inst_38966 = (0);
var inst_38967 = (0);
var state_39015__$1 = (function (){var statearr_39018 = state_39015;
(statearr_39018[(8)] = inst_38992);

(statearr_39018[(9)] = inst_38964);

(statearr_39018[(10)] = inst_38965);

(statearr_39018[(11)] = inst_38966);

(statearr_39018[(12)] = inst_38967);

return statearr_39018;
})();
var statearr_39020_40785 = state_39015__$1;
(statearr_39020_40785[(2)] = null);

(statearr_39020_40785[(1)] = (8));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_39016 === (1))){
var state_39015__$1 = state_39015;
var statearr_39022_40786 = state_39015__$1;
(statearr_39022_40786[(2)] = null);

(statearr_39022_40786[(1)] = (2));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_39016 === (4))){
var inst_38953 = (state_39015[(13)]);
var inst_38953__$1 = (state_39015[(2)]);
var inst_38954 = (inst_38953__$1 == null);
var state_39015__$1 = (function (){var statearr_39023 = state_39015;
(statearr_39023[(13)] = inst_38953__$1);

return statearr_39023;
})();
if(cljs.core.truth_(inst_38954)){
var statearr_39024_40787 = state_39015__$1;
(statearr_39024_40787[(1)] = (5));

} else {
var statearr_39025_40788 = state_39015__$1;
(statearr_39025_40788[(1)] = (6));

}

return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_39016 === (15))){
var state_39015__$1 = state_39015;
var statearr_39029_40789 = state_39015__$1;
(statearr_39029_40789[(2)] = null);

(statearr_39029_40789[(1)] = (16));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_39016 === (21))){
var state_39015__$1 = state_39015;
var statearr_39042_40790 = state_39015__$1;
(statearr_39042_40790[(2)] = null);

(statearr_39042_40790[(1)] = (23));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_39016 === (13))){
var inst_38967 = (state_39015[(12)]);
var inst_38964 = (state_39015[(9)]);
var inst_38965 = (state_39015[(10)]);
var inst_38966 = (state_39015[(11)]);
var inst_38974 = (state_39015[(2)]);
var inst_38975 = (inst_38967 + (1));
var tmp39026 = inst_38964;
var tmp39027 = inst_38966;
var tmp39028 = inst_38965;
var inst_38964__$1 = tmp39026;
var inst_38965__$1 = tmp39028;
var inst_38966__$1 = tmp39027;
var inst_38967__$1 = inst_38975;
var state_39015__$1 = (function (){var statearr_39046 = state_39015;
(statearr_39046[(14)] = inst_38974);

(statearr_39046[(9)] = inst_38964__$1);

(statearr_39046[(10)] = inst_38965__$1);

(statearr_39046[(11)] = inst_38966__$1);

(statearr_39046[(12)] = inst_38967__$1);

return statearr_39046;
})();
var statearr_39047_40791 = state_39015__$1;
(statearr_39047_40791[(2)] = null);

(statearr_39047_40791[(1)] = (8));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_39016 === (22))){
var state_39015__$1 = state_39015;
var statearr_39048_40792 = state_39015__$1;
(statearr_39048_40792[(2)] = null);

(statearr_39048_40792[(1)] = (2));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_39016 === (6))){
var inst_38953 = (state_39015[(13)]);
var inst_38962 = (f.cljs$core$IFn$_invoke$arity$1 ? f.cljs$core$IFn$_invoke$arity$1(inst_38953) : f.call(null, inst_38953));
var inst_38963 = cljs.core.seq(inst_38962);
var inst_38964 = inst_38963;
var inst_38965 = null;
var inst_38966 = (0);
var inst_38967 = (0);
var state_39015__$1 = (function (){var statearr_39050 = state_39015;
(statearr_39050[(9)] = inst_38964);

(statearr_39050[(10)] = inst_38965);

(statearr_39050[(11)] = inst_38966);

(statearr_39050[(12)] = inst_38967);

return statearr_39050;
})();
var statearr_39052_40794 = state_39015__$1;
(statearr_39052_40794[(2)] = null);

(statearr_39052_40794[(1)] = (8));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_39016 === (17))){
var inst_38978 = (state_39015[(7)]);
var inst_38982 = cljs.core.chunk_first(inst_38978);
var inst_38986 = cljs.core.chunk_rest(inst_38978);
var inst_38987 = cljs.core.count(inst_38982);
var inst_38964 = inst_38986;
var inst_38965 = inst_38982;
var inst_38966 = inst_38987;
var inst_38967 = (0);
var state_39015__$1 = (function (){var statearr_39053 = state_39015;
(statearr_39053[(9)] = inst_38964);

(statearr_39053[(10)] = inst_38965);

(statearr_39053[(11)] = inst_38966);

(statearr_39053[(12)] = inst_38967);

return statearr_39053;
})();
var statearr_39054_40797 = state_39015__$1;
(statearr_39054_40797[(2)] = null);

(statearr_39054_40797[(1)] = (8));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_39016 === (3))){
var inst_39013 = (state_39015[(2)]);
var state_39015__$1 = state_39015;
return cljs.core.async.impl.ioc_helpers.return_chan(state_39015__$1,inst_39013);
} else {
if((state_val_39016 === (12))){
var inst_39001 = (state_39015[(2)]);
var state_39015__$1 = state_39015;
var statearr_39076_40798 = state_39015__$1;
(statearr_39076_40798[(2)] = inst_39001);

(statearr_39076_40798[(1)] = (9));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_39016 === (2))){
var state_39015__$1 = state_39015;
return cljs.core.async.impl.ioc_helpers.take_BANG_(state_39015__$1,(4),in$);
} else {
if((state_val_39016 === (23))){
var inst_39009 = (state_39015[(2)]);
var state_39015__$1 = state_39015;
var statearr_39129_40803 = state_39015__$1;
(statearr_39129_40803[(2)] = inst_39009);

(statearr_39129_40803[(1)] = (7));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_39016 === (19))){
var inst_38996 = (state_39015[(2)]);
var state_39015__$1 = state_39015;
var statearr_39131_40804 = state_39015__$1;
(statearr_39131_40804[(2)] = inst_38996);

(statearr_39131_40804[(1)] = (16));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_39016 === (11))){
var inst_38964 = (state_39015[(9)]);
var inst_38978 = (state_39015[(7)]);
var inst_38978__$1 = cljs.core.seq(inst_38964);
var state_39015__$1 = (function (){var statearr_39132 = state_39015;
(statearr_39132[(7)] = inst_38978__$1);

return statearr_39132;
})();
if(inst_38978__$1){
var statearr_39134_40808 = state_39015__$1;
(statearr_39134_40808[(1)] = (14));

} else {
var statearr_39137_40810 = state_39015__$1;
(statearr_39137_40810[(1)] = (15));

}

return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_39016 === (9))){
var inst_39003 = (state_39015[(2)]);
var inst_39004 = cljs.core.async.impl.protocols.closed_QMARK_(out);
var state_39015__$1 = (function (){var statearr_39139 = state_39015;
(statearr_39139[(15)] = inst_39003);

return statearr_39139;
})();
if(cljs.core.truth_(inst_39004)){
var statearr_39140_40811 = state_39015__$1;
(statearr_39140_40811[(1)] = (21));

} else {
var statearr_39141_40812 = state_39015__$1;
(statearr_39141_40812[(1)] = (22));

}

return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_39016 === (5))){
var inst_38956 = cljs.core.async.close_BANG_(out);
var state_39015__$1 = state_39015;
var statearr_39142_40813 = state_39015__$1;
(statearr_39142_40813[(2)] = inst_38956);

(statearr_39142_40813[(1)] = (7));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_39016 === (14))){
var inst_38978 = (state_39015[(7)]);
var inst_38980 = cljs.core.chunked_seq_QMARK_(inst_38978);
var state_39015__$1 = state_39015;
if(inst_38980){
var statearr_39143_40814 = state_39015__$1;
(statearr_39143_40814[(1)] = (17));

} else {
var statearr_39144_40816 = state_39015__$1;
(statearr_39144_40816[(1)] = (18));

}

return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_39016 === (16))){
var inst_38999 = (state_39015[(2)]);
var state_39015__$1 = state_39015;
var statearr_39145_40820 = state_39015__$1;
(statearr_39145_40820[(2)] = inst_38999);

(statearr_39145_40820[(1)] = (12));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_39016 === (10))){
var inst_38965 = (state_39015[(10)]);
var inst_38967 = (state_39015[(12)]);
var inst_38972 = cljs.core._nth(inst_38965,inst_38967);
var state_39015__$1 = state_39015;
return cljs.core.async.impl.ioc_helpers.put_BANG_(state_39015__$1,(13),out,inst_38972);
} else {
if((state_val_39016 === (18))){
var inst_38978 = (state_39015[(7)]);
var inst_38990 = cljs.core.first(inst_38978);
var state_39015__$1 = state_39015;
return cljs.core.async.impl.ioc_helpers.put_BANG_(state_39015__$1,(20),out,inst_38990);
} else {
if((state_val_39016 === (8))){
var inst_38967 = (state_39015[(12)]);
var inst_38966 = (state_39015[(11)]);
var inst_38969 = (inst_38967 < inst_38966);
var inst_38970 = inst_38969;
var state_39015__$1 = state_39015;
if(cljs.core.truth_(inst_38970)){
var statearr_39147_40825 = state_39015__$1;
(statearr_39147_40825[(1)] = (10));

} else {
var statearr_39148_40826 = state_39015__$1;
(statearr_39148_40826[(1)] = (11));

}

return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
return null;
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
});
return (function() {
var cljs$core$async$mapcat_STAR__$_state_machine__35497__auto__ = null;
var cljs$core$async$mapcat_STAR__$_state_machine__35497__auto____0 = (function (){
var statearr_39155 = [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null];
(statearr_39155[(0)] = cljs$core$async$mapcat_STAR__$_state_machine__35497__auto__);

(statearr_39155[(1)] = (1));

return statearr_39155;
});
var cljs$core$async$mapcat_STAR__$_state_machine__35497__auto____1 = (function (state_39015){
while(true){
var ret_value__35499__auto__ = (function (){try{while(true){
var result__35500__auto__ = switch__35496__auto__(state_39015);
if(cljs.core.keyword_identical_QMARK_(result__35500__auto__,new cljs.core.Keyword(null,"recur","recur",-437573268))){
continue;
} else {
return result__35500__auto__;
}
break;
}
}catch (e39157){var ex__35501__auto__ = e39157;
var statearr_39158_40839 = state_39015;
(statearr_39158_40839[(2)] = ex__35501__auto__);


if(cljs.core.seq((state_39015[(4)]))){
var statearr_39165_40840 = state_39015;
(statearr_39165_40840[(1)] = cljs.core.first((state_39015[(4)])));

} else {
throw ex__35501__auto__;
}

return new cljs.core.Keyword(null,"recur","recur",-437573268);
}})();
if(cljs.core.keyword_identical_QMARK_(ret_value__35499__auto__,new cljs.core.Keyword(null,"recur","recur",-437573268))){
var G__40841 = state_39015;
state_39015 = G__40841;
continue;
} else {
return ret_value__35499__auto__;
}
break;
}
});
cljs$core$async$mapcat_STAR__$_state_machine__35497__auto__ = function(state_39015){
switch(arguments.length){
case 0:
return cljs$core$async$mapcat_STAR__$_state_machine__35497__auto____0.call(this);
case 1:
return cljs$core$async$mapcat_STAR__$_state_machine__35497__auto____1.call(this,state_39015);
}
throw(new Error('Invalid arity: ' + arguments.length));
};
cljs$core$async$mapcat_STAR__$_state_machine__35497__auto__.cljs$core$IFn$_invoke$arity$0 = cljs$core$async$mapcat_STAR__$_state_machine__35497__auto____0;
cljs$core$async$mapcat_STAR__$_state_machine__35497__auto__.cljs$core$IFn$_invoke$arity$1 = cljs$core$async$mapcat_STAR__$_state_machine__35497__auto____1;
return cljs$core$async$mapcat_STAR__$_state_machine__35497__auto__;
})()
})();
var state__35927__auto__ = (function (){var statearr_39169 = f__35926__auto__();
(statearr_39169[(6)] = c__35925__auto__);

return statearr_39169;
})();
return cljs.core.async.impl.ioc_helpers.run_state_machine_wrapped(state__35927__auto__);
}));

return c__35925__auto__;
});
/**
 * Deprecated - this function will be removed. Use transducer instead
 */
cljs.core.async.mapcat_LT_ = (function cljs$core$async$mapcat_LT_(var_args){
var G__39173 = arguments.length;
switch (G__39173) {
case 2:
return cljs.core.async.mapcat_LT_.cljs$core$IFn$_invoke$arity$2((arguments[(0)]),(arguments[(1)]));

break;
case 3:
return cljs.core.async.mapcat_LT_.cljs$core$IFn$_invoke$arity$3((arguments[(0)]),(arguments[(1)]),(arguments[(2)]));

break;
default:
throw (new Error(["Invalid arity: ",cljs.core.str.cljs$core$IFn$_invoke$arity$1(arguments.length)].join('')));

}
});

(cljs.core.async.mapcat_LT_.cljs$core$IFn$_invoke$arity$2 = (function (f,in$){
return cljs.core.async.mapcat_LT_.cljs$core$IFn$_invoke$arity$3(f,in$,null);
}));

(cljs.core.async.mapcat_LT_.cljs$core$IFn$_invoke$arity$3 = (function (f,in$,buf_or_n){
var out = cljs.core.async.chan.cljs$core$IFn$_invoke$arity$1(buf_or_n);
cljs.core.async.mapcat_STAR_(f,in$,out);

return out;
}));

(cljs.core.async.mapcat_LT_.cljs$lang$maxFixedArity = 3);

/**
 * Deprecated - this function will be removed. Use transducer instead
 */
cljs.core.async.mapcat_GT_ = (function cljs$core$async$mapcat_GT_(var_args){
var G__39189 = arguments.length;
switch (G__39189) {
case 2:
return cljs.core.async.mapcat_GT_.cljs$core$IFn$_invoke$arity$2((arguments[(0)]),(arguments[(1)]));

break;
case 3:
return cljs.core.async.mapcat_GT_.cljs$core$IFn$_invoke$arity$3((arguments[(0)]),(arguments[(1)]),(arguments[(2)]));

break;
default:
throw (new Error(["Invalid arity: ",cljs.core.str.cljs$core$IFn$_invoke$arity$1(arguments.length)].join('')));

}
});

(cljs.core.async.mapcat_GT_.cljs$core$IFn$_invoke$arity$2 = (function (f,out){
return cljs.core.async.mapcat_GT_.cljs$core$IFn$_invoke$arity$3(f,out,null);
}));

(cljs.core.async.mapcat_GT_.cljs$core$IFn$_invoke$arity$3 = (function (f,out,buf_or_n){
var in$ = cljs.core.async.chan.cljs$core$IFn$_invoke$arity$1(buf_or_n);
cljs.core.async.mapcat_STAR_(f,in$,out);

return in$;
}));

(cljs.core.async.mapcat_GT_.cljs$lang$maxFixedArity = 3);

/**
 * Deprecated - this function will be removed. Use transducer instead
 */
cljs.core.async.unique = (function cljs$core$async$unique(var_args){
var G__39196 = arguments.length;
switch (G__39196) {
case 1:
return cljs.core.async.unique.cljs$core$IFn$_invoke$arity$1((arguments[(0)]));

break;
case 2:
return cljs.core.async.unique.cljs$core$IFn$_invoke$arity$2((arguments[(0)]),(arguments[(1)]));

break;
default:
throw (new Error(["Invalid arity: ",cljs.core.str.cljs$core$IFn$_invoke$arity$1(arguments.length)].join('')));

}
});

(cljs.core.async.unique.cljs$core$IFn$_invoke$arity$1 = (function (ch){
return cljs.core.async.unique.cljs$core$IFn$_invoke$arity$2(ch,null);
}));

(cljs.core.async.unique.cljs$core$IFn$_invoke$arity$2 = (function (ch,buf_or_n){
var out = cljs.core.async.chan.cljs$core$IFn$_invoke$arity$1(buf_or_n);
var c__35925__auto___40872 = cljs.core.async.chan.cljs$core$IFn$_invoke$arity$1((1));
cljs.core.async.impl.dispatch.run((function (){
var f__35926__auto__ = (function (){var switch__35496__auto__ = (function (state_39235){
var state_val_39236 = (state_39235[(1)]);
if((state_val_39236 === (7))){
var inst_39229 = (state_39235[(2)]);
var state_39235__$1 = state_39235;
var statearr_39245_40877 = state_39235__$1;
(statearr_39245_40877[(2)] = inst_39229);

(statearr_39245_40877[(1)] = (3));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_39236 === (1))){
var inst_39199 = null;
var state_39235__$1 = (function (){var statearr_39246 = state_39235;
(statearr_39246[(7)] = inst_39199);

return statearr_39246;
})();
var statearr_39248_40878 = state_39235__$1;
(statearr_39248_40878[(2)] = null);

(statearr_39248_40878[(1)] = (2));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_39236 === (4))){
var inst_39214 = (state_39235[(8)]);
var inst_39214__$1 = (state_39235[(2)]);
var inst_39215 = (inst_39214__$1 == null);
var inst_39216 = cljs.core.not(inst_39215);
var state_39235__$1 = (function (){var statearr_39250 = state_39235;
(statearr_39250[(8)] = inst_39214__$1);

return statearr_39250;
})();
if(inst_39216){
var statearr_39251_40880 = state_39235__$1;
(statearr_39251_40880[(1)] = (5));

} else {
var statearr_39258_40881 = state_39235__$1;
(statearr_39258_40881[(1)] = (6));

}

return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_39236 === (6))){
var state_39235__$1 = state_39235;
var statearr_39260_40886 = state_39235__$1;
(statearr_39260_40886[(2)] = null);

(statearr_39260_40886[(1)] = (7));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_39236 === (3))){
var inst_39231 = (state_39235[(2)]);
var inst_39232 = cljs.core.async.close_BANG_(out);
var state_39235__$1 = (function (){var statearr_39263 = state_39235;
(statearr_39263[(9)] = inst_39231);

return statearr_39263;
})();
return cljs.core.async.impl.ioc_helpers.return_chan(state_39235__$1,inst_39232);
} else {
if((state_val_39236 === (2))){
var state_39235__$1 = state_39235;
return cljs.core.async.impl.ioc_helpers.take_BANG_(state_39235__$1,(4),ch);
} else {
if((state_val_39236 === (11))){
var inst_39214 = (state_39235[(8)]);
var inst_39223 = (state_39235[(2)]);
var inst_39199 = inst_39214;
var state_39235__$1 = (function (){var statearr_39266 = state_39235;
(statearr_39266[(10)] = inst_39223);

(statearr_39266[(7)] = inst_39199);

return statearr_39266;
})();
var statearr_39267_40891 = state_39235__$1;
(statearr_39267_40891[(2)] = null);

(statearr_39267_40891[(1)] = (2));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_39236 === (9))){
var inst_39214 = (state_39235[(8)]);
var state_39235__$1 = state_39235;
return cljs.core.async.impl.ioc_helpers.put_BANG_(state_39235__$1,(11),out,inst_39214);
} else {
if((state_val_39236 === (5))){
var inst_39214 = (state_39235[(8)]);
var inst_39199 = (state_39235[(7)]);
var inst_39218 = cljs.core._EQ_.cljs$core$IFn$_invoke$arity$2(inst_39214,inst_39199);
var state_39235__$1 = state_39235;
if(inst_39218){
var statearr_39272_40894 = state_39235__$1;
(statearr_39272_40894[(1)] = (8));

} else {
var statearr_39273_40895 = state_39235__$1;
(statearr_39273_40895[(1)] = (9));

}

return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_39236 === (10))){
var inst_39226 = (state_39235[(2)]);
var state_39235__$1 = state_39235;
var statearr_39275_40898 = state_39235__$1;
(statearr_39275_40898[(2)] = inst_39226);

(statearr_39275_40898[(1)] = (7));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_39236 === (8))){
var inst_39199 = (state_39235[(7)]);
var tmp39271 = inst_39199;
var inst_39199__$1 = tmp39271;
var state_39235__$1 = (function (){var statearr_39276 = state_39235;
(statearr_39276[(7)] = inst_39199__$1);

return statearr_39276;
})();
var statearr_39277_40899 = state_39235__$1;
(statearr_39277_40899[(2)] = null);

(statearr_39277_40899[(1)] = (2));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
return null;
}
}
}
}
}
}
}
}
}
}
}
});
return (function() {
var cljs$core$async$state_machine__35497__auto__ = null;
var cljs$core$async$state_machine__35497__auto____0 = (function (){
var statearr_39279 = [null,null,null,null,null,null,null,null,null,null,null];
(statearr_39279[(0)] = cljs$core$async$state_machine__35497__auto__);

(statearr_39279[(1)] = (1));

return statearr_39279;
});
var cljs$core$async$state_machine__35497__auto____1 = (function (state_39235){
while(true){
var ret_value__35499__auto__ = (function (){try{while(true){
var result__35500__auto__ = switch__35496__auto__(state_39235);
if(cljs.core.keyword_identical_QMARK_(result__35500__auto__,new cljs.core.Keyword(null,"recur","recur",-437573268))){
continue;
} else {
return result__35500__auto__;
}
break;
}
}catch (e39281){var ex__35501__auto__ = e39281;
var statearr_39282_40902 = state_39235;
(statearr_39282_40902[(2)] = ex__35501__auto__);


if(cljs.core.seq((state_39235[(4)]))){
var statearr_39289_40903 = state_39235;
(statearr_39289_40903[(1)] = cljs.core.first((state_39235[(4)])));

} else {
throw ex__35501__auto__;
}

return new cljs.core.Keyword(null,"recur","recur",-437573268);
}})();
if(cljs.core.keyword_identical_QMARK_(ret_value__35499__auto__,new cljs.core.Keyword(null,"recur","recur",-437573268))){
var G__40904 = state_39235;
state_39235 = G__40904;
continue;
} else {
return ret_value__35499__auto__;
}
break;
}
});
cljs$core$async$state_machine__35497__auto__ = function(state_39235){
switch(arguments.length){
case 0:
return cljs$core$async$state_machine__35497__auto____0.call(this);
case 1:
return cljs$core$async$state_machine__35497__auto____1.call(this,state_39235);
}
throw(new Error('Invalid arity: ' + arguments.length));
};
cljs$core$async$state_machine__35497__auto__.cljs$core$IFn$_invoke$arity$0 = cljs$core$async$state_machine__35497__auto____0;
cljs$core$async$state_machine__35497__auto__.cljs$core$IFn$_invoke$arity$1 = cljs$core$async$state_machine__35497__auto____1;
return cljs$core$async$state_machine__35497__auto__;
})()
})();
var state__35927__auto__ = (function (){var statearr_39290 = f__35926__auto__();
(statearr_39290[(6)] = c__35925__auto___40872);

return statearr_39290;
})();
return cljs.core.async.impl.ioc_helpers.run_state_machine_wrapped(state__35927__auto__);
}));


return out;
}));

(cljs.core.async.unique.cljs$lang$maxFixedArity = 2);

/**
 * Deprecated - this function will be removed. Use transducer instead
 */
cljs.core.async.partition = (function cljs$core$async$partition(var_args){
var G__39300 = arguments.length;
switch (G__39300) {
case 2:
return cljs.core.async.partition.cljs$core$IFn$_invoke$arity$2((arguments[(0)]),(arguments[(1)]));

break;
case 3:
return cljs.core.async.partition.cljs$core$IFn$_invoke$arity$3((arguments[(0)]),(arguments[(1)]),(arguments[(2)]));

break;
default:
throw (new Error(["Invalid arity: ",cljs.core.str.cljs$core$IFn$_invoke$arity$1(arguments.length)].join('')));

}
});

(cljs.core.async.partition.cljs$core$IFn$_invoke$arity$2 = (function (n,ch){
return cljs.core.async.partition.cljs$core$IFn$_invoke$arity$3(n,ch,null);
}));

(cljs.core.async.partition.cljs$core$IFn$_invoke$arity$3 = (function (n,ch,buf_or_n){
var out = cljs.core.async.chan.cljs$core$IFn$_invoke$arity$1(buf_or_n);
var c__35925__auto___40907 = cljs.core.async.chan.cljs$core$IFn$_invoke$arity$1((1));
cljs.core.async.impl.dispatch.run((function (){
var f__35926__auto__ = (function (){var switch__35496__auto__ = (function (state_39348){
var state_val_39349 = (state_39348[(1)]);
if((state_val_39349 === (7))){
var inst_39344 = (state_39348[(2)]);
var state_39348__$1 = state_39348;
var statearr_39354_40908 = state_39348__$1;
(statearr_39354_40908[(2)] = inst_39344);

(statearr_39354_40908[(1)] = (3));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_39349 === (1))){
var inst_39311 = (new Array(n));
var inst_39312 = inst_39311;
var inst_39313 = (0);
var state_39348__$1 = (function (){var statearr_39362 = state_39348;
(statearr_39362[(7)] = inst_39312);

(statearr_39362[(8)] = inst_39313);

return statearr_39362;
})();
var statearr_39363_40917 = state_39348__$1;
(statearr_39363_40917[(2)] = null);

(statearr_39363_40917[(1)] = (2));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_39349 === (4))){
var inst_39316 = (state_39348[(9)]);
var inst_39316__$1 = (state_39348[(2)]);
var inst_39317 = (inst_39316__$1 == null);
var inst_39318 = cljs.core.not(inst_39317);
var state_39348__$1 = (function (){var statearr_39364 = state_39348;
(statearr_39364[(9)] = inst_39316__$1);

return statearr_39364;
})();
if(inst_39318){
var statearr_39366_40921 = state_39348__$1;
(statearr_39366_40921[(1)] = (5));

} else {
var statearr_39367_40923 = state_39348__$1;
(statearr_39367_40923[(1)] = (6));

}

return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_39349 === (15))){
var inst_39338 = (state_39348[(2)]);
var state_39348__$1 = state_39348;
var statearr_39368_40924 = state_39348__$1;
(statearr_39368_40924[(2)] = inst_39338);

(statearr_39368_40924[(1)] = (14));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_39349 === (13))){
var state_39348__$1 = state_39348;
var statearr_39372_40925 = state_39348__$1;
(statearr_39372_40925[(2)] = null);

(statearr_39372_40925[(1)] = (14));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_39349 === (6))){
var inst_39313 = (state_39348[(8)]);
var inst_39334 = (inst_39313 > (0));
var state_39348__$1 = state_39348;
if(cljs.core.truth_(inst_39334)){
var statearr_39373_40932 = state_39348__$1;
(statearr_39373_40932[(1)] = (12));

} else {
var statearr_39374_40933 = state_39348__$1;
(statearr_39374_40933[(1)] = (13));

}

return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_39349 === (3))){
var inst_39346 = (state_39348[(2)]);
var state_39348__$1 = state_39348;
return cljs.core.async.impl.ioc_helpers.return_chan(state_39348__$1,inst_39346);
} else {
if((state_val_39349 === (12))){
var inst_39312 = (state_39348[(7)]);
var inst_39336 = cljs.core.vec(inst_39312);
var state_39348__$1 = state_39348;
return cljs.core.async.impl.ioc_helpers.put_BANG_(state_39348__$1,(15),out,inst_39336);
} else {
if((state_val_39349 === (2))){
var state_39348__$1 = state_39348;
return cljs.core.async.impl.ioc_helpers.take_BANG_(state_39348__$1,(4),ch);
} else {
if((state_val_39349 === (11))){
var inst_39328 = (state_39348[(2)]);
var inst_39329 = (new Array(n));
var inst_39312 = inst_39329;
var inst_39313 = (0);
var state_39348__$1 = (function (){var statearr_39382 = state_39348;
(statearr_39382[(10)] = inst_39328);

(statearr_39382[(7)] = inst_39312);

(statearr_39382[(8)] = inst_39313);

return statearr_39382;
})();
var statearr_39383_40936 = state_39348__$1;
(statearr_39383_40936[(2)] = null);

(statearr_39383_40936[(1)] = (2));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_39349 === (9))){
var inst_39312 = (state_39348[(7)]);
var inst_39326 = cljs.core.vec(inst_39312);
var state_39348__$1 = state_39348;
return cljs.core.async.impl.ioc_helpers.put_BANG_(state_39348__$1,(11),out,inst_39326);
} else {
if((state_val_39349 === (5))){
var inst_39312 = (state_39348[(7)]);
var inst_39313 = (state_39348[(8)]);
var inst_39316 = (state_39348[(9)]);
var inst_39321 = (state_39348[(11)]);
var inst_39320 = (inst_39312[inst_39313] = inst_39316);
var inst_39321__$1 = (inst_39313 + (1));
var inst_39322 = (inst_39321__$1 < n);
var state_39348__$1 = (function (){var statearr_39385 = state_39348;
(statearr_39385[(12)] = inst_39320);

(statearr_39385[(11)] = inst_39321__$1);

return statearr_39385;
})();
if(cljs.core.truth_(inst_39322)){
var statearr_39386_40937 = state_39348__$1;
(statearr_39386_40937[(1)] = (8));

} else {
var statearr_39387_40938 = state_39348__$1;
(statearr_39387_40938[(1)] = (9));

}

return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_39349 === (14))){
var inst_39341 = (state_39348[(2)]);
var inst_39342 = cljs.core.async.close_BANG_(out);
var state_39348__$1 = (function (){var statearr_39392 = state_39348;
(statearr_39392[(13)] = inst_39341);

return statearr_39392;
})();
var statearr_39393_40942 = state_39348__$1;
(statearr_39393_40942[(2)] = inst_39342);

(statearr_39393_40942[(1)] = (7));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_39349 === (10))){
var inst_39332 = (state_39348[(2)]);
var state_39348__$1 = state_39348;
var statearr_39395_40943 = state_39348__$1;
(statearr_39395_40943[(2)] = inst_39332);

(statearr_39395_40943[(1)] = (7));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_39349 === (8))){
var inst_39312 = (state_39348[(7)]);
var inst_39321 = (state_39348[(11)]);
var tmp39388 = inst_39312;
var inst_39312__$1 = tmp39388;
var inst_39313 = inst_39321;
var state_39348__$1 = (function (){var statearr_39396 = state_39348;
(statearr_39396[(7)] = inst_39312__$1);

(statearr_39396[(8)] = inst_39313);

return statearr_39396;
})();
var statearr_39397_40948 = state_39348__$1;
(statearr_39397_40948[(2)] = null);

(statearr_39397_40948[(1)] = (2));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
return null;
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
});
return (function() {
var cljs$core$async$state_machine__35497__auto__ = null;
var cljs$core$async$state_machine__35497__auto____0 = (function (){
var statearr_39398 = [null,null,null,null,null,null,null,null,null,null,null,null,null,null];
(statearr_39398[(0)] = cljs$core$async$state_machine__35497__auto__);

(statearr_39398[(1)] = (1));

return statearr_39398;
});
var cljs$core$async$state_machine__35497__auto____1 = (function (state_39348){
while(true){
var ret_value__35499__auto__ = (function (){try{while(true){
var result__35500__auto__ = switch__35496__auto__(state_39348);
if(cljs.core.keyword_identical_QMARK_(result__35500__auto__,new cljs.core.Keyword(null,"recur","recur",-437573268))){
continue;
} else {
return result__35500__auto__;
}
break;
}
}catch (e39399){var ex__35501__auto__ = e39399;
var statearr_39400_40950 = state_39348;
(statearr_39400_40950[(2)] = ex__35501__auto__);


if(cljs.core.seq((state_39348[(4)]))){
var statearr_39401_40951 = state_39348;
(statearr_39401_40951[(1)] = cljs.core.first((state_39348[(4)])));

} else {
throw ex__35501__auto__;
}

return new cljs.core.Keyword(null,"recur","recur",-437573268);
}})();
if(cljs.core.keyword_identical_QMARK_(ret_value__35499__auto__,new cljs.core.Keyword(null,"recur","recur",-437573268))){
var G__40952 = state_39348;
state_39348 = G__40952;
continue;
} else {
return ret_value__35499__auto__;
}
break;
}
});
cljs$core$async$state_machine__35497__auto__ = function(state_39348){
switch(arguments.length){
case 0:
return cljs$core$async$state_machine__35497__auto____0.call(this);
case 1:
return cljs$core$async$state_machine__35497__auto____1.call(this,state_39348);
}
throw(new Error('Invalid arity: ' + arguments.length));
};
cljs$core$async$state_machine__35497__auto__.cljs$core$IFn$_invoke$arity$0 = cljs$core$async$state_machine__35497__auto____0;
cljs$core$async$state_machine__35497__auto__.cljs$core$IFn$_invoke$arity$1 = cljs$core$async$state_machine__35497__auto____1;
return cljs$core$async$state_machine__35497__auto__;
})()
})();
var state__35927__auto__ = (function (){var statearr_39402 = f__35926__auto__();
(statearr_39402[(6)] = c__35925__auto___40907);

return statearr_39402;
})();
return cljs.core.async.impl.ioc_helpers.run_state_machine_wrapped(state__35927__auto__);
}));


return out;
}));

(cljs.core.async.partition.cljs$lang$maxFixedArity = 3);

/**
 * Deprecated - this function will be removed. Use transducer instead
 */
cljs.core.async.partition_by = (function cljs$core$async$partition_by(var_args){
var G__39404 = arguments.length;
switch (G__39404) {
case 2:
return cljs.core.async.partition_by.cljs$core$IFn$_invoke$arity$2((arguments[(0)]),(arguments[(1)]));

break;
case 3:
return cljs.core.async.partition_by.cljs$core$IFn$_invoke$arity$3((arguments[(0)]),(arguments[(1)]),(arguments[(2)]));

break;
default:
throw (new Error(["Invalid arity: ",cljs.core.str.cljs$core$IFn$_invoke$arity$1(arguments.length)].join('')));

}
});

(cljs.core.async.partition_by.cljs$core$IFn$_invoke$arity$2 = (function (f,ch){
return cljs.core.async.partition_by.cljs$core$IFn$_invoke$arity$3(f,ch,null);
}));

(cljs.core.async.partition_by.cljs$core$IFn$_invoke$arity$3 = (function (f,ch,buf_or_n){
var out = cljs.core.async.chan.cljs$core$IFn$_invoke$arity$1(buf_or_n);
var c__35925__auto___40956 = cljs.core.async.chan.cljs$core$IFn$_invoke$arity$1((1));
cljs.core.async.impl.dispatch.run((function (){
var f__35926__auto__ = (function (){var switch__35496__auto__ = (function (state_39467){
var state_val_39468 = (state_39467[(1)]);
if((state_val_39468 === (7))){
var inst_39463 = (state_39467[(2)]);
var state_39467__$1 = state_39467;
var statearr_39469_40957 = state_39467__$1;
(statearr_39469_40957[(2)] = inst_39463);

(statearr_39469_40957[(1)] = (3));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_39468 === (1))){
var inst_39419 = [];
var inst_39420 = inst_39419;
var inst_39421 = new cljs.core.Keyword("cljs.core.async","nothing","cljs.core.async/nothing",-69252123);
var state_39467__$1 = (function (){var statearr_39472 = state_39467;
(statearr_39472[(7)] = inst_39420);

(statearr_39472[(8)] = inst_39421);

return statearr_39472;
})();
var statearr_39473_40958 = state_39467__$1;
(statearr_39473_40958[(2)] = null);

(statearr_39473_40958[(1)] = (2));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_39468 === (4))){
var inst_39424 = (state_39467[(9)]);
var inst_39424__$1 = (state_39467[(2)]);
var inst_39425 = (inst_39424__$1 == null);
var inst_39426 = cljs.core.not(inst_39425);
var state_39467__$1 = (function (){var statearr_39481 = state_39467;
(statearr_39481[(9)] = inst_39424__$1);

return statearr_39481;
})();
if(inst_39426){
var statearr_39482_40959 = state_39467__$1;
(statearr_39482_40959[(1)] = (5));

} else {
var statearr_39486_40960 = state_39467__$1;
(statearr_39486_40960[(1)] = (6));

}

return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_39468 === (15))){
var inst_39420 = (state_39467[(7)]);
var inst_39455 = cljs.core.vec(inst_39420);
var state_39467__$1 = state_39467;
return cljs.core.async.impl.ioc_helpers.put_BANG_(state_39467__$1,(18),out,inst_39455);
} else {
if((state_val_39468 === (13))){
var inst_39450 = (state_39467[(2)]);
var state_39467__$1 = state_39467;
var statearr_39490_40962 = state_39467__$1;
(statearr_39490_40962[(2)] = inst_39450);

(statearr_39490_40962[(1)] = (7));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_39468 === (6))){
var inst_39420 = (state_39467[(7)]);
var inst_39452 = inst_39420.length;
var inst_39453 = (inst_39452 > (0));
var state_39467__$1 = state_39467;
if(cljs.core.truth_(inst_39453)){
var statearr_39492_40963 = state_39467__$1;
(statearr_39492_40963[(1)] = (15));

} else {
var statearr_39493_40964 = state_39467__$1;
(statearr_39493_40964[(1)] = (16));

}

return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_39468 === (17))){
var inst_39460 = (state_39467[(2)]);
var inst_39461 = cljs.core.async.close_BANG_(out);
var state_39467__$1 = (function (){var statearr_39494 = state_39467;
(statearr_39494[(10)] = inst_39460);

return statearr_39494;
})();
var statearr_39495_40965 = state_39467__$1;
(statearr_39495_40965[(2)] = inst_39461);

(statearr_39495_40965[(1)] = (7));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_39468 === (3))){
var inst_39465 = (state_39467[(2)]);
var state_39467__$1 = state_39467;
return cljs.core.async.impl.ioc_helpers.return_chan(state_39467__$1,inst_39465);
} else {
if((state_val_39468 === (12))){
var inst_39420 = (state_39467[(7)]);
var inst_39439 = cljs.core.vec(inst_39420);
var state_39467__$1 = state_39467;
return cljs.core.async.impl.ioc_helpers.put_BANG_(state_39467__$1,(14),out,inst_39439);
} else {
if((state_val_39468 === (2))){
var state_39467__$1 = state_39467;
return cljs.core.async.impl.ioc_helpers.take_BANG_(state_39467__$1,(4),ch);
} else {
if((state_val_39468 === (11))){
var inst_39420 = (state_39467[(7)]);
var inst_39424 = (state_39467[(9)]);
var inst_39428 = (state_39467[(11)]);
var inst_39436 = inst_39420.push(inst_39424);
var tmp39508 = inst_39420;
var inst_39420__$1 = tmp39508;
var inst_39421 = inst_39428;
var state_39467__$1 = (function (){var statearr_39509 = state_39467;
(statearr_39509[(12)] = inst_39436);

(statearr_39509[(7)] = inst_39420__$1);

(statearr_39509[(8)] = inst_39421);

return statearr_39509;
})();
var statearr_39510_40966 = state_39467__$1;
(statearr_39510_40966[(2)] = null);

(statearr_39510_40966[(1)] = (2));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_39468 === (9))){
var inst_39421 = (state_39467[(8)]);
var inst_39432 = cljs.core.keyword_identical_QMARK_(inst_39421,new cljs.core.Keyword("cljs.core.async","nothing","cljs.core.async/nothing",-69252123));
var state_39467__$1 = state_39467;
var statearr_39515_40971 = state_39467__$1;
(statearr_39515_40971[(2)] = inst_39432);

(statearr_39515_40971[(1)] = (10));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_39468 === (5))){
var inst_39424 = (state_39467[(9)]);
var inst_39428 = (state_39467[(11)]);
var inst_39421 = (state_39467[(8)]);
var inst_39429 = (state_39467[(13)]);
var inst_39428__$1 = (f.cljs$core$IFn$_invoke$arity$1 ? f.cljs$core$IFn$_invoke$arity$1(inst_39424) : f.call(null, inst_39424));
var inst_39429__$1 = cljs.core._EQ_.cljs$core$IFn$_invoke$arity$2(inst_39428__$1,inst_39421);
var state_39467__$1 = (function (){var statearr_39516 = state_39467;
(statearr_39516[(11)] = inst_39428__$1);

(statearr_39516[(13)] = inst_39429__$1);

return statearr_39516;
})();
if(inst_39429__$1){
var statearr_39518_40972 = state_39467__$1;
(statearr_39518_40972[(1)] = (8));

} else {
var statearr_39519_40973 = state_39467__$1;
(statearr_39519_40973[(1)] = (9));

}

return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_39468 === (14))){
var inst_39424 = (state_39467[(9)]);
var inst_39428 = (state_39467[(11)]);
var inst_39442 = (state_39467[(2)]);
var inst_39445 = [];
var inst_39447 = inst_39445.push(inst_39424);
var inst_39420 = inst_39445;
var inst_39421 = inst_39428;
var state_39467__$1 = (function (){var statearr_39520 = state_39467;
(statearr_39520[(14)] = inst_39442);

(statearr_39520[(15)] = inst_39447);

(statearr_39520[(7)] = inst_39420);

(statearr_39520[(8)] = inst_39421);

return statearr_39520;
})();
var statearr_39527_40974 = state_39467__$1;
(statearr_39527_40974[(2)] = null);

(statearr_39527_40974[(1)] = (2));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_39468 === (16))){
var state_39467__$1 = state_39467;
var statearr_39531_40975 = state_39467__$1;
(statearr_39531_40975[(2)] = null);

(statearr_39531_40975[(1)] = (17));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_39468 === (10))){
var inst_39434 = (state_39467[(2)]);
var state_39467__$1 = state_39467;
if(cljs.core.truth_(inst_39434)){
var statearr_39532_40976 = state_39467__$1;
(statearr_39532_40976[(1)] = (11));

} else {
var statearr_39538_40977 = state_39467__$1;
(statearr_39538_40977[(1)] = (12));

}

return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_39468 === (18))){
var inst_39457 = (state_39467[(2)]);
var state_39467__$1 = state_39467;
var statearr_39539_40979 = state_39467__$1;
(statearr_39539_40979[(2)] = inst_39457);

(statearr_39539_40979[(1)] = (17));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
if((state_val_39468 === (8))){
var inst_39429 = (state_39467[(13)]);
var state_39467__$1 = state_39467;
var statearr_39540_40984 = state_39467__$1;
(statearr_39540_40984[(2)] = inst_39429);

(statearr_39540_40984[(1)] = (10));


return new cljs.core.Keyword(null,"recur","recur",-437573268);
} else {
return null;
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
});
return (function() {
var cljs$core$async$state_machine__35497__auto__ = null;
var cljs$core$async$state_machine__35497__auto____0 = (function (){
var statearr_39547 = [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null];
(statearr_39547[(0)] = cljs$core$async$state_machine__35497__auto__);

(statearr_39547[(1)] = (1));

return statearr_39547;
});
var cljs$core$async$state_machine__35497__auto____1 = (function (state_39467){
while(true){
var ret_value__35499__auto__ = (function (){try{while(true){
var result__35500__auto__ = switch__35496__auto__(state_39467);
if(cljs.core.keyword_identical_QMARK_(result__35500__auto__,new cljs.core.Keyword(null,"recur","recur",-437573268))){
continue;
} else {
return result__35500__auto__;
}
break;
}
}catch (e39549){var ex__35501__auto__ = e39549;
var statearr_39550_40986 = state_39467;
(statearr_39550_40986[(2)] = ex__35501__auto__);


if(cljs.core.seq((state_39467[(4)]))){
var statearr_39557_40987 = state_39467;
(statearr_39557_40987[(1)] = cljs.core.first((state_39467[(4)])));

} else {
throw ex__35501__auto__;
}

return new cljs.core.Keyword(null,"recur","recur",-437573268);
}})();
if(cljs.core.keyword_identical_QMARK_(ret_value__35499__auto__,new cljs.core.Keyword(null,"recur","recur",-437573268))){
var G__40988 = state_39467;
state_39467 = G__40988;
continue;
} else {
return ret_value__35499__auto__;
}
break;
}
});
cljs$core$async$state_machine__35497__auto__ = function(state_39467){
switch(arguments.length){
case 0:
return cljs$core$async$state_machine__35497__auto____0.call(this);
case 1:
return cljs$core$async$state_machine__35497__auto____1.call(this,state_39467);
}
throw(new Error('Invalid arity: ' + arguments.length));
};
cljs$core$async$state_machine__35497__auto__.cljs$core$IFn$_invoke$arity$0 = cljs$core$async$state_machine__35497__auto____0;
cljs$core$async$state_machine__35497__auto__.cljs$core$IFn$_invoke$arity$1 = cljs$core$async$state_machine__35497__auto____1;
return cljs$core$async$state_machine__35497__auto__;
})()
})();
var state__35927__auto__ = (function (){var statearr_39561 = f__35926__auto__();
(statearr_39561[(6)] = c__35925__auto___40956);

return statearr_39561;
})();
return cljs.core.async.impl.ioc_helpers.run_state_machine_wrapped(state__35927__auto__);
}));


return out;
}));

(cljs.core.async.partition_by.cljs$lang$maxFixedArity = 3);


//# sourceMappingURL=cljs.core.async.js.map
