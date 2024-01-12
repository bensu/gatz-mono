(ns gatz.connections
  (:require [clojure.set :as set]
            [medley.core :refer [dissoc-in]]))

;; :user-id->conn-id->ws {user-id {conn-id ws}}
;; :did->user-id {did #{user-id}}

;; on message

;; did -> #{user-id}
;; user-id -> #{conn-id} -> #{ws}

;; on connection
;; from request: user-id, conn-id, ws
;; from database: user-id -> #{did}
;; did -> #{user-id}

;; on close
;; from request: {user-id, conn-id, ws}

;; TODO: there is no cleanup for did

;; if last did for user-id, remove user-id from user-id -> #{did}

(def ws-schema :any)

(def state-schema
  [:map
   [:user-id->conn-id->ws [:map-of :uuid [:map-of :uuid ws-schema]]]
   [:did->user-ids [:map-of :uuid [:map-of :uuid :any]]]
;;    [:user-ids #{:uuid}]
;;    [:dids #{:uuid}]
   ])

(def init-state
  {:user-id->conn-id->ws {}
   :did->user-ids {}
;;    :user-ids #{}
;;    :dids #{}
   })

(defn connected-users [state]
  (set (keys (:user-id->conn-id->ws state))))

(defn active-discussions [state]
  (set (keys (:did->user-ids state))))

(defn discussion-users [state did]
  (set (keys (get-in state [:did->user-ids did]))))

(defn user-wss [state user-id]
  (set (vals (get-in state [:user-id->conn-id->ws user-id]))))

(defn add-conn [state {:keys [user-id conn-id ws user-discussions]}]
  {:pre [(some? ws) (uuid? user-id) (uuid? conn-id)
         (set? user-discussions) (every? uuid? user-discussions)]}
  (-> state
      (update :user-id->conn-id->ws assoc-in [user-id conn-id] ws)
      (update :did->user-ids (fn [did->user-ids]
                               (reduce
                                (fn [acc did]
                                  (assoc-in acc [did user-id] {}))
                                did->user-ids
                                user-discussions)))))

(defn remove-conn [state {:keys [user-id conn-id user-discussions]}]
  (-> state
      (update :user-id->conn-id->ws dissoc-in [user-id conn-id])
      (update :did->user-ids
              (fn [did->user-ids]
                (reduce (fn [acc did]
                          (dissoc-in acc [did user-id]))
                        did->user-ids
                        user-discussions)))))

(defn add-user-to-d [state {:keys [did user-id]}]
  (-> state
      (update :did->user-ids assoc-in [did user-id] {})))

(defn add-users-to-d [state {:keys [did user-ids]}]
  (reduce
   (fn [acc uid]
     (add-user-to-d acc {:did did :user-id uid}))
   state
   user-ids))

(defn remove-user-from-d [state {:keys [did user-id]}]
  (-> state
      (update :did->user-ids dissoc-in [did user-id])))

(defn add-discussion [state {:keys [did user-ids]}]
  (reduce (fn [state user-id]
            (add-user-to-d state {:did did :user-id user-id}))
          state
          user-ids))

(defn remove-discussion [state {:keys [did]}]
  (update state :did->user-ids dissoc did))

(defn did->wss [state did]
  (let [user-ids (discussion-users state did)]
    (->> user-ids
         (map #(user-wss state %))
         (reduce set/union))))
