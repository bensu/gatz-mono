(ns gatz.test
  (:require [clojure.test :as test]
            [gatz.db.user-test]
            [gatz.db.discussion-test]
            [gatz.db.message-test]
            [gatz.notify-test]
            [gatz.api-test]
            [gatz.system]))

(defn -main []
  (clojure.test/run-all-tests))