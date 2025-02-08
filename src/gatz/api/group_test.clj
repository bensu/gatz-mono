(ns gatz.api.group-test
  (:require [clojure.test :as test :refer [deftest testing is]]
            [clojure.data.json :as json]
            [crdt.core :as crdt]
            [gatz.api.group :as api.group]
            [gatz.api.invite-link :as api.invite-link]
            [gatz.crdt.discussion :as crdt.discussion]
            [gatz.db :as db]
            [gatz.db.discussion :as db.discussion]
            [gatz.db.group :as db.group]
            [gatz.db.invite-link :as db.invite-link]
            [gatz.db.util-test :as db.util-test]
            [gatz.db.user :as db.user]
            [malli.core :as malli]
            [xtdb.api :as xtdb])
  (:import [java.util Date]
           [java.time Duration]))

(deftest params
  (testing "parsing the deltas works"
    (let [json-delta {:name "Name" :description "des" :avatar "avatar"}]
      (is (= {:group/name "Name" :group/description "des" :group/avatar "avatar"}
             (api.group/parse-delta json-delta)))))
  (testing "we can parse the different params"

    (let [gid (crdt/random-ulid)
          uid (random-uuid)
          now (Date.)]

      (doseq [p (json/read-str
                 (json/write-str
                  [{:id gid
                    :action "update-attrs"
                    :delta {:name "test" :description "test" :avatar "test"}}
                   {:id gid
                    :action "add-member"
                    :delta {:members [uid]}}
                   {:id gid
                    :action "remove-member"
                    :delta {:members [uid]}}
                   {:id  gid
                    :action "add-admin"
                    :delta {:admins [uid]}}
                   {:id (str gid)
                    :action "remove-admin"
                    :delta {:admins [uid]}}
                   {:id gid
                    :action "transfer-ownership"
                    :delta {:owner uid}}])
                 {:key-fn keyword})]
        (let [parsed (api.group/parse-request-params p)]
          (is (malli/validate db.group/Action (-> parsed
                                                  (assoc :group/by_uid uid)
                                                  (assoc-in [:group/delta :group/updated_at] now)))))))))

(deftest basic-flow
  (testing "only members can get the group"
    (let [owner (random-uuid)
          non-member (random-uuid)
          ctx (db.util-test/test-system)
          node (:biff.xtdb/node ctx)
          get-ctx (fn [uid]
                    (-> ctx
                        (assoc :biff/db (xtdb/db node))
                        (assoc :auth/user-id uid)))]

      (let [ok-resp (api.group/create! (-> (get-ctx owner)
                                           (assoc :params {:name "Test Group"
                                                           :description nil
                                                           :avatar nil})))
            {:keys [group]} (json/read-str (:body ok-resp) {:key-fn keyword})
            gid (crdt/parse-ulid (:id group))]
        (is (= 200 (:status ok-resp)))
        (is (crdt/ulid? gid))

        (is (= "open" (get-in group [:settings :member_mode])))

        (let [ok-resp (api.group/get-group (-> (get-ctx owner)
                                               (assoc :params {:id (str gid)})))]
          (is (= 200 (:status ok-resp))))
        (let [err-resp (api.group/get-group (-> (get-ctx non-member)
                                                (assoc :params {:id (str gid)})))]
          (is (= 400 (:status err-resp))))))))

