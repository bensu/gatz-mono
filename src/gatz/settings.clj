(ns gatz.settings)

(def app-name "gatz")

;; This should be in-sync with the frontend
(def min-app-version "1.0.0")

(def manifest
  {:app {:min_version min-app-version
         :upgrade_message nil ;; Put a string here if you want to override the upgrade message
         :blocked_version nil ;; XXX: this will brick the app if the version is older than this value
         :install_links {:ios "https://testflight.apple.com/join/K5OnqYuP"
                         :android "https://play.google.com/apps/internaltest/4701234533605084026"}}})
