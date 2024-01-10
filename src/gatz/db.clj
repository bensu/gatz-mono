(ns gatz.db
  (:require [com.biffweb :as biff :refer [q]]
            [malli.transform :as mt]))

;; ====================================================================== 
;; User

(def default-img "http://www.gravatar.com/avatar")

(defn user-by-name [db username]
  {:pre [(string? username) (not (empty? username))]}
  (let [users (q db
                 '{:find (pull u [*])
                   :in [username]
                   :where [[u :user/name username]
                           [u :db/type :gatz/user]]}
                 username)]
           ;; XXX: we can't guarantee uniqueness of usernames
    (->> users
         (sort-by (comp :user/created_at #(.getTime %)))
         first)))

(defn create-user! [ctx {:keys [username]}]

  (assert (nil? (user-by-name (:biff/db ctx) username)))

  (let [now (java.util.Date.)
        user-id (random-uuid)
        user {:db/doc-type :gatz/user
              :db/type :gatz/user
              :xt/id user-id
              :user/name username
              :user/created_at now
              :user/updated_at now
              :user/image default-img}]
    (biff/submit-tx ctx [user])
    user))

(defn user-by-id [db user-id]
  {:pre [(uuid? user-id)]}
  (first
   (q db
      '{:find (pull user [*])
        :in [user-id]
        :where [[user :xt/id user-id]
                [user :db/type :gatz/user]]}
      user-id)))

(defn all-users [db]
  (vec (q db '{:find (pull user [*])
               :where [[user :db/type :gatz/user]]})))

;; ====================================================================== 
;; Messages

(defn ->uuid [s]
  (if (string? s)
    (try
      (java.util.UUID/fromString s)
      (catch Exception _ nil))))

(defn create-message!
  [{:keys [auth/user-id] :as ctx}
   {:keys [text id discussion_id]}]

  {:pre [(string? text) (uuid? user-id)]}

  (let [now (java.util.Date.)
        msg-id (or (some-> id ->uuid)
                   (random-uuid))
        _ (assert (uuid? msg-id))
        did (mt/-string->uuid discussion_id)
        msg {:db/doc-type :gatz/message
             :db/type :gatz/message
             :xt/id msg-id
             :message/did did
             :message/created_at now
             :message/updated_at now
             :message/user_id user-id
             :message/text text}]
    (biff/submit-tx ctx [msg])
    msg))

(defn messages-by-did [db did]
  (q db '{:find (pull m [*])
          :in [did]
          :where [[m :message/did did]
                  [m :db/type :gatz/message]]}
     did))

;; ====================================================================== 
;; Discussion 

(defn discussion-by-id [db did]
  ;; (def -ctx ctx)
  (let [discussion (first (q db '{:find (pull d [*])
                                  :in [did]
                                  :where [[d :xt/id did]
                                          [d :db/type :gatz/discussion]]}
                             did))
        messages  (messages-by-did db did)]
    (assert discussion)
    {:discussion discussion
     :user-ids (set (map :message/user_id messages))
     :messages messages}))

(defn create-discussion!

  [{:keys [auth/user-id] :as ctx} {:keys [name selected_users]}]

  {:pre [(string? name) (not (empty? name))]}

  (let [now (java.util.Date.)
        did (random-uuid)
        member-uids (keep mt/-string->uuid selected_users)
        d {:db/doc-type :gatz/discussion
           :db/type :gatz/discussion
           :xt/id did
           :discussion/did did
           :discussion/name name
           :discussion/created_by user-id
           :discussion/created_at now
           :discussion/updated_at now
           :discussion/members (conj (set member-uids) user-id)}]
    (biff/submit-tx ctx [d])
    d))

(defn add-member! [ctx p]
  (let [d (discussion-by-id (:biff/db ctx) (:discussion/id p))
        new-d (-> (:discussion d)
                  (assoc :db/doc-type :gatz/discussion)
                  (update :discussion/members conj (:user/id p)))]
    (biff/submit-tx ctx [new-d])))

(defn discussions-by-user-id [db user-id]
  (let [dids (q db '{:find [did]
                     :in [user-id]
                     :where [[did :db/type :gatz/discussion]
                             [did :discussion/members user-id]]}
                user-id)]
    (set (map first dids))))

