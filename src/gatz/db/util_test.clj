(ns gatz.db.util-test
  (:require [gatz.system :as system]
            [com.biffweb.impl.xtdb :as biff.xtdb]
            [xtdb.api :as xtdb]))

(defmacro is-equal [a b]
  `(clojure.test/is (= ~a ~b)
                    (pr-str (clojure.data/diff ~a ~b))))

(defn test-node  []
  (xtdb/start-node
   {:xtdb/index-store {:kv-store {:xtdb/module 'xtdb.mem-kv/->kv-store}}
    :xtdb/tx-log {:kv-store {:xtdb/module 'xtdb.mem-kv/->kv-store}}
    :xtdb/document-store {:kv-store {:xtdb/module 'xtdb.mem-kv/->kv-store}}}))

(defn test-system []
  (let [node (test-node)]
    (biff.xtdb/save-tx-fns! node system/tx-fns)
    (xtdb/sync node)
    {:biff.xtdb/node node
     :biff/db (xtdb/db node)
     :biff/malli-opts #'gatz.system/malli-opts}))

