(ns gatz.db.migrations
  (:require [clojure.set :as set]
            [clojure.string :as str]
            [clojure.pprint :as pp]
            [crdt.core :as crdt]
            [gatz.db :refer :all]
            [gatz.db.contacts :as db.contacts]
            [gatz.db.discussion :as db.discussion]
            [gatz.db.group :as db.group]
            [gatz.db.message :as db.message]
            [gatz.db.invite-link :as db.invite-link]
            [gatz.db.user :as db.user]
            [gatz.crdt.discussion :as crdt.discussion]
            [gatz.crdt.user :as crdt.user]
            [gatz.schema :as schema]
            [malli.core :as malli]
            [com.biffweb :as biff :refer [q]]
            [xtdb.api :as xtdb])
  (:import [java.util Date]))

(def good-users
  {"sbensu"  "+12222222222"
   "bensu" "+10000000000"
   "sebas" "+14159499932"
   "devon" "+16509067099"
   "test" "+11111111111"})

(defn get-env [k]
  {:post [(string? %)]}
  (System/getenv k))

(defn get-node []
  (biff/use-xt {:biff.xtdb/topology :standalone
                :biff.xtdb.jdbc/jdbcUrl (get-env "DATABASE_URL")}))

(defn get-all-users [db]
  (q db
     '{:find (pull u [*])
       :where [[u :db/type :gatz/user]]}))

(defn delete-bad-users! [ctx]
  (let [node (:biff.xtdb/node ctx)
        db (xtdb/db node)
        all-users (get-all-users db)
        txns (->> all-users
                  (remove (fn [user]
                            (contains? good-users (:user/name user))))
                  (map :xt/id)
                  (mapv (fn [uid]
                          [::xtdb/delete uid])))]
    (xtdb/submit-tx node txns)))

(defn add-phone-number-to-good-users!
  [{:keys [biff.xtdb/node] :as ctx}]
  (let [db (xtdb/db node)
        txns (for [[username phone] good-users]
               (some-> (db.user/by-name db username)
                       (assoc :db/doc-type :gatz/user)
                       (assoc :user/phone_number phone)))]
    (biff/submit-tx ctx (vec (remove nil? txns)))))

(defn add-first-and-last-message-to-discussions!
  [{:keys [biff.xtdb/node] :as ctx}]
  (let [db (xtdb/db node)
        txns (for [d (get-all-discussions db)]
               (when (or (nil? (:discussion/first_message d))
                         (nil? (:discussion/latest_message d)))
                 (let [messages (db.message/by-did db (:discussion/did d))]
                   (when-not (empty? messages)
                     (let [first-message (or (:discussion/first_message d)
                                             (:xt/id (first messages)))
                           last-message (or (:discussion/latest_message d)
                                            (:xt/id (last messages)))]
                       (assert (and first-message last-message))
                       (-> d
                           (assoc :discussion/first_message first-message
                                  :discussion/latest_message last-message)
                           (crdt.discussion/update-discussion)))))))]
    (biff/submit-tx ctx (vec (remove nil? txns)))))

(defn lower-case-usernames!
  [{:keys [biff.xtdb/node] :as ctx}]
  (let [db (xtdb/db node)
        txns (for [u (get-all-users db)]
               (let [username (:user/name u)]
                 (when (not= username (str/lower-case username))
                   (-> u
                       (assoc :db/doc-type :gatz/user)
                       (assoc :user/name (str/lower-case username))))))]
    (biff/submit-tx ctx (vec (remove nil? txns)))))

(defn get-users-without-push-notifications [db]
  (let [users (get-all-users db)]
    (->> users
         (remove :user/push_tokens)
         (map :user/name)
         set)))

