(ns gatz.system
  (:require [com.biffweb :as biff]
            [gatz.email :as email]
            [gatz.api :as api]
            [gatz.subscriptions :as sub]
            [gatz.schema :as schema]
            [gatz.connections :as conns]
            [clojure.test :as test]
            [clojure.tools.logging :as log]
            [clojure.tools.namespace.repl :as tn-repl]
            [ring.middleware.cors :refer [wrap-cors]]
            [malli.core :as malc]
            [malli.registry :as malr]
            [nrepl.cmdline :as nrepl-cmd]
            [xtdb.jdbc.psql])
  (:import [java.time Duration]))

(def plugins
  [api/plugin
   (biff/authentication-plugin {})
   #_home/plugin
   sub/plugin
   schema/plugin])

(def routes [["" {:middleware [biff/wrap-site-defaults]}
              (keep :routes plugins)]
             ["" {:middleware [biff/wrap-api-defaults
                               #(wrap-cors %
                                           :access-control-allow-origin [#"http://localhost:8081"]
                                           :access-control-allow-methods [:get :put :post :delete])]}
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

(def initial-system
  {:biff/plugins #'plugins
   :biff/send-email #'email/send-email
   :biff/handler #'handler
   :biff/malli-opts #'malli-opts
   :biff.beholder/on-save #'on-save
   :biff.xtdb/tx-fns biff/tx-fns
   ;; TODO: you need to also merge the state into the components
  ;; ::conns-state (atom conns/init-state)
   })

(defonce system (atom {}))

(defn use-atom [k initial-state ctx]
  {:pre [(keyword? k)]}
  (println "use atom setup")
  (let [a (atom initial-state)]
    (-> ctx
        (assoc k a)
        (update :biff/stop conj #(reset! a initial-state)))))

(defn jdbc-spec []
  {:jdbcUrl "..."
                                              ;; OR
   :host "..."
   :dbname "..."
   :user "..."
   :password "..."}
  (let [db-spec (biff/secret :db/spec)]
    (if (string? db-spec)
      (edn/read-string db-spec)
      db-spec)))

(def components
  [biff/use-config
   biff/use-secrets
   (partial use-atom :conns-state conns/init-state)
   biff/use-tx
;;   #(biff/use-xt
;;     %
;;     {:xtdb/document-store {:xtdb/module 'xtdb.jdbc/->document-store
;;                            :connection-pool {:dialect {:xtdb/module 'xtdb.jdbc.psql/->dialect}
;;                                              ;; :pool-opts {...}
;;                                              :db-spec (jdbc-spec)}}
;;      :xtdb/tx-log {:xtdb/module 'xtdb.jdbc/->tx-log
;;                    :connection-pool {:dialect {:xtdb/module 'xtdb.jdbc.psql/->dialect}
;;                                     ;; :pool-opts {...}
;;                                      :db-spec (jdbc-spec)}
;;                    :poll-sleep-duration (Duration/ofSeconds 1)}})
   biff/use-queues
   biff/use-tx-listener
   biff/use-jetty
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
