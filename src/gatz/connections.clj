(ns gatz.connections
  (:require [clojure.set :as set]
            [medley.core :refer [dissoc-in]]))

;; :user-id->conn-id->ws {user-id {conn-id ws}}
;; :ch-id->user-id {ch-id #{user-id}}

;; on message

;; ch-id -> #{user-id}
;; user-id -> #{conn-id} -> #{ws}

;; on connection
;; from request: user-id, conn-id, ws
;; from database: user-id -> #{ch-id}
;; ch-id -> #{user-id}

;; on close
;; from request: {user-id, conn-id, ws}

;; TODO: there is no cleanup for ch-id

;; if last ch-id for user-id, remove user-id from user-id -> #{ch-id}

(def ws-schema :any)

(def state-schema
  [:map
   [:user-id->conn-id->ws [:map-of :uuid [:map-of :uuid ws-schema]]]
   [:ch-id->user-ids [:map-of :uuid [:map-of :uuid :any]]]
;;    [:user-ids #{:uuid}]
;;    [:ch-ids #{:uuid}]
   ])

(def init-state
  {:user-id->conn-id->ws {}
   :ch-id->user-ids {}
;;    :user-ids #{}
;;    :ch-ids #{}
   })

(defn connected-users [state]
  (set (keys (:user-id->conn-id->ws state))))

(defn active-channels [state]
  (set (keys (:ch-id->user-ids state))))

(defn channel-users [state ch-id]
  (set (keys (get-in state [:ch-id->user-ids ch-id]))))

(defn user-wss [state user-id]
  (set (vals (get-in state [:user-id->conn-id->ws user-id]))))

(defn add-conn [state {:keys [user-id conn-id ws user-channels]}]
  (-> state
      (update :user-id->conn-id->ws assoc-in [user-id conn-id] ws)
      (update :ch-id->user-ids (fn [ch-id->user-ids]
                                 (reduce
                                  (fn [acc ch-id]
                                    (assoc-in acc [ch-id user-id] {}))
                                  ch-id->user-ids
                                  user-channels)))))

(defn remove-conn [state {:keys [user-id conn-id user-channels]}]
  (-> state
      (update :user-id->conn-id->ws dissoc-in [user-id conn-id])
      (update :ch-id->user-ids
              (fn [ch-id->user-ids]
                (reduce (fn [acc ch-id]
                          (dissoc-in acc [ch-id user-id]))
                        ch-id->user-ids
                        user-channels)))))

(defn add-user-to-ch [state {:keys [ch-id user-id]}]
  (-> state
      (update :ch-id->user-ids assoc-in [ch-id user-id] {})))

(defn remove-user-from-ch [state {:keys [ch-id user-id]}]
  (-> state
      (update :ch-id->user-ids dissoc-in [ch-id user-id])))

(defn add-channel [state {:keys [ch-id user-ids]}]
  (reduce (fn [state user-id]
            (add-user-to-ch state {:ch-id ch-id :user-id user-id}))
          state
          user-ids))

(defn remove-channel [state {:keys [ch-id]}]
  (update state :ch-id->user-ids dissoc ch-id))

(defn ch-id->wss [state ch-id]
  (let [user-ids (channel-users state ch-id)]
    (->> user-ids
         (map #(user-wss state %))
         (reduce set/union))))
