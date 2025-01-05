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

(defn dids-for-uid [db uid text-query]
  {:pre [(string? text-query) (uuid? uid)]}
  (->> (q db '{:find [did mid created-at]
               :in [text-query uid]
               :order-by [[created-at :desc]]
               :where [[(text-search :message/text text-query) [[mid]]]
                       [mid :xt/id]
                       [mid :db/type :gatz/message]
                       [mid :message/did did]
                       [mid :message/created_at created-at]
                       [mid :message/deleted_at nil]
                       [did :db/type :gatz/discussion]
                       [did :discussion/members uid]]}
          text-query
          uid)
       (map (fn [[did mid created-at]]
              {:search/did did
               :search/mid mid
               :search/ts created-at}))
       (group-by :search/did)
       (map (fn [[did results]]
              {:search/did did
               :search/last_ts (->> results (map :search/ts) sort last)
               :search/results results}))
       (sort-by (fn [{:search/keys [last_ts]}] last_ts))
       vec))
