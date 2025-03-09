(ns gatz.expo.core
  (:require [crdt.core :as crdt]
            [cljs.reader :as reader]))

;; Export core CRDT constructors
(defn ^:export new-lww [clock value]
  (crdt/->LWW clock value))

(defn ^:export new-min-wins [value]
  (crdt/min-wins value))

(defn ^:export new-max-wins [value]
  (crdt/max-wins value))

(defn ^:export new-grow-only-set [values]
  (crdt/gos (js->clj values)))

(defn ^:export new-lww-set [clock values]
  (crdt/lww-set clock (js->clj values)))

;; Export core CRDT operations
(defn ^:export merge-crdts [a b]
  (crdt/-merge a b))

(defn ^:export apply-delta [crdt delta]
  (crdt/-apply-delta crdt delta))

(defn ^:export get-value [crdt]
  (clj->js (crdt/-value crdt)))

;; Export clock utilities
(defn ^:export new-hlc [node-id]
  (crdt/new-hlc node-id (js/Date.)))

;; Helper for reading CRDT literals from strings
(defn ^:export read-crdt [edn-str]
  (reader/read-string edn-str))

;; Example usage from JavaScript:
;; 
;; import { newHlc, newLww, getValue, mergeCrdts } from './cljs-out/gatz.expo.core';
;; 
;; const nodeId = '123e4567-e89b-12d3-a456-426614174000';
;; const clock = new_hlc(nodeId);
;; const lww1 = new_lww(clock, "value1");
;; const lww2 = new_lww(clock, "value2");
;; const merged = merge_crdts(lww1, lww2);
;; console.log(get_value(merged)); // "value2"