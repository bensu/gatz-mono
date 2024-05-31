(ns gatz.test
  (:gen-class)
  (:require [clojure.test :as test]
            [crdt.core]
            [gatz.api-test]
            [gatz.api.contacts-test]
            [gatz.api.discussion-test]
            [gatz.api.group-test]
            [gatz.db.contacts-test]
            [gatz.db.discussion-test]
            [gatz.db.group-test]
            [gatz.db.message-test]
            [gatz.db.user-test]
            [gatz.notify-test]
            [gatz.system]))

(defn -main [& args]
  (clojure.test/run-tests
   'crdt.core
   'gatz.api-test
   'gatz.api.contacts-test
   'gatz.api.discussion-test
   'gatz.api.group-test
   'gatz.db.contacts-test
   'gatz.db.discussion-test
   'gatz.db.group-test
   'gatz.db.message-test
   'gatz.db.user-test
   'gatz.notify-test))