(def admin-usernames #{"sebas"})
(def test-usernames #{"test" "test2" "test3" "test4" "bensu" "sbensu"})

(defn add-admin-and-test-to-all-users!
  [{:keys [biff.xtdb/node] :as ctx}]
  (let [db (xtdb/db node)
        txns (for [u (get-all-users db)]
               (let [username (:user/name u)]
                 (cond
                   (contains? admin-usernames username)
                   (-> u
                       (assoc :user/is_admin true)
                       (crdt.user/update-user))

                   (contains? test-usernames username)
                   (-> u
                       (assoc :user/is_test true)
                       (crdt.user/update-user))

                   :else (crdt.user/update-user u))))]
    #_(vec (remove nil? txns))
    (biff/submit-tx ctx (vec (remove nil? txns)))))

(defn username-img [username]
  {:pre [(string? username)]}
  (format "https://gatzapi.com/avatars/%s.jpg" username))

;; images are now hosted in cloudflare
(def picture-in-cloudflare
  #{"sebas"
    "devon"
    "tara"
    "jack"
    "grantslatton"
    "bensu"
    "martin"
    "willyintheworld"
    "tbensu"
    "lconstable"
    "ameesh"
    "ankit"
    "viktor"
    "zack"
    "max"
    "biglu"})

(defn add-user-images!
  [{:keys [biff.xtdb/node] :as ctx}]
  (let [db (xtdb/db node)
        users (db.user/all-users db)
        txns (for [u users]
               (let [username (:user/name u)]
                 (when (contains? picture-in-cloudflare username)
                   (let [img (username-img username)]
                     (-> u
                         (assoc :user/avatar img)
                         (crdt.user/update-user)
                         (dissoc :user/image))))))]
    (biff/submit-tx ctx (vec (remove nil? txns)))))

(defn add-last-message-read!
  "Adds the last message read to all discussions"
  [{:keys [biff.xtdb/node] :as ctx}]
  (let [db (xtdb/db node)
        txns (for [d (get-all-discussions db)]
               (let [last-update (or (:discussion/updated_at d)
                                     (:discussion/created_at d))
                     members (:discussion/members d)]
                 (when-let [last-message (or (:discussion/latest_message d)
                                             (:discussion/first_message d))]
                   (let [all-read (into {} (for [m members]
                                             [m last-message]))]
                     (-> d
                         (assoc :discussion/last_message_read all-read)
                         (crdt.discussion/update-discussion last-update))))))]
    #_(vec (remove nil? txns))
    (biff/submit-tx ctx (vec (remove nil? txns)))))

(defn get-all-messages [db]
  (q db
     '{:find (pull m [*])
       :where [[m :db/type :gatz/message]]}))

(defn messages-with-n-or-more-reactions
  "Finds messages that were reacted to n or more time"
  [db n]
  (vec
   (filter (fn [d]
             (let [reactions (:message/reactions d)]
               (<= n (db.message/count-reactions reactions))))
           (get-all-messages db))))

(defn add-notification-settings-to-users!
  [{:keys [biff.xtdb/node] :as ctx}]
  (let [db (xtdb/db node)
        all-users (get-all-users db)
        now (java.util.Date.)
        txns (for [u all-users]
               (when (nil? (get-in u [:user/settings :settings/notifications]))
                 (let [token (get-in u [:user/push_tokens :push/expo :push/token])
                       new-nts (if (nil? token)
                                 crdt.user/notifications-off
                                 crdt.user/notifications-on)]
                   (-> u
                       (update :user/settings merge {:settings/notifications new-nts})
                       (crdt.user/update-user now)))))]
    (vec (remove nil? txns))))

(defn get-discussions-without-last-message [db]
  (q db
     '{:find (pull d [*])
       :where [[d :db/type :gatz/discussion]
               [d :discussion/latest_message nil]]}))

;; TODO: can't query messages
(defn d-latest-message [db did]
  {:pre [(uuid? did)]}
  (->> (q db '{:find [(pull m [:message/created_at :xt/id]) created-at]
               :in [did]
               :where [[m :message/did did]
                       [m :db/type :gatz/message]
                       [m :message/created_at created-at]]
               :order-by [[created-at :desc]]
               :limit 1}
          did)
       (remove :message/deleted_at)
       ffirst))

(defn add-latest-message!
  [{:keys [biff.xtdb/node] :as ctx}]
  (let [db (xtdb/db node)
        ds (get-discussions-without-last-message db)
        now (java.util.Date.)
        txns (for [d ds]
               (when-let [latest-message (d-latest-message db (:xt/id d))]
                 (let [latest-activity-ts (:message/created_at latest-message)]
                   (-> d
                       (assoc :discussion/latest_message (:xt/id latest-message))
                       (assoc :discussion/latest_activity_ts latest-activity-ts)
                       (crdt.discussion/update-discussion now)))))]
    (biff/submit-tx ctx (vec (remove nil? txns)))))

(defn add-latest-activity-ts!
  [{:keys [biff.xtdb/node] :as ctx}]
  (let [db (xtdb/db node)
        all-discussions (get-all-discussions-with-latest-message db)
        now (java.util.Date.)
        txns (for [[d latest-message] all-discussions]
               (let [latest-activity-ts (:message/created_at latest-message)]
                 (-> d
                     (assoc :discussion/latest_activity_ts latest-activity-ts)
                     (crdt.discussion/update-discussion now))))]
    (biff/submit-tx ctx (vec (remove nil? txns)))))

