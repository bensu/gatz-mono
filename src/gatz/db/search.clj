(ns gatz.db.search
  (:require [com.biffweb :as biff :refer [q]]
            [gatz.schema :as schema]))

(def search-result
  [:map
   [:search/did #'schema/DiscussionId]
   [:search/ts inst?]
   [:search/mid #'schema/MessageId]])

(def search-results
  [:vec-of
   [:map
    [:search/did #'schema/DiscussionId]
    [:search/last_ts inst?]
    [:search/results [:vector search-result]]]])

(defn dids-for-uid
  ([db uid text-query]
   (dids-for-uid db uid text-query {}))
  ([db uid text-query {:keys [older-than-ts]}]
   {:pre [(string? text-query) (uuid? uid)
          (or (nil? older-than-ts) (inst? older-than-ts))]}
   (->> (q db {:find '[did created-at mid]
               :in '[text-query uid older-than-ts]
               :order-by '[[created-at :desc]]
               :limit 20
               :where (cond-> '[[(text-search :message/text text-query) [[mid]]]
                                [mid :xt/id]
                                [mid :db/type :gatz/message]
                                [mid :message/did did]
                                [mid :message/deleted_at nil]
                                [did :db/type :gatz/discussion]
                                [did :discussion/members uid]
                                [did :discussion/created_at created-at]]
                        older-than-ts (conj '[(< created-at older-than-ts)]))}
           text-query
           uid
           older-than-ts)
        (map (fn [[did created-at mid]]
               {:search/did did
                :search/mid mid
                :search/ts created-at}))
        (group-by :search/did)
        (map (fn [[did results]]
               {:search/did did
                :search/last_ts (->> results (map :search/ts) sort last)
                :search/results results}))
        (sort-by (fn [{:search/keys [last_ts]}] last_ts))
        vec)))
