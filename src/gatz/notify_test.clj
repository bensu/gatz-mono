(ns gatz.notify-test
  (:require [clojure.test :refer [deftest is testing]]
            [xtdb.api :as xtdb]
            [gatz.db :as db]
            [gatz.db.contacts :as db.contacts]
            [gatz.db.discussion :as db.discussion]
            [gatz.db.message :as db.message]
            [gatz.db.user :as db.user]
            [gatz.db.util-test :as db.util-test :refer [is-equal]]
            [gatz.system]
            [gatz.notify :as notify]
            [gatz.crdt.message :as crdt.message]
            [gatz.crdt.discussion :as crdt.discussion]
            [gatz.crdt.user :as crdt.user])
  (:import [java.util Date]))

(defn ->ctx []
  (db.util-test/test-system))

(defn ->auth-ctx [ctx uid]
  (assoc ctx :auth/user-id uid))

(defn with-db [ctx]
  (assoc ctx :biff/db (xtdb/db (:biff.xtdb/node ctx))))

(deftest notify-on-message
  (testing "notifications on new messages"
    (let [poster-uid (random-uuid)
          commenter-uid (random-uuid)
          lurker-uid (random-uuid)
          ctoken "COMMENTER_TOKEN"
          ptoken "POSTER_TOKEN"
          ctx (->ctx)
          node (:biff.xtdb/node ctx)
          get-ctx (fn [uid] (with-db (->auth-ctx ctx uid)))
          _ (do
              (db.user/create-user! (get-ctx poster-uid)
                                    {:id poster-uid
                                     :username "poster"
                                     :phone "+11111111111"})
              (db.user/create-user! (get-ctx commenter-uid)
                                    {:id commenter-uid
                                     :username "commenter"
                                     :phone "+12222222222"})
              (db.user/create-user! (get-ctx lurker-uid)
                                    {:id lurker-uid
                                     :username "lurker"
                                     :phone "+13333333333"})
              (xtdb/sync node)
              (db.contacts/force-contacts! ctx poster-uid commenter-uid)
              (db.contacts/force-contacts! ctx poster-uid lurker-uid)
              (db.contacts/force-contacts! ctx commenter-uid lurker-uid)
              (xtdb/sync node))
          {:keys [message discussion]} (db/create-discussion-with-message!
                                        (get-ctx poster-uid)
                                        {:name ""
                                         :selected_users #{commenter-uid lurker-uid}
                                         :text "First discussion!"
                                         :media_id nil})
          _ (xtdb/sync node)
          message (crdt.message/->value message)
          discussion (crdt.message/->value discussion)
          did (:xt/id discussion)
          nts1 (notify/notifications-for-comment (xtdb/db node) message)]

      (xtdb/sync node)

      (testing "No notifications when the discussion is created"
        (is (= (:message/user_id message) poster-uid))
        (is (= (:message/did message) (:xt/id discussion)))
        (is (= 1 (count (:discussion/subscribers discussion))))
        (is (contains? (:discussion/members discussion) commenter-uid))

        (is (empty? nts1)
            "Only the creator of the discussion is in it and they don't have push notifications set up"))

      (testing "No notifications if the users don't have push notifications set up"
        (let [d2 (-> (db.discussion/subscribe! (get-ctx commenter-uid)
                                               did
                                               commenter-uid)
                     :discussion
                     crdt.discussion/->value)
              _ (xtdb/sync node)
              nts2 (notify/notifications-for-comment (xtdb/db node) message)]
          (xtdb/sync node)
          (is (= 2 (count (:discussion/subscribers d2))))
          (is (empty? nts2)
              "The users don't have push notifications set up")))

      ;; TODO: should check that the first message doesn't trigger notifications
      (testing "People subscribed with tokens to the discussion get notifications"
        (db.user/add-push-token! (get-ctx commenter-uid)
                                 {:push-token {:push/expo {:push/service :push/expo
                                                           :push/token ctoken
                                                           :push/created_at (Date.)}}})
        (xtdb/sync node)
        (let [db (xtdb/db node)
              nts4 (notify/notifications-for-comment db message)]
          (is (= [{:expo/to ctoken
                   :expo/uid commenter-uid
                   :expo/body "First discussion!"
                   :expo/data {:url (notify/message-url did (:xt/id message))
                               :scope :notify/message
                               :did did
                               :mid (:xt/id message)}
                   :expo/title "poster commented on their post"}]
                 nts4))))

      (testing "The original poster gets notifications when new comments come in"
        (let [new-comment (db/create-message! (get-ctx commenter-uid)
                                              {:text "A comment" :did did})
              nts5 (notify/notifications-for-comment (xtdb/db node) new-comment)]
          (is (empty? nts5) "Poster still doesn't have notifications set up")

          (db.user/add-push-token! (get-ctx poster-uid)
                                   {:push-token {:push/expo {:push/service :push/expo
                                                             :push/token ptoken
                                                             :push/created_at (Date.)}}})
          (xtdb/sync node)

          (let [db (xtdb/db node)
                nts-for-og-post (notify/notifications-for-comment db message)
                nts-for-new-comment (notify/notifications-for-comment db new-comment)]
            (is (= #{commenter-uid} (set (map :expo/uid nts-for-og-post)))
                "Only the commenter gets the notifications for the OG post")
            (is (= [{:expo/to ptoken
                     :expo/uid poster-uid
                     :expo/body "A comment"
                     :expo/data {:url (notify/message-url did (:xt/id new-comment))
                                 :scope :notify/message
                                 :did did
                                 :mid (:xt/id new-comment)}
                     :expo/title "commenter commented on your post"}]
                   nts-for-new-comment)))))
      (testing "The lurker auto subscribes and listens to new comments"
        (db.user/add-push-token! (get-ctx lurker-uid)
                                 {:push-token {:push/expo {:push/service :push/expo
                                                           :push/token "LURKER_TOKEN"
                                                           :push/created_at (Date.)}}})
        (xtdb/sync node)
        (is (= #{poster-uid commenter-uid}
               (:discussion/subscribers (crdt.discussion/->value
                                         (db.discussion/by-id (xtdb/db node) did))))
            "Lurker was not originally subscribed to the discussion")

        (db/create-message! (get-ctx lurker-uid)
                            {:text "A lurker comment" :did did})
        (xtdb/sync node)
        (is (= #{poster-uid commenter-uid lurker-uid}
               (:discussion/subscribers (crdt.discussion/->value
                                         (db.discussion/by-id (xtdb/db node) did))))
            "Lurker auto subscribes to the discussion")))))

(deftest daily-notifications
  (testing "When there is no activity, no notifications are sent"
    (let [uid (random-uuid)
          cid (random-uuid)
          ctx (->ctx)
          node (:biff.xtdb/node ctx)
          get-ctx (fn [uid] (with-db (->auth-ctx ctx uid)))
          ptoken "POSTER_TOKEN"
          ctoken "COMMENTER_TOKEN"]

      (db.user/create-user!
       (get-ctx uid) {:id uid :username "poster" :phone "+11111111111"})
      (db.user/create-user!
       (get-ctx cid) {:id cid :username "commenter" :phone "+12222222222"})
      (db.contacts/force-contacts! ctx uid cid)
      (xtdb/sync node)

      (let [db (xtdb/db node)
            nts (notify/activity-notification-for-user db uid)]
        (is (empty? nts) "No notifications if user doesn't have them set up"))

      (db.user/add-push-token!
       (get-ctx uid)
       {:push-token {:push/expo {:push/service :push/expo
                                 :push/token ptoken
                                 :push/created_at (java.util.Date.)}}})
      (xtdb/sync node)

      (is (empty? (notify/activity-notification-for-user (xtdb/db node) uid))
          "No notifications when there is no activity")

      (testing "Friends get notifications from your activity"
        (db/create-discussion-with-message!
         (get-ctx uid)
         {:name ""
          :selected_users #{cid}
          :text "First discussion!"})
        (xtdb/sync node)

        (let [db (xtdb/db node)]
          (is (empty? (notify/activity-notification-for-user db uid))
              "No notifications for your own activity")
          (is (empty? (notify/activity-notification-for-user db cid))
              "Friends dont' get notifications if they haven't set them up"))

        (db.user/add-push-token! (get-ctx cid)
                                 {:push-token {:push/expo {:push/service :push/expo
                                                           :push/token ctoken
                                                           :push/created_at (java.util.Date.)}}})
        (xtdb/sync node)

        (let [db (xtdb/db node)]
          (is (= {:expo/to ctoken
                  :expo/uid cid
                  :expo/title "poster posted in gatz"
                  :expo/data {:scope :notify/activity :url "/"}
                  ;; TODO: this is an error: we are double counting the first message
                  ;; of the discussion as a new post and a new reply
                  :expo/body "1 new post"}
                 (notify/activity-notification-for-user db cid))
              "Friends get notifications from your activity"))

        (db.user/mark-active! (get-ctx cid))
        (xtdb/sync node)

        (let [db (xtdb/db node)]
          (is (empty? (notify/activity-notification-for-user db cid))
              "They don't get notified if they were active after the activity"))

        (testing "It includes multiple discussions"
          (db/create-discussion-with-message!
           (get-ctx uid)
           {:name ""
            :selected_users #{cid}
            :text "Second discussion!"})
          (db/create-discussion-with-message!
           (get-ctx uid)
           {:name ""
            :selected_users #{cid}
            :text "Third discussion!"})
          (db/create-discussion-with-message!
           (get-ctx uid)
           {:name ""
            :selected_users #{cid}
            :text "Fourth discussion!"})
          (xtdb/sync node)
          (let [db (xtdb/db node)]
            (is (= {:expo/to ctoken
                    :expo/uid cid
                    :expo/title "poster posted in gatz"
                    :expo/data {:scope :notify/activity :url "/"}
                    ;; TODO: this is an error: we are double counting the first message
                    ;; of the discussion as a new post and a new reply
                    :expo/body "3 new posts"}
                   (notify/activity-notification-for-user db cid))
                "Friends get notifications from your activity"))

          (db.user/edit-notifications! (get-ctx cid)
                                       {:settings.notification/activity :settings.notification/none})
          (xtdb/sync node)
          (let [db (xtdb/db node)]
            (is (empty? (notify/activity-notification-for-user db cid))
                "No notifications if you opted out of them")))))))

(deftest reaction-notifications
  (testing "Reactions triggers a notification"
    (let [ctx (->ctx)
          node (:biff.xtdb/node ctx)
          get-ctx (fn [uid] (with-db (->auth-ctx ctx uid)))
          uid (random-uuid)
          cid (random-uuid)
          utoken "USER_TOKEN"
          ctoken "COMMENTER_TOKEN"
          lid (random-uuid)
          lid2 (random-uuid)
          _ (do
              (db.user/create-user!
               (get-ctx uid) {:id uid :username "poster" :phone "+11111111111"})
              (db.user/create-user!
               (get-ctx cid) {:id cid :username "commenter" :phone "+2222222222"})
              (db.user/create-user!
               (get-ctx lid) {:id lid :username "lurker" :phone "+3333333333"})
              (db.user/create-user!
               (get-ctx lid2) {:id lid2 :username "lurker2" :phone "+4444444444"}))

          _ (xtdb/sync node)

          _ (do
              (db.contacts/force-contacts! ctx uid cid)
              (db.contacts/force-contacts! ctx uid lid)
              (db.user/add-push-token!
               (get-ctx uid)
               {:push-token {:push/expo {:push/service :push/expo
                                         :push/token utoken
                                         :push/created_at (java.util.Date.)}}})
              (db.user/add-push-token!
               (get-ctx cid)
               {:push-token {:push/expo {:push/service :push/expo
                                         :push/token ctoken
                                         :push/created_at (java.util.Date.)}}}))

          _ (xtdb/sync node)

          {:keys [discussion message]}
          (db/create-discussion-with-message!
           (get-ctx uid)
           {:name ""
            :selected_users #{uid cid lid}
            :text "First discussion!"})
          post-message message

          _ (xtdb/sync node)

          did (:xt/id discussion)
          message (db/create-message! (get-ctx cid)
                                      {:text "A commenter comment"
                                       :did did})
          mid (:xt/id message)
          url (str "/discussion/" did "/message/" mid)]

      (xtdb/sync node)

      (testing "commenting on the post subscribed us to it"
        (let [db (xtdb/db node)
              d (crdt.discussion/->value (db.discussion/by-id db did))]
          (is (= #{cid uid} (:discussion/subscribers d)))))

      (testing "The commenter's reaction to the main post"
        (let [{:keys [evt message]}
              (db.message/react-to-message!
               (get-ctx cid) {:reaction  "❓" :mid (:xt/id post-message) :did did})
              _ (do
                  (assert message)
                  (assert evt)
                  (xtdb/sync node))
              delta (get-in evt [:evt/data :message.crdt/delta])
              reactions (db.message/flatten-reactions did mid (:message/reactions delta))
              reaction (first reactions)
              db (xtdb/db node)
              d (crdt.discussion/->value (db.discussion/by-id db did))
              nts (notify/on-reaction db d message reaction)]

          (testing "triggers a reaction to the poster"
            (is (= 1 (count nts)))
            (is-equal {:expo/to utoken
                       :expo/uid uid
                       :expo/title "commenter ❓ your post"
                       :expo/body "poster: First discussion!"
                       :expo/data {:url (str "/discussion/" did)
                                   :scope :notify/discussion :did did}}
                      (first nts)))

          (testing "doesn't trigger a notification to the poster if they unsubscribed"
            (db.discussion/unsubscribe! (get-ctx uid) did uid)
            (xtdb/sync node)
            (let [db (xtdb/db node)
                  nts (notify/on-reaction db discussion message reaction)
                  d (crdt.discussion/->value (db.discussion/by-id db did))]
              (is (not (contains? (:discussion/subscribers d) uid)))
              (is (empty? nts))))))

      (testing "The posters reactions to the commenter's comment"
        (let [{:keys [evt message]}
              (db.message/react-to-message!
               (get-ctx uid) {:reaction  "❓" :mid mid :did did})
              _ (assert message)
              _ (assert evt)
              _ (xtdb/sync node)
              delta (get-in evt [:evt/data :message.crdt/delta])
              reactions (db.message/flatten-reactions did mid (:message/reactions delta))
              reaction (first reactions)]

          (testing "triggers a reaction to the commenter"
            (let [db (xtdb/db node)
                  d (crdt.discussion/->value (db.discussion/by-id db did))
                  nts (notify/on-reaction db d message reaction)]
              (is (= 1 (count nts)))
              (is-equal {:expo/to ctoken
                         :expo/uid cid
                         :expo/title "poster ❓ your comment"
                         :expo/body "commenter: A commenter comment"
                         :expo/data {:url url
                                     :scope :notify/message
                                     :did did
                                     :mid (:xt/id message)}}
                        (first nts)))))

        (testing "The commenters' reaction on the commenter's comment doesn't trigger notifications"
          (let [{:keys [evt message]}
                (db.message/react-to-message!
                 (get-ctx cid) {:reaction  "❓" :mid mid :did did})
                _ (assert message)
                _ (assert evt)
                delta (get-in evt [:evt/data :message.crdt/delta])
                reactions (db.message/flatten-reactions did mid (:message/reactions delta))
                reaction (first reactions)
                _ (xtdb/sync node)
                db (xtdb/db node)
                nts (notify/on-reaction db discussion message reaction)]
            (is (empty? nts))))))))

(deftest at-mentions
  (testing "Reactions triggers a notification"
    (let [ctx (->ctx)
          node (:biff.xtdb/node ctx)
          get-ctx (fn [uid] (with-db (->auth-ctx ctx uid)))
          uid (random-uuid)
          cid (random-uuid)
          cid2 (random-uuid)
          utoken "USER_TOKEN"
          ctoken "COMMENTER_TOKEN"
          mtoken "MEMBER_TOKEN"
          lid (random-uuid)
          lid2 (random-uuid)
          _ (do
              (db.user/create-user!
               (get-ctx uid) {:id uid :username "poster" :phone "+11111111111"})
              (db.user/create-user!
               (get-ctx cid) {:id cid :username "commenter" :phone "+2222222222"})
              (db.user/create-user!
               (get-ctx cid2) {:id cid2 :username "member" :phone "+5555555555"})
              (db.user/create-user!
               (get-ctx lid) {:id lid :username "lurker" :phone "+3333333333"})
              (db.user/create-user!
               (get-ctx lid2) {:id lid2 :username "lurker2" :phone "+4444444444"}))

          _ (xtdb/sync node)

          _ (do
              (db.contacts/force-contacts! ctx uid cid)
              (db.contacts/force-contacts! ctx uid cid2)
              (db.contacts/force-contacts! ctx cid cid2)
              (db.contacts/force-contacts! ctx uid lid)
              (db.user/add-push-token!
               (get-ctx uid)
               {:push-token {:push/expo {:push/service :push/expo
                                         :push/token utoken
                                         :push/created_at (java.util.Date.)}}})
              (db.user/add-push-token!
               (get-ctx cid)
               {:push-token {:push/expo {:push/service :push/expo
                                         :push/token ctoken
                                         :push/created_at (java.util.Date.)}}})
              (db.user/add-push-token!
               (get-ctx cid2)
               {:push-token {:push/expo {:push/service :push/expo
                                         :push/token mtoken
                                         :push/created_at (java.util.Date.)}}}))

          _ (xtdb/sync node)

          {:keys [discussion]}
          (db/create-discussion-with-message!
           (get-ctx uid)
           {:name ""
            :selected_users #{uid cid cid2 lid}
            :text "First discussion!"})
          _ (xtdb/sync node)

          did (:xt/id discussion)
          message (db/create-message! (get-ctx cid)
                                      {:text "Commenter at-mentions @member in this message"
                                       :did did})]

      (xtdb/sync node)

      (testing "the message comes with a mention and triggers a notification"
        (let [db (xtdb/db node)
              message (crdt.message/->value message)]
          (is (= #{cid2} (set (keys (:message/mentions message)))))
          (is (= [{:expo/uid cid2
                   :expo/to mtoken
                   :expo/body "Commenter at-mentions @member ..."
                   :expo/data {:url (notify/message-url did (:xt/id message))
                               :scope :notify/message
                               :did did :mid (:xt/id message)}
                   :expo/title "commenter mentioned you in their comment"}]
                 (notify/notifications-for-at-mentions db  message)))
          (is (= [{:expo/uid uid
                   :expo/to utoken
                   :expo/body "Commenter at-mentions @member ..."
                   :expo/data {:url (notify/message-url did (:xt/id message))
                               :scope :notify/message
                               :did did :mid (:xt/id message)}
                   :expo/title "commenter commented on your post"}
                  {:expo/to mtoken
                   :expo/uid cid2
                   :expo/body "Commenter at-mentions @member ..."
                   :expo/title "commenter mentioned you in their comment"
                   :expo/data {:url (notify/message-url did (:xt/id message))
                               :scope :notify/message
                               :did did
                               :mid (:xt/id message)}}]
                 (notify/all-notifications-for-message db message)))))

      (testing "a second mention also triggers a notifiation"
        (let [message (db/create-message! (get-ctx cid)
                                          {:text "Another at-mention for @member"
                                           :did did})
              _ (xtdb/sync node)
              db (xtdb/db node)
              message (crdt.message/->value message)]
          (is (= #{cid2} (set (keys (:message/mentions message)))))
          (is (= [{:expo/uid cid2
                   :expo/to mtoken
                   :expo/body "Another at-mention for @member"
                   :expo/data {:url (notify/message-url did (:xt/id message))
                               :scope :notify/message
                               :did did :mid (:xt/id message)}
                   :expo/title "commenter mentioned you in their comment"}]
                 (notify/notifications-for-at-mentions db message)))
          (is (= [{:expo/uid uid
                   :expo/to utoken
                   :expo/body "Another at-mention for @member"
                   :expo/data {:url (notify/message-url did (:xt/id message))
                               :scope :notify/message
                               :did did :mid (:xt/id message)}
                   :expo/title "commenter commented on your post"}]
                 (notify/notifications-for-comment db message))))))))

(deftest friend-accepted-nts
  (testing "when your friend accepts a request"
    (let [ctx (->ctx)
          node (:biff.xtdb/node ctx)
          get-ctx (fn [uid] (with-db (->auth-ctx ctx uid)))
          [uid cid cid2] (repeatedly 2 random-uuid)
          token "REQUESTER_TOKEN"]

      (db.user/create-user! (get-ctx uid) {:id uid :username "requester" :phone "+11111111111"})
      (db.user/create-user! (get-ctx cid) {:id cid :username "friend" :phone "+2222222222"})
      (db.user/create-user! (get-ctx cid2) {:id cid2 :username "friend2" :phone "+33333333333"})
      (xtdb/sync node)

      (testing "you don't get a ntoification if you don't have notifications on"
        (let [db (xtdb/db node)
              to-user (crdt.user/->value (db.user/by-id db uid))
              new-friend (crdt.user/->value (db.user/by-id db cid))]
          (is (nil? (notify/friend-accepted to-user new-friend)))))

      (db.user/add-push-token! (get-ctx uid)
                               {:push-token {:push/expo {:push/service :push/expo
                                                         :push/token token
                                                         :push/created_at (Date.)}}})
      (xtdb/sync node)

      (testing "you get a notification if you have notifications on"
        (let [db (xtdb/db node)
              to-user (crdt.user/->value (db.user/by-id db uid))
              new-friend (crdt.user/->value (db.user/by-id db cid))]
          (is (= {:expo/to token
                  :expo/uid uid
                  :expo/title "You are now friends with friend"
                  :expo/body "They accepted your request"
                  :expo/data {:scope :notify/friend_accepted
                              :url (str "/contact/" cid)}}
                 (notify/friend-accepted to-user new-friend)))))

      (db.user/edit-notifications! (get-ctx uid) {:settings.notification/friend_accepted false})
      (xtdb/sync node)

      (testing "you don't a notification if you turned off friend accepted notifications"
        (let [db (xtdb/db node)
              to-user (crdt.user/->value (db.user/by-id db uid))
              new-friend (crdt.user/->value (db.user/by-id db cid))]
          (is (nil? (notify/friend-accepted to-user new-friend))))))))


#_(deftest special-reaction-notificactions
    (testing "After 3 special reactions it triggers a notification"

      (let [uid (random-uuid)
            ctx (->ctx)
            node (:biff.xtdb/node ctx)
            get-ctx (fn [uid] (with-db (->auth-ctx ctx uid)))
            poster (db.user/create-user! (get-ctx uid)
                                         {:id uid
                                          :username "poster"
                                          :phone "+11111111111"})
            cid (random-uuid)
            commenter (db.user/create-user! (get-ctx cid)
                                            {:username "commenter"
                                             :id cid
                                             :phone "+12222222222"})
            ctoken "COMMENTER_TOKEN"
            lid (random-uuid)
            lurker (db.user/create-user! (get-ctx lid)
                                         {:username "lurker"
                                          :phone "+13333333333"})

            lid2 (random-uuid)
            lurker2 (db.user/create-user! (get-ctx lid2)
                                          {:username "lurker2"
                                           :phone "+144444444444"})

            _ (xtdb/sync node)

            {:keys [discussion]} (db/create-discussion-with-message!
                                  (get-ctx uid)
                                  {:name ""
                                   :selected_users #{uid}
                                   :text "First discussion!"})
            _ (xtdb/sync node)

            did (:xt/id discussion)
            message (db/create-message! (get-ctx cid)
                                        {:text "A commenter comment"
                                         :did did})
            mid (:xt/id message)]

        (xtdb/sync node)

        (testing "First reaction doesn't trigger notifications"
        ;; Poster reacts
          (let [{:keys [reaction message evt]} (db.message/react-to-message!
                                                (get-ctx uid)
                                                {:reaction  "❓"
                                                 :mid  mid
                                                 :did did})
                _ (xtdb/sync node)
                nts (notify/notification-on-reaction (xtdb/db node) message reaction)]

            (is (empty? nts) "First reaction doesn't trigger notifications")))

        (testing "Second reaction doesn't trigger notifications"
         ;; Lurker
          (let [{:keys [reaction message evt]} (db.message/react-to-message!
                                                (get-ctx lid)
                                                {:reaction "❓"
                                                 :mid  mid
                                                 :did did})

                _ (xtdb/sync node)
                nts (notify/notification-on-reaction (xtdb/db node) message reaction)]
            (is (empty? nts) "Second reaction doesn't trigger notifications")))

        (testing "Third reaction doesn't trigger notifications if it is from the commenter"
         ;; Commenter reacts
          (let [{:keys [reaction message evt]} (db.message/react-to-message!
                                                (get-ctx cid)
                                                {:reaction "❓"
                                                 :mid  mid
                                                 :did did})
                _ (xtdb/sync node)
                nts (notify/notification-on-reaction (xtdb/db node) message reaction)]
            (is (empty? nts) "Second reaction doesn't trigger notifications")))

        (testing "Third reaction does trigger notifications"
         ;; Second lurker reacts
          (let [{:keys [reaction message evt]} (db.message/react-to-message!
                                                (get-ctx lid2)
                                                {:reaction "❓"
                                                 :mid  mid
                                                 :did did})

                _ (xtdb/sync node)
                nts (notify/notification-on-reaction (xtdb/db node) message reaction)]
            (is (empty? nts) "No notifications if the user doesn't have them on")

            (xtdb/sync node)
            (db.user/add-push-token! (get-ctx cid)
                                     cid
                                     {:push-token {:push/expo {:push/service :push/expo
                                                               :push/token ctoken
                                                               :push/created_at (java.util.Date.)}}})

            (xtdb/sync node)

            (let [nts (notify/notification-on-reaction (xtdb/db node) message reaction)]
              (is (= [{:expo/to ctoken :expo/uid cid
                       :expo/title "3 friends are interested in your comment"
                       :expo/body "Consider posting about this topic"
                       :expo/data {:url (str "/discussion/" did "/message/" mid)}}]
                     nts)
                  "No notifications if the user doesn't have them on"))))))

    (testing "After 3 special reactions it triggers a notification, even when they are all different"

      (let [uid (random-uuid)

            ctx (->ctx)
            node (:biff.xtdb/node ctx)
            get-ctx (fn [uid] (with-db (->auth-ctx ctx uid)))

            poster (db.user/create-user! (get-ctx uid)
                                         {:id uid
                                          :username "poster"
                                          :phone "+11111111111"})
            cid (random-uuid)
            commenter (db.user/create-user! (get-ctx cid)
                                            {:id cid
                                             :username "commenter"
                                             :phone "+12222222222"})
            ctoken "COMMENTER_TOKEN"
            lid (random-uuid)
            lurker (db.user/create-user! (get-ctx lid)
                                         {:id lid
                                          :username "lurker"
                                          :phone "+13333333333"})

            lid2 (random-uuid)
            lurker2 (db.user/create-user! (get-ctx lid2)
                                          {:id lid2
                                           :username "lurker2"
                                           :phone "+144444444444"})

            lid3 (random-uuid)
            lurker3 (db.user/create-user! (get-ctx lid3)
                                          {:id lid3
                                           :username "lurker3"
                                           :phone "+144444444445"})

            _ (xtdb/sync node)

            {:keys [discussion]} (db/create-discussion-with-message!
                                  (get-ctx uid)
                                  {:name ""
                                   :selected_users #{uid}
                                   :text "First discussion!"})

            did (:xt/id discussion)
            _ (xtdb/sync node)
            message (db/create-message! (get-ctx cid)
                                        {:text "A commenter comment"
                                         :did did})
            mid (:xt/id message)]

        (xtdb/sync node)

        (testing "First reaction doesn't trigger notifications"
        ;; Poster reacts
          (let [{:keys [reaction message evt]} (db.message/react-to-message!
                                                (get-ctx uid)
                                                {:reaction  "❓"
                                                 :mid  mid
                                                 :did did})

                _ (xtdb/sync node)
                nts (notify/notification-on-reaction (xtdb/db node) message reaction)]

            (is (empty? nts) "First reaction doesn't trigger notifications")))

        (testing "Second reaction doesn't trigger notifications"
         ;; Lurker
          (let [{:keys [reaction message evt]} (db.message/react-to-message!
                                                (get-ctx lid)
                                                {:reaction "❗"
                                                 :mid  mid
                                                 :did did})
                _ (xtdb/sync node)
                nts (notify/notification-on-reaction (xtdb/db node) message reaction)]
            (is (empty? nts) "Second reaction doesn't trigger notifications")))

        (testing "Third reaction doesn't trigger notifications if it is from the commenter"
         ;; Commenter reacts
          (let [{:keys [reaction message evt]} (db.message/react-to-message!
                                                (get-ctx cid)
                                                {:reaction "❓"
                                                 :mid  mid
                                                 :did did})
                _ (xtdb/sync node)
                nts (notify/notification-on-reaction (xtdb/db node) message reaction)]
            (is (empty? nts) "Second reaction doesn't trigger notifications")))

        (testing "Third reaction does trigger notifications"
         ;; Second lurker reacts
          (let [{:keys [reaction message evt]} (db.message/react-to-message!
                                                (get-ctx lid2)
                                                {:reaction "❗"
                                                 :mid  mid
                                                 :did did})
                _ (xtdb/sync node)
                nts (notify/notification-on-reaction (xtdb/db node) message reaction)]
            (is (empty? nts) "No notifications if the user doesn't have them on")

            (db.user/add-push-token! (get-ctx cid) cid
                                     {:push-token {:push/expo {:push/service :push/expo
                                                               :push/token ctoken
                                                               :push/created_at (java.util.Date.)}}})

            (xtdb/sync node)
            (let [nts (notify/notification-on-reaction (xtdb/db node) message reaction)]
              (is (= [{:expo/to ctoken :expo/uid cid
                       :expo/title "3 friends are interested in your comment"
                       :expo/body "Consider posting about this topic"
                       :expo/data {:url (str "/discussion/" did "/message/" mid)}}]
                     nts)
                  "No notifications if the user doesn't have them on"))))

        (testing "Unrelated reactions don't trigger notifications"
         ;; Third lurker reacts
          (let [{:keys [reaction message evt]} (db.message/react-to-message!
                                                (get-ctx lid3)
                                                {:reaction "😭" :mid  mid :did did})
                _ (xtdb/sync node)
                nts (notify/notification-on-reaction (xtdb/db node) message reaction)]
            (is (empty? nts) "No notifications if the user doesn't have them on")))

        (testing "Further reactions don't trigger notifications"
         ;; Third lurker reacts
          (let [{:keys [reaction message evt]} (db.message/react-to-message!
                                                (get-ctx lid3)
                                                {:reaction "❗" :mid  mid :did did})
                _ (xtdb/sync node)
                nts (notify/notification-on-reaction (xtdb/db node) message reaction)]
            (is (empty? nts) "No notifications if the user doesn't have them on"))))))
