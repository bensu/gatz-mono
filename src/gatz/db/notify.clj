(ns gatz.db.notify
  (:require [com.biffweb :as biff :refer [q]]))

;; ====================================================================== 
;; Activity for notifications

(defn discussions-for-user-since-ts

  [db user-id since-ts]
  {:pre [(uuid? user-id) (inst? since-ts)]}

  (let [r (q db '{:find [creator-username did]
                  :in [user-id since-ts]
                      ;; TODO: this is scanning all user discussions ever
                  :where [[did :db/type :gatz/discussion]
                          [did :discussion/members user-id]
                          [did :discussion/created_at created-at]
                          [(< since-ts created-at)]

                          [did :discussion/created_by creator-id]

                          [creator-id :db/type :gatz/user]
                          [creator-id :user/name creator-username]]}
             user-id since-ts)]
    (reduce (fn [acc [username did]]
              (-> acc
                  (update :dids conj did)
                  (update :creators conj username)))
            {:creators  #{} :dids #{}}
            r)))


;; TODO: can't query messages like this directly anymore
(defn messages-sent-to-user-since

  [db user-id since-ts]

  {:pre [(uuid? user-id) (inst? since-ts)]}

  (let [r (q db '{:find [sender-name mid]
                  :in [user-id since-ts]
                          ;; TODO: this is scanning all user discussions ever
                  :where [[did :db/type :gatz/discussion]
                          [did :discussion/members user-id]

                          [mid :db/type :gatz/message]
                          [mid :message/created_at m-created-at]
                          [mid :message/did did]
                          [(< since-ts m-created-at)]
                          [mid :message/user_id sender-id]

                          [sid :xt/id sender-id]
                          [sid :db/type :gatz/user]
                          [sid :user/name sender-name]]}
             user-id since-ts)]
    (reduce (fn [acc [username mid]]
              (-> acc
                  (update :mids conj mid)
                  (update :senders conj username)))
            {:senders #{} :mids #{}}
            r)))

