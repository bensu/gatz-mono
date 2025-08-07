var $CLJS = require("./cljs_env");
var $jscomp = $CLJS.$jscomp;
var COMPILED = false;
require("./cljs.core.js");
require("./clojure.set.js");
require("./cljs.reader.js");
require("./medley.core.js");
var cognitect=$CLJS.cognitect || ($CLJS.cognitect = {});
var clojure=$CLJS.clojure || ($CLJS.clojure = {});
var crdt=$CLJS.crdt || ($CLJS.crdt = {});
var cljs=$CLJS.cljs || ($CLJS.cljs = {});
var shadow=$CLJS.shadow || ($CLJS.shadow = {});
var goog=$CLJS.goog || ($CLJS.goog = {});
var gatz=$CLJS.gatz || ($CLJS.gatz = {});
var medley=$CLJS.medley || ($CLJS.medley = {});
var com=$CLJS.com || ($CLJS.com = {});

$CLJS.SHADOW_ENV.setLoaded("crdt.core.js");

goog.provide('crdt.core');
crdt.core.now = (function crdt$core$now(){
return (new Date());
});
crdt.core.comparable_QMARK_ = (function crdt$core$comparable_QMARK_(x){
return (((x instanceof cljs.core.IComparable)) || (typeof x === 'number'));
});
(Date.prototype.cljs$core$IComparable$ = cljs.core.PROTOCOL_SENTINEL);

(Date.prototype.cljs$core$IComparable$_compare$arity$2 = (function (this$,other){
var this$__$1 = this;
if((other instanceof Date)){
return cljs.core.compare(this$__$1.getTime(),other.getTime());
} else {
throw (new Error("Cannot compare Date with non-Date"));
}
}));
(cljs.core.IComparable["string"] = true);

(cljs.core._compare["string"] = (function (this$,other){
if(typeof other === 'string'){
return this$.localeCompare(other);
} else {
throw (new Error("Cannot compare string with non-string"));
}
}));
crdt.core.rand_uuid = (function crdt$core$rand_uuid(){
return cljs.core.random_uuid();
});

/**
 * @interface
 */
crdt.core.StateCRDT = function(){};

var crdt$core$StateCRDT$_merge$dyn_44861 = (function (this$,that){
var x__5350__auto__ = (((this$ == null))?null:this$);
var m__5351__auto__ = (crdt.core._merge[goog.typeOf(x__5350__auto__)]);
if((!((m__5351__auto__ == null)))){
return (m__5351__auto__.cljs$core$IFn$_invoke$arity$2 ? m__5351__auto__.cljs$core$IFn$_invoke$arity$2(this$,that) : m__5351__auto__.call(null, this$,that));
} else {
var m__5349__auto__ = (crdt.core._merge["_"]);
if((!((m__5349__auto__ == null)))){
return (m__5349__auto__.cljs$core$IFn$_invoke$arity$2 ? m__5349__auto__.cljs$core$IFn$_invoke$arity$2(this$,that) : m__5349__auto__.call(null, this$,that));
} else {
throw cljs.core.missing_protocol("StateCRDT.-merge",this$);
}
}
});
crdt.core._merge = (function crdt$core$_merge(this$,that){
if((((!((this$ == null)))) && ((!((this$.crdt$core$StateCRDT$_merge$arity$2 == null)))))){
return this$.crdt$core$StateCRDT$_merge$arity$2(this$,that);
} else {
return crdt$core$StateCRDT$_merge$dyn_44861(this$,that);
}
});


/**
 * @interface
 */
crdt.core.OpCRDT = function(){};

var crdt$core$OpCRDT$_value$dyn_44862 = (function (this$){
var x__5350__auto__ = (((this$ == null))?null:this$);
var m__5351__auto__ = (crdt.core._value[goog.typeOf(x__5350__auto__)]);
if((!((m__5351__auto__ == null)))){
return (m__5351__auto__.cljs$core$IFn$_invoke$arity$1 ? m__5351__auto__.cljs$core$IFn$_invoke$arity$1(this$) : m__5351__auto__.call(null, this$));
} else {
var m__5349__auto__ = (crdt.core._value["_"]);
if((!((m__5349__auto__ == null)))){
return (m__5349__auto__.cljs$core$IFn$_invoke$arity$1 ? m__5349__auto__.cljs$core$IFn$_invoke$arity$1(this$) : m__5349__auto__.call(null, this$));
} else {
throw cljs.core.missing_protocol("OpCRDT.-value",this$);
}
}
});
/**
 * Returns the EDN value without the CRDT tracking
 */
crdt.core._value = (function crdt$core$_value(this$){
if((((!((this$ == null)))) && ((!((this$.crdt$core$OpCRDT$_value$arity$1 == null)))))){
return this$.crdt$core$OpCRDT$_value$arity$1(this$);
} else {
return crdt$core$OpCRDT$_value$dyn_44862(this$);
}
});

var crdt$core$OpCRDT$_apply_delta$dyn_44863 = (function (this$,_delta){
var x__5350__auto__ = (((this$ == null))?null:this$);
var m__5351__auto__ = (crdt.core._apply_delta[goog.typeOf(x__5350__auto__)]);
if((!((m__5351__auto__ == null)))){
return (m__5351__auto__.cljs$core$IFn$_invoke$arity$2 ? m__5351__auto__.cljs$core$IFn$_invoke$arity$2(this$,_delta) : m__5351__auto__.call(null, this$,_delta));
} else {
var m__5349__auto__ = (crdt.core._apply_delta["_"]);
if((!((m__5349__auto__ == null)))){
return (m__5349__auto__.cljs$core$IFn$_invoke$arity$2 ? m__5349__auto__.cljs$core$IFn$_invoke$arity$2(this$,_delta) : m__5349__auto__.call(null, this$,_delta));
} else {
throw cljs.core.missing_protocol("OpCRDT.-apply-delta",this$);
}
}
});
/**
 * Applies a delta to the CRDT
 */
crdt.core._apply_delta = (function crdt$core$_apply_delta(this$,_delta){
if((((!((this$ == null)))) && ((!((this$.crdt$core$OpCRDT$_apply_delta$arity$2 == null)))))){
return this$.crdt$core$OpCRDT$_apply_delta$arity$2(this$,_delta);
} else {
return crdt$core$OpCRDT$_apply_delta$dyn_44863(this$,_delta);
}
});


/**
 * @interface
 */
crdt.core.CRDTDelta = function(){};

var crdt$core$CRDTDelta$_init$dyn_44864 = (function (this$){
var x__5350__auto__ = (((this$ == null))?null:this$);
var m__5351__auto__ = (crdt.core._init[goog.typeOf(x__5350__auto__)]);
if((!((m__5351__auto__ == null)))){
return (m__5351__auto__.cljs$core$IFn$_invoke$arity$1 ? m__5351__auto__.cljs$core$IFn$_invoke$arity$1(this$) : m__5351__auto__.call(null, this$));
} else {
var m__5349__auto__ = (crdt.core._init["_"]);
if((!((m__5349__auto__ == null)))){
return (m__5349__auto__.cljs$core$IFn$_invoke$arity$1 ? m__5349__auto__.cljs$core$IFn$_invoke$arity$1(this$) : m__5349__auto__.call(null, this$));
} else {
throw cljs.core.missing_protocol("CRDTDelta.-init",this$);
}
}
});
/**
 * Returns the empty type of the CRDT it should be applied to
 */
