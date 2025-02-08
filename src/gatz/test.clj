(ns gatz.test
  (:gen-class)
  (:require [clojure.test :as test]
            [gatz.system]))

(defn -main [& args]
  (let [test-results (test/run-all-tests #".*-test$")]
    ;; Shutdown any running components
    (when-let [stop-fn (resolve 'gatz.system/stop)]
      (stop-fn))
    ;; Exit with appropriate status code
    (System/exit (if (and
                      (zero? (:fail test-results))
                      (zero? (:error test-results)))
                   0
                   1))))