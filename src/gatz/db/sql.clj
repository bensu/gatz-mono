(ns gatz.db.sql
  (:require [juxt.clojars-mirrors.nippy.v3v1v1.taoensso.nippy :as juxt-nippy]
            [clojure.pprint :as pprint :refer [pprint]]
            [juxt.clojars-mirrors.nextjdbc.v1v2v674.next.jdbc :as jdbc]
            [xtdb.jdbc.psql]
            [crdt.core :as crdt])
  (:import [org.postgresql Driver]))

;; Import the postgresql driver
;;        org.postgresql/postgresql {:mvn/version "42.2.18"}


(defn get-conn []
  (Class/forName "org.postgresql.Driver")
  (jdbc/get-connection "jdbc:postgresql://localhost:5432/gatz_prod_broken"))

;; We have a DB table

;; Table "public.tx_events"
;;     Column    |           Type           | Collation | Nullable |                     Default
;; --------------+--------------------------+-----------+----------+-------------------------------------------------
;;  event_offset | bigint                   |           | not null | nextval('tx_events_event_offset_seq'::regclass)
;;  event_key    | character varying        |           |          |
;;  tx_time      | timestamp with time zone |           |          | CURRENT_TIMESTAMP
;;  topic        | character varying        |           | not null |
;;  v            | bytea                    |           | not null |
;;  compacted    | integer                  |           | not null |
;; Indexes:
;;     "tx_events_pkey" PRIMARY KEY, btree (event_offset)
;;     "tx_events_event_key_idx_2" btree (event_key)

;; We want to get every row in the table from event_offset=T upwards

(defn get-rows-from-offset [jdbc-conn offset]
  (jdbc/execute! jdbc-conn
                 ["SELECT * FROM tx_events WHERE event_offset >= ? order by event_offset" offset]))

;; each of the rows has a v field, which is a byte array.
;; which we want to deserialize using nippy

(defn byte-array-to-map [byte-array]
  (juxt-nippy/thaw byte-array))

(defn row->txn [row]
  (-> row
      (update :tx_events/v (fn [ba]
                             (some-> ba byte-array-to-map)))))

;; each of those values has either:
;; a collection of operations that looks like this

