(ns gatz.test
  (:require [clojure.test :refer [deftest is testing]]
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
  (testing "notifications on new messages"
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

      (testing "No notifications when the discussion is created"
        (is (= (:message/user_id message) (:xt/id poster)))
        (is (= (:message/did message) (:xt/id discussion)))
        (is (= 1 (count (:discussion/subscribers discussion))))
        (is (contains? (:discussion/members discussion) (:xt/id commenter)))

        (is (empty? nts1)
            "Only the creator of the discussion is in it and they don't have push notifications set up"))

      (testing "No notifications if the users don't have push notifications set up"
        (let [d2 (db/subscribe! (with-db ctx) (:xt/id commenter) (:xt/id discussion))
              nts2 (notify/notifications-for-comment (xtdb/db node) message)]
          (is (= 2 (count (:discussion/subscribers d2))))
          (is (empty? nts2)
              "The users don't have push notifications set up")))

      ;; TODO: should check that the first message doesn't trigger notifications
      (testing "People subscribed to the discussion get notifications"
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
                 nts4))))

      (testing "The original poster gets notifications when new comments come in"
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
                   nts-for-new-comment))))))))



(deftest daily-notifications
  (testing "When there is no activity, no notifications are sent"
    (let [uid (random-uuid)
          node (new-db-node)
          ctx (->auth-ctx node uid)
          ptoken "POSTER_TOKEN"
          poster (db/create-user! (with-db ctx)
                                  {:id uid
                                   :username "poster"
                                   :phone "+11111111111"})
          cid (random-uuid)
          commenter (db/create-user! (with-db ctx)
                                     {:username "commenter"
                                      :id cid
                                      :phone "+12222222222"})
          ctoken "COMMENTER_TOKEN"
          nts (notify/activity-notification-for-user (xtdb/db node) uid)]
      (is (empty? nts) "No notifications if user doesn't have them set up")
      (db/add-push-token! (with-db ctx)
                          {:user-id (:xt/id poster)
                           :push-token {:push/expo {:push/service :push/expo
                                                    :push/token ptoken
                                                    :push/created_at (java.util.Date.)}}})
      (is (empty? (notify/activity-notification-for-user (xtdb/db node) uid))
          "No notifications when there is no activity")

      (testing "Friends get notifications from your activity"
        (db/create-discussion-with-message!
         (with-db ctx)
         {:name ""
          :selected_users #{(:xt/id commenter)}
          :text "First discussion!"})
        (is (empty? (notify/activity-notification-for-user (xtdb/db node) uid))
            "No notifications for your own activity")
        (is (empty? (notify/activity-notification-for-user (xtdb/db node) cid))
            "Friends dont' get notifications if they haven't set them up")
        (db/add-push-token! (with-db ctx)
                            {:user-id (:xt/id commenter)
                             :push-token {:push/expo {:push/service :push/expo
                                                      :push/token ctoken
                                                      :push/created_at (java.util.Date.)}}})
        (is (= {:expo/to ctoken
                :expo/uid cid
                :expo/title "poster is in gatz"
                ;; TODO: this is an error: we are double counting the first message
                ;; of the discussion as a new post and a new reply
                :expo/body "1 new post, 1 new reply"}
               (notify/activity-notification-for-user (xtdb/db node) cid))
            "Friends get notifications from your activity")

        (db/mark-user-active! (with-db ctx) cid)

        (is (empty? (notify/activity-notification-for-user (xtdb/db node) cid))
            "They don't get notified if they were active after the activity")

        (testing "It includes multiple discussions"
          (db/create-discussion-with-message!
           (with-db ctx)
           {:name ""
            :selected_users #{(:xt/id commenter)}
            :text "Second discussion!"})
          (db/create-discussion-with-message!
           (with-db ctx)
           {:name ""
            :selected_users #{(:xt/id commenter)}
            :text "Third discussion!"})
          (db/create-discussion-with-message!
           (with-db ctx)
           {:name ""
            :selected_users #{(:xt/id commenter)}
            :text "Fourth discussion!"})

          (is (= {:expo/to ctoken
                  :expo/uid cid
                  :expo/title "poster is in gatz"
                ;; TODO: this is an error: we are double counting the first message
                ;; of the discussion as a new post and a new reply
                  :expo/body "3 new posts, 3 new replies"}
                 (notify/activity-notification-for-user (xtdb/db node) cid))
              "Friends get notifications from your activity"))))))