(ns gatz.api.discussion-test
  (:require [clojure.test :refer [deftest is testing]]
            [gatz.api.discussion :as api.discussion]))

(deftest feed-params
  (testing "it can parse the basic params"
    (let [did (random-uuid)]
      (is (= {} (api.discussion/parse-feed-params {})))
      (is (= {:last_did did} (api.discussion/parse-feed-params {:last_did (str did)})))
      (is (= {:last_did nil} (api.discussion/parse-feed-params {:last_did "not a uuid"}))))))