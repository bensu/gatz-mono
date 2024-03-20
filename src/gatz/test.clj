(ns gatz.test
  (:require [clojure.test :refer [deftest is]]
            [xtdb.api :as xtdb]
            [gatz.db :as db]
            [gatz.system]
            [gatz.notify :as notify]))

(deftest example-test
  (is (= 4 (+ 2 2))))

(defn new-db-node []
  (xtdb/start-node {} #_{:xtdb.kv/db-dir (java.io.File. "data")
                         :xtdb.kv/store 'xtdb.kv.memdb/kv-store}))

(defn ->ctx [node]
  {:biff/malli-opts #'gatz.system/malli-opts
   :biff.xtdb/retry true
   :biff.xtdb/node node})

(defn ->auth-ctx [node uid]
  (assoc (->ctx node) :auth/user-id uid))

(defn with-db [ctx]
  (assoc ctx :biff/db (xtdb/db (:biff.xtdb/node ctx))))

(deftest notify-on-message
  (let [uid (random-uuid)
        node (new-db-node)
        ctx (->auth-ctx node uid)
        poster (db/create-user! (with-db ctx)
                                {:id uid
                                 :username "poster"
                                 :phone "+11111111111"})
        commenter (db/create-user! (with-db ctx)
                                   {:username "commenter"
                                    :phone "+12222222222"})
        {:keys [message discussion]} (db/create-discussion-with-message!
                                      (with-db ctx)
                                      {:name ""
                                       :selected_users #{(:xt/id commenter)}
                                       :text "First discussion!"
                                       :media_id nil})
        did (:xt/id discussion)
        nts1 (notify/notifications-for-comment (xtdb/db node) message)]

    (is (= (:message/user_id message) (:xt/id poster)))
    (is (= (:message/did message) (:xt/id discussion)))
    (is (= 1 (count (:discussion/subscribers discussion))))
    (is (contains? (:discussion/members discussion) (:xt/id commenter)))

    (is (empty? nts1)
        "Only the creator of the discussion is in it and they don't have push notifications set up")

    (let [d2 (db/subscribe! (with-db ctx) (:xt/id commenter) (:xt/id discussion))
          nts2 (notify/notifications-for-comment (xtdb/db node) message)]
      (is (= 2 (count (:discussion/subscribers d2))))
      (is (empty? nts2)
          "The users don't have push notifications set up"))

    (let [ctoken "COMMENTER_TOKEN"
          commenter (db/add-push-token! (with-db ctx)
                                        {:user-id (:xt/id commenter)
                                         :push-token {:push/expo {:push/service :push/expo
                                                                  :push/token ctoken
                                                                  :push/created_at (java.util.Date.)}}})
          nts4 (notify/notifications-for-comment (xtdb/db node) message)]
      (is (= [{:expo/uid (:xt/id commenter)
               :expo/to ctoken
               :expo/body "First discussion!"
               :expo/data {:url (str "/discussion/" did)}
               :expo/title "poster commented on their own post"}]
             nts4)))

    (let [new-comment (db/create-message! (with-db (->auth-ctx node (:xt/id commenter)))
                                          {:text "A comment"
                                           :did did})
          nts5 (notify/notifications-for-comment (xtdb/db node) new-comment)]
      (is (empty? nts5) "Poster still doesn't have notifications set up")

      (let [ptoken "POSTER_TOKEN"
            _poster (db/add-push-token! (with-db ctx)
                                        {:user-id (:xt/id poster)
                                         :push-token {:push/expo {:push/service :push/expo
                                                                  :push/token ptoken
                                                                  :push/created_at (java.util.Date.)}}})
            nts-for-og-post (notify/notifications-for-comment (xtdb/db node) message)
            nts-for-new-comment (notify/notifications-for-comment (xtdb/db node) new-comment)]
        (is (= #{(:xt/id commenter)} (set (map :expo/uid nts-for-og-post))) "Only the commenter gets the notifications for the OG post")
        (is (= [{:expo/uid (:xt/id poster)
                 :expo/to ptoken
                 :expo/body "A comment"
                 :expo/data {:url (str "/discussion/" did)}
                 :expo/title "commenter commented on your post"}]
               nts-for-new-comment))))))


