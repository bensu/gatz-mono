(ns gatz.db.util
  (:require [xtdb.api :as xtdb]))

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
    (com.biffweb.impl.xtdb/save-tx-fns! node (var-get #'gatz.system/tx-fns))
    {:biff.xtdb/node node
     :biff/db (xtdb/db node)
     :biff/malli-opts #'gatz.system/malli-opts}))

(defn  ->latest-version [raw-data all-migrations]
  ;; TODO: should I handle the unthawable case from
  ;; TODO: what should the version system look like
  (when raw-data
    (let [last-version (count all-migrations)
          original-version (or (:db/version raw-data) 0)]
      (if (= original-version last-version)
        raw-data ;; already up to date, no migrations needed
        (loop [migrations (subvec all-migrations original-version last-version)
               msg (assoc raw-data :db/version original-version)]
          (if-let [migration (first migrations)]
            (let [{:keys [from to transform]} migration]
              (assert (= from (:db/version msg))
                      "Applying migration to the wrong version")
              (recur (rest migrations)
                     (-> (transform msg)
                         (assoc :db/version to))))
            msg))))))

