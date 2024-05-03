(ns gatz.system
  (:gen-class)
  (:require [com.biffweb :as biff]
            [gatz.email :as email]
            [gatz.api :as api]
            [gatz.db.message :as db.message]
            [gatz.db.user :as db.user]
            [gatz.schema :as schema]
            [gatz.connections :as conns]
            [gatz.notify :as notify]
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
  (:import [org.postgresql Driver]))

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

(def tx-fns (merge biff/tx-fns db.message/tx-fns db.user/tx-fns))

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

(defn tiny-handler [ctx]
  {:status 200
   :headers {"content-type" "text/plain"}
   :body "Loading"})

(def components
  [biff/use-config
   biff/use-secrets
   (fn start-fake-server [{:keys [biff/secret] :as ctx}]
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
   (fn start-conns-state [ctx]
     (use-atom ctx :conns-state conns/init-state))
   (fn start-xtdb [{:keys [biff/secret] :as ctx}]
     (let [jdbc-url (to-jdbc-uri (secret :biff.xtdb.jdbc/jdbcUrl))]
       (assert (some? jdbc-url))
       (-> ctx
           (assoc :biff.xtdb.jdbc/jdbcUrl jdbc-url)
           ;; if biff/secret is present, biff/use-tx tries to pull password out of it, 
           ;; which Heroku doesn't provide
           (dissoc :biff/secret)
           (biff/use-xt)
           (assoc :biff/secret secret))))
   biff/use-queues
   biff/use-tx-listener
   (fn stop-fake-server [ctx]
     (println "stopping fake server")
     (ring.adapter.jetty9/stop-server (:fake-server ctx))
     (dissoc ctx :fake-server ctx))
   (fn start-http-server [{:keys [biff/secret] :as ctx}]
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
