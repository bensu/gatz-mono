(ns gatz.crdt.message
  (:require [clojure.string :as str]
            [clojure.test :refer [deftest testing is]]
            [crdt.core :as crdt]
            [gatz.schema :as schema]
            [malli.core :as malli]
            [medley.core :refer [map-vals filter-vals]]
            #?(:clj [taoensso.nippy :as nippy])
            #?(:clj [juxt.clojars-mirrors.nippy.v3v1v1.taoensso.nippy :as juxt-nippy]))
  (:import [java.util Date]))


(def -npr-link-preview-mock
  #:link_preview{:host "npr.org",
                 :images
                 [#:link_preview{:uri
                                 #java/uri "https://npr.brightspotcdn.com/dims3/default/strip/false/crop/5256x2957+0+230/resize/1400/quality/100/format/jpeg/?url=http%3A%2F%2Fnpr-brightspot.s3.amazonaws.com%2F72%2Fa2%2Ff38f61084615b22753610cf023ee%2Fimg-2072-edit.jpg",
                                 :width nil,
                                 :height nil}],
                 :media_type "article",
                 :title
                 "NPR shopped at Walmart to track how inflation is changing prices : NPR",
                 :favicons
                 #{#java/uri "https://media.npr.org/chrome/favicon/favicon-180x180.png"
                   #java/uri "https://media.npr.org/chrome/favicon/favicon.ico"
                   #java/uri "https://media.npr.org/chrome/favicon/favicon-16x16.png"
                   #java/uri "https://media.npr.org/chrome/favicon/favicon-48x48.png"
                   #java/uri "https://media.npr.org/chrome/favicon/favicon-32x32.png"
                   #java/uri "https://media.npr.org/chrome/favicon/favicon-96x96.png"},
                 :description
                 "NPR has tracked the prices of dozens of items at the same superstore in Georgia, including eggs, T-shirts, snacks and paper towels. Here's what got cheaper over the past year, and more expensive.",
                 :site_name "NPR",
                 :videos [],
                 :uri #java/uri "https://npr.org"})

(def -economist-link-preview-mock
  #:link_preview{:host "economist.com",
                 :images
                 [#:link_preview{:uri
                                 #java/uri "https://www.economist.com/interactive/1843/2025/01/14/the-burned-and-the-saved-what-the-la-fires-spared/promo.jpg",
                                 :width nil,
                                 :height nil}],
                 :media_type "article",
                 :title
                 "The burned and the saved: what the LA fires spared | The Economist",
                 :favicons
                 #{#java/uri "https://www.economist.com/interactive/ico/touch-icon-167x167.png"
                   #java/uri "https://www.economist.com/interactive/ico/touch-icon-120x120.png"
                   #java/uri "https://www.economist.com/interactive/ico/touch-icon-152x152.png"
                   #java/uri "https://www.economist.com/interactive/ico/touch-icon-180x180.png"
                   #java/uri "https://www.economist.com/interactive/favicon.ico"},
                 :description
                 "As two fires continue to blaze, some pockets of the city contain both rubble and relics",
                 :site_name "The Economist",
                 :videos [],
                 :uri #java/uri "https://economist.com"})

(def message-defaults
  {:message/media nil
   :message/reply_to nil
   :message/deleted_at nil
   :message/edits []
   :message/mentions {}
   :message/flagged_uids (crdt/lww-set)
   :message/reactions {}
   :message/link_previews [-npr-link-preview-mock -economist-link-preview-mock]
   :message/posted_as_discussion []})

(def final-keys
  [:xt/id
   :message/did
   :message/user_id
   :message/reply_to
   :message/media
   ;; :message/mentions
   :message/created_at])

(defn new-message
  [{:keys [uid mid did text media reply_to mentions]}
   {:keys [now cid clock]}]
  {:pre [(inst? now)
         (or (uuid? cid) (some? clock))
         (uuid? uid) (uuid? mid) (uuid? did)
         (string? text)]}
  (let [clock (or clock (crdt/new-hlc cid now))
        mentions (or mentions [])
        msg-mentions (zipmap (map :mention/to_uid mentions)
                             (map (partial crdt/lww clock) mentions))]
    {:xt/id mid
     :db/type :gatz/message
     :db/version 2
     :crdt/clock clock
     :message/did did
     :message/user_id uid
     :message/reply_to reply_to
     :message/media media
     :message/created_at now
     :message/flagged_uids (crdt/lww-set)
     :message/deleted_at #crdt/min-wins nil
     :message/updated_at (crdt/->MaxWins now)
     :message/posted_as_discussion #crdt/gos #{}
     :message/edits (crdt/->GrowOnlySet #{{:message/text text
                                           :message/edited_at now}})
     :message/mentions msg-mentions
     :message/text (crdt/->LWW clock text)
     ;; TODO: add link previews
     :message/reactions {}}))

