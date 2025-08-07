(ns gatz.connections
  (:require [medley.core :refer [dissoc-in]]))

(def ws-schema :any)

(def state-schema
  [:map
   [:user-id->conn-id->ws [:map-of :uuid [:map-of :uuid ws-schema]]]])

(def init-state
  {:user-id->conn-id->ws {}})

(defn all-wss [state]
  (mapcat vals (vals (:user-id->conn-id->ws state))))

(defn connected-users [state]
  (set (keys (:user-id->conn-id->ws state))))

(defn user-wss [state user-id]
  (set (vals (get-in state [:user-id->conn-id->ws user-id]))))

(defn uids->wss [state uids]
  (set (mapcat (partial user-wss state) uids)))

(defn add-conn [state {:keys [user-id conn-id ws]}]
  {:pre [(some? ws) (uuid? user-id) (uuid? conn-id)]}
  (-> state
      (update :user-id->conn-id->ws assoc-in [user-id conn-id] ws)))

(defn remove-conn [state {:keys [user-id conn-id]}]
  (-> state
      (update :user-id->conn-id->ws dissoc-in [user-id conn-id])))

