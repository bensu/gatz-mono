(defproject chat.gatz/web "0.0.1"
  :min-lein-version "2.0.0"
  :source-paths ["src" "tasks/src" "test"]
  :resource-paths ["resources"]
  :target-path "target/%s/"
  :main gatz.system
  :uberjar-name "gatz-web-standalone.jar"
  :plugins [[lein-tools-deps "0.4.5"]]
  :middleware [lein-tools-deps.plugin/resolve-dependencies-with-deps-edn]
  :profiles {:uberjar {:aot [gatz.system]}}
  :lein-tools-deps/config {:config-files [:install :user :project]}
;;   :repositories [["public-github" {:url "git://github.com"}]]
;;   :git-down {com.biffweb/biff {:property "value"}}
;;  :dependencies [[com.biffweb/biff "v0.7.4"]
;;                 [com.xtdb/xtdb-jdbc "1.24.3"]
;;                 [camel-snake-kebab/camel-snake-kebab "0.4.3"]
;;                 [dev.weavejester/medley "1.7.0"]
;;                 [remus/remus "0.2.2"]
;;                 [ring-cors/ring-cors "0.1.13"]
;;                 [org.jsoup/jsoup "1.11.3"]
;;                 [org.clojure/clojure "1.11.1"]
;;                 [org.slf4j/slf4j-simple "2.0.0-alpha5"]]
  )