crdt.core._init = (function crdt$core$_init(this$){
if((((!((this$ == null)))) && ((!((this$.crdt$core$CRDTDelta$_init$arity$1 == null)))))){
return this$.crdt$core$CRDTDelta$_init$arity$1(this$);
} else {
return crdt$core$CRDTDelta$_init$dyn_44864(this$);
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
 * @implements {crdt.core.StateCRDT}
 * @implements {crdt.core.OpCRDT}
 * @implements {crdt.core.CRDTDelta}
 * @implements {cljs.core.IPrintWithWriter}
 * @implements {cljs.core.IIterable}
 * @implements {cljs.core.IWithMeta}
 * @implements {cljs.core.IAssociative}
 * @implements {cljs.core.IMap}
 * @implements {cljs.core.ILookup}
*/
crdt.core.MinWins = (function (value,__meta,__extmap,__hash){
this.value = value;
this.__meta = __meta;
this.__extmap = __extmap;
this.__hash = __hash;
this.cljs$lang$protocol_mask$partition0$ = 2230716170;
this.cljs$lang$protocol_mask$partition1$ = 139264;
});
(crdt.core.MinWins.prototype.cljs$core$ILookup$_lookup$arity$2 = (function (this__5300__auto__,k__5301__auto__){
var self__ = this;
var this__5300__auto____$1 = this;
return this__5300__auto____$1.cljs$core$ILookup$_lookup$arity$3(null, k__5301__auto__,null);
}));

(crdt.core.MinWins.prototype.cljs$core$ILookup$_lookup$arity$3 = (function (this__5302__auto__,k44714,else__5303__auto__){
var self__ = this;
var this__5302__auto____$1 = this;
var G__44718 = k44714;
var G__44718__$1 = (((G__44718 instanceof cljs.core.Keyword))?G__44718.fqn:null);
switch (G__44718__$1) {
case "value":
return self__.value;

break;
default:
return cljs.core.get.cljs$core$IFn$_invoke$arity$3(self__.__extmap,k44714,else__5303__auto__);

}
}));

(crdt.core.MinWins.prototype.cljs$core$IKVReduce$_kv_reduce$arity$3 = (function (this__5320__auto__,f__5321__auto__,init__5322__auto__){
var self__ = this;
var this__5320__auto____$1 = this;
return cljs.core.reduce.cljs$core$IFn$_invoke$arity$3((function (ret__5323__auto__,p__44719){
var vec__44720 = p__44719;
var k__5324__auto__ = cljs.core.nth.cljs$core$IFn$_invoke$arity$3(vec__44720,(0),null);
var v__5325__auto__ = cljs.core.nth.cljs$core$IFn$_invoke$arity$3(vec__44720,(1),null);
return (f__5321__auto__.cljs$core$IFn$_invoke$arity$3 ? f__5321__auto__.cljs$core$IFn$_invoke$arity$3(ret__5323__auto__,k__5324__auto__,v__5325__auto__) : f__5321__auto__.call(null, ret__5323__auto__,k__5324__auto__,v__5325__auto__));
}),init__5322__auto__,this__5320__auto____$1);
}));

(crdt.core.MinWins.prototype.crdt$core$StateCRDT$ = cljs.core.PROTOCOL_SENTINEL);

(crdt.core.MinWins.prototype.crdt$core$StateCRDT$_merge$arity$2 = (function (this$,that){
var self__ = this;
var this$__$1 = this;
return this$__$1.crdt$core$OpCRDT$_apply_delta$arity$2(null, that);
}));

(crdt.core.MinWins.prototype.cljs$core$IPrintWithWriter$_pr_writer$arity$3 = (function (this__5315__auto__,writer__5316__auto__,opts__5317__auto__){
var self__ = this;
var this__5315__auto____$1 = this;
var pr_pair__5318__auto__ = (function (keyval__5319__auto__){
return cljs.core.pr_sequential_writer(writer__5316__auto__,cljs.core.pr_writer,""," ","",opts__5317__auto__,keyval__5319__auto__);
});
return cljs.core.pr_sequential_writer(writer__5316__auto__,pr_pair__5318__auto__,"#crdt.core.MinWins{",", ","}",opts__5317__auto__,cljs.core.concat.cljs$core$IFn$_invoke$arity$2(new cljs.core.PersistentVector(null, 1, 5, cljs.core.PersistentVector.EMPTY_NODE, [(new cljs.core.PersistentVector(null,2,(5),cljs.core.PersistentVector.EMPTY_NODE,[new cljs.core.Keyword(null,"value","value",305978217),self__.value],null))], null),self__.__extmap));
}));

(crdt.core.MinWins.prototype.cljs$core$IIterable$_iterator$arity$1 = (function (G__44713){
var self__ = this;
var G__44713__$1 = this;
return (new cljs.core.RecordIter((0),G__44713__$1,1,new cljs.core.PersistentVector(null, 1, 5, cljs.core.PersistentVector.EMPTY_NODE, [new cljs.core.Keyword(null,"value","value",305978217)], null),(cljs.core.truth_(self__.__extmap)?cljs.core._iterator(self__.__extmap):cljs.core.nil_iter())));
}));

(crdt.core.MinWins.prototype.cljs$core$IMeta$_meta$arity$1 = (function (this__5298__auto__){
var self__ = this;
var this__5298__auto____$1 = this;
return self__.__meta;
}));

(crdt.core.MinWins.prototype.cljs$core$ICloneable$_clone$arity$1 = (function (this__5295__auto__){
var self__ = this;
var this__5295__auto____$1 = this;
return (new crdt.core.MinWins(self__.value,self__.__meta,self__.__extmap,self__.__hash));
}));

(crdt.core.MinWins.prototype.cljs$core$ICounted$_count$arity$1 = (function (this__5304__auto__){
var self__ = this;
var this__5304__auto____$1 = this;
return (1 + cljs.core.count(self__.__extmap));
}));

(crdt.core.MinWins.prototype.crdt$core$OpCRDT$ = cljs.core.PROTOCOL_SENTINEL);

(crdt.core.MinWins.prototype.crdt$core$OpCRDT$_value$arity$1 = (function (_){
var self__ = this;
var ___$1 = this;
return self__.value;
}));

(crdt.core.MinWins.prototype.crdt$core$OpCRDT$_apply_delta$arity$2 = (function (this$,delta){
var self__ = this;
var this$__$1 = this;
var delta_value = crdt.core._value(delta);
if((delta_value == null)){
return this$__$1;
} else {
if((self__.value == null)){
return (new crdt.core.MinWins(delta_value,null,null,null));
} else {
var G__44723 = cljs.core.compare(self__.value,delta_value);
switch (G__44723) {
case (-1):
return this$__$1;

break;
case (0):
return this$__$1;

break;
case (1):
return (new crdt.core.MinWins(delta_value,null,null,null));

break;
default:
throw (new Error(["No matching clause: ",cljs.core.str.cljs$core$IFn$_invoke$arity$1(G__44723)].join('')));

}

}
}
}));

(crdt.core.MinWins.prototype.crdt$core$CRDTDelta$ = cljs.core.PROTOCOL_SENTINEL);

(crdt.core.MinWins.prototype.crdt$core$CRDTDelta$_init$arity$1 = (function (_){
var self__ = this;
var ___$1 = this;
return (new crdt.core.MinWins(null,null,null,null));
}));

(crdt.core.MinWins.prototype.cljs$core$IHash$_hash$arity$1 = (function (this__5296__auto__){
var self__ = this;
var this__5296__auto____$1 = this;
var h__5111__auto__ = self__.__hash;
if((!((h__5111__auto__ == null)))){
return h__5111__auto__;
} else {
var h__5111__auto____$1 = (function (coll__5297__auto__){
return (-1150539511 ^ cljs.core.hash_unordered_coll(coll__5297__auto__));
})(this__5296__auto____$1);
(self__.__hash = h__5111__auto____$1);

return h__5111__auto____$1;
}
}));

(crdt.core.MinWins.prototype.cljs$core$IEquiv$_equiv$arity$2 = (function (this44715,other44716){
var self__ = this;
var this44715__$1 = this;
return (((!((other44716 == null)))) && ((((this44715__$1.constructor === other44716.constructor)) && (((cljs.core._EQ_.cljs$core$IFn$_invoke$arity$2(this44715__$1.value,other44716.value)) && (cljs.core._EQ_.cljs$core$IFn$_invoke$arity$2(this44715__$1.__extmap,other44716.__extmap)))))));
}));

(crdt.core.MinWins.prototype.cljs$core$IMap$_dissoc$arity$2 = (function (this__5310__auto__,k__5311__auto__){
var self__ = this;
var this__5310__auto____$1 = this;
if(cljs.core.contains_QMARK_(new cljs.core.PersistentHashSet(null, new cljs.core.PersistentArrayMap(null, 1, [new cljs.core.Keyword(null,"value","value",305978217),null], null), null),k__5311__auto__)){
return cljs.core.dissoc.cljs$core$IFn$_invoke$arity$2(cljs.core._with_meta(cljs.core.into.cljs$core$IFn$_invoke$arity$2(cljs.core.PersistentArrayMap.EMPTY,this__5310__auto____$1),self__.__meta),k__5311__auto__);
} else {
return (new crdt.core.MinWins(self__.value,self__.__meta,cljs.core.not_empty(cljs.core.dissoc.cljs$core$IFn$_invoke$arity$2(self__.__extmap,k__5311__auto__)),null));
}
}));

(crdt.core.MinWins.prototype.cljs$core$IAssociative$_contains_key_QMARK_$arity$2 = (function (this__5307__auto__,k44714){
var self__ = this;
var this__5307__auto____$1 = this;
var G__44724 = k44714;
var G__44724__$1 = (((G__44724 instanceof cljs.core.Keyword))?G__44724.fqn:null);
switch (G__44724__$1) {
case "value":
return true;

break;
default:
return cljs.core.contains_QMARK_(self__.__extmap,k44714);

}
}));

(crdt.core.MinWins.prototype.cljs$core$IAssociative$_assoc$arity$3 = (function (this__5308__auto__,k__5309__auto__,G__44713){
var self__ = this;
var this__5308__auto____$1 = this;
var pred__44725 = cljs.core.keyword_identical_QMARK_;
var expr__44726 = k__5309__auto__;
if(cljs.core.truth_((pred__44725.cljs$core$IFn$_invoke$arity$2 ? pred__44725.cljs$core$IFn$_invoke$arity$2(new cljs.core.Keyword(null,"value","value",305978217),expr__44726) : pred__44725.call(null, new cljs.core.Keyword(null,"value","value",305978217),expr__44726)))){
return (new crdt.core.MinWins(G__44713,self__.__meta,self__.__extmap,null));
} else {
return (new crdt.core.MinWins(self__.value,self__.__meta,cljs.core.assoc.cljs$core$IFn$_invoke$arity$3(self__.__extmap,k__5309__auto__,G__44713),null));
}
}));

(crdt.core.MinWins.prototype.cljs$core$ISeqable$_seq$arity$1 = (function (this__5313__auto__){
var self__ = this;
var this__5313__auto____$1 = this;
return cljs.core.seq(cljs.core.concat.cljs$core$IFn$_invoke$arity$2(new cljs.core.PersistentVector(null, 1, 5, cljs.core.PersistentVector.EMPTY_NODE, [(new cljs.core.MapEntry(new cljs.core.Keyword(null,"value","value",305978217),self__.value,null))], null),self__.__extmap));
}));

(crdt.core.MinWins.prototype.cljs$core$IWithMeta$_with_meta$arity$2 = (function (this__5299__auto__,G__44713){
var self__ = this;
var this__5299__auto____$1 = this;
return (new crdt.core.MinWins(self__.value,G__44713,self__.__extmap,self__.__hash));
}));

(crdt.core.MinWins.prototype.cljs$core$ICollection$_conj$arity$2 = (function (this__5305__auto__,entry__5306__auto__){
var self__ = this;
var this__5305__auto____$1 = this;
if(cljs.core.vector_QMARK_(entry__5306__auto__)){
return this__5305__auto____$1.cljs$core$IAssociative$_assoc$arity$3(null, cljs.core._nth(entry__5306__auto__,(0)),cljs.core._nth(entry__5306__auto__,(1)));
} else {
return cljs.core.reduce.cljs$core$IFn$_invoke$arity$3(cljs.core._conj,this__5305__auto____$1,entry__5306__auto__);
}
}));

(crdt.core.MinWins.getBasis = (function (){
return new cljs.core.PersistentVector(null, 1, 5, cljs.core.PersistentVector.EMPTY_NODE, [new cljs.core.Symbol(null,"value","value",1946509744,null)], null);
}));

(crdt.core.MinWins.cljs$lang$type = true);

(crdt.core.MinWins.cljs$lang$ctorPrSeq = (function (this__5346__auto__){
return (new cljs.core.List(null,"crdt.core/MinWins",null,(1),null));
}));

(crdt.core.MinWins.cljs$lang$ctorPrWriter = (function (this__5346__auto__,writer__5347__auto__){
return cljs.core._write(writer__5347__auto__,"crdt.core/MinWins");
}));

/**
 * Positional factory function for crdt.core/MinWins.
 */
crdt.core.__GT_MinWins = (function crdt$core$__GT_MinWins(value){
return (new crdt.core.MinWins(value,null,null,null));
});

/**
 * Factory function for crdt.core/MinWins, taking a map of keywords to field values.
 */
crdt.core.map__GT_MinWins = (function crdt$core$map__GT_MinWins(G__44717){
var extmap__5342__auto__ = (function (){var G__44728 = cljs.core.dissoc.cljs$core$IFn$_invoke$arity$2(G__44717,new cljs.core.Keyword(null,"value","value",305978217));
if(cljs.core.record_QMARK_(G__44717)){
return cljs.core.into.cljs$core$IFn$_invoke$arity$2(cljs.core.PersistentArrayMap.EMPTY,G__44728);
} else {
return G__44728;
}
})();
return (new crdt.core.MinWins(new cljs.core.Keyword(null,"value","value",305978217).cljs$core$IFn$_invoke$arity$1(G__44717),null,cljs.core.not_empty(extmap__5342__auto__),null));
});

crdt.core.min_wins = (function crdt$core$min_wins(value){
if((value instanceof crdt.core.MinWins)){
return value;
} else {
return crdt.core.__GT_MinWins(value);
}
});
(crdt.core.MinWins.prototype.cljs$core$IPrintWithWriter$ = cljs.core.PROTOCOL_SENTINEL);

(crdt.core.MinWins.prototype.cljs$core$IPrintWithWriter$_pr_writer$arity$3 = (function (obj,writer,_){
var obj__$1 = this;
var tagged_value = cljs.core.tagged_literal(new cljs.core.Symbol("crdt","min-wins","crdt/min-wins",885127570,null),obj__$1.value);
return cljs.core._write(writer,cljs.core.pr_str.cljs$core$IFn$_invoke$arity$variadic(cljs.core.prim_seq.cljs$core$IFn$_invoke$arity$2([tagged_value], 0)));
}));
/**
 * Used by the reader like so:
 * 
 * #crdt/min-wins 1
 * #crdt/min-wins "a"
 * #crdt/min-wins #inst "2021-06-01"
 * #crdt/min-wins #uuid "08f711cd-1d4d-4f61-b157-c36a8be8ef95"
 */
crdt.core.read_min_wins = (function crdt$core$read_min_wins(value){
return crdt.core.__GT_MinWins(value);
});
cljs.reader.register_tag_parser_BANG_(new cljs.core.Symbol("crdt","min-wins","crdt/min-wins",885127570,null),crdt.core.read_min_wins);
crdt.core.min_wins_instance_QMARK_ = (function crdt$core$min_wins_instance_QMARK_(x){
return (x instanceof crdt.core.MinWins);
});
crdt.core.min_wins_schema = (function crdt$core$min_wins_schema(value_schema){
return new cljs.core.PersistentVector(null, 2, 5, cljs.core.PersistentVector.EMPTY_NODE, [new cljs.core.Keyword(null,"map","map",1371690461),new cljs.core.PersistentVector(null, 2, 5, cljs.core.PersistentVector.EMPTY_NODE, [new cljs.core.Keyword(null,"value","value",305978217),value_schema], null)], null);
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
 * @implements {crdt.core.StateCRDT}
 * @implements {crdt.core.OpCRDT}
 * @implements {crdt.core.CRDTDelta}
 * @implements {cljs.core.IPrintWithWriter}
 * @implements {cljs.core.IIterable}
 * @implements {cljs.core.IWithMeta}
 * @implements {cljs.core.IAssociative}
 * @implements {cljs.core.IMap}
 * @implements {cljs.core.ILookup}
*/
crdt.core.MaxWins = (function (value,__meta,__extmap,__hash){
this.value = value;
this.__meta = __meta;
this.__extmap = __extmap;
this.__hash = __hash;
this.cljs$lang$protocol_mask$partition0$ = 2230716170;
this.cljs$lang$protocol_mask$partition1$ = 139264;
});
(crdt.core.MaxWins.prototype.cljs$core$ILookup$_lookup$arity$2 = (function (this__5300__auto__,k__5301__auto__){
var self__ = this;
var this__5300__auto____$1 = this;
return this__5300__auto____$1.cljs$core$ILookup$_lookup$arity$3(null, k__5301__auto__,null);
}));

(crdt.core.MaxWins.prototype.cljs$core$ILookup$_lookup$arity$3 = (function (this__5302__auto__,k44730,else__5303__auto__){
var self__ = this;
var this__5302__auto____$1 = this;
var G__44734 = k44730;
var G__44734__$1 = (((G__44734 instanceof cljs.core.Keyword))?G__44734.fqn:null);
switch (G__44734__$1) {
case "value":
return self__.value;

break;
default:
return cljs.core.get.cljs$core$IFn$_invoke$arity$3(self__.__extmap,k44730,else__5303__auto__);

}
}));

(crdt.core.MaxWins.prototype.cljs$core$IKVReduce$_kv_reduce$arity$3 = (function (this__5320__auto__,f__5321__auto__,init__5322__auto__){
var self__ = this;
var this__5320__auto____$1 = this;
return cljs.core.reduce.cljs$core$IFn$_invoke$arity$3((function (ret__5323__auto__,p__44735){
var vec__44736 = p__44735;
var k__5324__auto__ = cljs.core.nth.cljs$core$IFn$_invoke$arity$3(vec__44736,(0),null);
var v__5325__auto__ = cljs.core.nth.cljs$core$IFn$_invoke$arity$3(vec__44736,(1),null);
return (f__5321__auto__.cljs$core$IFn$_invoke$arity$3 ? f__5321__auto__.cljs$core$IFn$_invoke$arity$3(ret__5323__auto__,k__5324__auto__,v__5325__auto__) : f__5321__auto__.call(null, ret__5323__auto__,k__5324__auto__,v__5325__auto__));
}),init__5322__auto__,this__5320__auto____$1);
}));

(crdt.core.MaxWins.prototype.crdt$core$StateCRDT$ = cljs.core.PROTOCOL_SENTINEL);

(crdt.core.MaxWins.prototype.crdt$core$StateCRDT$_merge$arity$2 = (function (this$,that){
var self__ = this;
var this$__$1 = this;
return this$__$1.crdt$core$OpCRDT$_apply_delta$arity$2(null, that);
}));

(crdt.core.MaxWins.prototype.cljs$core$IPrintWithWriter$_pr_writer$arity$3 = (function (this__5315__auto__,writer__5316__auto__,opts__5317__auto__){
var self__ = this;
var this__5315__auto____$1 = this;
var pr_pair__5318__auto__ = (function (keyval__5319__auto__){
return cljs.core.pr_sequential_writer(writer__5316__auto__,cljs.core.pr_writer,""," ","",opts__5317__auto__,keyval__5319__auto__);
});
return cljs.core.pr_sequential_writer(writer__5316__auto__,pr_pair__5318__auto__,"#crdt.core.MaxWins{",", ","}",opts__5317__auto__,cljs.core.concat.cljs$core$IFn$_invoke$arity$2(new cljs.core.PersistentVector(null, 1, 5, cljs.core.PersistentVector.EMPTY_NODE, [(new cljs.core.PersistentVector(null,2,(5),cljs.core.PersistentVector.EMPTY_NODE,[new cljs.core.Keyword(null,"value","value",305978217),self__.value],null))], null),self__.__extmap));
}));

(crdt.core.MaxWins.prototype.cljs$core$IIterable$_iterator$arity$1 = (function (G__44729){
var self__ = this;
var G__44729__$1 = this;
return (new cljs.core.RecordIter((0),G__44729__$1,1,new cljs.core.PersistentVector(null, 1, 5, cljs.core.PersistentVector.EMPTY_NODE, [new cljs.core.Keyword(null,"value","value",305978217)], null),(cljs.core.truth_(self__.__extmap)?cljs.core._iterator(self__.__extmap):cljs.core.nil_iter())));
}));

(crdt.core.MaxWins.prototype.cljs$core$IMeta$_meta$arity$1 = (function (this__5298__auto__){
var self__ = this;
var this__5298__auto____$1 = this;
return self__.__meta;
}));

(crdt.core.MaxWins.prototype.cljs$core$ICloneable$_clone$arity$1 = (function (this__5295__auto__){
var self__ = this;
var this__5295__auto____$1 = this;
return (new crdt.core.MaxWins(self__.value,self__.__meta,self__.__extmap,self__.__hash));
}));

(crdt.core.MaxWins.prototype.cljs$core$ICounted$_count$arity$1 = (function (this__5304__auto__){
var self__ = this;
var this__5304__auto____$1 = this;
return (1 + cljs.core.count(self__.__extmap));
}));

(crdt.core.MaxWins.prototype.crdt$core$OpCRDT$ = cljs.core.PROTOCOL_SENTINEL);

(crdt.core.MaxWins.prototype.crdt$core$OpCRDT$_value$arity$1 = (function (_){
var self__ = this;
var ___$1 = this;
return self__.value;
}));

(crdt.core.MaxWins.prototype.crdt$core$OpCRDT$_apply_delta$arity$2 = (function (this$,delta){
var self__ = this;
var this$__$1 = this;
var delta_value = crdt.core._value(delta);
if((delta_value == null)){
return this$__$1;
} else {
if((self__.value == null)){
return (new crdt.core.MaxWins(delta_value,null,null,null));
} else {
var G__44739 = cljs.core.compare(self__.value,delta_value);
switch (G__44739) {
case (-1):
return (new crdt.core.MaxWins(delta_value,null,null,null));

break;
case (0):
return this$__$1;

break;
case (1):
return this$__$1;

break;
default:
throw (new Error(["No matching clause: ",cljs.core.str.cljs$core$IFn$_invoke$arity$1(G__44739)].join('')));

}

}
}
}));

(crdt.core.MaxWins.prototype.crdt$core$CRDTDelta$ = cljs.core.PROTOCOL_SENTINEL);

(crdt.core.MaxWins.prototype.crdt$core$CRDTDelta$_init$arity$1 = (function (_){
var self__ = this;
var ___$1 = this;
return (new crdt.core.MaxWins(null,null,null,null));
}));

(crdt.core.MaxWins.prototype.cljs$core$IHash$_hash$arity$1 = (function (this__5296__auto__){
var self__ = this;
var this__5296__auto____$1 = this;
var h__5111__auto__ = self__.__hash;
if((!((h__5111__auto__ == null)))){
return h__5111__auto__;
} else {
var h__5111__auto____$1 = (function (coll__5297__auto__){
return (-951037943 ^ cljs.core.hash_unordered_coll(coll__5297__auto__));
})(this__5296__auto____$1);
(self__.__hash = h__5111__auto____$1);

return h__5111__auto____$1;
}
}));

(crdt.core.MaxWins.prototype.cljs$core$IEquiv$_equiv$arity$2 = (function (this44731,other44732){
var self__ = this;
var this44731__$1 = this;
return (((!((other44732 == null)))) && ((((this44731__$1.constructor === other44732.constructor)) && (((cljs.core._EQ_.cljs$core$IFn$_invoke$arity$2(this44731__$1.value,other44732.value)) && (cljs.core._EQ_.cljs$core$IFn$_invoke$arity$2(this44731__$1.__extmap,other44732.__extmap)))))));
}));

(crdt.core.MaxWins.prototype.cljs$core$IMap$_dissoc$arity$2 = (function (this__5310__auto__,k__5311__auto__){
var self__ = this;
var this__5310__auto____$1 = this;
if(cljs.core.contains_QMARK_(new cljs.core.PersistentHashSet(null, new cljs.core.PersistentArrayMap(null, 1, [new cljs.core.Keyword(null,"value","value",305978217),null], null), null),k__5311__auto__)){
return cljs.core.dissoc.cljs$core$IFn$_invoke$arity$2(cljs.core._with_meta(cljs.core.into.cljs$core$IFn$_invoke$arity$2(cljs.core.PersistentArrayMap.EMPTY,this__5310__auto____$1),self__.__meta),k__5311__auto__);
} else {
return (new crdt.core.MaxWins(self__.value,self__.__meta,cljs.core.not_empty(cljs.core.dissoc.cljs$core$IFn$_invoke$arity$2(self__.__extmap,k__5311__auto__)),null));
}
}));

(crdt.core.MaxWins.prototype.cljs$core$IAssociative$_contains_key_QMARK_$arity$2 = (function (this__5307__auto__,k44730){
var self__ = this;
var this__5307__auto____$1 = this;
var G__44740 = k44730;
var G__44740__$1 = (((G__44740 instanceof cljs.core.Keyword))?G__44740.fqn:null);
switch (G__44740__$1) {
case "value":
return true;

break;
default:
return cljs.core.contains_QMARK_(self__.__extmap,k44730);

}
}));

(crdt.core.MaxWins.prototype.cljs$core$IAssociative$_assoc$arity$3 = (function (this__5308__auto__,k__5309__auto__,G__44729){
var self__ = this;
var this__5308__auto____$1 = this;
var pred__44741 = cljs.core.keyword_identical_QMARK_;
var expr__44742 = k__5309__auto__;
if(cljs.core.truth_((pred__44741.cljs$core$IFn$_invoke$arity$2 ? pred__44741.cljs$core$IFn$_invoke$arity$2(new cljs.core.Keyword(null,"value","value",305978217),expr__44742) : pred__44741.call(null, new cljs.core.Keyword(null,"value","value",305978217),expr__44742)))){
return (new crdt.core.MaxWins(G__44729,self__.__meta,self__.__extmap,null));
} else {
return (new crdt.core.MaxWins(self__.value,self__.__meta,cljs.core.assoc.cljs$core$IFn$_invoke$arity$3(self__.__extmap,k__5309__auto__,G__44729),null));
}
}));

(crdt.core.MaxWins.prototype.cljs$core$ISeqable$_seq$arity$1 = (function (this__5313__auto__){
var self__ = this;
var this__5313__auto____$1 = this;
return cljs.core.seq(cljs.core.concat.cljs$core$IFn$_invoke$arity$2(new cljs.core.PersistentVector(null, 1, 5, cljs.core.PersistentVector.EMPTY_NODE, [(new cljs.core.MapEntry(new cljs.core.Keyword(null,"value","value",305978217),self__.value,null))], null),self__.__extmap));
}));

(crdt.core.MaxWins.prototype.cljs$core$IWithMeta$_with_meta$arity$2 = (function (this__5299__auto__,G__44729){
var self__ = this;
var this__5299__auto____$1 = this;
return (new crdt.core.MaxWins(self__.value,G__44729,self__.__extmap,self__.__hash));
}));

(crdt.core.MaxWins.prototype.cljs$core$ICollection$_conj$arity$2 = (function (this__5305__auto__,entry__5306__auto__){
var self__ = this;
var this__5305__auto____$1 = this;
if(cljs.core.vector_QMARK_(entry__5306__auto__)){
return this__5305__auto____$1.cljs$core$IAssociative$_assoc$arity$3(null, cljs.core._nth(entry__5306__auto__,(0)),cljs.core._nth(entry__5306__auto__,(1)));
} else {
return cljs.core.reduce.cljs$core$IFn$_invoke$arity$3(cljs.core._conj,this__5305__auto____$1,entry__5306__auto__);
}
}));

(crdt.core.MaxWins.getBasis = (function (){
return new cljs.core.PersistentVector(null, 1, 5, cljs.core.PersistentVector.EMPTY_NODE, [new cljs.core.Symbol(null,"value","value",1946509744,null)], null);
}));

(crdt.core.MaxWins.cljs$lang$type = true);

(crdt.core.MaxWins.cljs$lang$ctorPrSeq = (function (this__5346__auto__){
return (new cljs.core.List(null,"crdt.core/MaxWins",null,(1),null));
}));

(crdt.core.MaxWins.cljs$lang$ctorPrWriter = (function (this__5346__auto__,writer__5347__auto__){
return cljs.core._write(writer__5347__auto__,"crdt.core/MaxWins");
}));

/**
 * Positional factory function for crdt.core/MaxWins.
 */
crdt.core.__GT_MaxWins = (function crdt$core$__GT_MaxWins(value){
return (new crdt.core.MaxWins(value,null,null,null));
});

/**
 * Factory function for crdt.core/MaxWins, taking a map of keywords to field values.
 */
crdt.core.map__GT_MaxWins = (function crdt$core$map__GT_MaxWins(G__44733){
var extmap__5342__auto__ = (function (){var G__44744 = cljs.core.dissoc.cljs$core$IFn$_invoke$arity$2(G__44733,new cljs.core.Keyword(null,"value","value",305978217));
if(cljs.core.record_QMARK_(G__44733)){
return cljs.core.into.cljs$core$IFn$_invoke$arity$2(cljs.core.PersistentArrayMap.EMPTY,G__44744);
} else {
return G__44744;
}
})();
return (new crdt.core.MaxWins(new cljs.core.Keyword(null,"value","value",305978217).cljs$core$IFn$_invoke$arity$1(G__44733),null,cljs.core.not_empty(extmap__5342__auto__),null));
});

crdt.core.max_wins = (function crdt$core$max_wins(value){
if((value instanceof crdt.core.MaxWins)){
return value;
} else {
return crdt.core.__GT_MaxWins(value);
}
});
(crdt.core.MaxWins.prototype.cljs$core$IPrintWithWriter$ = cljs.core.PROTOCOL_SENTINEL);

(crdt.core.MaxWins.prototype.cljs$core$IPrintWithWriter$_pr_writer$arity$3 = (function (obj,writer,_){
var obj__$1 = this;
var tagged_value = cljs.core.tagged_literal(new cljs.core.Symbol("crdt","max-wins","crdt/max-wins",1772255516,null),obj__$1.value);
return cljs.core._write(writer,cljs.core.pr_str.cljs$core$IFn$_invoke$arity$variadic(cljs.core.prim_seq.cljs$core$IFn$_invoke$arity$2([tagged_value], 0)));
}));
/**
 * Used by the reader like so:
 * 
 * #crdt/max-wins 1
 * #crdt/max-wins "a"
 * #crdt/max-wins #inst "2021-06-01"
 * #crdt/max-wins #uuid "08f711cd-1d4d-4f61-b157-c36a8be8ef95"
 */
crdt.core.read_max_wins = (function crdt$core$read_max_wins(value){
return crdt.core.__GT_MaxWins(value);
});
cljs.reader.register_tag_parser_BANG_(new cljs.core.Symbol("crdt","max-wins","crdt/max-wins",1772255516,null),crdt.core.read_max_wins);
crdt.core.max_wins_instance_QMARK_ = (function crdt$core$max_wins_instance_QMARK_(x){
return (x instanceof crdt.core.MaxWins);
});
crdt.core.max_wins_schema = (function crdt$core$max_wins_schema(value_schema){
return new cljs.core.PersistentVector(null, 2, 5, cljs.core.PersistentVector.EMPTY_NODE, [new cljs.core.Keyword(null,"map","map",1371690461),new cljs.core.PersistentVector(null, 2, 5, cljs.core.PersistentVector.EMPTY_NODE, [new cljs.core.Keyword(null,"value","value",305978217),value_schema], null)], null);
});

/**
 * @interface
 */
crdt.core.IHLC = function(){};

var crdt$core$IHLC$_increment$dyn_44871 = (function (this$,now){
var x__5350__auto__ = (((this$ == null))?null:this$);
var m__5351__auto__ = (crdt.core._increment[goog.typeOf(x__5350__auto__)]);
if((!((m__5351__auto__ == null)))){
return (m__5351__auto__.cljs$core$IFn$_invoke$arity$2 ? m__5351__auto__.cljs$core$IFn$_invoke$arity$2(this$,now) : m__5351__auto__.call(null, this$,now));
} else {
var m__5349__auto__ = (crdt.core._increment["_"]);
if((!((m__5349__auto__ == null)))){
return (m__5349__auto__.cljs$core$IFn$_invoke$arity$2 ? m__5349__auto__.cljs$core$IFn$_invoke$arity$2(this$,now) : m__5349__auto__.call(null, this$,now));
} else {
throw cljs.core.missing_protocol("IHLC.-increment",this$);
}
}
});
/**
 * Increment the clock
 */
crdt.core._increment = (function crdt$core$_increment(this$,now){
if((((!((this$ == null)))) && ((!((this$.crdt$core$IHLC$_increment$arity$2 == null)))))){
return this$.crdt$core$IHLC$_increment$arity$2(this$,now);
} else {
return crdt$core$IHLC$_increment$dyn_44871(this$,now);
}
});

var crdt$core$IHLC$_receive$dyn_44872 = (function (this$,that,now){
var x__5350__auto__ = (((this$ == null))?null:this$);
var m__5351__auto__ = (crdt.core._receive[goog.typeOf(x__5350__auto__)]);
if((!((m__5351__auto__ == null)))){
return (m__5351__auto__.cljs$core$IFn$_invoke$arity$3 ? m__5351__auto__.cljs$core$IFn$_invoke$arity$3(this$,that,now) : m__5351__auto__.call(null, this$,that,now));
} else {
var m__5349__auto__ = (crdt.core._receive["_"]);
if((!((m__5349__auto__ == null)))){
return (m__5349__auto__.cljs$core$IFn$_invoke$arity$3 ? m__5349__auto__.cljs$core$IFn$_invoke$arity$3(this$,that,now) : m__5349__auto__.call(null, this$,that,now));
} else {
throw cljs.core.missing_protocol("IHLC.-receive",this$);
}
}
});
/**
 * Combine two clocks
 */
crdt.core._receive = (function crdt$core$_receive(this$,that,now){
if((((!((this$ == null)))) && ((!((this$.crdt$core$IHLC$_receive$arity$3 == null)))))){
return this$.crdt$core$IHLC$_receive$arity$3(this$,that,now);
} else {
return crdt$core$IHLC$_receive$dyn_44872(this$,that,now);
}
});


/**
* @constructor
 * @implements {cljs.core.IRecord}
 * @implements {cljs.core.IKVReduce}
 * @implements {cljs.core.IEquiv}
 * @implements {cljs.core.IHash}
 * @implements {cljs.core.ICollection}
 * @implements {crdt.core.IHLC}
 * @implements {cljs.core.ICounted}
 * @implements {cljs.core.ISeqable}
 * @implements {cljs.core.IMeta}
 * @implements {cljs.core.ICloneable}
 * @implements {crdt.core.StateCRDT}
 * @implements {crdt.core.OpCRDT}
 * @implements {crdt.core.CRDTDelta}
 * @implements {cljs.core.IPrintWithWriter}
 * @implements {cljs.core.IIterable}
 * @implements {cljs.core.IComparable}
 * @implements {cljs.core.IWithMeta}
 * @implements {cljs.core.IAssociative}
 * @implements {cljs.core.IMap}
 * @implements {cljs.core.ILookup}
*/
crdt.core.HLC = (function (ts,counter,node,__meta,__extmap,__hash){
this.ts = ts;
this.counter = counter;
this.node = node;
this.__meta = __meta;
this.__extmap = __extmap;
this.__hash = __hash;
this.cljs$lang$protocol_mask$partition0$ = 2230716170;
this.cljs$lang$protocol_mask$partition1$ = 141312;
});
(crdt.core.HLC.prototype.cljs$core$ILookup$_lookup$arity$2 = (function (this__5300__auto__,k__5301__auto__){
var self__ = this;
var this__5300__auto____$1 = this;
return this__5300__auto____$1.cljs$core$ILookup$_lookup$arity$3(null, k__5301__auto__,null);
}));

(crdt.core.HLC.prototype.cljs$core$ILookup$_lookup$arity$3 = (function (this__5302__auto__,k44746,else__5303__auto__){
var self__ = this;
var this__5302__auto____$1 = this;
var G__44750 = k44746;
var G__44750__$1 = (((G__44750 instanceof cljs.core.Keyword))?G__44750.fqn:null);
switch (G__44750__$1) {
case "ts":
return self__.ts;

break;
case "counter":
return self__.counter;

break;
case "node":
return self__.node;

break;
default:
return cljs.core.get.cljs$core$IFn$_invoke$arity$3(self__.__extmap,k44746,else__5303__auto__);

}
}));

(crdt.core.HLC.prototype.cljs$core$IKVReduce$_kv_reduce$arity$3 = (function (this__5320__auto__,f__5321__auto__,init__5322__auto__){
var self__ = this;
var this__5320__auto____$1 = this;
return cljs.core.reduce.cljs$core$IFn$_invoke$arity$3((function (ret__5323__auto__,p__44751){
var vec__44752 = p__44751;
var k__5324__auto__ = cljs.core.nth.cljs$core$IFn$_invoke$arity$3(vec__44752,(0),null);
var v__5325__auto__ = cljs.core.nth.cljs$core$IFn$_invoke$arity$3(vec__44752,(1),null);
return (f__5321__auto__.cljs$core$IFn$_invoke$arity$3 ? f__5321__auto__.cljs$core$IFn$_invoke$arity$3(ret__5323__auto__,k__5324__auto__,v__5325__auto__) : f__5321__auto__.call(null, ret__5323__auto__,k__5324__auto__,v__5325__auto__));
}),init__5322__auto__,this__5320__auto____$1);
}));

(crdt.core.HLC.prototype.crdt$core$StateCRDT$ = cljs.core.PROTOCOL_SENTINEL);

(crdt.core.HLC.prototype.crdt$core$StateCRDT$_merge$arity$2 = (function (this$,that){
var self__ = this;
var this$__$1 = this;
return this$__$1.crdt$core$OpCRDT$_apply_delta$arity$2(null, that);
}));

(crdt.core.HLC.prototype.cljs$core$IPrintWithWriter$_pr_writer$arity$3 = (function (this__5315__auto__,writer__5316__auto__,opts__5317__auto__){
var self__ = this;
var this__5315__auto____$1 = this;
var pr_pair__5318__auto__ = (function (keyval__5319__auto__){
return cljs.core.pr_sequential_writer(writer__5316__auto__,cljs.core.pr_writer,""," ","",opts__5317__auto__,keyval__5319__auto__);
});
return cljs.core.pr_sequential_writer(writer__5316__auto__,pr_pair__5318__auto__,"#crdt.core.HLC{",", ","}",opts__5317__auto__,cljs.core.concat.cljs$core$IFn$_invoke$arity$2(new cljs.core.PersistentVector(null, 3, 5, cljs.core.PersistentVector.EMPTY_NODE, [(new cljs.core.PersistentVector(null,2,(5),cljs.core.PersistentVector.EMPTY_NODE,[new cljs.core.Keyword(null,"ts","ts",1617209904),self__.ts],null)),(new cljs.core.PersistentVector(null,2,(5),cljs.core.PersistentVector.EMPTY_NODE,[new cljs.core.Keyword(null,"counter","counter",804008177),self__.counter],null)),(new cljs.core.PersistentVector(null,2,(5),cljs.core.PersistentVector.EMPTY_NODE,[new cljs.core.Keyword(null,"node","node",581201198),self__.node],null))], null),self__.__extmap));
}));

(crdt.core.HLC.prototype.cljs$core$IIterable$_iterator$arity$1 = (function (G__44745){
var self__ = this;
var G__44745__$1 = this;
return (new cljs.core.RecordIter((0),G__44745__$1,3,new cljs.core.PersistentVector(null, 3, 5, cljs.core.PersistentVector.EMPTY_NODE, [new cljs.core.Keyword(null,"ts","ts",1617209904),new cljs.core.Keyword(null,"counter","counter",804008177),new cljs.core.Keyword(null,"node","node",581201198)], null),(cljs.core.truth_(self__.__extmap)?cljs.core._iterator(self__.__extmap):cljs.core.nil_iter())));
}));

(crdt.core.HLC.prototype.cljs$core$IMeta$_meta$arity$1 = (function (this__5298__auto__){
var self__ = this;
var this__5298__auto____$1 = this;
return self__.__meta;
}));

(crdt.core.HLC.prototype.cljs$core$ICloneable$_clone$arity$1 = (function (this__5295__auto__){
var self__ = this;
var this__5295__auto____$1 = this;
return (new crdt.core.HLC(self__.ts,self__.counter,self__.node,self__.__meta,self__.__extmap,self__.__hash));
}));

(crdt.core.HLC.prototype.cljs$core$ICounted$_count$arity$1 = (function (this__5304__auto__){
var self__ = this;
var this__5304__auto____$1 = this;
return (3 + cljs.core.count(self__.__extmap));
}));

(crdt.core.HLC.prototype.crdt$core$OpCRDT$ = cljs.core.PROTOCOL_SENTINEL);

(crdt.core.HLC.prototype.crdt$core$OpCRDT$_value$arity$1 = (function (this$){
var self__ = this;
var this$__$1 = this;
return this$__$1;
}));

(crdt.core.HLC.prototype.crdt$core$OpCRDT$_apply_delta$arity$2 = (function (this$,delta){
var self__ = this;
var this$__$1 = this;
var G__44755 = cljs.core.compare(this$__$1,delta);
switch (G__44755) {
case (-1):
return delta;

break;
case (0):
return this$__$1;

break;
case (1):
return this$__$1;

break;
default:
throw (new Error(["No matching clause: ",cljs.core.str.cljs$core$IFn$_invoke$arity$1(G__44755)].join('')));

}
}));

(crdt.core.HLC.prototype.crdt$core$CRDTDelta$ = cljs.core.PROTOCOL_SENTINEL);

(crdt.core.HLC.prototype.crdt$core$CRDTDelta$_init$arity$1 = (function (_){
var self__ = this;
var ___$1 = this;
return (new crdt.core.HLC(self__.ts,(0),self__.node,null,null,null));
}));

(crdt.core.HLC.prototype.cljs$core$IHash$_hash$arity$1 = (function (this__5296__auto__){
var self__ = this;
var this__5296__auto____$1 = this;
var h__5111__auto__ = self__.__hash;
if((!((h__5111__auto__ == null)))){
return h__5111__auto__;
} else {
var h__5111__auto____$1 = (function (coll__5297__auto__){
return (-1000904628 ^ cljs.core.hash_unordered_coll(coll__5297__auto__));
})(this__5296__auto____$1);
(self__.__hash = h__5111__auto____$1);

return h__5111__auto____$1;
}
}));

(crdt.core.HLC.prototype.cljs$core$IEquiv$_equiv$arity$2 = (function (this44747,other44748){
var self__ = this;
var this44747__$1 = this;
return (((!((other44748 == null)))) && ((((this44747__$1.constructor === other44748.constructor)) && (((cljs.core._EQ_.cljs$core$IFn$_invoke$arity$2(this44747__$1.ts,other44748.ts)) && (((cljs.core._EQ_.cljs$core$IFn$_invoke$arity$2(this44747__$1.counter,other44748.counter)) && (((cljs.core._EQ_.cljs$core$IFn$_invoke$arity$2(this44747__$1.node,other44748.node)) && (cljs.core._EQ_.cljs$core$IFn$_invoke$arity$2(this44747__$1.__extmap,other44748.__extmap)))))))))));
}));

(crdt.core.HLC.prototype.crdt$core$IHLC$ = cljs.core.PROTOCOL_SENTINEL);

(crdt.core.HLC.prototype.crdt$core$IHLC$_increment$arity$2 = (function (_,now){
var self__ = this;
var ___$1 = this;
if((self__.ts.getTime() < now.getTime())){
return (new crdt.core.HLC(now,(0),self__.node,null,null,null));
} else {
return (new crdt.core.HLC(self__.ts,(self__.counter + (1)),self__.node,null,null,null));
}
}));

(crdt.core.HLC.prototype.crdt$core$IHLC$_receive$arity$3 = (function (_,remote,now){
var self__ = this;
var ___$1 = this;
if((((self__.ts.getTime() < now.getTime())) && ((new cljs.core.Keyword(null,"ts","ts",1617209904).cljs$core$IFn$_invoke$arity$1(remote).getTime() < now.getTime())))){
return (new crdt.core.HLC(now,(0),self__.node,null,null,null));
} else {
var G__44756 = cljs.core.compare(self__.ts,new cljs.core.Keyword(null,"ts","ts",1617209904).cljs$core$IFn$_invoke$arity$1(remote));
switch (G__44756) {
case (-1):
return (new crdt.core.HLC(new cljs.core.Keyword(null,"ts","ts",1617209904).cljs$core$IFn$_invoke$arity$1(remote),(new cljs.core.Keyword(null,"counter","counter",804008177).cljs$core$IFn$_invoke$arity$1(remote) + (1)),self__.node,null,null,null));

break;
case (0):
return (new crdt.core.HLC(self__.ts,((function (){var x__5087__auto__ = self__.counter;
var y__5088__auto__ = new cljs.core.Keyword(null,"counter","counter",804008177).cljs$core$IFn$_invoke$arity$1(remote);
return ((x__5087__auto__ > y__5088__auto__) ? x__5087__auto__ : y__5088__auto__);
})() + (1)),self__.node,null,null,null));

break;
case (1):
return (new crdt.core.HLC(self__.ts,(self__.counter + (1)),self__.node,null,null,null));

break;
default:
throw (new Error(["No matching clause: ",cljs.core.str.cljs$core$IFn$_invoke$arity$1(G__44756)].join('')));

}
}
}));

(crdt.core.HLC.prototype.cljs$core$IMap$_dissoc$arity$2 = (function (this__5310__auto__,k__5311__auto__){
var self__ = this;
var this__5310__auto____$1 = this;
if(cljs.core.contains_QMARK_(new cljs.core.PersistentHashSet(null, new cljs.core.PersistentArrayMap(null, 3, [new cljs.core.Keyword(null,"node","node",581201198),null,new cljs.core.Keyword(null,"ts","ts",1617209904),null,new cljs.core.Keyword(null,"counter","counter",804008177),null], null), null),k__5311__auto__)){
return cljs.core.dissoc.cljs$core$IFn$_invoke$arity$2(cljs.core._with_meta(cljs.core.into.cljs$core$IFn$_invoke$arity$2(cljs.core.PersistentArrayMap.EMPTY,this__5310__auto____$1),self__.__meta),k__5311__auto__);
} else {
return (new crdt.core.HLC(self__.ts,self__.counter,self__.node,self__.__meta,cljs.core.not_empty(cljs.core.dissoc.cljs$core$IFn$_invoke$arity$2(self__.__extmap,k__5311__auto__)),null));
}
}));

(crdt.core.HLC.prototype.cljs$core$IAssociative$_contains_key_QMARK_$arity$2 = (function (this__5307__auto__,k44746){
var self__ = this;
var this__5307__auto____$1 = this;
var G__44757 = k44746;
var G__44757__$1 = (((G__44757 instanceof cljs.core.Keyword))?G__44757.fqn:null);
switch (G__44757__$1) {
case "ts":
case "counter":
case "node":
return true;

break;
default:
return cljs.core.contains_QMARK_(self__.__extmap,k44746);

}
}));

(crdt.core.HLC.prototype.cljs$core$IAssociative$_assoc$arity$3 = (function (this__5308__auto__,k__5309__auto__,G__44745){
var self__ = this;
var this__5308__auto____$1 = this;
var pred__44758 = cljs.core.keyword_identical_QMARK_;
var expr__44759 = k__5309__auto__;
if(cljs.core.truth_((pred__44758.cljs$core$IFn$_invoke$arity$2 ? pred__44758.cljs$core$IFn$_invoke$arity$2(new cljs.core.Keyword(null,"ts","ts",1617209904),expr__44759) : pred__44758.call(null, new cljs.core.Keyword(null,"ts","ts",1617209904),expr__44759)))){
return (new crdt.core.HLC(G__44745,self__.counter,self__.node,self__.__meta,self__.__extmap,null));
} else {
if(cljs.core.truth_((pred__44758.cljs$core$IFn$_invoke$arity$2 ? pred__44758.cljs$core$IFn$_invoke$arity$2(new cljs.core.Keyword(null,"counter","counter",804008177),expr__44759) : pred__44758.call(null, new cljs.core.Keyword(null,"counter","counter",804008177),expr__44759)))){
return (new crdt.core.HLC(self__.ts,G__44745,self__.node,self__.__meta,self__.__extmap,null));
} else {
if(cljs.core.truth_((pred__44758.cljs$core$IFn$_invoke$arity$2 ? pred__44758.cljs$core$IFn$_invoke$arity$2(new cljs.core.Keyword(null,"node","node",581201198),expr__44759) : pred__44758.call(null, new cljs.core.Keyword(null,"node","node",581201198),expr__44759)))){
return (new crdt.core.HLC(self__.ts,self__.counter,G__44745,self__.__meta,self__.__extmap,null));
} else {
return (new crdt.core.HLC(self__.ts,self__.counter,self__.node,self__.__meta,cljs.core.assoc.cljs$core$IFn$_invoke$arity$3(self__.__extmap,k__5309__auto__,G__44745),null));
}
}
}
}));

(crdt.core.HLC.prototype.cljs$core$ISeqable$_seq$arity$1 = (function (this__5313__auto__){
var self__ = this;
var this__5313__auto____$1 = this;
return cljs.core.seq(cljs.core.concat.cljs$core$IFn$_invoke$arity$2(new cljs.core.PersistentVector(null, 3, 5, cljs.core.PersistentVector.EMPTY_NODE, [(new cljs.core.MapEntry(new cljs.core.Keyword(null,"ts","ts",1617209904),self__.ts,null)),(new cljs.core.MapEntry(new cljs.core.Keyword(null,"counter","counter",804008177),self__.counter,null)),(new cljs.core.MapEntry(new cljs.core.Keyword(null,"node","node",581201198),self__.node,null))], null),self__.__extmap));
}));

(crdt.core.HLC.prototype.cljs$core$IWithMeta$_with_meta$arity$2 = (function (this__5299__auto__,G__44745){
var self__ = this;
var this__5299__auto____$1 = this;
return (new crdt.core.HLC(self__.ts,self__.counter,self__.node,G__44745,self__.__extmap,self__.__hash));
}));

(crdt.core.HLC.prototype.cljs$core$ICollection$_conj$arity$2 = (function (this__5305__auto__,entry__5306__auto__){
var self__ = this;
var this__5305__auto____$1 = this;
if(cljs.core.vector_QMARK_(entry__5306__auto__)){
return this__5305__auto____$1.cljs$core$IAssociative$_assoc$arity$3(null, cljs.core._nth(entry__5306__auto__,(0)),cljs.core._nth(entry__5306__auto__,(1)));
} else {
return cljs.core.reduce.cljs$core$IFn$_invoke$arity$3(cljs.core._conj,this__5305__auto____$1,entry__5306__auto__);
}
}));

(crdt.core.HLC.prototype.cljs$core$IComparable$_compare$arity$2 = (function (this$,that){
var self__ = this;
var this$__$1 = this;
var G__44761 = cljs.core.compare(cljs.core.get.cljs$core$IFn$_invoke$arity$2(this$__$1,new cljs.core.Keyword(null,"ts","ts",1617209904)),cljs.core.get.cljs$core$IFn$_invoke$arity$2(that,new cljs.core.Keyword(null,"ts","ts",1617209904)));
switch (G__44761) {
case (-1):
return (-1);

break;
case (1):
return (1);

break;
case (0):
var G__44762 = cljs.core.compare(cljs.core.get.cljs$core$IFn$_invoke$arity$2(this$__$1,new cljs.core.Keyword(null,"counter","counter",804008177)),cljs.core.get.cljs$core$IFn$_invoke$arity$2(that,new cljs.core.Keyword(null,"counter","counter",804008177)));
switch (G__44762) {
case (-1):
return (-1);

break;
case (1):
return (1);

break;
case (0):
var G__44763 = cljs.core.compare(cljs.core.get.cljs$core$IFn$_invoke$arity$2(this$__$1,new cljs.core.Keyword(null,"node","node",581201198)),cljs.core.get.cljs$core$IFn$_invoke$arity$2(that,new cljs.core.Keyword(null,"node","node",581201198)));
switch (G__44763) {
case (-1):
return (-1);

break;
case (1):
return (1);

break;
case (0):
return (0);

break;
default:
throw (new Error(["No matching clause: ",cljs.core.str.cljs$core$IFn$_invoke$arity$1(G__44763)].join('')));

}

break;
default:
throw (new Error(["No matching clause: ",cljs.core.str.cljs$core$IFn$_invoke$arity$1(G__44762)].join('')));

}

break;
default:
throw (new Error(["No matching clause: ",cljs.core.str.cljs$core$IFn$_invoke$arity$1(G__44761)].join('')));

}
}));

(crdt.core.HLC.getBasis = (function (){
return new cljs.core.PersistentVector(null, 3, 5, cljs.core.PersistentVector.EMPTY_NODE, [cljs.core.with_meta(new cljs.core.Symbol(null,"ts","ts",-1037225865,null),new cljs.core.PersistentArrayMap(null, 1, [new cljs.core.Keyword(null,"tag","tag",-1290361223),new cljs.core.Symbol("js","Date","js/Date",946858373,null)], null)),cljs.core.with_meta(new cljs.core.Symbol(null,"counter","counter",-1850427592,null),new cljs.core.PersistentArrayMap(null, 1, [new cljs.core.Keyword(null,"tag","tag",-1290361223),new cljs.core.Symbol(null,"number","number",-1084057331,null)], null)),cljs.core.with_meta(new cljs.core.Symbol(null,"node","node",-2073234571,null),new cljs.core.PersistentArrayMap(null, 1, [new cljs.core.Keyword(null,"tag","tag",-1290361223),new cljs.core.Symbol(null,"UUID","UUID",-880853215,null)], null))], null);
}));

(crdt.core.HLC.cljs$lang$type = true);

(crdt.core.HLC.cljs$lang$ctorPrSeq = (function (this__5346__auto__){
return (new cljs.core.List(null,"crdt.core/HLC",null,(1),null));
}));

(crdt.core.HLC.cljs$lang$ctorPrWriter = (function (this__5346__auto__,writer__5347__auto__){
return cljs.core._write(writer__5347__auto__,"crdt.core/HLC");
}));

/**
 * Positional factory function for crdt.core/HLC.
 */
crdt.core.__GT_HLC = (function crdt$core$__GT_HLC(ts,counter,node){
return (new crdt.core.HLC(ts,counter,node,null,null,null));
});

/**
 * Factory function for crdt.core/HLC, taking a map of keywords to field values.
 */
crdt.core.map__GT_HLC = (function crdt$core$map__GT_HLC(G__44749){
var extmap__5342__auto__ = (function (){var G__44764 = cljs.core.dissoc.cljs$core$IFn$_invoke$arity$variadic(G__44749,new cljs.core.Keyword(null,"ts","ts",1617209904),cljs.core.prim_seq.cljs$core$IFn$_invoke$arity$2([new cljs.core.Keyword(null,"counter","counter",804008177),new cljs.core.Keyword(null,"node","node",581201198)], 0));
if(cljs.core.record_QMARK_(G__44749)){
return cljs.core.into.cljs$core$IFn$_invoke$arity$2(cljs.core.PersistentArrayMap.EMPTY,G__44764);
} else {
return G__44764;
}
})();
return (new crdt.core.HLC(new cljs.core.Keyword(null,"ts","ts",1617209904).cljs$core$IFn$_invoke$arity$1(G__44749),new cljs.core.Keyword(null,"counter","counter",804008177).cljs$core$IFn$_invoke$arity$1(G__44749),new cljs.core.Keyword(null,"node","node",581201198).cljs$core$IFn$_invoke$arity$1(G__44749),null,cljs.core.not_empty(extmap__5342__auto__),null));
});

(crdt.core.HLC.prototype.cljs$core$IPrintWithWriter$ = cljs.core.PROTOCOL_SENTINEL);

(crdt.core.HLC.prototype.cljs$core$IPrintWithWriter$_pr_writer$arity$3 = (function (obj,writer,_){
var obj__$1 = this;
var tagged_value = cljs.core.tagged_literal(new cljs.core.Symbol("crdt","hlc","crdt/hlc",-500131509,null),new cljs.core.PersistentVector(null, 3, 5, cljs.core.PersistentVector.EMPTY_NODE, [obj__$1.ts,obj__$1.counter,obj__$1.node], null));
return cljs.core._write(writer,cljs.core.pr_str.cljs$core$IFn$_invoke$arity$variadic(cljs.core.prim_seq.cljs$core$IFn$_invoke$arity$2([tagged_value], 0)));
}));
crdt.core.new_hlc = (function crdt$core$new_hlc(var_args){
var G__44766 = arguments.length;
switch (G__44766) {
case 1:
return crdt.core.new_hlc.cljs$core$IFn$_invoke$arity$1((arguments[(0)]));

break;
case 2:
return crdt.core.new_hlc.cljs$core$IFn$_invoke$arity$2((arguments[(0)]),(arguments[(1)]));

break;
default:
throw (new Error(["Invalid arity: ",cljs.core.str.cljs$core$IFn$_invoke$arity$1(arguments.length)].join('')));

}
});

(crdt.core.new_hlc.cljs$core$IFn$_invoke$arity$1 = (function (node){
return crdt.core.new_hlc.cljs$core$IFn$_invoke$arity$2(node,crdt.core.now());
}));

(crdt.core.new_hlc.cljs$core$IFn$_invoke$arity$2 = (function (node,now){
return (new crdt.core.HLC(now,(0),node,null,null,null));
}));

(crdt.core.new_hlc.cljs$lang$maxFixedArity = 2);

/**
 * Used by the reader like so:
 * 
 * #crdt/hlc [#uuid "08f711cd-1d4d-4f61-b157-c36a8be8ef95"]
 * #crdt/hlc [1 #uuid "08f711cd-1d4d-4f61-b157-c36a8be8ef95"]
 * #crdt/hlc [#inst "2021-06-01" 1 #uuid "08f711cd-1d4d-4f61-b157-c36a8be8ef95"]
 */
crdt.core.read_hlc = (function crdt$core$read_hlc(value){
if(cljs.core.vector_QMARK_(value)){
} else {
throw (new Error(["Assert failed: ","HLC must be a vector","\n","(vector? value)"].join('')));
}

if((cljs.core.count(value) <= (3))){
} else {
throw (new Error(["Assert failed: ","HLC must have 0, 1, 2, or 3 elements","\n","(<= (count value) 3)"].join('')));
}

var G__44767 = cljs.core.count(value);
switch (G__44767) {
case (0):
return crdt.core.__GT_HLC(crdt.core.now(),(0),cljs.core.random_uuid());

break;
case (1):
return crdt.core.__GT_HLC(crdt.core.now(),(0),cljs.core.first(value));

break;
case (2):
return crdt.core.__GT_HLC(crdt.core.now(),cljs.core.first(value),cljs.core.second(value));

break;
case (3):
return crdt.core.__GT_HLC(cljs.core.first(value),cljs.core.second(value),cljs.core.nth.cljs$core$IFn$_invoke$arity$2(value,(2)));

break;
default:
throw (new Error(["No matching clause: ",cljs.core.str.cljs$core$IFn$_invoke$arity$1(G__44767)].join('')));

}
});
cljs.reader.register_tag_parser_BANG_(new cljs.core.Symbol("crdt","hlc","crdt/hlc",-500131509,null),crdt.core.read_hlc);
crdt.core.hlc_instance_QMARK_ = (function crdt$core$hlc_instance_QMARK_(x){
return (x instanceof crdt.core.HLC);
});
crdt.core.hlc_schema = new cljs.core.PersistentVector(null, 4, 5, cljs.core.PersistentVector.EMPTY_NODE, [new cljs.core.Keyword(null,"map","map",1371690461),new cljs.core.PersistentVector(null, 2, 5, cljs.core.PersistentVector.EMPTY_NODE, [new cljs.core.Keyword(null,"ts","ts",1617209904),cljs.core.inst_QMARK_], null),new cljs.core.PersistentVector(null, 2, 5, cljs.core.PersistentVector.EMPTY_NODE, [new cljs.core.Keyword(null,"counter","counter",804008177),cljs.core.integer_QMARK_], null),new cljs.core.PersistentVector(null, 2, 5, cljs.core.PersistentVector.EMPTY_NODE, [new cljs.core.Keyword(null,"node","node",581201198),new cljs.core.Keyword(null,"uuid","uuid",-2145095719)], null)], null);
crdt.core.inc_time = (function crdt$core$inc_time(d){
return (new Date((d.getTime() + (1))));
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
 * @implements {cljs.core.IComparable}
 * @implements {cljs.core.IWithMeta}
 * @implements {cljs.core.IAssociative}
 * @implements {cljs.core.IMap}
 * @implements {cljs.core.ILookup}
*/
crdt.core.ClientClock = (function (event_number,ts,user_id,conn_id,__meta,__extmap,__hash){
this.event_number = event_number;
this.ts = ts;
this.user_id = user_id;
this.conn_id = conn_id;
this.__meta = __meta;
this.__extmap = __extmap;
this.__hash = __hash;
this.cljs$lang$protocol_mask$partition0$ = 2230716170;
this.cljs$lang$protocol_mask$partition1$ = 141312;
});
(crdt.core.ClientClock.prototype.cljs$core$ILookup$_lookup$arity$2 = (function (this__5300__auto__,k__5301__auto__){
var self__ = this;
var this__5300__auto____$1 = this;
return this__5300__auto____$1.cljs$core$ILookup$_lookup$arity$3(null, k__5301__auto__,null);
}));

(crdt.core.ClientClock.prototype.cljs$core$ILookup$_lookup$arity$3 = (function (this__5302__auto__,k44769,else__5303__auto__){
var self__ = this;
var this__5302__auto____$1 = this;
var G__44773 = k44769;
var G__44773__$1 = (((G__44773 instanceof cljs.core.Keyword))?G__44773.fqn:null);
switch (G__44773__$1) {
case "event-number":
return self__.event_number;

break;
case "ts":
return self__.ts;

break;
case "user-id":
return self__.user_id;

break;
case "conn-id":
return self__.conn_id;

break;
default:
return cljs.core.get.cljs$core$IFn$_invoke$arity$3(self__.__extmap,k44769,else__5303__auto__);

}
}));

(crdt.core.ClientClock.prototype.cljs$core$IKVReduce$_kv_reduce$arity$3 = (function (this__5320__auto__,f__5321__auto__,init__5322__auto__){
var self__ = this;
var this__5320__auto____$1 = this;
return cljs.core.reduce.cljs$core$IFn$_invoke$arity$3((function (ret__5323__auto__,p__44774){
var vec__44775 = p__44774;
var k__5324__auto__ = cljs.core.nth.cljs$core$IFn$_invoke$arity$3(vec__44775,(0),null);
var v__5325__auto__ = cljs.core.nth.cljs$core$IFn$_invoke$arity$3(vec__44775,(1),null);
return (f__5321__auto__.cljs$core$IFn$_invoke$arity$3 ? f__5321__auto__.cljs$core$IFn$_invoke$arity$3(ret__5323__auto__,k__5324__auto__,v__5325__auto__) : f__5321__auto__.call(null, ret__5323__auto__,k__5324__auto__,v__5325__auto__));
}),init__5322__auto__,this__5320__auto____$1);
}));

(crdt.core.ClientClock.prototype.cljs$core$IPrintWithWriter$_pr_writer$arity$3 = (function (this__5315__auto__,writer__5316__auto__,opts__5317__auto__){
var self__ = this;
var this__5315__auto____$1 = this;
var pr_pair__5318__auto__ = (function (keyval__5319__auto__){
return cljs.core.pr_sequential_writer(writer__5316__auto__,cljs.core.pr_writer,""," ","",opts__5317__auto__,keyval__5319__auto__);
});
return cljs.core.pr_sequential_writer(writer__5316__auto__,pr_pair__5318__auto__,"#crdt.core.ClientClock{",", ","}",opts__5317__auto__,cljs.core.concat.cljs$core$IFn$_invoke$arity$2(new cljs.core.PersistentVector(null, 4, 5, cljs.core.PersistentVector.EMPTY_NODE, [(new cljs.core.PersistentVector(null,2,(5),cljs.core.PersistentVector.EMPTY_NODE,[new cljs.core.Keyword(null,"event-number","event-number",-297055826),self__.event_number],null)),(new cljs.core.PersistentVector(null,2,(5),cljs.core.PersistentVector.EMPTY_NODE,[new cljs.core.Keyword(null,"ts","ts",1617209904),self__.ts],null)),(new cljs.core.PersistentVector(null,2,(5),cljs.core.PersistentVector.EMPTY_NODE,[new cljs.core.Keyword(null,"user-id","user-id",-206822291),self__.user_id],null)),(new cljs.core.PersistentVector(null,2,(5),cljs.core.PersistentVector.EMPTY_NODE,[new cljs.core.Keyword(null,"conn-id","conn-id",83297724),self__.conn_id],null))], null),self__.__extmap));
}));

(crdt.core.ClientClock.prototype.cljs$core$IIterable$_iterator$arity$1 = (function (G__44768){
var self__ = this;
var G__44768__$1 = this;
return (new cljs.core.RecordIter((0),G__44768__$1,4,new cljs.core.PersistentVector(null, 4, 5, cljs.core.PersistentVector.EMPTY_NODE, [new cljs.core.Keyword(null,"event-number","event-number",-297055826),new cljs.core.Keyword(null,"ts","ts",1617209904),new cljs.core.Keyword(null,"user-id","user-id",-206822291),new cljs.core.Keyword(null,"conn-id","conn-id",83297724)], null),(cljs.core.truth_(self__.__extmap)?cljs.core._iterator(self__.__extmap):cljs.core.nil_iter())));
}));

(crdt.core.ClientClock.prototype.cljs$core$IMeta$_meta$arity$1 = (function (this__5298__auto__){
var self__ = this;
var this__5298__auto____$1 = this;
return self__.__meta;
}));

(crdt.core.ClientClock.prototype.cljs$core$ICloneable$_clone$arity$1 = (function (this__5295__auto__){
var self__ = this;
var this__5295__auto____$1 = this;
return (new crdt.core.ClientClock(self__.event_number,self__.ts,self__.user_id,self__.conn_id,self__.__meta,self__.__extmap,self__.__hash));
}));

(crdt.core.ClientClock.prototype.cljs$core$ICounted$_count$arity$1 = (function (this__5304__auto__){
var self__ = this;
var this__5304__auto____$1 = this;
return (4 + cljs.core.count(self__.__extmap));
}));

(crdt.core.ClientClock.prototype.cljs$core$IHash$_hash$arity$1 = (function (this__5296__auto__){
var self__ = this;
var this__5296__auto____$1 = this;
var h__5111__auto__ = self__.__hash;
if((!((h__5111__auto__ == null)))){
return h__5111__auto__;
} else {
var h__5111__auto____$1 = (function (coll__5297__auto__){
return (-164346443 ^ cljs.core.hash_unordered_coll(coll__5297__auto__));
})(this__5296__auto____$1);
(self__.__hash = h__5111__auto____$1);

return h__5111__auto____$1;
}
}));

(crdt.core.ClientClock.prototype.cljs$core$IEquiv$_equiv$arity$2 = (function (this44770,other44771){
var self__ = this;
var this44770__$1 = this;
return (((!((other44771 == null)))) && ((((this44770__$1.constructor === other44771.constructor)) && (((cljs.core._EQ_.cljs$core$IFn$_invoke$arity$2(this44770__$1.event_number,other44771.event_number)) && (((cljs.core._EQ_.cljs$core$IFn$_invoke$arity$2(this44770__$1.ts,other44771.ts)) && (((cljs.core._EQ_.cljs$core$IFn$_invoke$arity$2(this44770__$1.user_id,other44771.user_id)) && (((cljs.core._EQ_.cljs$core$IFn$_invoke$arity$2(this44770__$1.conn_id,other44771.conn_id)) && (cljs.core._EQ_.cljs$core$IFn$_invoke$arity$2(this44770__$1.__extmap,other44771.__extmap)))))))))))));
}));

(crdt.core.ClientClock.prototype.cljs$core$IMap$_dissoc$arity$2 = (function (this__5310__auto__,k__5311__auto__){
var self__ = this;
var this__5310__auto____$1 = this;
if(cljs.core.contains_QMARK_(new cljs.core.PersistentHashSet(null, new cljs.core.PersistentArrayMap(null, 4, [new cljs.core.Keyword(null,"user-id","user-id",-206822291),null,new cljs.core.Keyword(null,"event-number","event-number",-297055826),null,new cljs.core.Keyword(null,"ts","ts",1617209904),null,new cljs.core.Keyword(null,"conn-id","conn-id",83297724),null], null), null),k__5311__auto__)){
return cljs.core.dissoc.cljs$core$IFn$_invoke$arity$2(cljs.core._with_meta(cljs.core.into.cljs$core$IFn$_invoke$arity$2(cljs.core.PersistentArrayMap.EMPTY,this__5310__auto____$1),self__.__meta),k__5311__auto__);
} else {
return (new crdt.core.ClientClock(self__.event_number,self__.ts,self__.user_id,self__.conn_id,self__.__meta,cljs.core.not_empty(cljs.core.dissoc.cljs$core$IFn$_invoke$arity$2(self__.__extmap,k__5311__auto__)),null));
}
}));

(crdt.core.ClientClock.prototype.cljs$core$IAssociative$_contains_key_QMARK_$arity$2 = (function (this__5307__auto__,k44769){
var self__ = this;
var this__5307__auto____$1 = this;
var G__44778 = k44769;
var G__44778__$1 = (((G__44778 instanceof cljs.core.Keyword))?G__44778.fqn:null);
switch (G__44778__$1) {
case "event-number":
case "ts":
case "user-id":
case "conn-id":
return true;

break;
default:
return cljs.core.contains_QMARK_(self__.__extmap,k44769);

}
}));

(crdt.core.ClientClock.prototype.cljs$core$IAssociative$_assoc$arity$3 = (function (this__5308__auto__,k__5309__auto__,G__44768){
var self__ = this;
var this__5308__auto____$1 = this;
var pred__44779 = cljs.core.keyword_identical_QMARK_;
var expr__44780 = k__5309__auto__;
if(cljs.core.truth_((pred__44779.cljs$core$IFn$_invoke$arity$2 ? pred__44779.cljs$core$IFn$_invoke$arity$2(new cljs.core.Keyword(null,"event-number","event-number",-297055826),expr__44780) : pred__44779.call(null, new cljs.core.Keyword(null,"event-number","event-number",-297055826),expr__44780)))){
return (new crdt.core.ClientClock(G__44768,self__.ts,self__.user_id,self__.conn_id,self__.__meta,self__.__extmap,null));
} else {
if(cljs.core.truth_((pred__44779.cljs$core$IFn$_invoke$arity$2 ? pred__44779.cljs$core$IFn$_invoke$arity$2(new cljs.core.Keyword(null,"ts","ts",1617209904),expr__44780) : pred__44779.call(null, new cljs.core.Keyword(null,"ts","ts",1617209904),expr__44780)))){
return (new crdt.core.ClientClock(self__.event_number,G__44768,self__.user_id,self__.conn_id,self__.__meta,self__.__extmap,null));
} else {
if(cljs.core.truth_((pred__44779.cljs$core$IFn$_invoke$arity$2 ? pred__44779.cljs$core$IFn$_invoke$arity$2(new cljs.core.Keyword(null,"user-id","user-id",-206822291),expr__44780) : pred__44779.call(null, new cljs.core.Keyword(null,"user-id","user-id",-206822291),expr__44780)))){
return (new crdt.core.ClientClock(self__.event_number,self__.ts,G__44768,self__.conn_id,self__.__meta,self__.__extmap,null));
} else {
if(cljs.core.truth_((pred__44779.cljs$core$IFn$_invoke$arity$2 ? pred__44779.cljs$core$IFn$_invoke$arity$2(new cljs.core.Keyword(null,"conn-id","conn-id",83297724),expr__44780) : pred__44779.call(null, new cljs.core.Keyword(null,"conn-id","conn-id",83297724),expr__44780)))){
return (new crdt.core.ClientClock(self__.event_number,self__.ts,self__.user_id,G__44768,self__.__meta,self__.__extmap,null));
} else {
return (new crdt.core.ClientClock(self__.event_number,self__.ts,self__.user_id,self__.conn_id,self__.__meta,cljs.core.assoc.cljs$core$IFn$_invoke$arity$3(self__.__extmap,k__5309__auto__,G__44768),null));
}
}
}
}
}));

(crdt.core.ClientClock.prototype.cljs$core$ISeqable$_seq$arity$1 = (function (this__5313__auto__){
var self__ = this;
var this__5313__auto____$1 = this;
return cljs.core.seq(cljs.core.concat.cljs$core$IFn$_invoke$arity$2(new cljs.core.PersistentVector(null, 4, 5, cljs.core.PersistentVector.EMPTY_NODE, [(new cljs.core.MapEntry(new cljs.core.Keyword(null,"event-number","event-number",-297055826),self__.event_number,null)),(new cljs.core.MapEntry(new cljs.core.Keyword(null,"ts","ts",1617209904),self__.ts,null)),(new cljs.core.MapEntry(new cljs.core.Keyword(null,"user-id","user-id",-206822291),self__.user_id,null)),(new cljs.core.MapEntry(new cljs.core.Keyword(null,"conn-id","conn-id",83297724),self__.conn_id,null))], null),self__.__extmap));
}));

(crdt.core.ClientClock.prototype.cljs$core$IWithMeta$_with_meta$arity$2 = (function (this__5299__auto__,G__44768){
var self__ = this;
var this__5299__auto____$1 = this;
return (new crdt.core.ClientClock(self__.event_number,self__.ts,self__.user_id,self__.conn_id,G__44768,self__.__extmap,self__.__hash));
}));

(crdt.core.ClientClock.prototype.cljs$core$ICollection$_conj$arity$2 = (function (this__5305__auto__,entry__5306__auto__){
var self__ = this;
var this__5305__auto____$1 = this;
if(cljs.core.vector_QMARK_(entry__5306__auto__)){
return this__5305__auto____$1.cljs$core$IAssociative$_assoc$arity$3(null, cljs.core._nth(entry__5306__auto__,(0)),cljs.core._nth(entry__5306__auto__,(1)));
} else {
return cljs.core.reduce.cljs$core$IFn$_invoke$arity$3(cljs.core._conj,this__5305__auto____$1,entry__5306__auto__);
}
}));

(crdt.core.ClientClock.prototype.cljs$core$IComparable$_compare$arity$2 = (function (this$,that){
var self__ = this;
var this$__$1 = this;
var G__44782 = cljs.core.compare(cljs.core.get.cljs$core$IFn$_invoke$arity$2(this$__$1,new cljs.core.Keyword(null,"event-number","event-number",-297055826)),cljs.core.get.cljs$core$IFn$_invoke$arity$2(that,new cljs.core.Keyword(null,"event-number","event-number",-297055826)));
switch (G__44782) {
case (-1):
return (-1);

break;
case (1):
return (1);

break;
case (0):
var G__44783 = cljs.core.compare(cljs.core.get.cljs$core$IFn$_invoke$arity$2(this$__$1,new cljs.core.Keyword(null,"ts","ts",1617209904)),cljs.core.get.cljs$core$IFn$_invoke$arity$2(that,new cljs.core.Keyword(null,"ts","ts",1617209904)));
switch (G__44783) {
case (-1):
return (-1);

break;
case (1):
return (1);

break;
case (0):
var G__44784 = cljs.core.compare(cljs.core.get.cljs$core$IFn$_invoke$arity$2(this$__$1,new cljs.core.Keyword(null,"user-id","user-id",-206822291)),cljs.core.get.cljs$core$IFn$_invoke$arity$2(that,new cljs.core.Keyword(null,"user-id","user-id",-206822291)));
switch (G__44784) {
case (-1):
return (-1);

break;
case (1):
return (1);

break;
case (0):
var G__44785 = cljs.core.compare(cljs.core.get.cljs$core$IFn$_invoke$arity$2(this$__$1,new cljs.core.Keyword(null,"conn-id","conn-id",83297724)),cljs.core.get.cljs$core$IFn$_invoke$arity$2(that,new cljs.core.Keyword(null,"conn-id","conn-id",83297724)));
switch (G__44785) {
case (-1):
return (-1);

break;
case (1):
return (1);

break;
case (0):
return (0);

break;
default:
throw (new Error(["No matching clause: ",cljs.core.str.cljs$core$IFn$_invoke$arity$1(G__44785)].join('')));

}

break;
default:
throw (new Error(["No matching clause: ",cljs.core.str.cljs$core$IFn$_invoke$arity$1(G__44784)].join('')));

}

break;
default:
throw (new Error(["No matching clause: ",cljs.core.str.cljs$core$IFn$_invoke$arity$1(G__44783)].join('')));

}

break;
default:
throw (new Error(["No matching clause: ",cljs.core.str.cljs$core$IFn$_invoke$arity$1(G__44782)].join('')));

}
}));

(crdt.core.ClientClock.getBasis = (function (){
return new cljs.core.PersistentVector(null, 4, 5, cljs.core.PersistentVector.EMPTY_NODE, [new cljs.core.Symbol(null,"event-number","event-number",1343475701,null),new cljs.core.Symbol(null,"ts","ts",-1037225865,null),new cljs.core.Symbol(null,"user-id","user-id",1433709236,null),new cljs.core.Symbol(null,"conn-id","conn-id",1723829251,null)], null);
}));

(crdt.core.ClientClock.cljs$lang$type = true);

(crdt.core.ClientClock.cljs$lang$ctorPrSeq = (function (this__5346__auto__){
return (new cljs.core.List(null,"crdt.core/ClientClock",null,(1),null));
}));

(crdt.core.ClientClock.cljs$lang$ctorPrWriter = (function (this__5346__auto__,writer__5347__auto__){
return cljs.core._write(writer__5347__auto__,"crdt.core/ClientClock");
}));

/**
 * Positional factory function for crdt.core/ClientClock.
 */
crdt.core.__GT_ClientClock = (function crdt$core$__GT_ClientClock(event_number,ts,user_id,conn_id){
return (new crdt.core.ClientClock(event_number,ts,user_id,conn_id,null,null,null));
});

/**
 * Factory function for crdt.core/ClientClock, taking a map of keywords to field values.
 */
crdt.core.map__GT_ClientClock = (function crdt$core$map__GT_ClientClock(G__44772){
var extmap__5342__auto__ = (function (){var G__44786 = cljs.core.dissoc.cljs$core$IFn$_invoke$arity$variadic(G__44772,new cljs.core.Keyword(null,"event-number","event-number",-297055826),cljs.core.prim_seq.cljs$core$IFn$_invoke$arity$2([new cljs.core.Keyword(null,"ts","ts",1617209904),new cljs.core.Keyword(null,"user-id","user-id",-206822291),new cljs.core.Keyword(null,"conn-id","conn-id",83297724)], 0));
if(cljs.core.record_QMARK_(G__44772)){
return cljs.core.into.cljs$core$IFn$_invoke$arity$2(cljs.core.PersistentArrayMap.EMPTY,G__44786);
} else {
return G__44786;
}
})();
return (new crdt.core.ClientClock(new cljs.core.Keyword(null,"event-number","event-number",-297055826).cljs$core$IFn$_invoke$arity$1(G__44772),new cljs.core.Keyword(null,"ts","ts",1617209904).cljs$core$IFn$_invoke$arity$1(G__44772),new cljs.core.Keyword(null,"user-id","user-id",-206822291).cljs$core$IFn$_invoke$arity$1(G__44772),new cljs.core.Keyword(null,"conn-id","conn-id",83297724).cljs$core$IFn$_invoke$arity$1(G__44772),null,cljs.core.not_empty(extmap__5342__auto__),null));
});

crdt.core.choose_incoming_QMARK_ = (function crdt$core$choose_incoming_QMARK_(existing,incoming){
if((incoming == null)){
return false;
} else {
if((existing == null)){
return true;
} else {
if(cljs.core.not_EQ_.cljs$core$IFn$_invoke$arity$2(cljs.core.type(incoming),cljs.core.type(existing))){
var G__44787 = cljs.core.compare(cljs.core.type(incoming),cljs.core.type(existing));
switch (G__44787) {
case (-1):
return false;

break;
case (1):
return true;

break;
case (0):
return false;

break;
default:
throw (new Error(["No matching clause: ",cljs.core.str.cljs$core$IFn$_invoke$arity$1(G__44787)].join('')));

}
} else {
if(((crdt.core.comparable_QMARK_(incoming)) && (crdt.core.comparable_QMARK_(existing)))){
var G__44788 = cljs.core.compare(incoming,existing);
switch (G__44788) {
case (-1):
return false;

break;
case (1):
return true;

break;
case (0):
return false;

break;
default:
throw (new Error(["No matching clause: ",cljs.core.str.cljs$core$IFn$_invoke$arity$1(G__44788)].join('')));

}
} else {
return true;

}
}
}
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
 * @implements {crdt.core.StateCRDT}
 * @implements {crdt.core.OpCRDT}
 * @implements {crdt.core.CRDTDelta}
 * @implements {cljs.core.IPrintWithWriter}
 * @implements {cljs.core.IIterable}
 * @implements {cljs.core.IWithMeta}
 * @implements {cljs.core.IAssociative}
 * @implements {cljs.core.IMap}
 * @implements {cljs.core.ILookup}
*/
crdt.core.LWW = (function (clock,value,__meta,__extmap,__hash){
this.clock = clock;
this.value = value;
this.__meta = __meta;
this.__extmap = __extmap;
this.__hash = __hash;
this.cljs$lang$protocol_mask$partition0$ = 2230716170;
this.cljs$lang$protocol_mask$partition1$ = 139264;
});
(crdt.core.LWW.prototype.cljs$core$ILookup$_lookup$arity$2 = (function (this__5300__auto__,k__5301__auto__){
var self__ = this;
var this__5300__auto____$1 = this;
return this__5300__auto____$1.cljs$core$ILookup$_lookup$arity$3(null, k__5301__auto__,null);
}));

(crdt.core.LWW.prototype.cljs$core$ILookup$_lookup$arity$3 = (function (this__5302__auto__,k44790,else__5303__auto__){
var self__ = this;
var this__5302__auto____$1 = this;
var G__44794 = k44790;
var G__44794__$1 = (((G__44794 instanceof cljs.core.Keyword))?G__44794.fqn:null);
switch (G__44794__$1) {
case "clock":
return self__.clock;

break;
case "value":
return self__.value;

break;
default:
return cljs.core.get.cljs$core$IFn$_invoke$arity$3(self__.__extmap,k44790,else__5303__auto__);

}
}));

(crdt.core.LWW.prototype.cljs$core$IKVReduce$_kv_reduce$arity$3 = (function (this__5320__auto__,f__5321__auto__,init__5322__auto__){
var self__ = this;
var this__5320__auto____$1 = this;
return cljs.core.reduce.cljs$core$IFn$_invoke$arity$3((function (ret__5323__auto__,p__44795){
var vec__44796 = p__44795;
var k__5324__auto__ = cljs.core.nth.cljs$core$IFn$_invoke$arity$3(vec__44796,(0),null);
var v__5325__auto__ = cljs.core.nth.cljs$core$IFn$_invoke$arity$3(vec__44796,(1),null);
return (f__5321__auto__.cljs$core$IFn$_invoke$arity$3 ? f__5321__auto__.cljs$core$IFn$_invoke$arity$3(ret__5323__auto__,k__5324__auto__,v__5325__auto__) : f__5321__auto__.call(null, ret__5323__auto__,k__5324__auto__,v__5325__auto__));
}),init__5322__auto__,this__5320__auto____$1);
}));

(crdt.core.LWW.prototype.crdt$core$StateCRDT$ = cljs.core.PROTOCOL_SENTINEL);

(crdt.core.LWW.prototype.crdt$core$StateCRDT$_merge$arity$2 = (function (this$,that){
var self__ = this;
var this$__$1 = this;
return this$__$1.crdt$core$OpCRDT$_apply_delta$arity$2(null, that);
}));

(crdt.core.LWW.prototype.cljs$core$IPrintWithWriter$_pr_writer$arity$3 = (function (this__5315__auto__,writer__5316__auto__,opts__5317__auto__){
var self__ = this;
var this__5315__auto____$1 = this;
var pr_pair__5318__auto__ = (function (keyval__5319__auto__){
return cljs.core.pr_sequential_writer(writer__5316__auto__,cljs.core.pr_writer,""," ","",opts__5317__auto__,keyval__5319__auto__);
});
return cljs.core.pr_sequential_writer(writer__5316__auto__,pr_pair__5318__auto__,"#crdt.core.LWW{",", ","}",opts__5317__auto__,cljs.core.concat.cljs$core$IFn$_invoke$arity$2(new cljs.core.PersistentVector(null, 2, 5, cljs.core.PersistentVector.EMPTY_NODE, [(new cljs.core.PersistentVector(null,2,(5),cljs.core.PersistentVector.EMPTY_NODE,[new cljs.core.Keyword(null,"clock","clock",-894301127),self__.clock],null)),(new cljs.core.PersistentVector(null,2,(5),cljs.core.PersistentVector.EMPTY_NODE,[new cljs.core.Keyword(null,"value","value",305978217),self__.value],null))], null),self__.__extmap));
}));

(crdt.core.LWW.prototype.cljs$core$IIterable$_iterator$arity$1 = (function (G__44789){
var self__ = this;
var G__44789__$1 = this;
return (new cljs.core.RecordIter((0),G__44789__$1,2,new cljs.core.PersistentVector(null, 2, 5, cljs.core.PersistentVector.EMPTY_NODE, [new cljs.core.Keyword(null,"clock","clock",-894301127),new cljs.core.Keyword(null,"value","value",305978217)], null),(cljs.core.truth_(self__.__extmap)?cljs.core._iterator(self__.__extmap):cljs.core.nil_iter())));
}));

(crdt.core.LWW.prototype.cljs$core$IMeta$_meta$arity$1 = (function (this__5298__auto__){
var self__ = this;
var this__5298__auto____$1 = this;
return self__.__meta;
}));

(crdt.core.LWW.prototype.cljs$core$ICloneable$_clone$arity$1 = (function (this__5295__auto__){
var self__ = this;
var this__5295__auto____$1 = this;
return (new crdt.core.LWW(self__.clock,self__.value,self__.__meta,self__.__extmap,self__.__hash));
}));

(crdt.core.LWW.prototype.cljs$core$ICounted$_count$arity$1 = (function (this__5304__auto__){
var self__ = this;
var this__5304__auto____$1 = this;
return (2 + cljs.core.count(self__.__extmap));
}));

(crdt.core.LWW.prototype.crdt$core$OpCRDT$ = cljs.core.PROTOCOL_SENTINEL);

(crdt.core.LWW.prototype.crdt$core$OpCRDT$_value$arity$1 = (function (_){
var self__ = this;
var ___$1 = this;
return self__.value;
}));

(crdt.core.LWW.prototype.crdt$core$OpCRDT$_apply_delta$arity$2 = (function (this$,delta){
var self__ = this;
var this$__$1 = this;
var delta_clock = delta.clock;
var delta_value = delta.value;
if(cljs.core._EQ_.cljs$core$IFn$_invoke$arity$2(new cljs.core.Keyword("crdt.core","empty","crdt.core/empty",-1739054400),delta_clock)){
return this$__$1;
} else {
if(cljs.core._EQ_.cljs$core$IFn$_invoke$arity$2(new cljs.core.Keyword("crdt.core","empty","crdt.core/empty",-1739054400),self__.clock)){
return delta;
} else {
var G__44799 = cljs.core.compare(self__.clock,delta_clock);
switch (G__44799) {
case (-1):
return delta;

break;
case (1):
return this$__$1;

break;
case (0):
if(cljs.core.truth_(crdt.core.choose_incoming_QMARK_(self__.value,delta_value))){
return delta;
} else {
return this$__$1;
}

break;
default:
throw (new Error(["No matching clause: ",cljs.core.str.cljs$core$IFn$_invoke$arity$1(G__44799)].join('')));

}

}
}
}));

(crdt.core.LWW.prototype.crdt$core$CRDTDelta$ = cljs.core.PROTOCOL_SENTINEL);

(crdt.core.LWW.prototype.crdt$core$CRDTDelta$_init$arity$1 = (function (_){
var self__ = this;
var ___$1 = this;
return (new crdt.core.LWW(new cljs.core.Keyword("crdt.core","empty","crdt.core/empty",-1739054400),crdt.core._init(self__.value),null,null,null));
}));

(crdt.core.LWW.prototype.cljs$core$IHash$_hash$arity$1 = (function (this__5296__auto__){
var self__ = this;
var this__5296__auto____$1 = this;
var h__5111__auto__ = self__.__hash;
if((!((h__5111__auto__ == null)))){
return h__5111__auto__;
} else {
var h__5111__auto____$1 = (function (coll__5297__auto__){
return (-290600614 ^ cljs.core.hash_unordered_coll(coll__5297__auto__));
})(this__5296__auto____$1);
(self__.__hash = h__5111__auto____$1);

return h__5111__auto____$1;
}
}));

(crdt.core.LWW.prototype.cljs$core$IEquiv$_equiv$arity$2 = (function (this44791,other44792){
var self__ = this;
var this44791__$1 = this;
return (((!((other44792 == null)))) && ((((this44791__$1.constructor === other44792.constructor)) && (((cljs.core._EQ_.cljs$core$IFn$_invoke$arity$2(this44791__$1.clock,other44792.clock)) && (((cljs.core._EQ_.cljs$core$IFn$_invoke$arity$2(this44791__$1.value,other44792.value)) && (cljs.core._EQ_.cljs$core$IFn$_invoke$arity$2(this44791__$1.__extmap,other44792.__extmap)))))))));
}));

(crdt.core.LWW.prototype.cljs$core$IMap$_dissoc$arity$2 = (function (this__5310__auto__,k__5311__auto__){
var self__ = this;
var this__5310__auto____$1 = this;
if(cljs.core.contains_QMARK_(new cljs.core.PersistentHashSet(null, new cljs.core.PersistentArrayMap(null, 2, [new cljs.core.Keyword(null,"value","value",305978217),null,new cljs.core.Keyword(null,"clock","clock",-894301127),null], null), null),k__5311__auto__)){
return cljs.core.dissoc.cljs$core$IFn$_invoke$arity$2(cljs.core._with_meta(cljs.core.into.cljs$core$IFn$_invoke$arity$2(cljs.core.PersistentArrayMap.EMPTY,this__5310__auto____$1),self__.__meta),k__5311__auto__);
} else {
return (new crdt.core.LWW(self__.clock,self__.value,self__.__meta,cljs.core.not_empty(cljs.core.dissoc.cljs$core$IFn$_invoke$arity$2(self__.__extmap,k__5311__auto__)),null));
}
}));

(crdt.core.LWW.prototype.cljs$core$IAssociative$_contains_key_QMARK_$arity$2 = (function (this__5307__auto__,k44790){
var self__ = this;
var this__5307__auto____$1 = this;
var G__44800 = k44790;
var G__44800__$1 = (((G__44800 instanceof cljs.core.Keyword))?G__44800.fqn:null);
switch (G__44800__$1) {
case "clock":
case "value":
return true;

break;
default:
return cljs.core.contains_QMARK_(self__.__extmap,k44790);

}
}));

(crdt.core.LWW.prototype.cljs$core$IAssociative$_assoc$arity$3 = (function (this__5308__auto__,k__5309__auto__,G__44789){
var self__ = this;
var this__5308__auto____$1 = this;
var pred__44801 = cljs.core.keyword_identical_QMARK_;
var expr__44802 = k__5309__auto__;
if(cljs.core.truth_((pred__44801.cljs$core$IFn$_invoke$arity$2 ? pred__44801.cljs$core$IFn$_invoke$arity$2(new cljs.core.Keyword(null,"clock","clock",-894301127),expr__44802) : pred__44801.call(null, new cljs.core.Keyword(null,"clock","clock",-894301127),expr__44802)))){
return (new crdt.core.LWW(G__44789,self__.value,self__.__meta,self__.__extmap,null));
} else {
if(cljs.core.truth_((pred__44801.cljs$core$IFn$_invoke$arity$2 ? pred__44801.cljs$core$IFn$_invoke$arity$2(new cljs.core.Keyword(null,"value","value",305978217),expr__44802) : pred__44801.call(null, new cljs.core.Keyword(null,"value","value",305978217),expr__44802)))){
return (new crdt.core.LWW(self__.clock,G__44789,self__.__meta,self__.__extmap,null));
} else {
return (new crdt.core.LWW(self__.clock,self__.value,self__.__meta,cljs.core.assoc.cljs$core$IFn$_invoke$arity$3(self__.__extmap,k__5309__auto__,G__44789),null));
}
}
}));

(crdt.core.LWW.prototype.cljs$core$ISeqable$_seq$arity$1 = (function (this__5313__auto__){
var self__ = this;
var this__5313__auto____$1 = this;
return cljs.core.seq(cljs.core.concat.cljs$core$IFn$_invoke$arity$2(new cljs.core.PersistentVector(null, 2, 5, cljs.core.PersistentVector.EMPTY_NODE, [(new cljs.core.MapEntry(new cljs.core.Keyword(null,"clock","clock",-894301127),self__.clock,null)),(new cljs.core.MapEntry(new cljs.core.Keyword(null,"value","value",305978217),self__.value,null))], null),self__.__extmap));
}));

(crdt.core.LWW.prototype.cljs$core$IWithMeta$_with_meta$arity$2 = (function (this__5299__auto__,G__44789){
var self__ = this;
var this__5299__auto____$1 = this;
return (new crdt.core.LWW(self__.clock,self__.value,G__44789,self__.__extmap,self__.__hash));
}));

(crdt.core.LWW.prototype.cljs$core$ICollection$_conj$arity$2 = (function (this__5305__auto__,entry__5306__auto__){
var self__ = this;
var this__5305__auto____$1 = this;
if(cljs.core.vector_QMARK_(entry__5306__auto__)){
return this__5305__auto____$1.cljs$core$IAssociative$_assoc$arity$3(null, cljs.core._nth(entry__5306__auto__,(0)),cljs.core._nth(entry__5306__auto__,(1)));
} else {
return cljs.core.reduce.cljs$core$IFn$_invoke$arity$3(cljs.core._conj,this__5305__auto____$1,entry__5306__auto__);
}
}));

(crdt.core.LWW.getBasis = (function (){
return new cljs.core.PersistentVector(null, 2, 5, cljs.core.PersistentVector.EMPTY_NODE, [new cljs.core.Symbol(null,"clock","clock",746230400,null),new cljs.core.Symbol(null,"value","value",1946509744,null)], null);
}));

(crdt.core.LWW.cljs$lang$type = true);

(crdt.core.LWW.cljs$lang$ctorPrSeq = (function (this__5346__auto__){
return (new cljs.core.List(null,"crdt.core/LWW",null,(1),null));
}));

(crdt.core.LWW.cljs$lang$ctorPrWriter = (function (this__5346__auto__,writer__5347__auto__){
return cljs.core._write(writer__5347__auto__,"crdt.core/LWW");
}));

/**
 * Positional factory function for crdt.core/LWW.
 */
crdt.core.__GT_LWW = (function crdt$core$__GT_LWW(clock,value){
return (new crdt.core.LWW(clock,value,null,null,null));
});

/**
 * Factory function for crdt.core/LWW, taking a map of keywords to field values.
 */
crdt.core.map__GT_LWW = (function crdt$core$map__GT_LWW(G__44793){
var extmap__5342__auto__ = (function (){var G__44804 = cljs.core.dissoc.cljs$core$IFn$_invoke$arity$variadic(G__44793,new cljs.core.Keyword(null,"clock","clock",-894301127),cljs.core.prim_seq.cljs$core$IFn$_invoke$arity$2([new cljs.core.Keyword(null,"value","value",305978217)], 0));
if(cljs.core.record_QMARK_(G__44793)){
return cljs.core.into.cljs$core$IFn$_invoke$arity$2(cljs.core.PersistentArrayMap.EMPTY,G__44804);
} else {
return G__44804;
}
})();
return (new crdt.core.LWW(new cljs.core.Keyword(null,"clock","clock",-894301127).cljs$core$IFn$_invoke$arity$1(G__44793),new cljs.core.Keyword(null,"value","value",305978217).cljs$core$IFn$_invoke$arity$1(G__44793),null,cljs.core.not_empty(extmap__5342__auto__),null));
});

crdt.core.lww = (function crdt$core$lww(clock,value){
if((value instanceof crdt.core.LWW)){
return value;
} else {
return crdt.core.__GT_LWW(clock,value);
}
});
(crdt.core.LWW.prototype.cljs$core$IPrintWithWriter$ = cljs.core.PROTOCOL_SENTINEL);

(crdt.core.LWW.prototype.cljs$core$IPrintWithWriter$_pr_writer$arity$3 = (function (obj,writer,_){
var obj__$1 = this;
var tagged_value = cljs.core.tagged_literal(new cljs.core.Symbol("crdt","lww","crdt/lww",-443575776,null),new cljs.core.PersistentVector(null, 2, 5, cljs.core.PersistentVector.EMPTY_NODE, [obj__$1.clock,obj__$1.value], null));
return cljs.core._write(writer,cljs.core.pr_str.cljs$core$IFn$_invoke$arity$variadic(cljs.core.prim_seq.cljs$core$IFn$_invoke$arity$2([tagged_value], 0)));
}));
/**
 * Used by the reader like so:
 * 
 * #crdt/lww [clock value]
 * 
 * #crdt/lww [1 "a"]
 * #crdt/lww [#inst "2021-06-01" nil]
 * #crdt/lww [#crdt/hlc [#uuid "08f711cd-1d4d-4f61-b157-c36a8be8ef95"] 3]
 */
crdt.core.read_lww = (function crdt$core$read_lww(value){
if(cljs.core.vector_QMARK_(value)){
} else {
throw (new Error(["Assert failed: ","LWW must be a vector","\n","(vector? value)"].join('')));
}

if(cljs.core._EQ_.cljs$core$IFn$_invoke$arity$2(cljs.core.count(value),(2))){
} else {
throw (new Error(["Assert failed: ","LWW must have 2 elements","\n","(= (count value) 2)"].join('')));
}

return crdt.core.__GT_LWW(cljs.core.first(value),cljs.core.second(value));
});
cljs.reader.register_tag_parser_BANG_(new cljs.core.Symbol("crdt","lww","crdt/lww",-443575776,null),crdt.core.read_lww);
crdt.core.lww_instance_QMARK_ = (function crdt$core$lww_instance_QMARK_(x){
return (x instanceof crdt.core.LWW);
});
crdt.core.lww_schema = (function crdt$core$lww_schema(var_args){
var G__44806 = arguments.length;
switch (G__44806) {
case 1:
return crdt.core.lww_schema.cljs$core$IFn$_invoke$arity$1((arguments[(0)]));

break;
case 2:
return crdt.core.lww_schema.cljs$core$IFn$_invoke$arity$2((arguments[(0)]),(arguments[(1)]));

break;
default:
throw (new Error(["Invalid arity: ",cljs.core.str.cljs$core$IFn$_invoke$arity$1(arguments.length)].join('')));

}
});

(crdt.core.lww_schema.cljs$core$IFn$_invoke$arity$1 = (function (value_schema){
return crdt.core.lww_schema.cljs$core$IFn$_invoke$arity$2(crdt.core.hlc_schema,value_schema);
}));

(crdt.core.lww_schema.cljs$core$IFn$_invoke$arity$2 = (function (clock_schema,value_schema){
return new cljs.core.PersistentVector(null, 3, 5, cljs.core.PersistentVector.EMPTY_NODE, [new cljs.core.Keyword(null,"map","map",1371690461),new cljs.core.PersistentVector(null, 2, 5, cljs.core.PersistentVector.EMPTY_NODE, [new cljs.core.Keyword(null,"clock","clock",-894301127),clock_schema], null),new cljs.core.PersistentVector(null, 2, 5, cljs.core.PersistentVector.EMPTY_NODE, [new cljs.core.Keyword(null,"value","value",305978217),value_schema], null)], null);
}));

(crdt.core.lww_schema.cljs$lang$maxFixedArity = 2);


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
 * @implements {crdt.core.StateCRDT}
 * @implements {crdt.core.OpCRDT}
 * @implements {crdt.core.CRDTDelta}
 * @implements {cljs.core.IPrintWithWriter}
 * @implements {cljs.core.IIterable}
 * @implements {cljs.core.IWithMeta}
 * @implements {cljs.core.IAssociative}
 * @implements {cljs.core.IMap}
 * @implements {cljs.core.ILookup}
*/
crdt.core.GrowOnlySet = (function (xs,__meta,__extmap,__hash){
this.xs = xs;
this.__meta = __meta;
this.__extmap = __extmap;
this.__hash = __hash;
this.cljs$lang$protocol_mask$partition0$ = 2230716170;
this.cljs$lang$protocol_mask$partition1$ = 139264;
});
(crdt.core.GrowOnlySet.prototype.cljs$core$ILookup$_lookup$arity$2 = (function (this__5300__auto__,k__5301__auto__){
var self__ = this;
var this__5300__auto____$1 = this;
return this__5300__auto____$1.cljs$core$ILookup$_lookup$arity$3(null, k__5301__auto__,null);
}));

(crdt.core.GrowOnlySet.prototype.cljs$core$ILookup$_lookup$arity$3 = (function (this__5302__auto__,k44808,else__5303__auto__){
var self__ = this;
var this__5302__auto____$1 = this;
var G__44812 = k44808;
var G__44812__$1 = (((G__44812 instanceof cljs.core.Keyword))?G__44812.fqn:null);
switch (G__44812__$1) {
case "xs":
return self__.xs;

break;
default:
return cljs.core.get.cljs$core$IFn$_invoke$arity$3(self__.__extmap,k44808,else__5303__auto__);

}
}));

(crdt.core.GrowOnlySet.prototype.cljs$core$IKVReduce$_kv_reduce$arity$3 = (function (this__5320__auto__,f__5321__auto__,init__5322__auto__){
var self__ = this;
var this__5320__auto____$1 = this;
return cljs.core.reduce.cljs$core$IFn$_invoke$arity$3((function (ret__5323__auto__,p__44813){
var vec__44814 = p__44813;
var k__5324__auto__ = cljs.core.nth.cljs$core$IFn$_invoke$arity$3(vec__44814,(0),null);
var v__5325__auto__ = cljs.core.nth.cljs$core$IFn$_invoke$arity$3(vec__44814,(1),null);
return (f__5321__auto__.cljs$core$IFn$_invoke$arity$3 ? f__5321__auto__.cljs$core$IFn$_invoke$arity$3(ret__5323__auto__,k__5324__auto__,v__5325__auto__) : f__5321__auto__.call(null, ret__5323__auto__,k__5324__auto__,v__5325__auto__));
}),init__5322__auto__,this__5320__auto____$1);
}));

(crdt.core.GrowOnlySet.prototype.crdt$core$StateCRDT$ = cljs.core.PROTOCOL_SENTINEL);

(crdt.core.GrowOnlySet.prototype.crdt$core$StateCRDT$_merge$arity$2 = (function (this$,that){
var self__ = this;
var this$__$1 = this;
return (new crdt.core.GrowOnlySet(clojure.set.union.cljs$core$IFn$_invoke$arity$2(new cljs.core.Keyword(null,"xs","xs",649443341).cljs$core$IFn$_invoke$arity$1(this$__$1),new cljs.core.Keyword(null,"xs","xs",649443341).cljs$core$IFn$_invoke$arity$1(that)),null,null,null));
}));

(crdt.core.GrowOnlySet.prototype.cljs$core$IPrintWithWriter$_pr_writer$arity$3 = (function (this__5315__auto__,writer__5316__auto__,opts__5317__auto__){
var self__ = this;
var this__5315__auto____$1 = this;
var pr_pair__5318__auto__ = (function (keyval__5319__auto__){
return cljs.core.pr_sequential_writer(writer__5316__auto__,cljs.core.pr_writer,""," ","",opts__5317__auto__,keyval__5319__auto__);
});
return cljs.core.pr_sequential_writer(writer__5316__auto__,pr_pair__5318__auto__,"#crdt.core.GrowOnlySet{",", ","}",opts__5317__auto__,cljs.core.concat.cljs$core$IFn$_invoke$arity$2(new cljs.core.PersistentVector(null, 1, 5, cljs.core.PersistentVector.EMPTY_NODE, [(new cljs.core.PersistentVector(null,2,(5),cljs.core.PersistentVector.EMPTY_NODE,[new cljs.core.Keyword(null,"xs","xs",649443341),self__.xs],null))], null),self__.__extmap));
}));

(crdt.core.GrowOnlySet.prototype.cljs$core$IIterable$_iterator$arity$1 = (function (G__44807){
var self__ = this;
var G__44807__$1 = this;
return (new cljs.core.RecordIter((0),G__44807__$1,1,new cljs.core.PersistentVector(null, 1, 5, cljs.core.PersistentVector.EMPTY_NODE, [new cljs.core.Keyword(null,"xs","xs",649443341)], null),(cljs.core.truth_(self__.__extmap)?cljs.core._iterator(self__.__extmap):cljs.core.nil_iter())));
}));

(crdt.core.GrowOnlySet.prototype.cljs$core$IMeta$_meta$arity$1 = (function (this__5298__auto__){
var self__ = this;
var this__5298__auto____$1 = this;
return self__.__meta;
}));

(crdt.core.GrowOnlySet.prototype.cljs$core$ICloneable$_clone$arity$1 = (function (this__5295__auto__){
var self__ = this;
var this__5295__auto____$1 = this;
return (new crdt.core.GrowOnlySet(self__.xs,self__.__meta,self__.__extmap,self__.__hash));
}));

(crdt.core.GrowOnlySet.prototype.cljs$core$ICounted$_count$arity$1 = (function (this__5304__auto__){
var self__ = this;
var this__5304__auto____$1 = this;
return (1 + cljs.core.count(self__.__extmap));
}));

(crdt.core.GrowOnlySet.prototype.crdt$core$OpCRDT$ = cljs.core.PROTOCOL_SENTINEL);

(crdt.core.GrowOnlySet.prototype.crdt$core$OpCRDT$_value$arity$1 = (function (_){
var self__ = this;
var ___$1 = this;
return self__.xs;
}));

(crdt.core.GrowOnlySet.prototype.crdt$core$OpCRDT$_apply_delta$arity$2 = (function (_,delta){
var self__ = this;
var ___$1 = this;
if(cljs.core.truth_((crdt.core.grow_only_set_instance_QMARK_.cljs$core$IFn$_invoke$arity$1 ? crdt.core.grow_only_set_instance_QMARK_.cljs$core$IFn$_invoke$arity$1(delta) : crdt.core.grow_only_set_instance_QMARK_.call(null, delta)))){
return (new crdt.core.GrowOnlySet(clojure.set.union.cljs$core$IFn$_invoke$arity$2(self__.xs,crdt.core._value(delta)),null,null,null));
} else {
return (new crdt.core.GrowOnlySet(cljs.core.conj.cljs$core$IFn$_invoke$arity$2(self__.xs,crdt.core._value(delta)),null,null,null));

}
}));

(crdt.core.GrowOnlySet.prototype.crdt$core$CRDTDelta$ = cljs.core.PROTOCOL_SENTINEL);

(crdt.core.GrowOnlySet.prototype.crdt$core$CRDTDelta$_init$arity$1 = (function (_){
var self__ = this;
var ___$1 = this;
return (new crdt.core.GrowOnlySet(cljs.core.PersistentHashSet.EMPTY,null,null,null));
}));

(crdt.core.GrowOnlySet.prototype.cljs$core$IHash$_hash$arity$1 = (function (this__5296__auto__){
var self__ = this;
var this__5296__auto____$1 = this;
var h__5111__auto__ = self__.__hash;
if((!((h__5111__auto__ == null)))){
return h__5111__auto__;
} else {
var h__5111__auto____$1 = (function (coll__5297__auto__){
return (147828805 ^ cljs.core.hash_unordered_coll(coll__5297__auto__));
})(this__5296__auto____$1);
(self__.__hash = h__5111__auto____$1);

return h__5111__auto____$1;
}
}));

(crdt.core.GrowOnlySet.prototype.cljs$core$IEquiv$_equiv$arity$2 = (function (this44809,other44810){
var self__ = this;
var this44809__$1 = this;
return (((!((other44810 == null)))) && ((((this44809__$1.constructor === other44810.constructor)) && (((cljs.core._EQ_.cljs$core$IFn$_invoke$arity$2(this44809__$1.xs,other44810.xs)) && (cljs.core._EQ_.cljs$core$IFn$_invoke$arity$2(this44809__$1.__extmap,other44810.__extmap)))))));
}));

(crdt.core.GrowOnlySet.prototype.cljs$core$IMap$_dissoc$arity$2 = (function (this__5310__auto__,k__5311__auto__){
var self__ = this;
var this__5310__auto____$1 = this;
if(cljs.core.contains_QMARK_(new cljs.core.PersistentHashSet(null, new cljs.core.PersistentArrayMap(null, 1, [new cljs.core.Keyword(null,"xs","xs",649443341),null], null), null),k__5311__auto__)){
return cljs.core.dissoc.cljs$core$IFn$_invoke$arity$2(cljs.core._with_meta(cljs.core.into.cljs$core$IFn$_invoke$arity$2(cljs.core.PersistentArrayMap.EMPTY,this__5310__auto____$1),self__.__meta),k__5311__auto__);
} else {
return (new crdt.core.GrowOnlySet(self__.xs,self__.__meta,cljs.core.not_empty(cljs.core.dissoc.cljs$core$IFn$_invoke$arity$2(self__.__extmap,k__5311__auto__)),null));
}
}));

(crdt.core.GrowOnlySet.prototype.cljs$core$IAssociative$_contains_key_QMARK_$arity$2 = (function (this__5307__auto__,k44808){
var self__ = this;
var this__5307__auto____$1 = this;
var G__44817 = k44808;
var G__44817__$1 = (((G__44817 instanceof cljs.core.Keyword))?G__44817.fqn:null);
switch (G__44817__$1) {
case "xs":
return true;

break;
default:
return cljs.core.contains_QMARK_(self__.__extmap,k44808);

}
}));

(crdt.core.GrowOnlySet.prototype.cljs$core$IAssociative$_assoc$arity$3 = (function (this__5308__auto__,k__5309__auto__,G__44807){
var self__ = this;
var this__5308__auto____$1 = this;
var pred__44818 = cljs.core.keyword_identical_QMARK_;
var expr__44819 = k__5309__auto__;
if(cljs.core.truth_((pred__44818.cljs$core$IFn$_invoke$arity$2 ? pred__44818.cljs$core$IFn$_invoke$arity$2(new cljs.core.Keyword(null,"xs","xs",649443341),expr__44819) : pred__44818.call(null, new cljs.core.Keyword(null,"xs","xs",649443341),expr__44819)))){
return (new crdt.core.GrowOnlySet(G__44807,self__.__meta,self__.__extmap,null));
} else {
return (new crdt.core.GrowOnlySet(self__.xs,self__.__meta,cljs.core.assoc.cljs$core$IFn$_invoke$arity$3(self__.__extmap,k__5309__auto__,G__44807),null));
}
}));

(crdt.core.GrowOnlySet.prototype.cljs$core$ISeqable$_seq$arity$1 = (function (this__5313__auto__){
var self__ = this;
var this__5313__auto____$1 = this;
return cljs.core.seq(cljs.core.concat.cljs$core$IFn$_invoke$arity$2(new cljs.core.PersistentVector(null, 1, 5, cljs.core.PersistentVector.EMPTY_NODE, [(new cljs.core.MapEntry(new cljs.core.Keyword(null,"xs","xs",649443341),self__.xs,null))], null),self__.__extmap));
}));

(crdt.core.GrowOnlySet.prototype.cljs$core$IWithMeta$_with_meta$arity$2 = (function (this__5299__auto__,G__44807){
var self__ = this;
var this__5299__auto____$1 = this;
return (new crdt.core.GrowOnlySet(self__.xs,G__44807,self__.__extmap,self__.__hash));
}));

(crdt.core.GrowOnlySet.prototype.cljs$core$ICollection$_conj$arity$2 = (function (this__5305__auto__,entry__5306__auto__){
var self__ = this;
var this__5305__auto____$1 = this;
if(cljs.core.vector_QMARK_(entry__5306__auto__)){
return this__5305__auto____$1.cljs$core$IAssociative$_assoc$arity$3(null, cljs.core._nth(entry__5306__auto__,(0)),cljs.core._nth(entry__5306__auto__,(1)));
} else {
return cljs.core.reduce.cljs$core$IFn$_invoke$arity$3(cljs.core._conj,this__5305__auto____$1,entry__5306__auto__);
}
}));

(crdt.core.GrowOnlySet.getBasis = (function (){
return new cljs.core.PersistentVector(null, 1, 5, cljs.core.PersistentVector.EMPTY_NODE, [new cljs.core.Symbol(null,"xs","xs",-2004992428,null)], null);
}));

(crdt.core.GrowOnlySet.cljs$lang$type = true);

(crdt.core.GrowOnlySet.cljs$lang$ctorPrSeq = (function (this__5346__auto__){
return (new cljs.core.List(null,"crdt.core/GrowOnlySet",null,(1),null));
}));

(crdt.core.GrowOnlySet.cljs$lang$ctorPrWriter = (function (this__5346__auto__,writer__5347__auto__){
return cljs.core._write(writer__5347__auto__,"crdt.core/GrowOnlySet");
}));

/**
 * Positional factory function for crdt.core/GrowOnlySet.
 */
crdt.core.__GT_GrowOnlySet = (function crdt$core$__GT_GrowOnlySet(xs){
return (new crdt.core.GrowOnlySet(xs,null,null,null));
});

/**
 * Factory function for crdt.core/GrowOnlySet, taking a map of keywords to field values.
 */
crdt.core.map__GT_GrowOnlySet = (function crdt$core$map__GT_GrowOnlySet(G__44811){
var extmap__5342__auto__ = (function (){var G__44821 = cljs.core.dissoc.cljs$core$IFn$_invoke$arity$2(G__44811,new cljs.core.Keyword(null,"xs","xs",649443341));
if(cljs.core.record_QMARK_(G__44811)){
return cljs.core.into.cljs$core$IFn$_invoke$arity$2(cljs.core.PersistentArrayMap.EMPTY,G__44821);
} else {
return G__44821;
}
})();
return (new crdt.core.GrowOnlySet(new cljs.core.Keyword(null,"xs","xs",649443341).cljs$core$IFn$_invoke$arity$1(G__44811),null,cljs.core.not_empty(extmap__5342__auto__),null));
});

(crdt.core.GrowOnlySet.prototype.cljs$core$IPrintWithWriter$ = cljs.core.PROTOCOL_SENTINEL);

(crdt.core.GrowOnlySet.prototype.cljs$core$IPrintWithWriter$_pr_writer$arity$3 = (function (obj,writer,_){
var obj__$1 = this;
var tagged_value = cljs.core.tagged_literal(new cljs.core.Symbol("crdt","gos","crdt/gos",-299569948,null),obj__$1.xs);
return cljs.core._write(writer,cljs.core.pr_str.cljs$core$IFn$_invoke$arity$variadic(cljs.core.prim_seq.cljs$core$IFn$_invoke$arity$2([tagged_value], 0)));
}));
/**
 * Used by the reader like so:
 * 
 * #crdt/gos #{1 2 3}
 */
crdt.core.read_gos = (function crdt$core$read_gos(xs){
if(cljs.core.set_QMARK_(xs)){
} else {
throw (new Error(["Assert failed: ","GrowOnlySet must be a set","\n","(set? xs)"].join('')));
}

return crdt.core.__GT_GrowOnlySet(xs);
});
cljs.reader.register_tag_parser_BANG_(new cljs.core.Symbol("crdt","gos","crdt/gos",-299569948,null),crdt.core.read_gos);
crdt.core.grow_only_set_instance_QMARK_ = (function crdt$core$grow_only_set_instance_QMARK_(x){
return (x instanceof crdt.core.GrowOnlySet);
});
crdt.core.grow_only_set_schema = (function crdt$core$grow_only_set_schema(value_schema){
return new cljs.core.PersistentVector(null, 2, 5, cljs.core.PersistentVector.EMPTY_NODE, [new cljs.core.Keyword(null,"map","map",1371690461),new cljs.core.PersistentVector(null, 2, 5, cljs.core.PersistentVector.EMPTY_NODE, [new cljs.core.Keyword(null,"xs","xs",649443341),new cljs.core.PersistentVector(null, 2, 5, cljs.core.PersistentVector.EMPTY_NODE, [new cljs.core.Keyword(null,"set","set",304602554),value_schema], null)], null)], null);
});
crdt.core.gos = (function crdt$core$gos(xs){
return crdt.core.__GT_GrowOnlySet(cljs.core.set(xs));
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
 * @implements {crdt.core.StateCRDT}
 * @implements {crdt.core.OpCRDT}
 * @implements {cljs.core.IPrintWithWriter}
 * @implements {cljs.core.IIterable}
 * @implements {cljs.core.IWithMeta}
 * @implements {cljs.core.IAssociative}
 * @implements {cljs.core.IMap}
 * @implements {cljs.core.ILookup}
*/
crdt.core.LWWSet = (function (xs,__meta,__extmap,__hash){
this.xs = xs;
this.__meta = __meta;
this.__extmap = __extmap;
this.__hash = __hash;
this.cljs$lang$protocol_mask$partition0$ = 2230716170;
this.cljs$lang$protocol_mask$partition1$ = 139264;
});
(crdt.core.LWWSet.prototype.cljs$core$ILookup$_lookup$arity$2 = (function (this__5300__auto__,k__5301__auto__){
var self__ = this;
var this__5300__auto____$1 = this;
return this__5300__auto____$1.cljs$core$ILookup$_lookup$arity$3(null, k__5301__auto__,null);
}));

(crdt.core.LWWSet.prototype.cljs$core$ILookup$_lookup$arity$3 = (function (this__5302__auto__,k44823,else__5303__auto__){
var self__ = this;
var this__5302__auto____$1 = this;
var G__44827 = k44823;
var G__44827__$1 = (((G__44827 instanceof cljs.core.Keyword))?G__44827.fqn:null);
switch (G__44827__$1) {
case "xs":
return self__.xs;

break;
default:
return cljs.core.get.cljs$core$IFn$_invoke$arity$3(self__.__extmap,k44823,else__5303__auto__);

}
}));

(crdt.core.LWWSet.prototype.cljs$core$IKVReduce$_kv_reduce$arity$3 = (function (this__5320__auto__,f__5321__auto__,init__5322__auto__){
var self__ = this;
var this__5320__auto____$1 = this;
return cljs.core.reduce.cljs$core$IFn$_invoke$arity$3((function (ret__5323__auto__,p__44828){
var vec__44829 = p__44828;
var k__5324__auto__ = cljs.core.nth.cljs$core$IFn$_invoke$arity$3(vec__44829,(0),null);
var v__5325__auto__ = cljs.core.nth.cljs$core$IFn$_invoke$arity$3(vec__44829,(1),null);
return (f__5321__auto__.cljs$core$IFn$_invoke$arity$3 ? f__5321__auto__.cljs$core$IFn$_invoke$arity$3(ret__5323__auto__,k__5324__auto__,v__5325__auto__) : f__5321__auto__.call(null, ret__5323__auto__,k__5324__auto__,v__5325__auto__));
}),init__5322__auto__,this__5320__auto____$1);
}));

(crdt.core.LWWSet.prototype.crdt$core$StateCRDT$ = cljs.core.PROTOCOL_SENTINEL);

(crdt.core.LWWSet.prototype.crdt$core$StateCRDT$_merge$arity$2 = (function (this$,that){
var self__ = this;
var this$__$1 = this;
return this$__$1.crdt$core$OpCRDT$_apply_delta$arity$2(null, new cljs.core.Keyword(null,"xs","xs",649443341).cljs$core$IFn$_invoke$arity$1(that));
}));

(crdt.core.LWWSet.prototype.cljs$core$IPrintWithWriter$_pr_writer$arity$3 = (function (this__5315__auto__,writer__5316__auto__,opts__5317__auto__){
var self__ = this;
var this__5315__auto____$1 = this;
var pr_pair__5318__auto__ = (function (keyval__5319__auto__){
return cljs.core.pr_sequential_writer(writer__5316__auto__,cljs.core.pr_writer,""," ","",opts__5317__auto__,keyval__5319__auto__);
});
return cljs.core.pr_sequential_writer(writer__5316__auto__,pr_pair__5318__auto__,"#crdt.core.LWWSet{",", ","}",opts__5317__auto__,cljs.core.concat.cljs$core$IFn$_invoke$arity$2(new cljs.core.PersistentVector(null, 1, 5, cljs.core.PersistentVector.EMPTY_NODE, [(new cljs.core.PersistentVector(null,2,(5),cljs.core.PersistentVector.EMPTY_NODE,[new cljs.core.Keyword(null,"xs","xs",649443341),self__.xs],null))], null),self__.__extmap));
}));

(crdt.core.LWWSet.prototype.cljs$core$IIterable$_iterator$arity$1 = (function (G__44822){
var self__ = this;
var G__44822__$1 = this;
return (new cljs.core.RecordIter((0),G__44822__$1,1,new cljs.core.PersistentVector(null, 1, 5, cljs.core.PersistentVector.EMPTY_NODE, [new cljs.core.Keyword(null,"xs","xs",649443341)], null),(cljs.core.truth_(self__.__extmap)?cljs.core._iterator(self__.__extmap):cljs.core.nil_iter())));
}));

(crdt.core.LWWSet.prototype.cljs$core$IMeta$_meta$arity$1 = (function (this__5298__auto__){
var self__ = this;
var this__5298__auto____$1 = this;
return self__.__meta;
}));

(crdt.core.LWWSet.prototype.cljs$core$ICloneable$_clone$arity$1 = (function (this__5295__auto__){
var self__ = this;
var this__5295__auto____$1 = this;
return (new crdt.core.LWWSet(self__.xs,self__.__meta,self__.__extmap,self__.__hash));
}));

(crdt.core.LWWSet.prototype.cljs$core$ICounted$_count$arity$1 = (function (this__5304__auto__){
var self__ = this;
var this__5304__auto____$1 = this;
return (1 + cljs.core.count(self__.__extmap));
}));

(crdt.core.LWWSet.prototype.crdt$core$OpCRDT$ = cljs.core.PROTOCOL_SENTINEL);

(crdt.core.LWWSet.prototype.crdt$core$OpCRDT$_value$arity$1 = (function (_){
var self__ = this;
var ___$1 = this;
return cljs.core.set(cljs.core.map.cljs$core$IFn$_invoke$arity$2(cljs.core.key,cljs.core.filter.cljs$core$IFn$_invoke$arity$2((function (p__44832){
var vec__44833 = p__44832;
var _x = cljs.core.nth.cljs$core$IFn$_invoke$arity$3(vec__44833,(0),null);
var lww = cljs.core.nth.cljs$core$IFn$_invoke$arity$3(vec__44833,(1),null);
return crdt.core._value(lww);
}),self__.xs)));
}));

(crdt.core.LWWSet.prototype.crdt$core$OpCRDT$_apply_delta$arity$2 = (function (_,delta){
var self__ = this;
var ___$1 = this;
new cljs.core.PersistentArrayMap(null, 1, [new cljs.core.Keyword(null,"pre","pre",2118456869),new cljs.core.PersistentVector(null, 2, 5, cljs.core.PersistentVector.EMPTY_NODE, [cljs.core.map_QMARK_(delta),cljs.core.every_QMARK_(crdt.core.lww_instance_QMARK_,cljs.core.vals(delta))], null)], null);

return (new crdt.core.LWWSet(cljs.core.reduce.cljs$core$IFn$_invoke$arity$3((function (acc,p__44836){
var vec__44837 = p__44836;
var x = cljs.core.nth.cljs$core$IFn$_invoke$arity$3(vec__44837,(0),null);
var lww = cljs.core.nth.cljs$core$IFn$_invoke$arity$3(vec__44837,(1),null);
return cljs.core.update.cljs$core$IFn$_invoke$arity$4(acc,x,crdt.core._apply_delta,lww);
}),self__.xs,delta),null,null,null));
}));

(crdt.core.LWWSet.prototype.cljs$core$IHash$_hash$arity$1 = (function (this__5296__auto__){
var self__ = this;
var this__5296__auto____$1 = this;
var h__5111__auto__ = self__.__hash;
if((!((h__5111__auto__ == null)))){
return h__5111__auto__;
} else {
var h__5111__auto____$1 = (function (coll__5297__auto__){
return (924213555 ^ cljs.core.hash_unordered_coll(coll__5297__auto__));
})(this__5296__auto____$1);
(self__.__hash = h__5111__auto____$1);

return h__5111__auto____$1;
}
}));

(crdt.core.LWWSet.prototype.cljs$core$IEquiv$_equiv$arity$2 = (function (this44824,other44825){
var self__ = this;
var this44824__$1 = this;
return (((!((other44825 == null)))) && ((((this44824__$1.constructor === other44825.constructor)) && (((cljs.core._EQ_.cljs$core$IFn$_invoke$arity$2(this44824__$1.xs,other44825.xs)) && (cljs.core._EQ_.cljs$core$IFn$_invoke$arity$2(this44824__$1.__extmap,other44825.__extmap)))))));
}));

(crdt.core.LWWSet.prototype.cljs$core$IMap$_dissoc$arity$2 = (function (this__5310__auto__,k__5311__auto__){
var self__ = this;
var this__5310__auto____$1 = this;
if(cljs.core.contains_QMARK_(new cljs.core.PersistentHashSet(null, new cljs.core.PersistentArrayMap(null, 1, [new cljs.core.Keyword(null,"xs","xs",649443341),null], null), null),k__5311__auto__)){
return cljs.core.dissoc.cljs$core$IFn$_invoke$arity$2(cljs.core._with_meta(cljs.core.into.cljs$core$IFn$_invoke$arity$2(cljs.core.PersistentArrayMap.EMPTY,this__5310__auto____$1),self__.__meta),k__5311__auto__);
} else {
return (new crdt.core.LWWSet(self__.xs,self__.__meta,cljs.core.not_empty(cljs.core.dissoc.cljs$core$IFn$_invoke$arity$2(self__.__extmap,k__5311__auto__)),null));
}
}));

(crdt.core.LWWSet.prototype.cljs$core$IAssociative$_contains_key_QMARK_$arity$2 = (function (this__5307__auto__,k44823){
var self__ = this;
var this__5307__auto____$1 = this;
var G__44840 = k44823;
var G__44840__$1 = (((G__44840 instanceof cljs.core.Keyword))?G__44840.fqn:null);
switch (G__44840__$1) {
case "xs":
return true;

break;
default:
return cljs.core.contains_QMARK_(self__.__extmap,k44823);

}
}));

(crdt.core.LWWSet.prototype.cljs$core$IAssociative$_assoc$arity$3 = (function (this__5308__auto__,k__5309__auto__,G__44822){
var self__ = this;
var this__5308__auto____$1 = this;
var pred__44841 = cljs.core.keyword_identical_QMARK_;
var expr__44842 = k__5309__auto__;
if(cljs.core.truth_((pred__44841.cljs$core$IFn$_invoke$arity$2 ? pred__44841.cljs$core$IFn$_invoke$arity$2(new cljs.core.Keyword(null,"xs","xs",649443341),expr__44842) : pred__44841.call(null, new cljs.core.Keyword(null,"xs","xs",649443341),expr__44842)))){
return (new crdt.core.LWWSet(G__44822,self__.__meta,self__.__extmap,null));
} else {
return (new crdt.core.LWWSet(self__.xs,self__.__meta,cljs.core.assoc.cljs$core$IFn$_invoke$arity$3(self__.__extmap,k__5309__auto__,G__44822),null));
}
}));

(crdt.core.LWWSet.prototype.cljs$core$ISeqable$_seq$arity$1 = (function (this__5313__auto__){
var self__ = this;
var this__5313__auto____$1 = this;
return cljs.core.seq(cljs.core.concat.cljs$core$IFn$_invoke$arity$2(new cljs.core.PersistentVector(null, 1, 5, cljs.core.PersistentVector.EMPTY_NODE, [(new cljs.core.MapEntry(new cljs.core.Keyword(null,"xs","xs",649443341),self__.xs,null))], null),self__.__extmap));
}));

(crdt.core.LWWSet.prototype.cljs$core$IWithMeta$_with_meta$arity$2 = (function (this__5299__auto__,G__44822){
var self__ = this;
var this__5299__auto____$1 = this;
return (new crdt.core.LWWSet(self__.xs,G__44822,self__.__extmap,self__.__hash));
}));

(crdt.core.LWWSet.prototype.cljs$core$ICollection$_conj$arity$2 = (function (this__5305__auto__,entry__5306__auto__){
var self__ = this;
var this__5305__auto____$1 = this;
if(cljs.core.vector_QMARK_(entry__5306__auto__)){
return this__5305__auto____$1.cljs$core$IAssociative$_assoc$arity$3(null, cljs.core._nth(entry__5306__auto__,(0)),cljs.core._nth(entry__5306__auto__,(1)));
} else {
return cljs.core.reduce.cljs$core$IFn$_invoke$arity$3(cljs.core._conj,this__5305__auto____$1,entry__5306__auto__);
}
}));

(crdt.core.LWWSet.getBasis = (function (){
return new cljs.core.PersistentVector(null, 1, 5, cljs.core.PersistentVector.EMPTY_NODE, [new cljs.core.Symbol(null,"xs","xs",-2004992428,null)], null);
}));

(crdt.core.LWWSet.cljs$lang$type = true);

(crdt.core.LWWSet.cljs$lang$ctorPrSeq = (function (this__5346__auto__){
return (new cljs.core.List(null,"crdt.core/LWWSet",null,(1),null));
}));

(crdt.core.LWWSet.cljs$lang$ctorPrWriter = (function (this__5346__auto__,writer__5347__auto__){
return cljs.core._write(writer__5347__auto__,"crdt.core/LWWSet");
}));

/**
 * Positional factory function for crdt.core/LWWSet.
 */
crdt.core.__GT_LWWSet = (function crdt$core$__GT_LWWSet(xs){
return (new crdt.core.LWWSet(xs,null,null,null));
});

/**
 * Factory function for crdt.core/LWWSet, taking a map of keywords to field values.
 */
crdt.core.map__GT_LWWSet = (function crdt$core$map__GT_LWWSet(G__44826){
var extmap__5342__auto__ = (function (){var G__44844 = cljs.core.dissoc.cljs$core$IFn$_invoke$arity$2(G__44826,new cljs.core.Keyword(null,"xs","xs",649443341));
if(cljs.core.record_QMARK_(G__44826)){
return cljs.core.into.cljs$core$IFn$_invoke$arity$2(cljs.core.PersistentArrayMap.EMPTY,G__44844);
} else {
return G__44844;
}
})();
return (new crdt.core.LWWSet(new cljs.core.Keyword(null,"xs","xs",649443341).cljs$core$IFn$_invoke$arity$1(G__44826),null,cljs.core.not_empty(extmap__5342__auto__),null));
});

(crdt.core.LWWSet.prototype.cljs$core$IPrintWithWriter$ = cljs.core.PROTOCOL_SENTINEL);

(crdt.core.LWWSet.prototype.cljs$core$IPrintWithWriter$_pr_writer$arity$3 = (function (obj,writer,_){
var obj__$1 = this;
var tagged_value = cljs.core.tagged_literal(new cljs.core.Symbol("crdt","lww-set","crdt/lww-set",-497123604,null),obj__$1.xs);
return cljs.core._write(writer,cljs.core.pr_str.cljs$core$IFn$_invoke$arity$variadic(cljs.core.prim_seq.cljs$core$IFn$_invoke$arity$2([tagged_value], 0)));
}));
crdt.core.lww_set = (function crdt$core$lww_set(var_args){
var G__44846 = arguments.length;
switch (G__44846) {
case 0:
return crdt.core.lww_set.cljs$core$IFn$_invoke$arity$0();

break;
case 2:
return crdt.core.lww_set.cljs$core$IFn$_invoke$arity$2((arguments[(0)]),(arguments[(1)]));

break;
default:
throw (new Error(["Invalid arity: ",cljs.core.str.cljs$core$IFn$_invoke$arity$1(arguments.length)].join('')));

}
});

(crdt.core.lww_set.cljs$core$IFn$_invoke$arity$0 = (function (){
return crdt.core.lww_set.cljs$core$IFn$_invoke$arity$2(null,cljs.core.PersistentHashSet.EMPTY);
}));

(crdt.core.lww_set.cljs$core$IFn$_invoke$arity$2 = (function (clock,xs){
if((xs instanceof crdt.core.LWWSet)){
return xs;
} else {
var inner = cljs.core.into.cljs$core$IFn$_invoke$arity$2(cljs.core.PersistentArrayMap.EMPTY,cljs.core.map.cljs$core$IFn$_invoke$arity$2((function (x){
return new cljs.core.PersistentVector(null, 2, 5, cljs.core.PersistentVector.EMPTY_NODE, [x,(new crdt.core.LWW(clock,true,null,null,null))], null);
}),(function (){var or__5002__auto__ = xs;
if(cljs.core.truth_(or__5002__auto__)){
return or__5002__auto__;
} else {
return cljs.core.PersistentHashSet.EMPTY;
}
})()));
return (new crdt.core.LWWSet(inner,null,null,null));
}
}));

(crdt.core.lww_set.cljs$lang$maxFixedArity = 2);

crdt.core.read_lww_set = (function crdt$core$read_lww_set(xs){
if((xs instanceof crdt.core.LWWSet)){
return xs;
} else {
return (new crdt.core.LWWSet(xs,null,null,null));
}
});
cljs.reader.register_tag_parser_BANG_(new cljs.core.Symbol("crdt","lww-set","crdt/lww-set",-497123604,null),crdt.core.read_lww_set);
crdt.core.lww_set_delta = (function crdt$core$lww_set_delta(var_args){
var G__44848 = arguments.length;
switch (G__44848) {
case 2:
return crdt.core.lww_set_delta.cljs$core$IFn$_invoke$arity$2((arguments[(0)]),(arguments[(1)]));

break;
case 3:
return crdt.core.lww_set_delta.cljs$core$IFn$_invoke$arity$3((arguments[(0)]),(arguments[(1)]),(arguments[(2)]));

break;
default:
throw (new Error(["Invalid arity: ",cljs.core.str.cljs$core$IFn$_invoke$arity$1(arguments.length)].join('')));

}
});

(crdt.core.lww_set_delta.cljs$core$IFn$_invoke$arity$2 = (function (clock,s){
return crdt.core.lww_set_delta.cljs$core$IFn$_invoke$arity$3(clock,s,true);
}));

(crdt.core.lww_set_delta.cljs$core$IFn$_invoke$arity$3 = (function (clock,s,in_QMARK_){
if(((cljs.core.map_QMARK_(s)) || (cljs.core.set_QMARK_(s)))){
} else {
throw (new Error("Assert failed: (or (map? s) (set? s))"));
}

if(cljs.core.boolean_QMARK_(in_QMARK_)){
} else {
throw (new Error("Assert failed: (boolean? in?)"));
}

if(cljs.core.set_QMARK_(s)){
return cljs.core.into.cljs$core$IFn$_invoke$arity$2(cljs.core.PersistentArrayMap.EMPTY,cljs.core.map.cljs$core$IFn$_invoke$arity$2((function (x){
return new cljs.core.PersistentVector(null, 2, 5, cljs.core.PersistentVector.EMPTY_NODE, [x,crdt.core.lww(clock,in_QMARK_)], null);
}),s));
} else {
if(cljs.core.map_QMARK_(s)){
return s;
} else {
throw (new Error(["Assert failed: ","Only sets or maps are allowed","\n","false"].join('')));

}
}
}));

(crdt.core.lww_set_delta.cljs$lang$maxFixedArity = 3);

crdt.core.lww_set_schema = (function crdt$core$lww_set_schema(var_args){
var G__44850 = arguments.length;
switch (G__44850) {
case 1:
return crdt.core.lww_set_schema.cljs$core$IFn$_invoke$arity$1((arguments[(0)]));

break;
case 2:
return crdt.core.lww_set_schema.cljs$core$IFn$_invoke$arity$2((arguments[(0)]),(arguments[(1)]));

break;
default:
throw (new Error(["Invalid arity: ",cljs.core.str.cljs$core$IFn$_invoke$arity$1(arguments.length)].join('')));

}
});

(crdt.core.lww_set_schema.cljs$core$IFn$_invoke$arity$1 = (function (value_schema){
return crdt.core.lww_set_schema.cljs$core$IFn$_invoke$arity$2(crdt.core.hlc_schema,value_schema);
}));

(crdt.core.lww_set_schema.cljs$core$IFn$_invoke$arity$2 = (function (clock_schema,value_schema){
return new cljs.core.PersistentVector(null, 2, 5, cljs.core.PersistentVector.EMPTY_NODE, [new cljs.core.Keyword(null,"map","map",1371690461),new cljs.core.PersistentVector(null, 2, 5, cljs.core.PersistentVector.EMPTY_NODE, [new cljs.core.Keyword(null,"xs","xs",649443341),new cljs.core.PersistentVector(null, 3, 5, cljs.core.PersistentVector.EMPTY_NODE, [new cljs.core.Keyword(null,"map-of","map-of",1189682355),value_schema,crdt.core.lww_schema.cljs$core$IFn$_invoke$arity$2(clock_schema,cljs.core.boolean_QMARK_)], null)], null)], null);
}));

(crdt.core.lww_set_schema.cljs$lang$maxFixedArity = 2);

crdt.core.lww_set_delta_schema = (function crdt$core$lww_set_delta_schema(var_args){
var G__44852 = arguments.length;
switch (G__44852) {
case 1:
return crdt.core.lww_set_delta_schema.cljs$core$IFn$_invoke$arity$1((arguments[(0)]));

break;
case 2:
return crdt.core.lww_set_delta_schema.cljs$core$IFn$_invoke$arity$2((arguments[(0)]),(arguments[(1)]));

break;
default:
throw (new Error(["Invalid arity: ",cljs.core.str.cljs$core$IFn$_invoke$arity$1(arguments.length)].join('')));

}
});

(crdt.core.lww_set_delta_schema.cljs$core$IFn$_invoke$arity$1 = (function (value_schema){
return crdt.core.lww_set_delta_schema.cljs$core$IFn$_invoke$arity$2(crdt.core.hlc_schema,value_schema);
}));

(crdt.core.lww_set_delta_schema.cljs$core$IFn$_invoke$arity$2 = (function (clock_schema,value_schema){
return new cljs.core.PersistentVector(null, 3, 5, cljs.core.PersistentVector.EMPTY_NODE, [new cljs.core.Keyword(null,"map-of","map-of",1189682355),value_schema,crdt.core.lww_schema.cljs$core$IFn$_invoke$arity$2(clock_schema,cljs.core.boolean_QMARK_)], null);
}));

(crdt.core.lww_set_delta_schema.cljs$lang$maxFixedArity = 2);

(crdt.core.CRDTDelta["null"] = true);

(crdt.core._init["null"] = (function (_){
return null;
}));

(cljs.core.IMap.prototype.crdt$core$CRDTDelta$ = cljs.core.PROTOCOL_SENTINEL);

(cljs.core.IMap.prototype.crdt$core$CRDTDelta$_init$arity$1 = (function (_){
var ___$1 = this;
return cljs.core.PersistentArrayMap.EMPTY;
}));
(crdt.core.CRDTDelta["object"] = true);

(crdt.core._init["object"] = (function (this$){
return this$;
}));
(crdt.core.CRDTDelta["number"] = true);

(crdt.core._init["number"] = (function (this$){
return this$;
}));

(crdt.core.CRDTDelta["string"] = true);

(crdt.core._init["string"] = (function (this$){
return this$;
}));

(crdt.core.CRDTDelta["boolean"] = true);

(crdt.core._init["boolean"] = (function (this$){
return this$;
}));

(crdt.core.CRDTDelta["array"] = true);

(crdt.core._init["array"] = (function (this$){
return this$;
}));

(Date.prototype.crdt$core$CRDTDelta$ = cljs.core.PROTOCOL_SENTINEL);

(Date.prototype.crdt$core$CRDTDelta$_init$arity$1 = (function (this$){
var this$__$1 = this;
return this$__$1;
}));

(cljs.core.uuid.prototype.crdt$core$CRDTDelta$ = cljs.core.PROTOCOL_SENTINEL);

(cljs.core.uuid.prototype.crdt$core$CRDTDelta$_init$arity$1 = (function (this$){
var this$__$1 = this;
return this$__$1;
}));

(cljs.core.Keyword.prototype.crdt$core$CRDTDelta$ = cljs.core.PROTOCOL_SENTINEL);

(cljs.core.Keyword.prototype.crdt$core$CRDTDelta$_init$arity$1 = (function (this$){
var this$__$1 = this;
return this$__$1;
}));

(cljs.core.Symbol.prototype.crdt$core$CRDTDelta$ = cljs.core.PROTOCOL_SENTINEL);

(cljs.core.Symbol.prototype.crdt$core$CRDTDelta$_init$arity$1 = (function (this$){
var this$__$1 = this;
return this$__$1;
}));
(crdt.core.OpCRDT["null"] = true);

(crdt.core._value["null"] = (function (_){
return null;
}));

(crdt.core._apply_delta["null"] = (function (_,delta){
return crdt.core._apply_delta(crdt.core._init(delta),delta);
}));
crdt.core.value_map = (function crdt$core$value_map(this$){
return cljs.core.reduce.cljs$core$IFn$_invoke$arity$3((function (m,p__44853){
var vec__44854 = p__44853;
var k = cljs.core.nth.cljs$core$IFn$_invoke$arity$3(vec__44854,(0),null);
var v = cljs.core.nth.cljs$core$IFn$_invoke$arity$3(vec__44854,(1),null);
return cljs.core.assoc.cljs$core$IFn$_invoke$arity$3(m,k,crdt.core._value(v));
}),cljs.core.PersistentArrayMap.EMPTY,this$);
});
crdt.core.apply_delta_map = (function crdt$core$apply_delta_map(this$,delta){
return cljs.core.reduce.cljs$core$IFn$_invoke$arity$3((function (m,p__44857){
var vec__44858 = p__44857;
var k = cljs.core.nth.cljs$core$IFn$_invoke$arity$3(vec__44858,(0),null);
var val_delta = cljs.core.nth.cljs$core$IFn$_invoke$arity$3(vec__44858,(1),null);
return cljs.core.update.cljs$core$IFn$_invoke$arity$4(m,k,crdt.core._apply_delta,val_delta);
}),this$,delta);
});
(cljs.core.PersistentArrayMap.prototype.crdt$core$OpCRDT$ = cljs.core.PROTOCOL_SENTINEL);

(cljs.core.PersistentArrayMap.prototype.crdt$core$OpCRDT$_value$arity$1 = (function (this$){
var this$__$1 = this;
return crdt.core.value_map(this$__$1);
}));

(cljs.core.PersistentArrayMap.prototype.crdt$core$OpCRDT$_apply_delta$arity$2 = (function (this$,delta){
var this$__$1 = this;
return crdt.core.apply_delta_map(this$__$1,delta);
}));

(cljs.core.PersistentTreeMap.prototype.crdt$core$OpCRDT$ = cljs.core.PROTOCOL_SENTINEL);

(cljs.core.PersistentTreeMap.prototype.crdt$core$OpCRDT$_value$arity$1 = (function (this$){
var this$__$1 = this;
return crdt.core.value_map(this$__$1);
}));

(cljs.core.PersistentTreeMap.prototype.crdt$core$OpCRDT$_apply_delta$arity$2 = (function (this$,delta){
var this$__$1 = this;
return crdt.core.apply_delta_map(this$__$1,delta);
}));

(cljs.core.PersistentHashMap.prototype.crdt$core$OpCRDT$ = cljs.core.PROTOCOL_SENTINEL);

(cljs.core.PersistentHashMap.prototype.crdt$core$OpCRDT$_value$arity$1 = (function (this$){
var this$__$1 = this;
return crdt.core.value_map(this$__$1);
}));

(cljs.core.PersistentHashMap.prototype.crdt$core$OpCRDT$_apply_delta$arity$2 = (function (this$,delta){
var this$__$1 = this;
return crdt.core.apply_delta_map(this$__$1,delta);
}));
(cljs.core.PersistentHashMap.prototype.crdt$core$StateCRDT$ = cljs.core.PROTOCOL_SENTINEL);

(cljs.core.PersistentHashMap.prototype.crdt$core$StateCRDT$_merge$arity$2 = (function (this$,that){
var this$__$1 = this;
return cljs.core.merge_with.cljs$core$IFn$_invoke$arity$variadic(crdt.core._merge,cljs.core.prim_seq.cljs$core$IFn$_invoke$arity$2([this$__$1,that], 0));
}));

(cljs.core.PersistentArrayMap.prototype.crdt$core$StateCRDT$ = cljs.core.PROTOCOL_SENTINEL);

(cljs.core.PersistentArrayMap.prototype.crdt$core$StateCRDT$_merge$arity$2 = (function (this$,that){
var this$__$1 = this;
return cljs.core.merge_with.cljs$core$IFn$_invoke$arity$variadic(crdt.core._merge,cljs.core.prim_seq.cljs$core$IFn$_invoke$arity$2([this$__$1,that], 0));
}));

(cljs.core.PersistentTreeMap.prototype.crdt$core$StateCRDT$ = cljs.core.PROTOCOL_SENTINEL);

(cljs.core.PersistentTreeMap.prototype.crdt$core$StateCRDT$_merge$arity$2 = (function (this$,that){
var this$__$1 = this;
return cljs.core.merge_with.cljs$core$IFn$_invoke$arity$variadic(crdt.core._merge,cljs.core.prim_seq.cljs$core$IFn$_invoke$arity$2([this$__$1,that], 0));
}));
crdt.core.throw_unsupported_op = (function crdt$core$throw_unsupported_op(this$,delta){
throw cljs.core.ex_info.cljs$core$IFn$_invoke$arity$2(["Applied a delta to a value that is not a CRDT: %s \n %s",cljs.core.str.cljs$core$IFn$_invoke$arity$1(cljs.core.type(this$)),cljs.core.pr_str.cljs$core$IFn$_invoke$arity$variadic(cljs.core.prim_seq.cljs$core$IFn$_invoke$arity$2([delta], 0))].join(''),new cljs.core.PersistentArrayMap(null, 2, [new cljs.core.Keyword(null,"this","this",-611633625),this$,new cljs.core.Keyword(null,"delta","delta",108939957),delta], null));
});
(crdt.core.OpCRDT["object"] = true);

(crdt.core._value["object"] = (function (this$){
return this$;
}));

(crdt.core._apply_delta["object"] = (function (this$,delta){
return crdt.core.throw_unsupported_op(this$,delta);
}));
(crdt.core.OpCRDT["number"] = true);

(crdt.core._value["number"] = (function (this$){
return this$;
}));

(crdt.core._apply_delta["number"] = (function (this$,delta){
return crdt.core.throw_unsupported_op(this$,delta);
}));

(crdt.core.OpCRDT["string"] = true);

(crdt.core._value["string"] = (function (this$){
return this$;
}));

(crdt.core._apply_delta["string"] = (function (this$,delta){
return crdt.core.throw_unsupported_op(this$,delta);
}));

(crdt.core.OpCRDT["boolean"] = true);

(crdt.core._value["boolean"] = (function (this$){
return this$;
}));

(crdt.core._apply_delta["boolean"] = (function (this$,delta){
return crdt.core.throw_unsupported_op(this$,delta);
}));

(crdt.core.OpCRDT["array"] = true);

(crdt.core._value["array"] = (function (this$){
return this$;
}));

(crdt.core._apply_delta["array"] = (function (this$,delta){
return crdt.core.throw_unsupported_op(this$,delta);
}));

(Date.prototype.crdt$core$OpCRDT$ = cljs.core.PROTOCOL_SENTINEL);

(Date.prototype.crdt$core$OpCRDT$_value$arity$1 = (function (this$){
var this$__$1 = this;
return this$__$1;
}));

(Date.prototype.crdt$core$OpCRDT$_apply_delta$arity$2 = (function (this$,delta){
var this$__$1 = this;
return crdt.core.throw_unsupported_op(this$__$1,delta);
}));

(cljs.core.uuid.prototype.crdt$core$OpCRDT$ = cljs.core.PROTOCOL_SENTINEL);

(cljs.core.uuid.prototype.crdt$core$OpCRDT$_value$arity$1 = (function (this$){
var this$__$1 = this;
return this$__$1;
}));

(cljs.core.uuid.prototype.crdt$core$OpCRDT$_apply_delta$arity$2 = (function (this$,delta){
var this$__$1 = this;
return crdt.core.throw_unsupported_op(this$__$1,delta);
}));

(cljs.core.Keyword.prototype.crdt$core$OpCRDT$ = cljs.core.PROTOCOL_SENTINEL);

(cljs.core.Keyword.prototype.crdt$core$OpCRDT$_value$arity$1 = (function (this$){
var this$__$1 = this;
return this$__$1;
}));

(cljs.core.Keyword.prototype.crdt$core$OpCRDT$_apply_delta$arity$2 = (function (this$,delta){
var this$__$1 = this;
return crdt.core.throw_unsupported_op(this$__$1,delta);
}));

(cljs.core.Symbol.prototype.crdt$core$OpCRDT$ = cljs.core.PROTOCOL_SENTINEL);

(cljs.core.Symbol.prototype.crdt$core$OpCRDT$_value$arity$1 = (function (this$){
var this$__$1 = this;
return this$__$1;
}));

(cljs.core.Symbol.prototype.crdt$core$OpCRDT$_apply_delta$arity$2 = (function (this$,delta){
var this$__$1 = this;
return crdt.core.throw_unsupported_op(this$__$1,delta);
}));
crdt.core.clock_QMARK_ = (function crdt$core$clock_QMARK_(x){
return crdt.core.comparable_QMARK_(x);
});
/**
 * Recursively walks the map turning all its leaf nodes to LWW
 */
crdt.core.__GT_lww_map = (function crdt$core$__GT_lww_map(m,clock){
if(cljs.core.map_QMARK_(m)){
} else {
throw (new Error("Assert failed: (map? m)"));
}

var _PERCENT_ = medley.core.map_vals.cljs$core$IFn$_invoke$arity$2((function (v){
if(cljs.core.map_QMARK_(v)){
return (crdt.core.__GT_lww_map.cljs$core$IFn$_invoke$arity$2 ? crdt.core.__GT_lww_map.cljs$core$IFn$_invoke$arity$2(v,clock) : crdt.core.__GT_lww_map.call(null, v,clock));
} else {
return (new crdt.core.LWW(clock,v,null,null,null));
}
}),m);
if(cljs.core.map_QMARK_(_PERCENT_)){
} else {
throw (new Error("Assert failed: (map? %)"));
}

return _PERCENT_;
});

//# sourceMappingURL=crdt.core.js.map