(deftest invite-to-group
  (testing "when inviting to a group, they can join open discussions"
    (let [uid (random-uuid)
          cid (random-uuid)
          did (random-uuid)
          did2 (random-uuid)
          gid (crdt/random-ulid)
          public-gid (crdt/random-ulid)
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
      (xtdb/sync node)

      (let [group (db.group/create! ctx
                                    {:id gid :owner uid :now now
                                     :settings {:discussion/member_mode :discussion.member_mode/open}
                                     :name "test" :members #{}})]
        (is (= :discussion.member_mode/open
               (get-in group [:group/settings :discussion/member_mode]))))

      (let [public-group (db.group/create! ctx
                                           {:id public-gid :owner uid :now now
                                            :is_public true
                                            :settings {:discussion/member_mode :discussion.member_mode/open}
                                            :name "public" :members #{}})]
        (is (true? (:group/is_public public-group)))
        (is (= :discussion.member_mode/open
               (get-in public-group [:group/settings :discussion/member_mode]))))

      (xtdb/sync node)
      (db/create-discussion-with-message!
       (get-ctx uid)
       {:did did :group_id gid :to_all_contacts true :text "Open discussion"})
      (db/create-discussion-with-message!
       (get-ctx uid)
       {:did did2 :group_id gid
        :to_all_contacts false
        :selected_users #{}
        :text "Closed discussion"})
      (xtdb/sync node)

      (let [db (xtdb/db node)
            d1 (crdt.discussion/->value (db.discussion/by-id db did))
            d2  (crdt.discussion/->value (db.discussion/by-id db did2))]
        (is (= #{uid} (:discussion/members d1)))
        (is (= :discussion.member_mode/open (:discussion/member_mode d1)))
        (is (= #{uid} (:discussion/members d2)))
        (is (= :discussion.member_mode/closed (:discussion/member_mode d2))))

      (testing "before they join, they can't see the group"
        (let [db (xtdb/db node)
              r (api.group/get-user-groups (get-ctx uid))
              {:keys [groups public_groups]} (json/read-str (:body r) {:key-fn keyword})]
          (is (= #{(str public-gid) (str gid)} (set (map :id groups))))
          (is (= [(str public-gid)] (map :id public_groups))))
        (let [db (xtdb/db node)
              r (api.group/get-user-groups (get-ctx cid))
              {:keys [groups public_groups]} (json/read-str (:body r) {:key-fn keyword})]
          (is (= [] (map :id groups)))
          (is (= [(str public-gid)] (map :id public_groups)))))

      (let [params {:group_id (str gid)}
            ok-resp (api.invite-link/post-group-invite-link
                     (-> (get-ctx uid)
                         (assoc :params params)))
            _ (xtdb/sync node)
            db (xtdb/db node)

            {:keys [url]} (json/read-str (:body ok-resp) {:key-fn keyword})
            invite-link-id (db.invite-link/parse-url url)
            invite-link (db.invite-link/by-id db invite-link-id)]

        (is (= 200 (:status ok-resp)))
        (is (crdt/ulid? invite-link-id))
        (is (some? invite-link))
        (is (= :invite_link/group (:invite_link/type invite-link)))
        (is (= gid (:invite_link/group_id invite-link)))

        (let [params (-> {:id invite-link-id}
                         (json/write-str)
                         (json/read-str {:key-fn keyword}))
              ok-resp (api.invite-link/post-join-invite-link
                       (-> (get-ctx cid) (assoc :params params)))]
          (is (= 200 (:status ok-resp)))))

      (xtdb/sync node)
      (let [db (xtdb/db node)
            d (crdt.discussion/->value (db.discussion/by-id db did))
            d2 (crdt.discussion/->value (db.discussion/by-id db did2))]
        (is (= #{cid uid} (:discussion/members d)))
        (is (= #{uid} (:discussion/members d2))))

      (testing "after they join, they can see the group"
        (let [db (xtdb/db node)
              r (api.group/get-user-groups (get-ctx uid))
              {:keys [groups]} (json/read-str (:body r) {:key-fn keyword})]
          (is (= #{(str public-gid) (str gid)} (set (map :id groups)))))
        (let [db (xtdb/db node)
              r (api.group/get-user-groups (get-ctx cid))
              {:keys [groups]} (json/read-str (:body r) {:key-fn keyword})]
          (is (= [(str gid)] (map :id groups)))))

      (testing "inviting through an expired link fails"
        (let [before-expiry-ts (Date. (+ (.getTime now)
                                         (.toMillis (Duration/ofDays 6))))
              after-expiry-ts (Date. (+ (.getTime now)
                                        (.toMillis (Duration/ofDays 8))))
              params (db.util-test/json-params {:group_id gid})
              ok-resp (api.invite-link/post-group-invite-link
                       (-> (get-ctx uid)
                           (assoc :params params)))
              {:keys [url]} (json/read-str (:body ok-resp) {:key-fn keyword})
              invite-link-id (db.invite-link/parse-url url)]

          (is (= 200 (:status ok-resp)))
          (is (crdt/ulid? invite-link-id))

          (xtdb/sync node)

          ;; Let the link expire
          (binding [db.invite-link/*test-current-ts* after-expiry-ts]
            (let [db (xtdb/db node)
                  il (db.invite-link/by-id db invite-link-id)
                  params  (db.util-test/json-params {:id invite-link-id})
                  ok-resp (api.invite-link/post-join-invite-link (-> (get-ctx cid)
                                                                     (assoc :params params)))]
              (is (db.invite-link/expired? il))
              (is (= 400 (:status ok-resp))))
            (let [params  (db.util-test/json-params {:id invite-link-id})
                  ok-resp (api.invite-link/get-invite-link (-> (get-ctx cid)
                                                               (assoc :params params)))]
              (is (= 400 (:status ok-resp)))))

          (binding [db.invite-link/*test-current-ts* before-expiry-ts]
            (let [db (xtdb/db node)
                  il (db.invite-link/by-id db invite-link-id)
                  params  (db.util-test/json-params {:id invite-link-id})
                  ok-resp (api.invite-link/post-join-invite-link
                           (-> (get-ctx cid)
                               (assoc :params params)))]
              (is (not (db.invite-link/expired? il)))
              (is (= 200 (:status ok-resp)))))))

      (.close node))))
