(ns gatz.system
  (:gen-class)
  (:require [com.biffweb :as biff]
            [gatz.email :as email]
            [gatz.api :as api]
            [gatz.db.discussion :as db.discussion]
            [gatz.db.message :as db.message]
            [gatz.db.user :as db.user]
            [gatz.schema :as schema]
            [gatz.connections :as conns]
            [gatz.notify :as notify]
            [clojure.java.io :as io]
            [clojure.string :as str]
            [clojure.test :as test]
            [clojure.tools.logging :as log]
            [clojure.tools.namespace.repl :as tn-repl]
            [ring.middleware.cors :refer [wrap-cors]]
            [ring.middleware.gzip :refer [wrap-gzip]]
            [malli.core :as malc]
            [malli.registry :as malr]
            [malli.transform :as mt]
            [nrepl.cmdline :as nrepl-cmd]
            [ring.adapter.jetty9]
            [to-jdbc-uri.core :refer [to-jdbc-uri]]
            [xtdb.jdbc.psql])
  (:import [java.time Duration]
           [org.postgresql Driver]))

(def plugins
  [api/plugin
   (biff/authentication-plugin {})
   #_home/plugin
   notify/plugin
   schema/plugin])

(def routes [["" {:middleware [biff/wrap-site-defaults]}
              (keep :routes plugins)]
             ["" {:middleware [biff/wrap-api-defaults
                               ;; TODO: be more restrictive
                               #(wrap-cors %
                                           :access-control-allow-origin [#".*"]
                                           :access-control-allow-methods [:get :put :post :delete])
                               wrap-gzip]}
              (keep :api-routes plugins)]])

(def handler (-> (biff/reitit-handler {:routes routes})
                 biff/wrap-base-defaults))

(def static-pages (apply biff/safe-merge (map :static plugins)))

(defn generate-assets! [ctx]
  (biff/export-rum static-pages "target/resources/public")
  (biff/delete-old-files {:dir "target/resources/public"
                          :exts [".html"]}))

