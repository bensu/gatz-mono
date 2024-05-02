(ns gatz.db.util)

(defn ->latest-version [raw-data all-migrations]
  ;; TODO: should I handle the unthawable case from
  ;; TODO: what should the version system look like
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
          msg)))))

