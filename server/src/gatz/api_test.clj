(ns gatz.api-test
  (:require [clojure.test :refer [deftest testing is]]
            [clojure.java.io :as io]
            [gatz.api :refer :all]
            [gatz.auth :as auth]
            [gatz.db.user :as gatz.db.user]
            [clojure.data.json :as json]
            [gatz.system :as system]
            [gatz.db.util-test :as db.util-test]))

(defn parse-resp [resp]
  (json/read-str (:body resp) {:key-fn keyword}))

(deftest flatten-tx-ops-test
  (testing "we can flatten tx ops so that we process the final operations"
    (let [{:gatz.api-test/keys [delete-fn-tx add-reaction-fn-tx]}
          (read-string (slurp (io/resource "test/expanded_fn_txn.edn")))]
      (let [flat-tx-ops (flatten-tx-ops add-reaction-fn-tx)]
        (is (= 1 (count (:xtdb.api/tx-ops add-reaction-fn-tx))))
        (is (= 3 (count flat-tx-ops)))
        (is (= [:xtdb.api/fn :xtdb.api/put :xtdb.api/put]
               (map first flat-tx-ops)))
        (is (= [nil :message.crdt/add-reaction nil]
               (mapv (comp :message.crdt/action :evt/data last) flat-tx-ops)))
        (is (= [nil :gatz/evt :gatz/message] (mapv (comp :db/type last) flat-tx-ops))))
      (let [flat-tx-ops (flatten-tx-ops delete-fn-tx)]
        (is (= 1 (count (:xtdb.api/tx-ops delete-fn-tx))))
        (is (= 3 (count flat-tx-ops)))
        (is (= [nil :gatz/evt :gatz/message]
               (mapv (comp :db/type last) flat-tx-ops)))
        (is (= [nil :message.crdt/delete nil]
               (mapv (comp :message.crdt/action :evt/data last) flat-tx-ops)))
        (is (= [:xtdb.api/fn :xtdb.api/put :xtdb.api/put]
               (map first flat-tx-ops)))))))

(deftest api-routes-authentication-test
  (testing "API endpoints are properly protected by authentication middleware"
    (let [ctx (db.util-test/test-system)
          db (:biff/db ctx)
          handler system/handler
          ;; All API routes protected by auth middleware
          api-routes [;; User related routes
                      "/api/me"
                      "/api/user"
                      "/api/user/push-token"
                      "/api/user/disable-push"
                      "/api/user/avatar"
                      "/api/user/settings/notifications"
                      "/api/user/settings/location"
                      "/api/user/delete"
                      "/api/user/block"
                      "/api/user/settings/urls"
                      "/api/user/settings/profile"
                      "/api/user/location"
                      "/api/me/crdt"

                      ;; Media and file routes
                      "/api/file/presign"
                      "/api/media"
                      "/api/link-preview"

                      ;; Message routes
                      "/api/message"
                      "/api/message/delete"
                      "/api/message/flag"
                      "/api/message/edit"
                      "/api/message/react"
                      "/api/message/undo-react"

                      ;; Feed routes
                      "/api/feed/posts"
                      "/api/feed/active"
                      "/api/feed/items"
                      "/api/feed/dismiss"
                      "/api/feed/mark-seen"

                      ;; Search route
                      "/api/search"

                      ;; Contact routes
                      "/api/contact"
                      "/api/contacts"
                      "/api/contact/request"
                      "/api/contact/share-link"
                      "/api/contact/hide"
                      "/api/contact/unhide"

                      ;; Group routes
                      "/api/group"
                      "/api/groups"
                      "/api/group/avatar"
                      "/api/group/request"
                      "/api/group/share-link"

                      ;; Invite link routes
                      "/api/invite-link/screen"
                      "/api/invite-link"
                      "/api/invite-link/join"
                      "/api/invite-link/crew-share-link"
                      "/api/invite-link/code"

                      ;; Discussion routes
                      "/api/discussions"
                      "/api/discussion"
                      "/api/discussion/mark-many-seen"
                      "/api/discussion/mark-seen"
                      "/api/discussion/mark-message-seen"
                      "/api/discussion/archive"
                      "/api/discussion/unarchive"
                      "/api/discussion/subscribe"
                      "/api/discussion/unsubscribe"]]

      ;; Test that routes without authentication return 401
      (doseq [route api-routes]
        (let [;; Use the appropriate HTTP method for each route
              method (cond
                       ;; Routes that accept GET
                       (#{"/api/me" "/api/user" "/api/feed/posts" "/api/feed/active" "/api/feed/items"
                          "/api/search" "/api/contact" "/api/contacts" "/api/group" "/api/groups"
                          "/api/invite-link/screen" "/api/invite-link" "/api/invite-link/code"
                          "/api/discussion" "/api/discussions"} route)
                       :get

                       ;; Routes that can accept both GET and POST (test with GET)
                       (#{"/api/me/crdt"} route)
                       :get

                       ;; All other routes use POST
                       :else
                       :post)
              request {:uri route
                       :request-method method
                       :headers {"content-type" "application/json"}
                       :biff/db db}
              response (handler request)]
          (testing (str "Route " route " requires authentication")
            (is (= 401 (:status response)))
            (is (= "missing_token" (:error (parse-resp response))))
            (is (= "Missing token" (:message (parse-resp response)))))))

      ;; Test the auth middleware directly to ensure it works with valid authentication
      (testing "Auth middleware allows authenticated requests to pass through"
        ;; Define a simple test handler that always returns success
        (let [test-handler (fn [req] {:status 200, :body "success"})
              auth-middleware (auth/wrap-api-auth test-handler)
              user-id "user123"]

          ;; Test an unauthenticated request
          (let [no-auth-req {:headers {}}
                no-auth-resp (auth-middleware no-auth-req)]
            (is (= 401 (:status no-auth-resp))
                "Unauthenticated request should be rejected"))

          ;; Using with-redefs to mock the auth functions
          (with-redefs [;; Mock the token verification to return a valid user-id
                        auth/verify-auth-token (fn [& _] {:auth/user-id user-id})

            ;; Mock the user lookup to return a valid user
                        gatz.db.user/by-id (fn [& _] {:xt/id user-id})]
            ;; Test a request with auth token
            (let [auth-req {:headers {"authorization" "mock-token"}
                            :biff/db {}}
                  auth-resp (auth-middleware auth-req)]

              ;; The request should pass through the middleware
              (is (= 200 (:status auth-resp))
                  "Authenticated request should pass through middleware")
              (is (= "success" (:body auth-resp))
                  "The handler should process the authenticated request"))))))))

