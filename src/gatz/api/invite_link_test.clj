(ns gatz.api.invite-link-test
  (:require [clojure.data.json :as json]
            [clojure.set :as set]
            [clojure.test :as t :refer [deftest testing is]]
            [crdt.core :as crdt]
            [com.biffweb :as biff]
            [gatz.api.invite-link :as api.invite-link]
            [gatz.crdt.discussion :as crdt.discussion]
            [gatz.crdt.user :as crdt.user]
            [gatz.db.discussion :as db.discussion]
            [gatz.db :as db]
            [gatz.db.invite-link :as db.invite-link]
            [gatz.db.user :as db.user]
            [gatz.db.util-test :as db.util-test]
            [gatz.db.group :as db.group]
            [gatz.db.contacts :as db.contacts]
            [gatz.db.feed :as db.feed]
            [gatz.flags :as flags]
            [xtdb.api :as xtdb])
  (:import [java.util Date]))

(defn- select-feed-item [feed-item]
  (-> feed-item
      (update :feed/ref :xt/id)
      (select-keys [:feed/ref :feed/feed_type :feed/contact])))

(defn parse-resp [resp]
  (json/read-str (:body resp) {:key-fn keyword}))

(deftest group-invites
  (testing "accepting a group invite link gives you access to the group open posts"
    (flags/with-flags {:flags/global_invites_enabled true
                       :flags/only_users_with_friends_can_invite false}
      (let
       [gid (crdt/random-ulid)
        [uid cid cid2 sid did did2 did3 did4] (take 8 (repeatedly random-uuid))
        _ (println "did" did)
        _ (println "did2" did2)
        now (Date.)
        ctx (db.util-test/test-system)
        node (:biff.xtdb/node ctx)
        get-ctx (fn [uid]
                  (-> ctx
                      (assoc :biff/db (xtdb/db node))
                      (assoc :auth/user-id uid)))]

        (db.user/create-user!
         ctx {:id uid :username "user_id" :phone "+14159499000" :now now})
        (db.user/create-user!
         ctx {:id cid :username "contact" :phone "+14159499001" :now now})
        (db.user/create-user!
         ctx {:id cid2 :username "second_contact" :phone "+14159499003" :now now})
        (db.user/create-user!
         ctx {:id sid :username "stranger" :phone "+14159499002" :now now})
        (xtdb/sync node)

        (db.group/create! ctx
                          {:id gid
                           :owner uid
                           :now now
                           :settings {:discussion/member_mode :discussion.member_mode/open}
                           :name "test" :members #{}})

        (xtdb/sync node)

        (testing "things start empty"
          (let [db (xtdb/db node)
                group (db.group/by-id db gid)
                u-contacts (db.contacts/by-uid db uid)
                c-contacts (db.contacts/by-uid db cid)
                c2-contacts (db.contacts/by-uid db cid2)
                s-contacts (db.contacts/by-uid db sid)]
            (is (= #{uid} (:group/members group)))
            (is (empty? (:contacts/ids u-contacts)))
            (is (empty? (:contacts/ids c-contacts)))
            (is (empty? (:contacts/ids c2-contacts)))
            (is (empty? (:contacts/ids s-contacts)))))

      ;; Create some discussions that should show up as feed items
        (testing "create discussions that should show up as feed items"
         ;; Create a discussion in the group
          (db/create-discussion-with-message!
           (get-ctx uid)
           {:did did
            :text "Test discussion in group"
            :group_id gid
            :to_all_contacts true
            :media_ids []})

          ;; Create a direct message discussion
          (db/create-discussion-with-message!
           (get-ctx uid)
           {:did did2
            :text "Test direct message"
            :to_all_contacts true
            :media_ids []})

          (xtdb/sync node))

        (testing "the discussions are the right open mode"
          (let [db (xtdb/db node)
                d1 (crdt.discussion/->value (db.discussion/by-id db did))
                d2 (crdt.discussion/->value (db.discussion/by-id db did2))]
            (is (= :discussion.member_mode/open (:discussion/member_mode d1)))
            (is (= :discussion.member_mode/open (:discussion/member_mode d2)))))

        (testing "the user makes an invite link"
          (let [params  (db.util-test/json-params {:group_id gid})
                ok-resp (api.invite-link/post-group-invite-link
                         (assoc (get-ctx uid) :params params))
                {:keys [url id]} (parse-resp ok-resp)
                invite-link-id (crdt/parse-ulid id)]

            (is (= 200 (:status ok-resp)))
            (is (string? url))
            (is (crdt/ulid? invite-link-id))

            (xtdb/sync node)

            (testing "the invite link looks like what we expect"
              (let [db (xtdb/db node)
                    il (db.invite-link/by-id db invite-link-id)]
                (is (= invite-link-id (:xt/id il)))
                (is (= gid (:invite_link/group_id il)))))

            (testing "the contact accepts it"
              (let [params  (db.util-test/json-params {:id invite-link-id})
                    ok-resp (api.invite-link/post-join-invite-link (-> (get-ctx cid)
                                                                       (assoc :params params)))]
                (is (= 200 (:status ok-resp)))))

            (xtdb/sync node)

            (testing "they are not contacts"
              (let [db (xtdb/db node)
                    group (db.group/by-id db gid)
                    u-contacts (db.contacts/by-uid db uid)
                    c-contacts (db.contacts/by-uid db cid)
                    c2-contacts (db.contacts/by-uid db cid2)
                    s-contacts (db.contacts/by-uid db sid)]
                (is (= #{uid cid} (:group/members group)))
                (is (= #{} (:contacts/ids u-contacts)))
                (is (= #{} (:contacts/ids c-contacts)))
                (is (empty? (:contacts/ids c2-contacts)))
                (is (empty? (:contacts/ids s-contacts)))

                (testing "Contact should have feed items for the open discussions after accepting invite"
                  (let [feed-items (db.feed/for-user-with-ts db cid)]
                    (is (= [{:feed/ref did
                             :feed/contact uid
                             :feed/feed_type :feed.type/new_post}]
                           (map select-feed-item feed-items)))))))

            (testing "the other makes a discussion before accepting"
              (db/create-discussion-with-message!
               (get-ctx cid2)
               {:did did3
                :text "Test direct message"
                :to_all_contacts true
                :media_ids []})
              (xtdb/sync node)

              (testing "the discussions are the right open mode"
                (let [db (xtdb/db node)
                      d3 (crdt.discussion/->value (db.discussion/by-id db did3))]
                  (is (= :discussion.member_mode/open (:discussion/member_mode d3)))
                  (is (= #{cid2} (:discussion/members d3))))))

            (db/create-discussion-with-message!
             (get-ctx uid)
             {:did did4
              :text "Test but closed discussion in group"
              :group_id gid
              :to_all_contacts false
              :selected_users [cid]
              :media_ids []})

            (testing "the other accepts it"
              (let [params  (json/read-str (json/write-str {:id invite-link-id}) {:key-fn keyword})
                    ok-resp (api.invite-link/post-join-invite-link (-> (get-ctx cid2)
                                                                       (assoc :params params)))]
                (is (= 200 (:status ok-resp)))))

            (testing "nobody is contacts still"
              (let [db (xtdb/db node)
                    group (db.group/by-id db gid)
                    u-contacts (db.contacts/by-uid db uid)
                    c-contacts (db.contacts/by-uid db cid)
                    c2-contacts (db.contacts/by-uid db cid2)
                    s-contacts (db.contacts/by-uid db sid)]
                (is (= #{uid cid cid2} (:group/members group)))
                (is (= #{} (:contacts/ids u-contacts)))
                (is (= #{} (:contacts/ids c-contacts)))
                (is (= #{} (:contacts/ids c2-contacts)))
                (is (empty? (:contacts/ids s-contacts)))

                (testing "and they all have the right feed items"
                  (is (= #{{:feed/ref did
                            :feed/contact uid
                            :feed/feed_type :feed.type/new_post}
                           {:feed/ref did4
                            :feed/contact uid
                            :feed/feed_type :feed.type/new_post}}
                         (set (map select-feed-item (db.feed/for-user-with-ts db cid)))))
                  (is (= #{{:feed/ref did
                            :feed/contact uid
                            :feed/feed_type :feed.type/new_post}
                           {:feed/ref did3
                            :feed/contact cid2
                            :feed/feed_type :feed.type/new_post}}
                         (set (map select-feed-item (db.feed/for-user-with-ts db cid2)))))
                  (is (= #{{:feed/ref did
                            :feed/contact uid
                            :feed/feed_type :feed.type/new_post}
                           {:feed/ref did2
                            :feed/contact uid
                            :feed/feed_type :feed.type/new_post}
                           {:feed/ref did4
                            :feed/contact uid
                            :feed/feed_type :feed.type/new_post}}
                         (set (map select-feed-item (db.feed/for-user-with-ts db uid))))))))

            (xtdb/sync node)
            (.close node)))))))

(deftest get-invite-by-code
  (testing "getting an invite by code"
    (flags/with-flags {:flags/global_invites_enabled true
                       :flags/only_users_with_friends_can_invite false}
      (let [gid (crdt/random-ulid)
            [uid cid] (take 2 (repeatedly random-uuid))
            now (Date.)
            ctx (db.util-test/test-system)
            node (:biff.xtdb/node ctx)
            get-ctx (fn [uid]
                      (-> ctx
                          (assoc :biff/db (xtdb/db node))
                          (assoc :auth/user-id uid)))]

      ;; Create test users
        (db.user/create-user!
         ctx {:id uid :username "user_id" :phone "+14159499000" :now now})
        (db.user/create-user!
         ctx {:id cid :username "contact" :phone "+14159499001" :now now})

      ;; Create a group
        (db.group/create! ctx
                          {:id gid
                           :owner uid
                           :now now
                           :settings {:discussion/member_mode :discussion.member_mode/open}
                           :name "test"
                           :members #{}})

        (xtdb/sync node)

        (testing "creating and retrieving a crew invite link"
          (let [params (db.util-test/json-params {:group_id gid})
                create-resp (api.invite-link/post-crew-invite-link
                             (assoc (get-ctx uid) :params params))
                {:keys [id code]} (parse-resp create-resp)
                get-params (db.util-test/json-params {:code code})
                get-resp (api.invite-link/get-invite-by-code
                          (assoc (get-ctx cid) :params get-params))
                resp-body (parse-resp get-resp)]
            (is (= 200 (:status get-resp)))
            (is (= "crew" (:type resp-body)))
            (is (= id (get-in resp-body [:invite_link :id])))))

        (testing "trying any code gets you an empty response"
          (let [non-existent-code "ABCDEF"
                get-resp (api.invite-link/get-invite-by-code
                          (assoc (get-ctx cid) :params (db.util-test/json-params {:code non-existent-code})))]
            (is (= 200 (:status get-resp)))
            (is (= {} (parse-resp get-resp)))))

        (.close node)))))

(deftest crew-invite-link-reuse
  (testing "reusing existing crew invite links"
    (flags/with-flags {:flags/global_invites_enabled true
                       :flags/only_users_with_friends_can_invite false}
      (let [[uid cid] (take 2 (repeatedly random-uuid))
            now (Date.)
            ctx (db.util-test/test-system)
            node (:biff.xtdb/node ctx)
            get-ctx (fn [uid]
                      (-> ctx
                          (assoc :biff/db (xtdb/db node))
                          (assoc :auth/user-id uid)))]

        ;; Create test users
        (db.user/create-user!
         ctx {:id uid :username "user_id" :phone "+14159499000" :now now})
        (db.user/create-user!
         ctx {:id cid :username "contact" :phone "+14159499001" :now now})

        (xtdb/sync node)

        (testing "first create request creates a new invite link"
          (let [create-resp (api.invite-link/post-crew-invite-link (get-ctx uid))
                {:keys [id code]} (parse-resp create-resp)]
            (is (= 200 (:status create-resp)))
            (is (string? code))

            (xtdb/sync node)

            (testing "second request reuses the same invite link"
              (let [second-resp (api.invite-link/post-crew-invite-link (get-ctx uid))
                    second-result (parse-resp second-resp)]
                (is (= 200 (:status second-resp)))
                (is (= id (:id second-result)))
                (is (= code (:code second-result)))))

            (testing "crew link is returned even when other types of invite links exist"
              (let [gid (crdt/random-ulid)
                    ;; Create a group and a crew invite link with group id
                    group-params (db.util-test/json-params {:group_id gid})
                    _ (db.group/create! ctx
                                        {:id gid
                                         :owner uid
                                         :now now
                                         :settings {:discussion/member_mode :discussion.member_mode/open}
                                         :name "test"
                                         :members #{}})
                    _ (api.invite-link/post-group-invite-link
                       (assoc (get-ctx uid) :params group-params))
                    _ (db.invite-link/create! ctx {:gid gid
                                                   :uid uid
                                                   :type :invite_link/crew})

                    ;; Create a contact invite link
                    _ (db.invite-link/create! ctx {:uid uid :type :invite_link/contact})
                    _ (xtdb/sync node)

                    ;; Get crew invite link
                    crew-resp (api.invite-link/post-crew-invite-link (get-ctx uid))
                    crew-result (parse-resp crew-resp)]
                (is (= 200 (:status crew-resp)))
                (is (= id (:id crew-result)))
                (is (some? (:code crew-result)))))))

        (.close node)))))

(deftest invite-link-expiration-flag
  (testing "invite link expiration controlled by flag"
    (let [[uid cid] (take 2 (repeatedly random-uuid))
          now (Date.)
          past-date (Date. (- (.getTime now) (* 100 24 60 60 1000))) ; 100 days in the past
          ctx (db.util-test/test-system)
          node (:biff.xtdb/node ctx)
          get-ctx (fn [uid]
                    (-> ctx
                        (assoc :biff/db (xtdb/db node))
                        (assoc :auth/user-id uid)))]

      ;; Create test users
      (db.user/create-user!
       ctx {:id uid :username "user_id" :phone "+14159499000" :now now})
      (db.user/create-user!
       ctx {:id cid :username "contact" :phone "+14159499001" :now now})

      (xtdb/sync node)

      ;; Create an expired invite link
      (binding [db.invite-link/*test-current-ts* past-date]
        (db.invite-link/create! ctx {:uid uid :type :invite_link/crew}))

      (xtdb/sync node)

      (testing "with flag enabled, expired links are considered expired"
        (flags/with-flags {:flags/global_invites_enabled true
                           :flags/only_users_with_friends_can_invite false
                           :flags/invite_links_expire true}
          (let [resp (api.invite-link/post-crew-invite-link (get-ctx uid))
                link-data (parse-resp resp)]

          ;; Should create a new link since old one is expired
            (is (= 200 (:status resp)))
            (is (some? (:id link-data)))
            (is (some? (:code link-data))))))

      (xtdb/sync node)

      (testing "with flag disabled, expired links can still be used"
        (let [flags {:flags/global_invites_enabled true
                     :flags/only_users_with_friends_can_invite false
                     :flags/invite_links_expire false}
              existing-invite (db.invite-link/active-crew-invite-by-user (xtdb/db node) uid :flags flags)
              _ (is (some? existing-invite) "Should find an expired link when flag is disabled")

              resp (api.invite-link/post-crew-invite-link (get-ctx uid))
              link-data (parse-resp resp)]

          ;; Should reuse the expired link since expiration is disabled
          (is (= 200 (:status resp)))
          (is (= (str (:xt/id existing-invite)) (:id link-data)))))

      (.close node))))

(deftest invite-notification-test
  (testing "sending notification when invite is accepted"
    (flags/with-flags {:flags/global_invites_enabled true
                       :flags/only_users_with_friends_can_invite false}
      (let [[inviter-id invitee-id] (take 2 (repeatedly random-uuid))
            gid (crdt/random-ulid)
            now (Date.)
            ctx (db.util-test/test-system)
            node (:biff.xtdb/node ctx)
            submit-job-calls (atom [])
            get-ctx (fn [uid]
                      (-> ctx
                          (assoc :biff/db (xtdb/db node))
                          (assoc :auth/user-id uid)))
            create-crew-invite (fn []
                                 (api.invite-link/post-crew-invite-link (get-ctx inviter-id)))
            create-contact-invite (fn []
                                    (api.invite-link/post-contact-invite-link (get-ctx inviter-id)))
            create-group-invite (fn []
                                  (api.invite-link/post-group-invite-link
                                   (assoc (get-ctx inviter-id)
                                          :params (db.util-test/json-params {:group_id gid}))))
            accept-invite-link (fn [id]
                                 (api.invite-link/post-join-invite-link
                                  (assoc (get-ctx invitee-id)
                                         :params (db.util-test/json-params {:id id}))))]

        ;; Create test users
        (db.user/create-user!
         ctx {:id inviter-id :username "inviter" :phone "+14159499000" :now now})
        (db.user/create-user!
         ctx {:id invitee-id :username "invitee" :phone "+14159499001" :now now})

        ;; Configure push tokens and notification settings for the inviter
        (db.user/add-push-token!
         (get-ctx inviter-id)
         {:push-token {:push/expo {:push/service :push/expo
                                   :push/token "test-inviter-push-token"
                                   :push/created_at now}}})

        ;; Enable notifications for the inviter
        (db.user/edit-notifications!
         (get-ctx inviter-id)
         {:settings.notification/overall true
          :settings.notification/friend_accepted true})

        ;; Create a group
        (db.group/create! ctx
                          {:id gid
                           :owner inviter-id
                           :now now
                           :settings {:discussion/member_mode :discussion.member_mode/open}
                           :name "test"
                           :members #{}})

        (xtdb/sync node)

        ;; Test for crew invite
        (testing "notification is sent for crew invite"
          (with-redefs [biff/submit-job (fn [ctx queue-id job]
                                          (swap! submit-job-calls conj [queue-id job]))]
            ;; Create invite
            (let [create-resp (create-crew-invite)
                  {:keys [id]} (parse-resp create-resp)]
              (is (= 200 (:status create-resp)))

              ;; Reset call tracking
              (reset! submit-job-calls [])

              ;; Accept invite
              (let [accept-resp (accept-invite-link id)]
                (is (= 200 (:status accept-resp)))

                ;; Check that notification was sent
                (is (= 1 (count @submit-job-calls)) "Expected one notification to be sent")

                (let [[queue-id job] (first @submit-job-calls)]
                  (is (= :notify/any queue-id) "Notification should be sent to notify/any queue")
                  (is (= 1 (count (:notify/notifications job))) "Should have one notification")

                  (let [notification (first (:notify/notifications job))
                        expected-title (format "%s accepted your invitation" "invitee")
                        expected-body "You're now friends"
                        expected-data {:scope :notify/invite_accepted
                                       :url (format "/contact/%s" invitee-id)}]
                    (is (= (:expo/uid notification) inviter-id) "Notification should be sent to inviter")
                    (is (= "test-inviter-push-token" (:expo/to notification)) "Notification should have the correct push token")
                    (is (= expected-title (:expo/title notification)) "Notification should have the correct title")
                    (is (= expected-body (:expo/body notification)) "Notification should have the correct body")
                    (is (= expected-data (:expo/data notification)) "Notification should have the correct data")))))))

        ;; Test for contact invite
        (testing "notification is sent for contact invite"
          (with-redefs [biff/submit-job (fn [ctx queue-id job]
                                          (swap! submit-job-calls conj [queue-id job]))]
            ;; Create invite
            (let [create-resp (create-contact-invite)
                  {:keys [id]} (parse-resp create-resp)]
              (is (= 200 (:status create-resp)))

              ;; Reset call tracking
              (reset! submit-job-calls [])

              ;; Accept invite
              (let [accept-resp (accept-invite-link id)]
                (is (= 200 (:status accept-resp)))

                ;; Check that notification was sent
                (is (= 1 (count @submit-job-calls)) "Expected one notification to be sent")

                (let [[queue-id job] (first @submit-job-calls)]
                  (is (= :notify/any queue-id) "Notification should be sent to notify/any queue")
                  (is (= 1 (count (:notify/notifications job))) "Should have one notification")

                  (let [notification (first (:notify/notifications job))
                        expected-title (format "%s accepted your invitation" "invitee")
                        expected-body "You're now friends"
                        expected-data {:scope :notify/invite_accepted
                                       :url (format "/contact/%s" invitee-id)}]
                    (is (= (:expo/uid notification) inviter-id) "Notification should be sent to inviter")
                    (is (= "test-inviter-push-token" (:expo/to notification)) "Notification should have the correct push token")
                    (is (= expected-title (:expo/title notification)) "Notification should have the correct title")
                    (is (= expected-body (:expo/body notification)) "Notification should have the correct body")
                    (is (= expected-data (:expo/data notification)) "Notification should have the correct data")))))))

        ;; Test for group invite
        (testing "notification is sent for group invite"
          (with-redefs [biff/submit-job (fn [ctx queue-id job]
                                          (swap! submit-job-calls conj [queue-id job]))]
            ;; Create invite
            (let [create-resp (create-group-invite)
                  {:keys [id]} (parse-resp create-resp)]
              (is (= 200 (:status create-resp)))

              ;; Reset call tracking
              (reset! submit-job-calls [])

              ;; Accept invite
              (let [accept-resp (accept-invite-link id)]
                (is (= 200 (:status accept-resp)))

                ;; Check that notification was sent
                (is (= 1 (count @submit-job-calls)) "Expected one notification to be sent")

                (let [[queue-id job] (first @submit-job-calls)]
                  (is (= :notify/any queue-id) "Notification should be sent to notify/any queue")
                  (is (= 1 (count (:notify/notifications job))) "Should have one notification")

                  (let [notification (first (:notify/notifications job))
                        expected-title (format "%s accepted your invitation" "invitee")
                        expected-body "They've joined your group"
                        expected-data {:scope :notify/invite_accepted
                                       :url (format "/group/%s" gid)}]
                    (is (= (:expo/uid notification) inviter-id) "Notification should be sent to inviter")
                    (is (= "test-inviter-push-token" (:expo/to notification)) "Notification should have the correct push token")
                    (is (= expected-title (:expo/title notification)) "Notification should have the correct title")
                    (is (= expected-body (:expo/body notification)) "Notification should have the correct body")
                    (is (= expected-data (:expo/data notification)) "Notification should have the correct data")))))))

        ;; Test notification settings affect delivery
        (testing "notification is not sent when settings are disabled"
          ;; Disable notifications
          (db.user/edit-notifications!
           (get-ctx inviter-id)
           {:settings.notification/overall false})

          (xtdb/sync node)

          (with-redefs [biff/submit-job (fn [ctx queue-id job]
                                          (swap! submit-job-calls conj [queue-id job]))]
            ;; Create new invite
            (let [create-resp (create-crew-invite)
                  {:keys [id]} (parse-resp create-resp)]

              ;; Reset call tracking
              (reset! submit-job-calls [])

              ;; Accept invite
              (accept-invite-link id)

              ;; Check that no notification was sent because settings are disabled
              (is (empty? @submit-job-calls) "No notification should be sent when settings are disabled"))))

        (.close node)))))

(deftest feed-visibility-rules
  (testing "feed visibility rules when becoming friends"
    (flags/with-flags {:flags/global_invites_enabled true
                       :flags/only_users_with_friends_can_invite false}
      (let [gid (crdt/random-ulid)
            [uid cid cid2 cid3 cid4 sid did1 did2 did3 did4 did5 did6 did7 did8]
            (take 14 (repeatedly random-uuid))
            all-dids (set [did1 did2 did3 did4 did5 did6 did7 did8])
            now (Date.)
            ctx (db.util-test/test-system)
            node (:biff.xtdb/node ctx)
            get-ctx (fn [uid]
                      (-> ctx
                          (assoc :biff/db (xtdb/db node))
                          (assoc :auth/user-id uid)))]

        (db.user/create-user!
         ctx {:id cid :username "myself" :phone "+14159499001" :now now})
        (db.user/create-user!
         ctx {:id uid :username "my_new_friend" :phone "+14159499000" :now now})
        (db.user/create-user!
         ctx {:id cid2 :username "their_friend" :phone "+14159499003" :now now})
        (db.user/create-user!
         ctx {:id cid3 :username "their_second_friend" :phone "+14159499004" :now now})
        (db.user/create-user!
         ctx {:id cid4 :username "their_fof" :phone "+14159499005" :now now})
        (db.user/create-user!
         ctx {:id sid :username "stranger" :phone "+14159499002" :now now})
        (xtdb/sync node)

        (db.contacts/force-contacts! ctx uid cid2)
        (db.contacts/force-contacts! ctx uid cid3)
        (db.contacts/force-contacts! ctx cid3 cid4)
        (db.contacts/force-contacts! ctx cid2 cid4)
      ;; importantly, cid is not friends with uid (to be done during invite)
      ;; and cid is not friends with cid2

      ;; Create a group
        (db.group/create! ctx
                          {:id gid
                           :owner uid
                           :now now
                           :settings {:discussion/member_mode :discussion.member_mode/open}
                           :name "test"
                           :members #{cid2}})

        (xtdb/sync node)

        (testing "create discussions with different visibility rules"

        ;; These should be visible to me:
          (db/create-discussion-with-message!
           (get-ctx uid)
           {:did did1
            :text "Discussion for friends"
            :to_all_contacts true
            :to_all_friends_of_friends false})

          (db/create-discussion-with-message!
           (get-ctx uid)
           {:did did2
            :text "Discussion for friends of friends, from a friend"
            :to_all_contacts true
            :to_all_friends_of_friends true})

          (db/create-discussion-with-message!
           (get-ctx cid2)
           {:did did3
            :text "Discussion for friends of friends, from a friend of friend"
            :to_all_contacts true
            :to_all_friends_of_friends true})

        ;; These shouldn't be visible to me when I am friends with uid
        ;; but they should be visible to me when I am friends with cid

          (db/create-discussion-with-message!
           (get-ctx cid2)
           {:did did4
            :text "Discussion for friends only, from a friend of friend"
            :to_all_contacts true})

        ;; These shouldn't be visible to me ever

          (db/create-discussion-with-message!
           (get-ctx uid)
           {:did did5
            :text "Discussion from a friend, meant to a select group"
            :selected_users [cid2]})

          (db/create-discussion-with-message!
           (get-ctx cid2)
           {:did did6
            :text "Discussion from a friend, meant for a selection"
            :selected_users [uid]})

          (db/create-discussion-with-message!
           (get-ctx uid)
           {:did did7
            :text "Discussion from a friend, in a group"
            :to_all_contacts true
            :group_id gid})

          (db/create-discussion-with-message!
           (get-ctx cid2)
           {:did did8
            :text "Discussion from a friend of friend, in a group"
            :to_all_contacts true
            :group_id gid})

          (xtdb/sync node))

        (testing "we are not friends yet"
          (let [db (xtdb/db node)
                my-contacts (db.contacts/by-uid db cid)
                their-contacts (db.contacts/by-uid db uid)]
            (is (not (contains? (:contacts/ids my-contacts) uid)))
            (is (not (contains? (:contacts/ids their-contacts) cid)))))

        (testing "before becoming friends, no discussions are visible"
          (let [db (xtdb/db node)
                feed-items (db.feed/for-user-with-ts db cid)]
            (is (empty? feed-items))))

        (testing "the discussions are open"
          (let [db (xtdb/db node)]
            (doseq [did [did1 did2 did3 did4 did7 did8]]
              (is (contains? #{:discussion.member_mode/open :discussion.member_mode/friends_of_friends}
                             (:discussion/member_mode
                              (crdt.discussion/->value (db.discussion/by-id db did))))))))

        (testing "they invite me and I accept"
          (let [create-resp (api.invite-link/post-crew-invite-link
                             (assoc (get-ctx uid) :params {}))
                {:keys [id]} (parse-resp create-resp)
                invite-link-id (crdt/parse-ulid id)
                accept-resp (api.invite-link/post-join-invite-link
                             (-> (get-ctx cid)
                                 (assoc :params (db.util-test/json-params {:id invite-link-id}))))]
            (is (= 200 (:status create-resp)))
            (is (= 200 (:status accept-resp)))
            (xtdb/sync node)

            (testing "checking it worked"
              (let [db (xtdb/db node)
                    my-contacts (db.contacts/by-uid db cid)
                    their-contacts (db.contacts/by-uid db uid)]
                (is (contains? (:contacts/ids my-contacts) uid))
                (is (contains? (:contacts/ids their-contacts) cid))))))

        (testing "after we become friends, I have access to many discussions but not all"
          (let [db (xtdb/db node)
                dids-included #{did1 did2 did3}
                dids-excluded (set/difference all-dids dids-included)
                feed-items (db.feed/for-user-with-ts db cid)
                feed-item-refs (->> feed-items
                                    (filter #(= :gatz/discussion (:feed/ref_type %)))
                                    (map (comp :xt/id :feed/ref))
                                    (set))]
            (is (= dids-included feed-item-refs))
            (is (every? #(not (contains? feed-item-refs %)) dids-excluded))

            (doseq [did dids-included]
              (let [d (crdt.discussion/->value (db.discussion/by-id db did))]
                (is (contains? (:discussion/members d) cid))))
            (doseq [did dids-excluded]
              (let [d (crdt.discussion/->value (db.discussion/by-id db did))]
                (is (not (contains? (:discussion/members d) cid)))))))

        (testing "make friends with the second contact"
          (let [params (db.util-test/json-params {:group_id gid})
                create-resp (api.invite-link/post-crew-invite-link
                             (assoc (get-ctx cid) :params params))
                {:keys [id]} (parse-resp create-resp)
                invite-link-id (crdt/parse-ulid id)
                accept-resp (api.invite-link/post-join-invite-link
                             (-> (get-ctx cid2)
                                 (assoc :params (db.util-test/json-params {:id invite-link-id}))))]
            (is (= 200 (:status create-resp)))
            (is (= 200 (:status accept-resp)))
            (xtdb/sync node)))

        (testing "after becoming friends with second contact, verify all discussions are visible"
          (let [db (xtdb/db node)
                feed-items (db.feed/for-user-with-ts db cid)
                feed-item-refs (->> feed-items
                                    (filter #(= :gatz/discussion (:feed/ref_type %)))
                                    (map (comp :xt/id :feed/ref))
                                    (set))
                dids-included #{did1 did2 did3 did4}
                dids-excluded (set/difference all-dids dids-included)]
            (is (= dids-included feed-item-refs))
            (is (every? #(not (contains? feed-item-refs %)) dids-excluded))

            (doseq [did dids-included]
              (let [d (crdt.discussion/->value (db.discussion/by-id db did))]
                (is (contains? (:discussion/members d) cid))))
            (doseq [did dids-excluded]
              (let [d (crdt.discussion/->value (db.discussion/by-id db did))]
                (is (not (contains? (:discussion/members d) cid)))))))

        (xtdb/sync node)))))

