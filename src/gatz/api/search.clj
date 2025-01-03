(ns gatz.api.search
  (:require [clojure.set :as set]
            [clojure.string :as str]
            [clojure.data.json :as json]
            [gatz.crdt.discussion :as crdt.discussion]
            [gatz.db.search :as db.search]
            [gatz.db :as db]
            [gatz.db.group :as db.group]
            [gatz.db.user :as db.user]
            [sdk.posthog :as posthog]
            [gatz.crdt.user :as crdt.user]))

(defn json-response [body]
  {:status 200
   :headers {"Content-Type" "application/json"}
   :body (json/write-str body)})


(defn parse-search-params [params]
  (if-let [term (:term params)]
    (if (string? term)
      {:term (str/lower-case (str/trim term))}
      {})
    {}))


(defn search-term

  [{:keys [params biff/db auth/user auth/user-id] :as ctx}]

  (posthog/capture! ctx "search.term")

  (if-let [term (:term (parse-search-params params))]
    (let [search-results (->>
                          (db.search/dids-for-uid db user-id term)
                          (sort-by :search/last_ts)
                          (reverse)
                          (take 20))
          blocked-uids (:user/blocked_uids (crdt.user/->value user))
          poster-blocked? (fn [{:keys [discussion]}]
                            (contains? blocked-uids (:discussion/created_by discussion)))

          ds (->> search-results
                  (map (fn [{:keys [search/did]}]
                         (db/discussion-by-id db did)))
                  (remove poster-blocked?))

          ;; What are the groups and users in those discussions?
          groups (->> (keep (comp :discussion/group_id :discussion) ds)
                      (distinct)
                      (mapv (partial db.group/by-id db)))
          users (->> (map :user_ids ds)
                     (reduce set/union)
                     (mapv (partial db.user/by-id db)))]
      ;; TODO: send the results as well 
      (json-response {:discussions (mapv crdt.discussion/->value ds)
                      :users (mapv crdt.user/->value users)
                      :groups groups}))
    (json-response {:discussions [] :users [] :groups []})))