(defn fix-first-and-last-message! [{:keys [biff.xtdb/node] :as ctx}]
  (let [db (xtdb/db node)
        all-discussions (get-all-discussions db)
        now (java.util.Date.)
        txns (for [d all-discussions]
               (let [messages (db.message/by-did db (:discussion/did d))
                     first-message (first messages)
                     last-message (last messages)]
                 (-> d
                     (assoc :discussion/first_message (:xt/id first-message)
                            :discussion/latest_message (:xt/id last-message))
                     (crdt.discussion/update-discussion now))))
        txns (vec (remove nil? txns))]
    (biff/submit-tx ctx txns)))

(defn rename-user! [{:keys [biff.xtdb/node] :as ctx} old-name new-name]
  (let [db (xtdb/db node)
        user (db.user/by-name db old-name)
        now (java.util.Date.)
        new-user (-> user
                     (assoc :user/name new-name)
                     (crdt.user/update-user now))]
    (biff/submit-tx ctx [new-user])))

(defn all-messages [db]
  (q db '{:find (pull m [*])
          :where [[m :db/type :gatz/message]]}))

(defn messages-v0->v1! [{:keys [biff.xtdb/node] :as ctx}]
  (let [bad-txn-ids (agent #{})
        db (xtdb/db node)]
    (doseq [msgs (partition-all 50 (all-messages db))]
      (let [txn (->> msgs
                     (remove :db/version)
                     (map (fn [msg]
                            (-> msg
                                (db.message/v0->v1)
                                (assoc :db/version 1)))))
            {:keys [good bad]} (group-by (fn [txn]
                                           (if (malli.core/validate gatz.schema/MessageCRDT txn)
                                             :good
                                             :bad))
                                         txn)]
        (println "transaction for " (count good) " messages")
        (println "ignoring bad " (count bad))
        (when-not (empty? bad)
          (doseq [b bad]
            (clojure.pprint/pprint (:errors (malli.core/explain gatz.schema/MessageCRDT b)))))
        (send bad-txn-ids clojure.set/union (set (map :xt/id bad)))
        (biff/submit-tx ctx (vec good))))
    @bad-txn-ids))

(comment

  ;; 2024-05-01
  ;; Cleanup of messages that had old data

  (def -ctx @gatz.system/system)

  (messages-v0->v1! -ctx)
  (biff/submit-tx -ctx [{:db/op :delete :xt/id #uuid "08446f46-8238-41aa-943e-627fa3dadecc"}
                        {:db/op :delete :xt/id #uuid "e166c6ca-d96b-4a83-8307-5df2ac761f18"}
                        {:db/op :delete :xt/id  #uuid "ffc636e6-4811-48c1-81e0-d08c91af4b9d"}])
  (clojure.pprint/pprint
   (xtdb.api/entity (xtdb.api/db (:biff.xtdb/node -ctx)) #uuid "e166c6ca-d96b-4a83-8307-5df2ac761f18")
   (xtdb.api/entity (xtdb.api/db (:biff.xtdb/node -ctx)) #uuid "e166c6ca-d96b-4a83-8307-5df2ac761f18")))

(defn users-v0->v1! [{:keys [biff.xtdb/node] :as ctx}]
  (let [bad-txn-ids (agent #{})
        db (xtdb/db node)]
    (doseq [users (partition-all 50 (db.user/all-users db))]
      (let [txn (->> users
                     (remove :db/version)
                     (map (fn [user]
                            (-> user
                                (db.user/v0->v1)
                                (assoc :db/doc-type :gatz.crdt/user)
                                (assoc :db/version 1)))))
            {:keys [good bad]}
            (group-by (fn [txn]
                        (if (malli.core/validate gatz.schema/UserCRDT txn)
                          :good
                          :bad))
                      txn)]
        (println "transaction for " (count good) " users")
        (println "ignoring bad " (count bad) " users")
        (when-not (empty? bad)
          (doseq [b bad]
            (clojure.pprint/pprint (:errors (malli.core/explain gatz.schema/UserCRDT b)))))
        (send bad-txn-ids clojure.set/union (set (map :xt/id bad)))
        (biff/submit-tx ctx (vec good))))
    @bad-txn-ids))

(comment
  (def -ctx @gatz.system/system)

  (users-v0->v1! -ctx))

(defn discussions-v0->v1! [{:keys [biff.xtdb/node] :as ctx}]
  (let [bad-txn-ids (agent #{})
        db (xtdb/db node)]
    (doseq [ds (partition-all 50 (get-all-discussions db))]
      (let [txn (->> ds
                     (keep (fn [d]
                             (when-not (= 1 (:db/version d))
                               (-> d
                                   db.discussion/v0->v1
                                   db.discussion/crdt->doc
                                   (assoc :db/doc-type :gatz.doc/discussion
                                          :db/version 1))))))
            {:keys [good bad]}
            (group-by (fn [txn]
                        (if (malli.core/validate gatz.schema/DiscussionDoc txn)
                          :good
                          :bad))
                      txn)]
        (println "transaction for " (count good) " ds")
        (println "ignoring bad " (count bad) " ds")
        (when-not (empty? bad)
          (doseq [b bad]
            (clojure.pprint/pprint (:errors (malli.core/explain gatz.schema/DiscussionDoc b)))))
        (send bad-txn-ids clojure.set/union (set (map :xt/id bad)))
        (biff/submit-tx ctx (vec good))))
    @bad-txn-ids))

(comment
  (def -ctx @gatz.system/system)

  (discussions-v0->v1! -ctx))

(def intl-users
  {"adaobi" "+447715935538"
   "tbensu" "+5491137560441"
   "bolu" "+2349164824038"
   "viktor" "+46733843396"
   "jacks" "+5491166472830"
   "martin" "+4915905562097"
   "greggocabral" "+5491138067266"
   "brob" "+61492496889"
   "danielcompton" "+6421552546"
   "fynyky" "+6591001234"})

(defn migrate-phone-numbers!
  [{:keys [biff.xtdb/node] :as ctx}]
  (let [db (xtdb/db node)
        tx (keep (fn [[username intl-phone]]
                   (let [u (db.user/by-name db username)]
                     (assert u)
                     (when-not (= intl-phone (:user/phone_number u))
                       (merge gatz.crdt.user/user-defaults
                              (-> u
                                  (assoc :user/phone_number intl-phone)
                                  (assoc :db/doc-type :gatz.crdt/user))))))
                 intl-users)]
    (biff/submit-tx ctx (vec tx))))

(defn add-active-members! [{:keys [biff.xtdb/node] :as ctx}]
  (let [bad-txn-ids (agent #{})
        db (xtdb/db node)]
    (doseq [dids (partition-all 50 (db.discussion/all-ids db))]
      (let [txn (mapv (fn [did]
                        (let [d (db.discussion/by-id db did)
                              ms (db.message/by-did db did)
                              active-members (set (map :message/user_id ms))]
                          (-> d
                              (assoc :discussion/active_members (crdt/gos active-members))
                              (db.discussion/crdt->doc)
                              (assoc :db/doc-type :gatz.doc/discussion))))
                      dids)
            {:keys [good bad]}
            (group-by (fn [txn]
                        (if (malli.core/validate gatz.schema/DiscussionDoc txn)
                          :good
                          :bad))
                      txn)]
        (println "transaction for " (count good) " ds")
        (println "ignoring bad " (count bad) " ds")
        (when-not (empty? bad)
          (doseq [b bad]
            (clojure.pprint/pprint (:errors (malli.core/explain gatz.schema/DiscussionDoc b)))))
        (send bad-txn-ids clojure.set/union (set (map :xt/id bad)))
        (biff/submit-tx ctx (vec good))))
    @bad-txn-ids))

(comment
  (def -ctx @gatz.system/system)

  (add-active-members! -ctx))

(defn add-empty-contacts! [{:keys [biff.xtdb/node] :as ctx}]
  (let [db (xtdb/db node)
        now (Date.)
        uids (db.user/all-ids db)
        txns (vec (keep
                   (fn [uid]
                     (let [contacts (db.contacts/by-uid db uid)]
                       (when (nil? contacts)
                         (-> (db.user/new-contacts-txn {:uid uid :now now})
                             (dissoc :db/op)))))
                   uids))]
    (biff/submit-tx ctx txns)))

(defn make-everybody-contacts!
  [{:keys [biff.xtdb/node] :as ctx}]
  (let [db (xtdb/db node)
        now (Date.)
        uids (db.user/all-ids db)
        uid-pairs (->> (for [aid uids
                             bid uids
                             :when (not= aid bid)]
                         #{aid bid})
                       (set)
                       (mapv vec))
        txns (mapcat (fn [[a b]]
                       (db.contacts/forced-contact-txn db a b {:now now}))
                     uid-pairs)]
    (biff/submit-tx ctx (vec txns))))

(defn add-fake-contact-requests! [{:keys [biff.xtdb/node] :as ctx}]
  (let [db (xtdb/db node)
        now (Date.)
        uids (db.user/all-ids db)
        uid-pairs (->> (for [aid uids
                             bid uids
                             :when (not= aid bid)]
                         #{aid bid})
                       (set)
                       (mapv vec))
        txns (mapcat (fn [[a b]]
                       (when (nil? (db.contacts/current-request-between db a b))
                         (let [from a
                               to b
                               req-args {:id (random-uuid) :from from :to to :now now}
                               transition-args {:from from
                                                :to to
                                                :by to
                                                :now (Date.)
                                                :state :contact_request/accepted}]
                           [[:xtdb.api/fn :gatz.db.contacts/new-request {:args req-args}]
                            [:xtdb.api/fn :gatz.db.contacts/transition-to {:args transition-args}]])))
                     uid-pairs)]
    (biff/submit-tx ctx (vec txns))))

(defn add-user-activity-docs! [{:keys [biff.xtdb/node] :as ctx}]
  (let [db (xtdb/db node)
        uids (db.user/all-ids db)
        txns (mapv (fn [uid]
                     (when-not (db.user/activity-by-uid db uid)
                       (let [{:keys [user/last_active]} (db.user/by-id db uid)]
                         (db.user/new-activity-doc {:uid uid
                                                    :now (crdt/-value last_active)}))))
                   uids)]
    (biff/submit-tx ctx (vec txns))))

(defn all-invite-links [db]
  (q db '{:find (pull id [*])
          :where [[id :db/type :gatz/invite_link]]}))

(defn invite-links-multiple! [{:keys [biff.xtdb/node] :as ctx}]
  (let [db (xtdb/db node)
        ils (all-invite-links db)
        txns (mapv (fn [{:keys [used_at used_by] :as il}]
                     (-> (merge db.invite-link/default-fields il)
                         (assoc :db/doc-type :gatz/invite_link)
                         (assoc :invite_link/used_at (if used_at
                                                       (if (map? used_at)
                                                         used_at
                                                         {used_by used_at})
                                                       {}))
                         (assoc :invite_link/used_by (if used_by
                                                       (if (set? used_by)
                                                         used_by
                                                         #{used_by})
                                                       #{}))))
                   ils)]
    (biff/submit-tx ctx txns)))

(comment

;; Make joeryu friends with everybody
  (def -ctx @gatz.system/system)
  (def -db (xtdb.api/db (:biff.xtdb/node -ctx)))

  (def -joe-id #uuid "1e794e7a-08c0-4c79-9b51-78e458b40460")
  (def -luke-id  #uuid "6faf925c-33a6-421d-b57e-9a25fac4e0a0")

  (def -txn
    (gatz.api.invite-link/make-friends-with-my-contacts-txn -db -luke-id -joe-id (Date.)))
  (biff/submit-tx -ctx -txn)

  (gatz.db.user/by-name -db "lconstable")
  (gatz.db.user/by-name -db "joeryu")

  (gatz.db.contacts/by-uid -db -joe-id)

  (def -node (:biff.xtdb/node -ctx))

  (gatz.db.contacts/invite-contact-txn -node {:args {:by-uid -luke-id :to-uid -joe-id :now (Date.)}})

  ;; Add joeryu to all discussions
  )

(comment

  ;; remove usernames from people's contacts

  (def -test-usernames
    #{"test" "test2" "test3" "test4" "bensu" "sbensu"
      "test1231" "test235"})

  (def -ctx @gatz.system/system)

  (isolate-test-users! -ctx -test-usernames))

(defn isolate-test-users! [ctx usernames]
  {:pre [(every? string? usernames) (set? usernames)]}
  (let [now (Date.)
        node (:biff.xtdb/node ctx)
        db (xtdb.api/db node)
        txns (->> usernames
                  (keep (partial db.user/by-name db))
                  (mapcat (fn [u]
                            (let [uid (:xt/id u)]
                              (db.contacts/remove-all-user-contacts-txn node uid now))))
                  vec)]
    (biff/submit-tx ctx txns)))

(comment

  ;; Test first with -prod-test-group-id
  ;; And if that works well, then do it to -fc-group-id

  (def -fc-group-id #crdt/ulid "01J47H8AAW0QRSPKNQ9BHWAEAB")

  (def -prod-test-group-id  #crdt/ulid "01J4JHT8T75BCMKX1QFYQ987K8")

  (def -crew-group-ids #{-fc-group-id})

  (def -ctx @gatz.system/system)

  (mark-group-crew! -ctx -crew-group-ids))

(defn mark-group-crew! [ctx group-ids]
  {:pre [(every? crdt/ulid? group-ids) (set? group-ids)]}

  (let [db (xtdb.api/db (:biff.xtdb/node ctx))
        txns (keep (fn [gid]
                     (some-> (db.group/by-id db gid)
                             (db.group/mark-crew)
                             (assoc :db/doc-type :gatz/group)))
                   group-ids)]
    (biff/submit-tx ctx (vec txns))))

;; I want some poeple to see the full gammit of what is
;; happening in Gatz to see if they like it
;; including what others have posted
;;
(comment

  (def -fc-usernames
    #{"yasmin" "ivan" "woloski"})

  ;; add to open groups

  (def -ctx @gatz.system/system)

  (def -node (:biff.xtdb/node -ctx))

  (def -db (xtdb.api/db -node))

  (def -me (db.user/by-name -db "sebas"))

  (def -yasmin (db.user/by-name -db "yasmin"))
  (def -adaobi (db.user/by-name -db "adaobi"))
  (def -adaobi-posts
    (db.discussion/posts-for-user -db (:xt/id -adaobi)
                                  {:contact_id (:xt/id -adaobi)}))


  (def -groups (db.groups/by-member-uid -db (:xt/id -me)))

  (def -fc-group
    (first -groups))

  (def -fc-posts
    (db.discussion/posts-for-group -db (:xt/id -fc-group)
                                   (:xt/id -me)))


  (db.discussion/open-for-group -db (:xt/id -fc-group))

  (def -txns
    (let [members (->> -fc-usernames
                       (keep (partial db.user/by-name -db))
                       (map :xt/id)
                       set)

          _ (assert (= (count -fc-usernames)
                       (count members)))
          txns
          (db.discussion/add-member-to-group-txn -node
                                                 {:gid (:xt/id -fc-group)
                                                  :now (Date.)
                                                  :by-uid (:xt/id -me)
                                                  :members members})]

      (biff/submit-tx -ctx txns))))

(comment

  (def -new-usernames
    #{"dwarkesh", "davidrobertson", "sholto",
      "nan", "moxie"}))


#_(defn make-contacts-with-my-friends!
    [{:keys [biff.xtdb/node] :as ctx}
     my-username
     usernames]
    (let [db (xtdb/db node)
          now (Date.)
          my-id (:xt/id (db.user/by-name db my-username))
          _ (assert my-id)
          target-uids (->> usernames
                           (keep (partial db.user/by-name db))
                           (map :xt/id))
          _ (assert (= (count usernames)
                       (count target-uids)))
          my-contacts (:contacts/ids (db.contacts/by-uid db my-id))
          _ (assert (set? my-contacts))
          uid-pairs (->> (for [aid target-uids
                               bid my-contacts
                               :when (not= aid bid)]
                           #{aid bid})
                         (set)
                         (mapv vec))
          txns (mapcat (fn [[a b]]
                         (db.contacts/forced-contact-txn db a b {:now now}))
                       uid-pairs)]
    ;; txns
      (biff/submit-tx ctx (vec txns))))

(comment

  (def -ctx @gatz.system/system)

  (def -node (:biff.xtdb/node -ctx))

  (def -db (xtdb.api/db -node))

  (def -sgrove (db.user/by-name -db "sgrove"))

  (def -arram (db.user/by-name -db "arram"))

  (let [args {:from (:xt/id -sgrove)
              :to (:xt/id -arram)
              :now (Date.)}]
    (biff/submit-tx -ctx [[:xtdb.api/fn :gatz.db.contacts/remove-contacts {:args args}]])))

(comment


  (def -did #uuid "5648acdd-e8ed-4bd6-83cb-469ddfeee572")

  (def -ctx @gatz.system/system)

  (def -node (:biff.xtdb/node -ctx))

  (def -db (xtdb.api/db -node))

  (def -sgrove (db.user/by-name -db "sgrove"))

  (def -arram (db.user/by-name -db "arram"))

  (db.discussion/remove-members!
   (assoc -ctx :auth/user-id (:xt/id -sgrove) :auth/user -sgrove)
   -did
   #{(:xt/id -arram)}))
