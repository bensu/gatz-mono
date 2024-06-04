(ns gatz.api.discussion-test
  (:require [clojure.test :refer [deftest is testing]]
            [clojure.data.json :as json]
            [crdt.core :as crdt]
            [gatz.api.discussion :as api.discussion])
  (:import [java.util Date]))

(deftest feed-params
  (testing "it can parse the basic params"
    (let [did (random-uuid)]
      (is (= {} (api.discussion/parse-feed-params {})))
      (is (= {:last_did did} (api.discussion/parse-feed-params {:last_did (str did)})))
      (is (= {:last_did nil} (api.discussion/parse-feed-params {:last_did "not a uuid"}))))))

(deftest handle-request-params
  (testing "we can parse add-members"
    (let [t0 (Date.)
          uid (random-uuid)
          clock (crdt/new-hlc uid t0)
          lww-set-delta {uid (crdt/->LWW clock true)}
          delta {:discussion/members #{uid}}
          json-delta (json/read-str (json/write-str delta) {:key-fn keyword})]
      (is (= delta (api.discussion/parse-delta json-delta)))
      (is (= lww-set-delta (crdt/lww-set-delta clock (:discussion/members delta))))
      (is (= {:discussion/members lww-set-delta}
             (api.discussion/delta->crdt clock (api.discussion/parse-delta json-delta)))))))