(defn on-save [ctx]
  (biff/add-libs)
  (biff/eval-files! ctx)
  (generate-assets! ctx)
  (test/run-all-tests #"gatz.test.*"))

(def malli-opts
  {:registry (malr/composite-registry
              malc/default-registry
              (apply biff/safe-merge
                     (keep :schema plugins)))})

(def tx-fns
  (merge biff/tx-fns db.message/tx-fns db.user/tx-fns db.discussion/tx-fns))

(def initial-system
  {:biff/plugins #'plugins
   :biff/send-email #'email/send-email
   :biff/handler #'handler
   :biff/malli-opts #'malli-opts
   :biff.beholder/on-save #'on-save
   :biff.xtdb/tx-fns tx-fns})

(defonce system (atom {}))

(defn use-atom [ctx k initial-state]
  {:pre [(keyword? k)]}
  (let [a (atom initial-state)]
    (-> ctx
        (assoc k a)
        (update :biff/stop conj #(reset! a initial-state)))))

;; ====================================================================== 
;; Fake server

;; I think it can trick Heroku into thinking the app is up and running
;; but I am not sure

(defn tiny-handler [ctx]
  {:status 200
   :headers {"content-type" "text/plain"}
   :body "Loading"})

(defn start-fake-server [{:keys [biff/secret] :as ctx}]
     ;; This is here so that heroku is happy with the startup time
  (let [port (or (Integer/parseInt (System/getenv "PORT"))
                 (mt/-string->long (secret :biff/port)))
        _ (println "binding fake server to " port)
        server (ring.adapter.jetty9/run-jetty
                tiny-handler
                {:host "localhost"
                 :port port
                 :join? false
                 :allow-null-path-info true})]
    (println "server" server)
    (assoc ctx :fake-server server)))

(defn stop-fake-server [ctx]
  (println "stopping fake server")
  (ring.adapter.jetty9/stop-server (:fake-server ctx))
  (dissoc ctx :fake-server ctx))

;; ======================================================================  
;; XTDB

(comment
  (defn parse-jdbc-uri [uri-s]
    {:pre [(string? uri-s)]}
    (let [uri (java.net.URI. uri-s)
          user-info (.getUserInfo uri)
          [user password] (str/split user-info #":")]
      {:host (.getHost uri)
       :db (str/replace-first (.getPath uri) "/" "")
       :port (.getPort uri)
       :user user
       :password password})))

;; https://v1-docs.xtdb.com/administration/checkpointing/
;; https://v1-docs.xtdb.com/storage/aws-s3/
(defn s3-checkpont-store
  "Used in production. 

   To use in local development edit :biff.xtdb/checkpointer in config.edn"
  [{:keys [biff/secret] :as _ctx}]
  (let [bucket (secret :biff.xtdb.checkpointer/bucket)]
    (assert (string? bucket))
    (println "checkpointing from S3" bucket)
    {:xtdb/module 'xtdb.checkpoint/->checkpointer
     :approx-frequency (Duration/ofHours 6)
     :retention-policy {:retain-at-least 5 :retain-newer-than (Duration/ofDays 7)}
     :store {:xtdb/module 'xtdb.s3.checkpoint/->cp-store :bucket bucket}}))

;; https://v1-docs.xtdb.com/administration/checkpointing/
(defn file-checkpoint-store
  "Used for local development"
  [_ctx]
  {:xtdb/module 'xtdb.checkpoint/->checkpointer
   :approx-frequency (Duration/ofHours 6)
   :retention-policy {:retain-newer-than (Duration/ofDays 7) :retain-at-least 5}
   :store {:xtdb/module 'xtdb.checkpoint/->filesystem-checkpoint-store
           :path "storage/xtdb/checkpoints"}})

(defn index-store [ctx]
  (let [node-id (or (System/getenv "NODE_ID") "local")]
    (println (:biff.xtdb/checkpointer ctx))
    {:kv-store {:xtdb/module 'xtdb.rocksdb/->kv-store
                :db-dir (io/file (format "storage/%s/xtdb/index" node-id))
                :checkpointer (case (:biff.xtdb/checkpointer ctx)
                                :biff.xtdb.checkpointer/s3 (s3-checkpont-store ctx)
                                :biff.xtdb.checkpointer/file (file-checkpoint-store ctx))}}))

(defn xtdb-system [{:keys [biff/secret] :as ctx}]
  (let [jdbc-url (to-jdbc-uri (secret :biff.xtdb.jdbc/jdbcUrl))]
    {:xtdb/index-store (index-store ctx)
     :xtdb/tx-log {:xtdb/module 'xtdb.jdbc/->tx-log
                   :connection-pool :xtdb.jdbc/connection-pool}
     :xtdb/document-store {:xtdb/module 'xtdb.jdbc/->document-store
                           :connection-pool :xtdb.jdbc/connection-pool}
     :xtdb.jdbc/connection-pool {:dialect {:xtdb/module 'xtdb.jdbc.psql/->dialect}
                                 :pool-opts {:maximumPoolSize 5}
                                 :db-spec {:jdbcUrl jdbc-url}}}))


;; ====================================================================== 
;; Overall system

(def components
  [biff/use-config
   biff/use-secrets
   (fn start-conns-state [ctx]
     (use-atom ctx :conns-state conns/init-state))
   (fn start-xtdb [ctx]
     (-> ctx
         (assoc :biff.xtdb/opts (xtdb-system ctx))
         (biff/use-xt)))
   biff/use-queues
   biff/use-tx-listener
   (fn start-http-server [{:keys [biff/secret] :as ctx}]
     (let [port (or (some-> (System/getenv "PORT") Integer/parseInt)
                    (some-> (secret :biff/port) mt/-string->long)
                    8080)]
       (assert (some? port))
       (println "Binding HTTP to port:" port)
       (biff/use-jetty (assoc ctx :biff/port port :biff/host "0.0.0.0"))))
   biff/use-chime
   biff/use-beholder])

(defn start []
  (let [new-system (reduce (fn [system component]
                             (log/info "starting:" (str component))
                             (component system))
                           initial-system
                           components)]
    (reset! system new-system)
    (generate-assets! new-system)
    (log/info "Go to" (:biff/base-url new-system))))

(defn -main [& args]
  (start)
  (apply nrepl-cmd/-main args))

(defn refresh []
  (doseq [f (:biff/stop @system)]
    (log/info "stopping:" (str f))
    (f))
  (tn-repl/refresh :after `start))

(comment
  ;; Evaluate this if you make a change to initial-system, components, :tasks,
  ;; :queues, or config.edn. If you update secrets.env, you'll need to restart
  ;; the app.
  (refresh)

  ;; If that messes up your editor's REPL integration, you may need to use this
  ;; instead:
  (biff/fix-print (refresh))) 
