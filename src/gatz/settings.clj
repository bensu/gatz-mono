(ns gatz.settings)

(def app-name "gatz")

;; This should be in-sync with the frontend
(def min-app-version "1.1.12")

(def ios-app-store-url "https://apps.apple.com/us/app/gatz-chat/id6476069960")
(def android-play-store-url "https://play.google.com/apps/internaltest/4701234533605084026")

(def manifest
  {:app {:min_version min-app-version
         :upgrade_message nil ;; Put a string here if you want to override the upgrade message
         :blocked_version nil ;; XXX: this will brick the app if the version is older than this value
         :install_links {:ios ios-app-store-url
                         :android android-play-store-url}}})
