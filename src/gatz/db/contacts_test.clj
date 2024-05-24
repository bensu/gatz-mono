(ns gatz.db.contacts-test
  (:require [gatz.db.util-test :as db.util-test :refer [is-equal]]
            [gatz.db.contacts :as db.contacts]
            [gatz.db.user :as db.user]
            [clojure.test :as test :refer [deftest testing is]]
            [xtdb.api :as xtdb])
  (:import [java.util Date]))

(deftest viewing-contact-requests
  (testing "we can query to know what the state of my request is"
    (let [aid (random-uuid)
          bid (random-uuid)
          bs-accepted-request {:contact_request/from bid
                               :contact_request/to aid
                               :contact_request/state :contact_request/accepted}
          bs-pending-request {:contact_request/from bid
                              :contact_request/to aid
                              :contact_request/state :contact_request/requested}
          bs-ignored-request {:contact_request/from bid
                              :contact_request/to aid
                              :contact_request/state :contact_request/ignored}
          bs-removed-request {:contact_request/from aid
                              :contact_request/to bid
                              :contact_request/state :contact_request/removed}]

      (is (= :contact_request/none (db.contacts/state-for nil aid)))
      (is (= :contact_request/none (db.contacts/state-for nil bid)))

      (is (= :contact_request/accepted (db.contacts/state-for bs-accepted-request aid)))
      (is (= :contact_request/accepted (db.contacts/state-for bs-accepted-request bid)))

      (is (true? (db.contacts/can-transition? bs-accepted-request
                                              {:by aid :state :contact_request/removed})))
      (is (true? (db.contacts/can-transition? bs-accepted-request
                                              {:by bid :state :contact_request/removed})))
      (is (false? (db.contacts/can-transition? bs-accepted-request
                                               {:by aid :state :contact_request/ignored})))
      (is (false? (db.contacts/can-transition? bs-accepted-request
                                               {:by bid :state :contact_request/ignored})))
      (is (false? (db.contacts/can-transition? bs-accepted-request
                                               {:by aid :state :contact_request/accepted})))
      (is (false? (db.contacts/can-transition? bs-accepted-request
                                               {:by bid :state :contact_request/accepted})))
      (is (false? (db.contacts/can-transition? bs-accepted-request
                                               {:by aid :state :contact_request/requested})))
      (is (false? (db.contacts/can-transition? bs-accepted-request
                                               {:by bid :state :contact_request/requested})))

      (is (= :contact_request/response_pending_from_viewer
             (db.contacts/state-for bs-pending-request aid)))
      (is (= :contact_request/viewer_awaits_response
             (db.contacts/state-for bs-pending-request bid)))

      (is (false? (db.contacts/can-transition? bs-pending-request
                                               {:by aid :state :contact_request/removed})))
      (is (false? (db.contacts/can-transition? bs-pending-request
                                               {:by bid :state :contact_request/removed})))
      (is (true? (db.contacts/can-transition? bs-pending-request
                                              {:by aid :state :contact_request/ignored})))
      (is (false? (db.contacts/can-transition? bs-pending-request
                                               {:by bid :state :contact_request/ignored})))
      (is (true? (db.contacts/can-transition? bs-pending-request
                                              {:by aid :state :contact_request/accepted})))
      (is (false? (db.contacts/can-transition? bs-pending-request
                                               {:by bid :state :contact_request/accepted})))
      (is (false? (db.contacts/can-transition? bs-pending-request
                                               {:by aid :state :contact_request/requested})))
      (is (false? (db.contacts/can-transition? bs-pending-request
                                               {:by bid :state :contact_request/requested})))

      (is (= :contact_request/viewer_ignored_response
             (db.contacts/state-for bs-ignored-request aid)))
      (is (= :contact_request/viewer_awaits_response
             (db.contacts/state-for bs-ignored-request bid))
          "Even when they've been ignored, it still looks like they await the response")

      (is (true? (db.contacts/can-transition? bs-ignored-request
                                              {:by aid :state :contact_request/removed})))
      (is (true? (db.contacts/can-transition? bs-ignored-request
                                              {:by bid :state :contact_request/removed})))
      (is (false? (db.contacts/can-transition? bs-ignored-request
                                               {:by aid :state :contact_request/ignored})))
      (is (false? (db.contacts/can-transition? bs-ignored-request
                                               {:by bid :state :contact_request/ignored})))
      (is (false? (db.contacts/can-transition? bs-ignored-request
                                               {:by aid :state :contact_request/accepted})))
      (is (false? (db.contacts/can-transition? bs-ignored-request
                                               {:by bid :state :contact_request/accepted})))
      (is (false? (db.contacts/can-transition? bs-ignored-request
                                               {:by aid :state :contact_request/requested})))
      (is (false? (db.contacts/can-transition? bs-ignored-request
                                               {:by bid :state :contact_request/requested})))


      (testing "once a request is removed, we can start from scratch"
        (is (= :contact_request/none (db.contacts/state-for bs-removed-request bid)))
        (is (= :contact_request/none (db.contacts/state-for bs-removed-request aid))))))
  (testing "and we can do the same going through the database"
    (let [aid (random-uuid)
          bid (random-uuid)
          ctx (db.util-test/test-system)
          contact-ks [:contacts/user_id :contacts/ids]
          cr-ks [:contact_request/from :contact_request/to :contact_request/state]
          node (:biff.xtdb/node ctx)]
      (db.user/create-user! ctx {:id aid
                                 :username "viewed"
                                 :phone "+14159499932"})
      (db.user/create-user! ctx {:id bid
                                 :username "viewer"
                                 :phone "+14159499930"})
      (xtdb/sync node)
      (let [db (xtdb/db node)
            b-contacts (db.contacts/by-uid db bid)
            a-contacts (db.contacts/by-uid db aid)
            pending-requests (concat
                              (db.contacts/pending-requests-to db aid)
                              (db.contacts/pending-requests-to db aid))]
        (is-equal {:contacts/ids #{} :contacts/user_id aid}
                  (select-keys a-contacts contact-ks))
        (is-equal {:contacts/ids #{} :contacts/user_id bid}
                  (select-keys b-contacts contact-ks))
        (is (empty? pending-requests)))

      #_(db.contacts/request-contact! ctx {:from aid :to bid})
      (db.contacts/apply-request! (assoc ctx :auth/user-id aid)
                                  {:them bid :action :contact_request/requested})
      (xtdb/sync node)

      (let [db (xtdb/db node)
            b-contacts (db.contacts/by-uid db bid)
            a-contacts (db.contacts/by-uid db aid)
            b-pending-requests (db.contacts/pending-requests-to db bid)
            a-pending-requests (db.contacts/pending-requests-to db aid)]

        (is (empty? a-pending-requests))

        (is (= 1 (count b-pending-requests)))
        (is-equal {:contact_request/from aid
                   :contact_request/to bid
                   :contact_request/state :contact_request/requested}
                  (select-keys (first b-pending-requests) cr-ks))

        (is (empty? (db.contacts/requests-from-to db bid aid)))
        (is-equal (first b-pending-requests)
                  (first (db.contacts/requests-from-to db aid bid)))

        (is-equal {:contacts/ids #{} :contacts/user_id aid}
                  (select-keys a-contacts contact-ks))
        (is-equal {:contacts/ids #{} :contacts/user_id bid}
                  (select-keys b-contacts contact-ks))

        (is (= :contact_request/response_pending_from_viewer
               (db.contacts/state-for (first b-pending-requests) bid)))
        (is (= :contact_request/viewer_awaits_response
               (db.contacts/state-for (first b-pending-requests) aid))))

      (db.contacts/apply-request! (assoc ctx :auth/user-id bid)
                                  {:them aid :action :contact_request/ignored})
      (xtdb/sync node)

      (let [db (xtdb/db node)
            b-contacts (db.contacts/by-uid db bid)
            a-contacts (db.contacts/by-uid db aid)
            ignored-request (first (db.contacts/requests-from-to db aid bid))]

        (is-equal {:contacts/ids #{} :contacts/user_id aid}
                  (select-keys a-contacts contact-ks))
        (is-equal {:contacts/ids #{} :contacts/user_id bid}
                  (select-keys b-contacts contact-ks))

        (is (empty? (db.contacts/pending-requests-to db bid)))
        (is (empty? (db.contacts/pending-requests-to db aid)))

        (is-equal {:contact_request/from aid
                   :contact_request/to bid
                   :contact_request/state :contact_request/ignored}
                  (select-keys ignored-request cr-ks))

        (is (= :contact_request/viewer_awaits_response
               (db.contacts/state-for ignored-request aid)))
        (is (= :contact_request/viewer_ignored_response
               (db.contacts/state-for ignored-request bid))))
      (.close node))))

(deftest basic-flow
  (testing "users start with empty contacts"
    (let [ctx (db.util-test/test-system)
          node (:biff.xtdb/node ctx)
          ks [:contacts/user_id :contacts/ids]
          contact-request-ks [:contact_request/from
                              :contact_request/to
                              :contact_request/state]
          requester-id (random-uuid)
          accepter-id (random-uuid)
          denier-id (random-uuid)]
      (db.user/create-user! ctx {:id requester-id
                                 :username "requester"
                                 :phone "+14159499932"})
      (db.user/create-user! ctx {:id denier-id
                                 :username "denier"
                                 :phone "+14159499930"})
      (db.user/create-user! ctx {:id accepter-id
                                 :username "accepter"
                                 :phone "+14159499931"})
      (xtdb/sync node)

      (testing "which look like what we expect"
        (let [db (xtdb/db node)
              r-contacts (db.contacts/by-uid db requester-id)
              a-contacts (db.contacts/by-uid db accepter-id)
              d-contacts (db.contacts/by-uid db denier-id)]
          (is-equal {:contacts/user_id requester-id
                     :contacts/ids #{}}
                    (select-keys r-contacts ks))
          (is-equal {:contacts/user_id accepter-id
                     :contacts/ids #{}}
                    (select-keys a-contacts ks))
          (is-equal {:contacts/user_id denier-id
                     :contacts/ids #{}}
                    (select-keys d-contacts ks))
          (is (empty? (db.contacts/get-in-common db requester-id accepter-id)))
          (is (empty? (db.contacts/get-in-common db requester-id denier-id)))
          (is (empty? (db.contacts/get-in-common db accepter-id denier-id)))
          (is (empty? (db.contacts/pending-requests-to db requester-id)))
          (is (empty? (db.contacts/pending-requests-to db accepter-id)))
          (is (empty? (db.contacts/pending-requests-to db denier-id)))

          (doall
           (for [from [requester-id accepter-id denier-id]
                 to [requester-id accepter-id denier-id]
                 :when (not= from to)]
             (is (empty? (db.contacts/requests-from-to db from to)))))))
      (testing "somebody can request to be a contact"
        (db.contacts/apply-request! (assoc ctx :auth/user-id requester-id)
                                    {:them accepter-id :action :contact_request/requested})
        (xtdb/sync node)

        (let [db (xtdb/db node)
              r-contacts (db.contacts/by-uid db requester-id)
              a-contacts (db.contacts/by-uid db accepter-id)
              d-contacts (db.contacts/by-uid db denier-id)
              contact-request-ks [:contact_request/from
                                  :contact_request/to
                                  :contact_request/state]
              request-made {:contact_request/from requester-id
                            :contact_request/to accepter-id
                            :contact_request/state :contact_request/requested}
              all-pending-to-a (db.contacts/pending-requests-to db accepter-id)
              r-to-a (first all-pending-to-a)]
          (is-equal {:contacts/user_id requester-id
                     :contacts/ids #{}}
                    (select-keys r-contacts ks))
          (is-equal {:contacts/user_id accepter-id
                     :contacts/ids #{}}
                    (select-keys a-contacts ks))
          (is-equal {:contacts/user_id denier-id
                     :contacts/ids #{}}
                    (select-keys d-contacts ks))

          (is (= 1 (count all-pending-to-a)))

          (is-equal request-made (select-keys r-to-a contact-request-ks))
          (is (= :contact_request/viewer_awaits_response (db.contacts/state-for r-to-a requester-id)))
          (is (= :contact_request/response_pending_from_viewer (db.contacts/state-for r-to-a accepter-id)))

          (is (empty? (db.contacts/get-in-common db requester-id accepter-id)))
          (is (empty? (db.contacts/get-in-common db requester-id denier-id)))
          (is (empty? (db.contacts/get-in-common db accepter-id denier-id)))

          (is (empty? (db.contacts/pending-requests-to db requester-id)))
          (is (empty? (db.contacts/pending-requests-to db denier-id)))

          (doall
           (for [from [accepter-id denier-id]
                 to [requester-id accepter-id denier-id]
                 :when (not= from to)]
             (is (empty? (db.contacts/requests-from-to db from to)))))

          (is (empty? (db.contacts/requests-from-to db requester-id denier-id)))
          (is (= all-pending-to-a (db.contacts/requests-from-to db requester-id accepter-id)))

          (testing "if you retry, you get an error"
            (is (thrown? clojure.lang.ExceptionInfo
                         (db.contacts/apply-request! (assoc ctx :auth/user-id requester-id)
                                                     {:them accepter-id :action :contact_request/requested}))))
          (testing "if _they_ request now, they get an error, they have to approve or ignore"
            (is (thrown? clojure.lang.ExceptionInfo
                         (db.contacts/apply-request! (assoc ctx :auth/user-id accepter-id)
                                                     {:them requester-id :action :contact_request/requested}))))

          (testing "to multiple people"
            (db.contacts/apply-request! (assoc ctx :auth/user-id requester-id)
                                        {:them denier-id :action :contact_request/requested})
            (xtdb/sync node)

            (let [db (xtdb/db node)
                  r-contacts (db.contacts/by-uid db requester-id)
                  d-contacts (db.contacts/by-uid db denier-id)
                  second-request {:contact_request/from requester-id
                                  :contact_request/to denier-id
                                  :contact_request/state :contact_request/requested}
                  denier-pending (db.contacts/pending-requests-to db denier-id)]
              (is-equal {:contacts/user_id requester-id
                         :contacts/ids #{}}
                        (-> r-contacts (select-keys ks)))
              (is-equal {:contacts/user_id denier-id
                         :contacts/ids #{}}
                        (-> d-contacts (select-keys ks)))

              (is (= 1 (count denier-pending)))
              (is (= second-request
                     (select-keys (first denier-pending) contact-request-ks)))

              (is (empty? (db.contacts/pending-requests-to db requester-id)))

              (is (empty? (db.contacts/get-in-common db requester-id accepter-id)))
              (is (empty? (db.contacts/get-in-common db requester-id denier-id)))
              (is (empty? (db.contacts/get-in-common db accepter-id denier-id)))

              (doall
               (for [from [accepter-id denier-id]
                     to [requester-id accepter-id denier-id]
                     :when (not= from to)]
                 (is (empty? (db.contacts/requests-from-to db from to)))))

              (is (= denier-pending (db.contacts/requests-from-to db requester-id denier-id)))
              (is (= all-pending-to-a (db.contacts/requests-from-to db requester-id accepter-id)))))

          (testing "and those requests can be accepted or denied"
            (db.contacts/apply-request! (assoc ctx :auth/user-id accepter-id)
                                        {:them requester-id :action :contact_request/accepted})
            (db.contacts/apply-request! (assoc ctx :auth/user-id denier-id)
                                        {:them requester-id :action :contact_request/ignored})
            (xtdb/sync node)

            (let [db (xtdb/db node)
                  r-contacts (db.contacts/by-uid db requester-id)
                  a-contacts (db.contacts/by-uid db accepter-id)
                  d-contacts (db.contacts/by-uid db denier-id)
                  accepted-req {:contact_request/from requester-id
                                :contact_request/to accepter-id
                                :contact_request/state :contact_request/accepted}
                  ignored-req {:contact_request/from requester-id
                               :contact_request/to denier-id
                               :contact_request/state :contact_request/ignored}]

              (is-equal {:contacts/user_id requester-id :contacts/ids #{accepter-id}}
                        (-> r-contacts (select-keys ks)))
              (is-equal {:contacts/user_id accepter-id :contacts/ids #{requester-id}}
                        (-> a-contacts (select-keys ks)))
              (is-equal {:contacts/user_id denier-id :contacts/ids #{}}
                        (-> d-contacts (select-keys ks)))

              (is (empty? (db.contacts/get-in-common db requester-id accepter-id)))
              (is (empty? (db.contacts/get-in-common db requester-id denier-id)))
              (is (empty? (db.contacts/get-in-common db accepter-id denier-id)))

              (is (empty? (db.contacts/pending-requests-to db requester-id)))
              (is (empty? (db.contacts/pending-requests-to db accepter-id)))
              (is (empty? (db.contacts/pending-requests-to db denier-id)))

              (doall
               (for [from [accepter-id denier-id]
                     to [requester-id accepter-id denier-id]
                     :when (not= from to)]
                 (is (empty? (db.contacts/requests-from-to db from to)))))

              (is-equal accepted-req
                        (-> (db.contacts/requests-from-to db requester-id accepter-id)
                            first
                            (select-keys contact-request-ks)))
              (is-equal ignored-req
                        (-> (db.contacts/requests-from-to db requester-id denier-id)
                            first
                            (select-keys contact-request-ks)))

              (testing "it does nothing if you try again"
                (db.contacts/apply-request! (assoc ctx :auth/user-id accepter-id)
                                            {:them requester-id :action :contact_request/accepted})
                (db.contacts/apply-request! (assoc ctx :auth/user-id denier-id)
                                            {:them requester-id :action :contact_request/ignored})
                (xtdb/sync node)
                (let [db (xtdb/db node)
                      r-contacts (db.contacts/by-uid db requester-id)
                      a-contacts (db.contacts/by-uid db accepter-id)
                      d-contacts (db.contacts/by-uid db denier-id)]
                  (is-equal {:contacts/user_id requester-id :contacts/ids #{accepter-id}}
                            (-> r-contacts (select-keys ks)))
                  (is-equal {:contacts/user_id accepter-id :contacts/ids #{requester-id}}
                            (-> a-contacts (select-keys ks)))
                  (is-equal {:contacts/user_id denier-id :contacts/ids #{}}
                            (-> d-contacts (select-keys ks)))
                  (is-equal accepted-req
                            (-> (db.contacts/requests-from-to db requester-id accepter-id)
                                first
                                (select-keys contact-request-ks)))
                  (is-equal ignored-req
                            (-> (db.contacts/requests-from-to db requester-id denier-id)
                                first
                                (select-keys contact-request-ks)))))

              (testing "it throws an error if you do something different the second time"
                (is (thrown? clojure.lang.ExceptionInfo
                             (db.contacts/apply-request! (assoc ctx :auth/user-id accepter-id)
                                                         {:them requester-id :action :contact_request/ignored})))
                (is (thrown? clojure.lang.ExceptionInfo
                             (db.contacts/apply-request! (assoc ctx :auth/user-id denier-id)
                                                         {:them requester-id :action :contact_request/accepted})))
                (xtdb/sync node)))))

        (testing "Trying the wrong thing throws an error"
          (is (thrown? clojure.lang.ExceptionInfo
                       (db.contacts/apply-request! (assoc ctx :auth/user-id requester-id)
                                                   {:them denier-id :action :contact_request/accepted})))
          (is (thrown? clojure.lang.ExceptionInfo
                       (db.contacts/apply-request! (assoc ctx :auth/user-id requester-id)
                                                   {:them denier-id :action :contact_request/ignored}))))

        (testing "once people have contacts, we can find who they have in common"
          (db.contacts/apply-request! (assoc ctx :auth/user-id denier-id)
                                      {:them accepter-id :action :contact_request/requested})
          (db.contacts/apply-request! (assoc ctx :auth/user-id accepter-id)
                                      {:them denier-id :action :contact_request/accepted})
          (xtdb/sync node)

          (let [db (xtdb/db node)]
            (is (= #{accepter-id} (:contacts/ids (db.contacts/by-uid db requester-id))))
            (is (= #{requester-id denier-id} (:contacts/ids (db.contacts/by-uid db accepter-id))))
            (is (= #{accepter-id} (:contacts/ids (db.contacts/by-uid db denier-id))))
            (is (empty? (db.contacts/get-in-common db requester-id accepter-id)))
            (is (empty? (db.contacts/get-in-common db accepter-id denier-id)))
            (is (= #{accepter-id} (db.contacts/get-in-common db requester-id denier-id)))

            (doall
             (for [from [accepter-id]
                   to [requester-id denier-id]]
               (is (empty? (db.contacts/requests-from-to db from to)))))))
        (testing "and they can remove contacts"
          (db.contacts/apply-request! (assoc ctx :auth/user-id accepter-id)
                                      {:them requester-id
                                       :action :contact_request/removed})
          (xtdb/sync node)

          (let [db (xtdb/db node)
                ks [:contacts/user_id :contacts/ids :contacts/removed]
                r-contacts (db.contacts/by-uid db requester-id)
                a-contacts (db.contacts/by-uid db accepter-id)
                ;; d-contacts (db.contacts/by-uid db denier-id)
                removed-expected {:contact_request/from requester-id
                                  :contact_request/to accepter-id
                                  :contact_request/state :contact_request/removed}
                removed-request (db.contacts/requests-from-to db requester-id accepter-id)]
            (is (= 1 (count removed-request)))
            (is (= :contact_request/none
                   (db.contacts/state-for (first removed-request) requester-id)))
            (is (= :contact_request/none
                   (db.contacts/state-for (first removed-request) accepter-id)))

            (is-equal removed-expected
                      (select-keys (first removed-request) contact-request-ks))

            (is-equal {:contacts/user_id requester-id :contacts/ids #{}}
                      (-> r-contacts (select-keys ks)))
            (is-equal {:contacts/user_id accepter-id :contacts/ids #{denier-id}}
                      (-> a-contacts (select-keys ks)))

            (is (empty? (db.contacts/get-in-common db requester-id accepter-id)))
            (is (empty? (db.contacts/get-in-common db requester-id denier-id)))
            (is (empty? (db.contacts/get-in-common db accepter-id denier-id)))

            (testing "and removing again throws an error"
              (is (thrown? clojure.lang.ExceptionInfo
                           (db.contacts/apply-request! (assoc ctx :auth/user-id accepter-id)
                                                       {:them requester-id
                                                        :action :contact_request/removed}))))))

        (xtdb/sync node))

      (.close node))))

