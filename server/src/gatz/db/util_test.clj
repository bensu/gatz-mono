(ns gatz.db.util-test
  (:require [gatz.system :as system]
            [clojure.data.json :as json]
            [gatz.flags :as flags]
            [clojure.data] ;; this is necessary for is-equal
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
    (flags/use-flags
     {:biff.xtdb/node node
      :biff/db (xtdb/db node)
      :posthog/enabled? false
      :gatz.site/host "http://localhost:3000"
      :gatz.app/host "http://localhost:3000"
      :gatz.api/host "http://localhost:8080"
      :biff/malli-opts #'gatz.system/malli-opts})))

(defn json-params [m]
  {:pre [(map? m)] :post [(map? %)]}
  (-> m
      (json/write-str)
      (json/read-str {:key-fn keyword})))
