(ns gatz.test
  (:gen-class)
  (:require [clojure.test :as test]
            [clojure.tools.namespace.find :as find]
            [clojure.java.classpath :as cp]
            [gatz.system]))

(defn load-all-test-namespaces []
  (doseq [ns-sym (->> (cp/classpath-directories)
                      (mapcat find/find-namespaces-in-dir))]
    (require ns-sym)))

(defn -main [& args]
  (load-all-test-namespaces)
  (let [test-results (test/run-all-tests #"^(ddl|gatz|link-preview|crdt|sdk)\..*")]
    ;; Shutdown any running components
    (when-let [stop-fn (resolve 'gatz.system/stop)]
      (stop-fn))
    ;; Exit with appropriate status code
    (System/exit (if (and
                      (zero? (:fail test-results))
                      (zero? (:error test-results)))
                   0
                   1))))