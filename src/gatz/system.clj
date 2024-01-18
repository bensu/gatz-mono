(ns gatz.system
  (:gen-class)
  (:require [com.biffweb :as biff]
            [gatz.email :as email]
            [gatz.api :as api]
            [gatz.schema :as schema]
            [gatz.connections :as conns]
            [clojure.string :as str]
            [clojure.test :as test]
            [clojure.tools.logging :as log]
            [clojure.tools.namespace.repl :as tn-repl]
            [ring.middleware.cors :refer [wrap-cors]]
            [malli.core :as malc]
            [malli.registry :as malr]
            [malli.transform :as mt]
            [nrepl.cmdline :as nrepl-cmd]
            [xtdb.jdbc.psql])
  (:import [org.postgresql Driver]))

(def plugins
  [api/plugin
   (biff/authentication-plugin {})
   #_home/plugin
   schema/plugin])

(def routes [["" {:middleware [biff/wrap-site-defaults]}
              (keep :routes plugins)]
             ["" {:middleware [biff/wrap-api-defaults
                               ;; TODO: be more restrictive
                               #(wrap-cors %
                                           :access-control-allow-origin [#".*"]
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
   :biff.xtdb/tx-fns biff/tx-fns})

(defonce system (atom {}))

(defn use-atom [ctx k initial-state]
  {:pre [(keyword? k)]}
  (println "use atom setup")
  (let [a (atom initial-state)]
    (-> ctx
        (assoc k a)
        (update :biff/stop conj #(reset! a initial-state)))))

(def components
  [biff/use-config
   biff/use-secrets
   #(use-atom % :conns-state conns/init-state)
   (fn [{:keys [biff/secret] :as ctx}]
     (let [jdbc-url (-> (str "jdbc:" (secret :biff.xtdb.jdbc/jdbcUrl))
                        (str/replace "postgres://" "postgresql://"))]
       (assert (some? jdbc-url))
       (biff/use-xt (assoc ctx :biff.xtdb.jdbc/jdbcUrl jdbc-url))))
   biff/use-queues
   biff/use-tx-listener
   (fn [{:keys [biff/secret] :as ctx}]
     (println (secret :biff/port))
     (let [port (or (Integer/parseInt (System/getenv "PORT"))
                    (mt/-string->long (secret :biff/port)))]
       (assert (some? port))
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
  #_(apply nrepl-cmd/-main args))

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
