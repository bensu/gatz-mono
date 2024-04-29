(ns gatz.api.message
  (:require [clojure.data.json :as json]
            [gatz.db.discussion :as db.discussion]
            [gatz.db.message :as db.message]
            [gatz.crdt.message :as crdt.message]
            [gatz.notify :as notify]
            [malli.transform :as mt]))

;; ============================================================================
;; Endpoints

(defn json-response [body]
  {:status 200
   :headers {"Content-Type" "application/json"}
   :body (json/write-str body)})

(defn edit-message! [{:keys [params] :as ctx}]
  (let [{:keys [text id discussion_id]} params
        did (some-> discussion_id mt/-string->uuid)
        mid (some-> id mt/-string->uuid)
        {:keys [message]}
        (db.message/edit-message! ctx {:did did :mid mid :text text})]
    (json-response {:message (crdt.message/->value message)})))

(defn react-to-message! [{:keys [params biff/db] :as ctx}]
  (let [{:keys [reaction mid did]} params
        did (mt/-string->uuid did)
        d (db.discussion/by-id db did)
        mid (or (some-> mid mt/-string->uuid)
                (:discussion/first_message d))]
    (assert (string? reaction) "reaction must be a string")
    (let [{:keys [message]}
          (db.message/react-to-message! ctx {:did did :mid mid :reaction reaction})]
      (json-response {:message (crdt.message/->value message)}))))

(defn undo-react-to-message! [{:keys [params] :as ctx}]
  (let [{:keys [reaction mid did]} params
        did (mt/-string->uuid did)
        mid (some-> mid mt/-string->uuid)]
    (assert (string? reaction) "reaction must be a string")
    (let [{:keys [message]}
          (db.message/undo-react! ctx {:did did :mid mid :reaction reaction})]
      (json-response {:message (crdt.message/->value message)}))))

(defn delete-message! [{:keys [params biff/db] :as ctx}]
  (let [message (some->> (:id params)
                         mt/-string->uuid
                         (db.message/by-id db)
                         crdt.message/->value)]
    (db.message/delete-message! ctx (:message/did message) (:xt/id message))
    (json-response {:status "success"})))

;; ============================================================================
;; Events

(defmulti handle-message-evt! (fn [_ctx _d _m evt]
                                (get-in evt [:evt/data :message.crdt/action])))

(defmethod handle-message-evt! :default [_ _ _ _] nil)

(defmethod handle-message-evt! :message.crdt/add-reaction
  [ctx _d m evt]
  (let [delta (get-in evt [:evt/data :message.crdt/delta])
        did (:evt/did evt)
        mid (:evt/mid evt)
        reactions (db.message/flatten-reactions did mid (:message/reactions delta))]
    (doseq [reaction reactions]
      (try
        (notify/notify-on-reaction! ctx m reaction)
        (catch Exception e
          (println "notificaitons failed" e))))))

