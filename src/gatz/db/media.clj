(ns gatz.db.media
  (:require [com.biffweb :as biff :refer [q]]
            [xtdb.api :as xtdb]))

(def media-kinds
  #{;;  :media/aud 
    :media/img
                  ;;  :media/vid
    })

(def default-media
  {:media/size nil :media/height nil :media/width nil})

(defn update-media [media]
  (assoc (merge default-media media)
         :db/type :gatz/media
         :db/doc-type :gatz/media))

(defn create-media!
  [{:keys [auth/user-id] :as ctx}
   {:keys [id kind url size width height] :as _params}]

  {:pre [(uuid? user-id)
         (uuid? id)
         (contains? media-kinds kind)
         (string? url)
          ;; (string? mime) (number? size)
         ]}

  (let [now (java.util.Date.)
        media-id (or id (random-uuid))
        media {:xt/id media-id
               :media/user_id user-id
               :media/message_id nil
               :media/kind kind
               :media/url url
               :media/width width
               :media/height height
               :media/size size
               ;; :media/mime mime
               :media/created_at now}]
    (biff/submit-tx ctx [(update-media media)])
    media))

(defn by-id [db id]
  {:pre [(uuid? id)]}
  (xtdb/entity db id))