(deftest crdt-messages
  (let [[did mid uid cid uid2] (repeatedly 5 random-uuid)
        t0 (Date.)
        c0 (crdt/new-hlc cid t0)
        tick! (let [clock (atom c0)]
                (fn
                  ([] (swap! clock crdt/-increment t0))
                  ([ts] (swap! clock crdt/-increment ts))))
        now (Date.)
        text "0"
        mention-id (crdt/rand-uuid)
        mention {:xt/id mention-id
                 :db/type :gatz/mention
                 :db/version 1
                 :mention/to_uid uid
                 :mention/by_uid uid2
                 :mention/mid mid
                 :mention/did did
                 :mention/ts now}
        mention-id2 (crdt/rand-uuid)
        mention2 {:xt/id mention-id2
                  :db/type :gatz/mention
                  :db/version 1
                  :mention/to_uid uid2
                  :mention/by_uid uid
                  :mention/mid mid
                  :mention/did did
                  :mention/ts now}
        msg (new-message {:uid uid
                          :mid mid
                          :did did
                          :text text
                          :media nil
                          :mentions [mention]
                          :reply_to nil}
                         {:cid cid :now t0})
        [c1 c2 c3 c4 c5 c6 c7 c8 c9 c10 c11 c12 c13]
        (repeatedly 14 tick!)
        deltas [{:crdt/clock c1
                 :message/text (crdt/->LWW c1 "1")
                 :message/edits {:message/text "1" :message/edited_at (Date.)}
                 :message/updated_at (Date.)}
                {:crdt/clock c2
                 :message/text (crdt/->LWW c2 "2")
                 :message/updated_at (Date.)
                 :message/edits {:message/text "2" :message/edited_at (Date.)}}
                {:crdt/clock c3
                 :message/text (crdt/->LWW c3 "3")
                 :message/updated_at (Date.)
                 :message/edits {:message/text "3" :message/edited_at (Date.)}}
                {:crdt/clock c4
                 :message/posted_as_discussion (random-uuid)
                 :message/updated_at (Date.)}
                {:crdt/clock c5
                 :message/posted_as_discussion (random-uuid)
                 :message/updated_at (Date.)}
                {:crdt/clock c6
                 :message/reactions {uid {"like" (crdt/->LWW c6 now)}}}
                {:crdt/clock c7
                 :message/reactions {uid {"dislike" (crdt/->LWW c7 now)}}}
                {:crdt/clock c8
                 :message/reactions {uid {"dislike" (crdt/->LWW c8 nil)}}}
                {:crdt/clock c9
                 :message/reactions {uid2 {"like" (crdt/->LWW c9 now)}}}
                {:crdt/clock c10
                 :message/deleted_at (Date.)
                 :message/updated_at (Date.)}
                {:crdt/clock c11
                 :message/mentions {uid (crdt/lww c11 mention)}
                 :message/updated_at (Date.)}
                {:crdt/clock c12
                 :message/mentions {uid2 (crdt/lww c12 mention2)}
                 :message/updated_at (Date.)}
                {:crdt/clock c13
                 :message/mentions {uid2 (crdt/lww c13 nil)}
                 :message/updated_at (Date.)}]
        final (reduce crdt/-apply-delta msg (shuffle deltas))
        final-value (crdt/-value final)]

    (testing "lww works as expected with nil"
      (let [deltas [(crdt/lww c12 mention)
                    (crdt/lww c13 nil)]
            final (reduce crdt/-apply-delta (crdt/lww c10 "initial") (shuffle deltas))]
        (is (nil? (crdt/-value final)))))

    (testing "it conforms to the schemas"
      (is (malli/validate schema/MessageCRDT msg)
          (malli/explain schema/MessageCRDT msg))
      (is (malli/validate schema/Message (crdt/-value msg))
          (malli/explain schema/Message (crdt/-value msg)))
      (is (malli/validate schema/MessageCRDT final)
          (vec (:errors (malli/explain schema/MessageCRDT final))))
      (is (malli/validate schema/Message final-value)
          (vec (:errors (malli/explain schema/MessageCRDT final)))))

    #?(:clj
       (testing "messages can be freezed and thawed"
         (is (= msg (nippy/thaw (nippy/freeze msg))))
         (is (= final (nippy/thaw (nippy/freeze final))))
         (is (= msg (juxt-nippy/thaw (juxt-nippy/freeze msg))))
         (is (= final (juxt-nippy/thaw (juxt-nippy/freeze final))))))

    (testing "message deltas are idempotent"
      (let [second-final (->> (concat deltas deltas)
                              (shuffle)
                              (reduce crdt/-apply-delta msg))]
        (is (= final second-final))))

    (testing "message converges to what we expect"
      (is (= (select-keys (crdt/-value msg) final-keys)
             (select-keys final-value final-keys)))

      (is (= {uid mention uid2 nil}
             (:message/mentions final-value)))

      (is (= (:message/deleted_at final-value)
             (first (keep :message/deleted_at deltas))))

      (is (= 2 (count (:message/posted_as_discussion final-value))))

      (is (= "3" (:message/text final-value)))

      (is (= #{"0" "1" "2" "3"}
             (set (map :message/text (:message/edits final-value)))))

      (is (= {uid {"like" now "dislike" nil} uid2 {"like" now}}
             (:message/reactions final-value)))

      (is (= c13 (:crdt/clock final-value)))

      (is (= (last (sort (map :message/updated_at deltas)))
             (:message/updated_at final-value))))))

(defn apply-delta [msg delta]
  (crdt/-apply-delta msg delta))

(defn ->value
  "To make the CRDT messages backwards compatible for older clients"
  [msg]
  (-> (crdt/-value msg)
      (assoc :message/flagged_uids [])
      (update :message/reactions (fn [uid->emoji->ts]
                                   (map-vals (fn [emoji->ts]
                                               (filter-vals some? emoji->ts))
                                             uid->emoji->ts)))))
