(ns gatz.email
  (:require [camel-snake-kebab.core :as csk]
            [camel-snake-kebab.extras :as cske]
            [clj-http.client :as http]
            [gatz.settings :as settings]
            [clojure.tools.logging :as log]
            [rum.core :as rum]))

(defn signin-link [{:keys [to url user-exists]}]
  {:to to
   :subject "Sign in to Gatz"
   :html-body (rum/render-static-markup
               [:html
                [:body
                 [:p "We received a request to sign in to " settings/app-name
                  " using this email address. Click this link to sign in:"]
                 [:p [:a {:href url :target "_blank"} "Sign in to Gatz"]]
                 [:p "This link will expire in one hour. "
                  "If you did not request this link, you can ignore this email."]]])
   :text-body (format "We received a request to sign in to %s using this email address. Click this link to sign in:\n\n%s\n\nThis link will expire in one hour. If you did not request this link, you can ignore this email."
                      settings/app-name
                      url)
   :message-stream "outbound"})

(defn signin-code [{:keys [to code user-exists]}]
  {:to to
   :subject (if user-exists
              (format "Sign in to %s" settings/app-name)
              (format "Sign up for %s" settings/app-name))
   :html-body (rum/render-static-markup
               [:html
                [:body
                 [:p "We received a request to sign in to " settings/app-name
                  " using this email address. Enter the following code to sign in:"]
                 [:p {:style {:font-size "2rem"}} code]
                 [:p
                  "This code will expire in three minutes. "
                  "If you did not request this code, you can ignore this email."]]])
   :text-body (format "We received a request to sign in to %s using this email address. Enter the following code to sign in:\n\n%s\n\nThis code will expire in three minutes. If you did not request this code, you can ignore this email."
                      settings/app-name
                      code)
   :message-stream "outbound"})

(defn template [k opts]
  ((case k
     :signin-link signin-link
     :signin-code signin-code)
   opts))

(defn send-postmark [{:keys [biff/secret postmark/from]} form-params]
  (let [api-key (secret :postmark/api-key)
        _ (assert api-key "Postmark API key is required")
        transformed-params (merge {:from from} (cske/transform-keys csk/->PascalCase form-params))]
    (let [result (http/post "https://api.postmarkapp.com/email"
                            {:headers {"X-Postmark-Server-Token" api-key}
                             :as :json
                             :content-type :json
                             :form-params transformed-params
                             :throw-exceptions false})
          success (< (:status result) 400)]
      (when-not success
        (log/error (:body result)))
      success)))

(defn send-console [ctx form-params]
  (log/info "Email to console:")
  (log/info (format "TO: %s" (:to form-params)))
  (log/info (format "SUBJECT: %s" (:subject form-params)))
  (log/info "")
  (log/info (:text-body form-params))
  (log/info "")
  (log/info "To send emails instead of printing them to the console, add your API keys for Postmark and Recaptcha to config.edn.")
  true)

(defn send-email [{:keys [biff/secret recaptcha/site-key] :as ctx} opts]
  (let [form-params (if-some [template-key (:template opts)]
                      (template template-key opts)
                      opts)]
    (if (some? (secret :postmark/api-key))
      (do
        (log/info "Using Postmark to send email")
        (send-postmark ctx form-params))
      (do
        (log/info "Using console logging for email")
        (send-console ctx form-params)))))