(def example-tx-event
  #:tx_events{:event_offset 824883, :event_key nil,
              :tx_time #inst "2025-03-26T18:29:22.679951000-00:00",
              :topic "txs",
              :v {:xtdb.tx.event/tx-events
                  [[:crux.tx/match #xtdb/id "0d765b9ca8a104f6324e1bc333dcfa4714efe217" #xtdb/id "0000000000000000000000000000000000000000"]
                   [:crux.tx/put #xtdb/id "0d765b9ca8a104f6324e1bc333dcfa4714efe217" #xtdb/id "3e7ca2ac0cc12125f3440af054830a16d6878ad3"]
                   [:crux.tx/fn #xtdb/id "f44341fad212b86ed1c69e803a6e8ed3b760a026" #xtdb/id "2a8afcc31da1c219c1b680010971da36f34b1de4"]], :xtdb.api/submit-tx-opts {}},
              :compacted 0})

(def example-txn
  {:xtdb.tx.event/tx-events [[:crux.tx/match #xtdb/id "d67c6bafa6a9d476f0e75e12dfe3e436eaea88d8" #xtdb/id "0000000000000000000000000000000000000000"]
                             [:crux.tx/put #xtdb/id "d67c6bafa6a9d476f0e75e12dfe3e436eaea88d8" #xtdb/id "bf0f1bc52a9505811b6e116366a77ca250a92042"]
                             [:crux.tx/fn #xtdb/id "f44341fad212b86ed1c69e803a6e8ed3b760a026" #xtdb/id "0e291c3da398337b63115c5d34634d8ca4467109"]],
   :xtdb.api/submit-tx-opts {}})


;; or a single document that was written to the db 
;; the documents have an event_key field which is the id of the document


(def -example-document
  {:invite_link/group_id nil,
   :invite_link/code "ICJTFV",
   :db/type :gatz/invite_link,
   :invite_link/created_by #uuid "e87e478e-c200-4427-816c-d862737a1d11",
   :invite_link/used_by #{},
   :invite_link/created_at #inst "2025-03-26T18:30:04.051-00:00",
   :invite_link/contact_id nil,
   :invite_link/expires_at #inst "2025-06-24T18:30:04.051-00:00",
   :invite_link/used_at {},
   :crux.db/id (crdt/random-ulid)
   :db/version 1,
   :invite_link/type :invite_link/crew})

;; for each transaction, that is not a document, we want to look at the ids
;; in the operations and find the document with the same event_key

(defn by-id [jdbc-conn id]
  (some->
   (jdbc/execute! jdbc-conn
                  ["SELECT * FROM tx_events WHERE event_key = ?" (.toString id)])
   (first)
   (row->txn)))

(def -tx-event
  [:crux.tx/match #xtdb/id "d67c6bafa6a9d476f0e75e12dfe3e436eaea88d8" #xtdb/id "0000000000000000000000000000000000000000"])

(defn hydrate-tx-event [jdbc-conn tx-event]
  (let [[op  & ids] tx-event]
    [op (map (fn [id]
               (by-id jdbc-conn id))
             ids)]))

(defn hydrate-txn [jdbc-conn txn]
  (update txn
          :tx_events/v
          (fn [v]
            (println v)
            (if (contains? v :xtdb.tx.event/tx-events)
              (update v :xtdb.tx.event/tx-events (fn [tx-events]
                                                   (mapv (partial hydrate-tx-event jdbc-conn) tx-events)))
              v))))

;; we are looking for operations that put a document in the db

(defn put-op? [[op & _]]
  (= op :crux.tx/put))

(comment
  (def -put-ops
    (->> -txns
         (map (fn [{:tx_events/keys [event_offset v]}]
                {:offset event_offset
                 :puts (->> (:xtdb.tx.event/tx-events v)
                            (filter put-op?)
                            (map (partial hydrate-tx-event -conn))
                            vec)}))
         (filter (fn [{:keys [puts]}]
                   (not-empty puts)))))

  1)

(comment

  (require '[juxt.clojars-mirrors.nippy.v3v1v1.taoensso.nippy :as juxt-nippy])


;; First, convert the hex string to a byte array
  (defn hex-string-to-bytes [hex-str]
    (let [cleaned-str (clojure.string/replace hex-str #"\\x" "")]
      (->> (partition 2 cleaned-str)
           (map #(apply str %))
           (map #(Integer/parseInt % 16))
           (map unchecked-byte)
           byte-array)))


  (def hex-data "4e50590070026a17787464622e74782e6576656e742f74782d6576656e747372726a0d637275782e74782f6d6174636852a7ba00d67c6bafa6a9d476f0e75e12dfe3e436eaea88d852a7ba000000000000000000000000000000000000000000726a0b637275782e74782f70757452a7ba00d67c6bafa6a9d476f0e75e12dfe3e436eaea88d852a7ba00bf0f1bc52a9505811b6e116366a77ca250a92042726a0a637275782e74782f666e52a7ba00f44341fad212b86ed1c69e803a6e8ed3b760a02652a7ba000e291c3da398337b63115c5d34634d8ca44671096a17787464622e6170692f7375626d69742d74782d6f70747313")

  (def -second-evt "4e505900700c6a14696e766974655f6c696e6b2f67726f75705f6964036a10696e766974655f6c696e6b2f636f6465690649434a5446566a0764622f747970656a106761747a2f696e766974655f6c696e6b6a16696e766974655f6c696e6b2f637265617465645f62795be87e478ec2004427816cd862737a1d116a13696e766974655f6c696e6b2f757365645f6279126a16696e766974655f6c696e6b2f637265617465645f61745a00000195d3b7f8136a16696e766974655f6c696e6b2f636f6e746163745f6964036a16696e766974655f6c696e6b2f657870697265735f61745a00000197a33450136a13696e766974655f6c696e6b2f757365645f6174136a0a637275782e64622f69644b1b636f6d2e6769746875622e6634623661332e756c69642e556c6964074caced00057372001b636f6d2e6769746875622e6634623661332e756c6964246ed49f4c32a84b0200024a00036c73624a00036d7362787075b90a7d1e215f1d0195d3b7f8119af66a0a64622f76657273696f6e64016a10696e766974655f6c696e6b2f747970656a10696e766974655f6c696e6b2f63726577")

  (def -third-evt "4e50590070026a0f637275782e64622e666e2f61726773260170016a10696e766974655f6c696e6b2f636f6465690649434a5446566a0a637275782e64622f69645bf65221bb5a6f4cf7be3c128d4439044d")

;; Convert to byte array and thaw
  (def thawed-data (juxt-nippy/thaw (hex-string-to-bytes hex-data)))

;; Print the result
  (println thawed-data))


(comment
  (clojure.pprint/pprint thawed-data-2)

  ;; This event might be the bad one, which is 824882

  ;; I wasn't able to deserialize it?

  (def -second-evt "4e505900700c6a14696e766974655f6c696e6b2f67726f75705f6964036a10696e766974655f6c696e6b2f636f6465690649434a5446566a0764622f747970656a106761747a2f696e766974655f6c696e6b6a16696e766974655f6c696e6b2f637265617465645f62795be87e478ec2004427816cd862737a1d116a13696e766974655f6c696e6b2f757365645f6279126a16696e766974655f6c696e6b2f637265617465645f61745a00000195d3b7f8136a16696e766974655f6c696e6b2f636f6e746163745f6964036a16696e766974655f6c696e6b2f657870697265735f61745a00000197a33450136a13696e766974655f6c696e6b2f757365645f6174136a0a637275782e64622f69644b1b636f6d2e6769746875622e6634623661332e756c69642e556c6964074caced00057372001b636f6d2e6769746875622e6634623661332e756c69642e556c6964246ed49f4c32a84b0200024a00036c73624a00036d7362787075b90a7d1e215f1d0195d3b7f8119af66a0a64622f76657273696f6e64016a10696e766974655f6c696e6b2f747970656a10696e766974655f6c696e6b2f63726577")

  {:invite_link/group_id nil,
   :invite_link/code "ICJTFV",
   :db/type :gatz/invite_link,
   :invite_link/created_by #uuid "e87e478e-c200-4427-816c-d862737a1d11",
   :invite_link/used_by #{},
   :invite_link/created_at #inst "2025-03-26T18:30:04.051-00:00",
   :invite_link/contact_id nil,
   :invite_link/expires_at #inst "2025-06-24T18:30:04.051-00:00",
   :invite_link/used_at {},
   :crux.db/id
   #:nippy{:unthawable
           {:type :serializable,
            :cause :quarantined,
            :class-name "com.github.f4b6a3.ulid.Ulid",
            :content
            [-84, -19, 0, 5, 115, 114, 0, 27, 99, 111, 109, 46, 103, 105,
             116, 104, 117, 98, 46, 102, 52, 98, 54, 97, 51, 46, 117,
             108, 105, 100, 46, 85, 108, 105, 100, 36, 110, -44, -97, 76,
             50, -88, 75, 2, 0, 2, 74, 0, 3, 108, 115, 98, 74, 0, 3, 109,
             115, 98, 120, 112, 117, -71, 10, 125, 30, 33, 95, 29, 1,
             -107, -45, -73, -8, 17, -102, -10]}},
   :db/version 1,
   :invite_link/type :invite_link/crew})
