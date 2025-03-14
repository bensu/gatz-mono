(ns gatz.db.feed-test
  (:require [clojure.test :refer [deftest testing is]]
            [gatz.db.util-test :as db.util-test]
            [gatz.db.feed :as db.feed]
            [gatz.db.user :as db.user]
            [gatz.db.contacts :as db.contacts]
            [gatz.db.invite-link :as db.invite-link]
            [gatz.api.invite-link :as api.invite-link]
            [xtdb.api :as xt])
  (:import [java.util Date]))

(deftest test-new-user-feed-items
  (testing "When a new user joins via invite, inviter's friends get feed items"
    (let [now (Date.)
          inviter-id (random-uuid)
          new-user-id (random-uuid)
          new-user-2-id (random-uuid)
          friend1-id (random-uuid)
          friend2-id (random-uuid)

          ;; Create test system context
          ctx (db.util-test/test-system)
          node (:biff.xtdb/node ctx)
          get-ctx (fn [uid]
                    (assoc ctx
                           :auth/user-id uid
                           :biff/db (xt/db node)))

          ;; Create all users using the existing function
          _ (db.user/create-user! (get-ctx inviter-id)
                                  {:id inviter-id
                                   :username "inviter"
                                   :phone "+14159499000"
                                   :now now})
          _ (db.user/create-user! (get-ctx new-user-id)
                                  {:id new-user-id
                                   :username "new_user"
                                   :phone "+14159499001"
                                   :now now})
          _ (db.user/create-user! (get-ctx new-user-2-id)
                                  {:id new-user-2-id
                                   :username "new_user_2"
                                   :phone "+14159499004"
                                   :now now})
          _ (db.user/create-user! (get-ctx friend1-id)
                                  {:id friend1-id
                                   :username "friend1"
                                   :phone "+14159499002"
                                   :now now})
          _ (db.user/create-user! (get-ctx friend2-id)
                                  {:id friend2-id
                                   :username "friend2"
                                   :phone "+14159499003"
                                   :now now})

          ;; Make inviter friends with friend1 and friend2
          _ (db.contacts/force-contacts! ctx inviter-id friend1-id)
          _ (db.contacts/force-contacts! ctx inviter-id friend2-id)

          ;; Create an invite link from inviter
          invite-link (db.invite-link/create! ctx
                                              {:type :invite_link/contact
                                               :uid inviter-id
                                               :now now})

          crew-invite-link (db.invite-link/create! ctx
                                                   {:type :invite_link/crew
                                                    :uid inviter-id
                                                    :now now})
          _ (xt/sync node)


          ;; Have new-user accept the invite
          _ (api.invite-link/invite-to-contact! (get-ctx new-user-id) invite-link)

          ;; Have new-user-2 accept the crew invite
          _ (api.invite-link/invite-to-crew! (get-ctx new-user-2-id) crew-invite-link)

          _ (xt/sync node)
          db (xt/db node)

          ;; Verify feed items were created correctly
          feed-item-ks [:feed/uids :feed/ref_type :feed/ref :feed/feed_type]
          feed-item1 {:feed/uids #{friend1-id friend2-id}
                      :feed/feed_type :feed.type/new_user_invited_by_friend
                      :feed/ref_type :gatz/user
                      :feed/ref {:xt/id new-user-id}}
          ;; by now new-user-id is already friend of inviter
          ;; so they should also get the next feed item for new-user-2-id
          feed-item2 {:feed/uids #{friend1-id friend2-id new-user-id}
                      :feed/feed_type :feed.type/new_user_invited_by_friend
                      :feed/ref_type :gatz/user
                      :feed/ref {:xt/id new-user-2-id}}]

      ;; Verify users exist and are friends
      (is (= #{friend1-id friend2-id new-user-id new-user-2-id}
             (:contacts/ids (db.contacts/by-uid db inviter-id))))

      (is (= #{feed-item1 feed-item2}
             (set (map (fn [fi]
                         (-> fi
                             (select-keys feed-item-ks)
                             (update :feed/ref #(select-keys % [:xt/id]))))
                       (db.feed/for-user-with-ts db friend1-id)))
             (set (map (fn [fi]
                         (->  fi
                              (select-keys feed-item-ks)
                              (update :feed/ref #(select-keys % [:xt/id]))))
                       (db.feed/for-user-with-ts db friend2-id)))))

      ;; Clean up
      (.close node))))

#_(deftest test-crew-invites
    (testing "When a new user joins via crew invite, inviter's friends get feed items"
      (let [now (Date.)
            inviter-id (random-uuid)
            new-user-id (random-uuid)
            friend1-id (random-uuid)
            friend2-id (random-uuid)

            ctx (db.util-test/test-system)
            node (:biff.xtdb/node ctx)
            get-ctx (fn [uid]
                      (assoc ctx
                             :auth/user-id uid
                             :biff/db (xt/db node)))

          ;; Create all users using the existing function
            _ (db.user/create-user! (get-ctx inviter-id)
                                    {:id inviter-id
                                     :username "inviter"
                                     :phone "+14159499000"
                                     :now now})
            _ (db.user/create-user! (get-ctx new-user-id)
                                    {:id new-user-id
                                     :username "new_user"
                                     :phone "+14159499001"
                                     :now now})
            _ (db.user/create-user! (get-ctx friend1-id)
                                    {:id friend1-id
                                     :username "friend1"
                                     :phone "+14159499002"
                                     :now now})
            _ (db.user/create-user! (get-ctx friend2-id)
                                    {:id friend2-id
                                     :username "friend2"
                                     :phone "+14159499003"
                                     :now now})

          ;; Make inviter friends with friend1 and friend2
            _ (db.contacts/force-contacts! ctx inviter-id friend1-id)
            _ (db.contacts/force-contacts! ctx inviter-id friend2-id)

          ;; Create a crew invite link
            crew-invite-link (db.invite-link/create! ctx
                                                     {:type :invite_link/crew
                                                      :uid inviter-id
                                                      :now now})
            _ (xt/sync node)

          ;; Have new-user-2 accept the crew invite
            new-user-2-id (random-uuid)
            _ (db.user/create-user! (get-ctx new-user-2-id)
                                    {:id new-user-2-id
                                     :username "new_user_2"
                                     :phone "+14159499004"
                                     :now now})

            _ (api.invite-link/invite-to-crew!
               (get-ctx new-user-2-id)
               crew-invite-link)

            _ (xt/sync node)
            db (xt/db node)]

      ;; Verify feed items were created correctly for crew invite
        (let [feed-item-ks [:feed/uids :feed/ref_type :feed/ref :feed/feed_type]
              expected-feed-item {:feed/uids #{friend1-id friend2-id}
                                  :feed/feed_type :feed.type/new_user_invited_by_friend
                                  :feed/ref_type :gatz/user
                                  :feed/ref {:xt/id new-user-2-id}}]
          (is (= expected-feed-item
                 (-> (db.feed/for-user-with-ts db friend1-id)
                     (first)
                     (select-keys feed-item-ks)
                     (update :feed/ref #(select-keys % [:xt/id])))
                 (-> (db.feed/for-user-with-ts db friend2-id)
                     (first)
                     (select-keys feed-item-ks)
                     (update :feed/ref #(select-keys % [:xt/id]))))))

      ;; Clean up
        (.close node))))