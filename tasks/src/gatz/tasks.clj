(ns gatz.tasks
  (:require [clojure.tools.build.api :as b]
            [clojure.string :as str]
            [clojure.java.io :as io]
            #_[com.biffweb.tasks]
            #_[babashka.tasks :refer [shell clojure]]
            #_[babashka.fs :as fs]))

(def lib 'gaz/api)
(def version (format "0.0.%s" (b/git-count-revs nil)))
(def class-dir "target/classes")
(def uber-file (format "target/%s-%s-standalone.jar" "gatz" "0.0.1"))

;; delay to defer side effects (artifact downloads)
(def basis (delay (b/create-basis {:project "deps.edn"})))

(defn clean [_]
  (b/delete {:path "target"}))

(defn uber [_]
;; TODO: this needs to make sure that the assets are built
  (clean nil)
  (b/copy-dir {:target-dir class-dir
               :src-dirs ["src" "resources"]})
  (b/compile-clj {:basis @basis
                  :ns-compile '[gatz.system]
                  :class-dir class-dir})
  (b/uber {:class-dir class-dir
           :uber-file uber-file
           :basis @basis
           :main 'gatz.system}))