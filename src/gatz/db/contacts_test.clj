(ns gatz.db.contacts-test
  (:require [gatz.db.util-test :as db.util-test :refer [is-equal]]
            [gatz.db.contacts :as db.contacts]
            [gatz.db.user :as db.user]
            [clojure.test :as test :refer [deftest testing is]]
            [xtdb.api :as xtdb]))

(deftest basic-flow
  (testing "users start with empty contacts"
    (let [ctx (db.util-test/test-system)
          node (:biff.xtdb/node ctx)
          ks [:contacts/user_id :contacts/ids
              :contacts/requests_made :contacts/requests_received
              :contacts/removed]
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
                     :contacts/ids #{}
                     :contacts/removed {}
                     :contacts/requests_made {}
                     :contacts/requests_received {}}
                    (select-keys r-contacts ks))
          (is-equal {:contacts/user_id accepter-id
                     :contacts/ids #{}
                     :contacts/removed {}
                     :contacts/requests_made {}
                     :contacts/requests_received {}}
                    (select-keys a-contacts ks))
          (is-equal {:contacts/user_id denier-id
                     :contacts/ids #{}
                     :contacts/removed {}
                     :contacts/requests_made {}
                     :contacts/requests_received {}}
                    (select-keys d-contacts ks))))
      (testing "somebody can request to be a contact"
        (db.contacts/request-contact! ctx {:from requester-id :to accepter-id})
        (xtdb/sync node)

        (let [db (xtdb/db node)
              r-contacts (db.contacts/by-uid db requester-id)
              a-contacts (db.contacts/by-uid db accepter-id)
              d-contacts (db.contacts/by-uid db denier-id)
              contact-request-ks [:contact_request/from :contact_request/to
                                  :contact_request/decided_at :contact_request/decision]
              request-made {:contact_request/from requester-id
                            :contact_request/to accepter-id
                            :contact_request/decided_at nil
                            :contact_request/decision nil}]
          (is-equal {:contacts/user_id requester-id
                     :contacts/ids #{}
                     :contacts/removed {}
                     :contacts/requests_made {accepter-id request-made}
                     :contacts/requests_received {}}
                    (-> r-contacts
                        (select-keys ks)
                        (update-in [:contacts/requests_made accepter-id]
                                   select-keys contact-request-ks)))
          (is-equal {:contacts/user_id accepter-id
                     :contacts/ids #{}
                     :contacts/removed {}
                     :contacts/requests_made {}
                     :contacts/requests_received {requester-id request-made}}
                    (-> a-contacts
                        (select-keys ks)
                        (update-in [:contacts/requests_received requester-id]
                                   select-keys contact-request-ks)))
          (is-equal {:contacts/user_id denier-id
                     :contacts/ids #{}
                     :contacts/removed {}
                     :contacts/requests_made {}
                     :contacts/requests_received {}}
                    (select-keys d-contacts ks))

          (testing "you can retry and it you get the original result"
            (db.contacts/request-contact! ctx {:from requester-id :to accepter-id})
            (xtdb/sync node)
            (is-equal a-contacts (db.contacts/by-uid db accepter-id))
            (is-equal r-contacts (db.contacts/by-uid db requester-id)))

          (testing "to multiple people"
            (db.contacts/request-contact! ctx {:from requester-id :to denier-id})
            (xtdb/sync node)

            (let [db (xtdb/db node)
                  r-contacts (db.contacts/by-uid db requester-id)
                  d-contacts (db.contacts/by-uid db denier-id)
                  second-request {:contact_request/from requester-id
                                  :contact_request/to denier-id
                                  :contact_request/decided_at nil
                                  :contact_request/decision nil}]
              (is-equal {:contacts/user_id requester-id
                         :contacts/removed {}
                         :contacts/ids #{}
                         :contacts/requests_made {accepter-id request-made
                                                  denier-id second-request}
                         :contacts/requests_received {}}
                        (-> r-contacts
                            (select-keys ks)
                            (update-in [:contacts/requests_made accepter-id]
                                       select-keys contact-request-ks)
                            (update-in [:contacts/requests_made denier-id]
                                       select-keys contact-request-ks)))
              (is-equal {:contacts/user_id denier-id
                         :contacts/removed {}
                         :contacts/ids #{}
                         :contacts/requests_made {}
                         :contacts/requests_received {requester-id second-request}}
                        (-> d-contacts
                            (select-keys ks)
                            (update-in [:contacts/requests_received requester-id]
                                       select-keys contact-request-ks)))))

          (testing "and those requests can be accepted or denied"
            (db.contacts/decide-on-request! ctx {:from requester-id :to accepter-id
                                                 :decision :contact_request/accepted})
            (db.contacts/decide-on-request! ctx {:from requester-id :to denier-id
                                                 :decision :contact_request/ignored})
            (xtdb/sync node)

            (let [db (xtdb/db node)
                  r-contacts (db.contacts/by-uid db requester-id)
                  a-contacts (db.contacts/by-uid db accepter-id)
                  d-contacts (db.contacts/by-uid db denier-id)
                  contact-request-ks [:contact_request/from
                                      :contact_request/to
                                      :contact_request/decision]
                  accepted-req {:contact_request/from requester-id
                                :contact_request/to accepter-id
                                :contact_request/decision :contact_request/accepted}
                  ignored-req {:contact_request/from requester-id
                               :contact_request/to denier-id
                               :contact_request/decision :contact_request/ignored}]
              (is-equal {:contacts/user_id requester-id
                         :contacts/removed {}
                         :contacts/ids #{accepter-id}
                         :contacts/requests_made {accepter-id accepted-req
                                                  denier-id ignored-req}
                         :contacts/requests_received {}}
                        (-> r-contacts
                            (select-keys ks)
                            (update-in [:contacts/requests_made accepter-id]
                                       select-keys contact-request-ks)
                            (update-in [:contacts/requests_made denier-id]
                                       select-keys contact-request-ks)))
              (is-equal {:contacts/user_id accepter-id
                         :contacts/removed {}
                         :contacts/ids #{requester-id}
                         :contacts/requests_made {}
                         :contacts/requests_received {requester-id accepted-req}}
                        (-> a-contacts
                            (select-keys ks)
                            (update-in [:contacts/requests_received requester-id]
                                       select-keys contact-request-ks)))

              (is-equal {:contacts/user_id denier-id
                         :contacts/removed {}
                         :contacts/ids #{}
                         :contacts/requests_made {}
                         :contacts/requests_received {requester-id ignored-req}}
                        (-> d-contacts
                            (select-keys ks)
                            (update-in [:contacts/requests_received requester-id]
                                       select-keys contact-request-ks)))
              (testing "accepting throws an error if you try the opposite"
                (is (thrown? clojure.lang.ExceptionInfo
                             (db.contacts/decide-on-request! ctx {:from requester-id :to accepter-id
                                                                  :decision :contact_request/ignored})))
                (is (thrown? clojure.lang.ExceptionInfo
                             (db.contacts/decide-on-request! ctx {:from requester-id :to denier-id
                                                                  :decision :contact_request/accepted})))
                (xtdb/sync node))
              (testing "accepting does nothing if you try twice"
                (db.contacts/decide-on-request! ctx {:from requester-id :to accepter-id
                                                     :decision :contact_request/accepted})
                (db.contacts/decide-on-request! ctx {:from requester-id :to denier-id
                                                     :decision :contact_request/ignored})
                (xtdb/sync node)
                (let [db (xtdb/db node)
                      r-contacts (db.contacts/by-uid db requester-id)
                      a-contacts (db.contacts/by-uid db accepter-id)
                      d-contacts (db.contacts/by-uid db denier-id)]
                  (is-equal {:contacts/user_id requester-id
                             :contacts/ids #{accepter-id}
                             :contacts/removed {}
                             :contacts/requests_received {}
                             :contacts/requests_made {denier-id ignored-req
                                                      accepter-id accepted-req}}
                            (-> r-contacts
                                (select-keys ks)
                                (update-in [:contacts/requests_made accepter-id]
                                           select-keys contact-request-ks)
                                (update-in [:contacts/requests_made denier-id]
                                           select-keys contact-request-ks)))

                  (is-equal {:contacts/user_id accepter-id
                             :contacts/ids #{requester-id}
                             :contacts/removed {}
                             :contacts/requests_made {}
                             :contacts/requests_received {requester-id accepted-req}}
                            (-> a-contacts
                                (select-keys ks)
                                (update-in [:contacts/requests_received requester-id]
                                           select-keys contact-request-ks)))

                  (is-equal {:contacts/user_id denier-id
                             :contacts/ids #{}
                             :contacts/removed {}
                             :contacts/requests_made {}
                             :contacts/requests_received {requester-id ignored-req}}
                            (-> d-contacts
                                (select-keys ks)
                                (update-in [:contacts/requests_received requester-id]
                                           select-keys contact-request-ks))))))))

        (testing "accepting does nothing if there is nothing to accept"
          (db.contacts/decide-on-request! ctx {:from denier-id :to requester-id
                                               :decision :contact_request/accepted})
          (xtdb/sync node)
          (let [db (xtdb/db node)
                r-contacts (db.contacts/by-uid db requester-id)
                ;; a-contacts (db.contacts/by-uid db accepter-id)
                d-contacts (db.contacts/by-uid db denier-id)
                ks [:contacts/user_id :contacts/ids :contacts/removed]]

            (is-equal {:contacts/user_id requester-id
                       :contacts/ids #{accepter-id}
                       :contacts/removed {}
                       :contacts/requests_received {}}
                      (select-keys r-contacts (conj ks :contacts/requests_received)))

            (is-equal {:contacts/user_id denier-id
                       :contacts/ids #{}
                       :contacts/removed {}
                       :contacts/requests_made {}}
                      (select-keys d-contacts (conj ks :contacts/requests_made)))))
        (testing "and they can remove contacts"
          (db.contacts/remove-contact! ctx {:from requester-id :to accepter-id})
          (xtdb/sync node)

          (let [db (xtdb/db node)
                ks [:contacts/user_id :contacts/ids :contacts/removed]
                removed-ks [:contact_removed/from :contact_removed/to]
                r-contacts (db.contacts/by-uid db requester-id)
                a-contacts (db.contacts/by-uid db accepter-id)
                ;; d-contacts (db.contacts/by-uid db denier-id)
                removed-expected {:contact_removed/from requester-id
                                  :contact_removed/to accepter-id}]
            (is-equal {:contacts/user_id requester-id
                       :contacts/ids #{}
                       :contacts/removed {accepter-id removed-expected}}
                      (-> r-contacts
                          (select-keys ks)
                          (update-in [:contacts/removed accepter-id]
                                     select-keys removed-ks)))
            (is-equal {:contacts/user_id accepter-id
                       :contacts/ids #{}
                       :contacts/removed {requester-id removed-expected}}
                      (-> a-contacts
                          (select-keys ks)
                          (update-in [:contacts/removed requester-id]
                                     select-keys removed-ks)))
            (testing "and removing does nothing if you try twice"
              (db.contacts/remove-contact! ctx {:from requester-id :to accepter-id})
              (xtdb/sync node)
              (let [db-after (xtdb/db node)]
                (is (= r-contacts (db.contacts/by-uid db-after requester-id)))
                (is (= a-contacts (db.contacts/by-uid db-after accepter-id)))))))

        (xtdb/sync node))

      (.close node))))

