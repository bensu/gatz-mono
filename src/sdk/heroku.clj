(ns sdk.heroku)

(defn dyno-name
  [{:keys [biff/secret] :as _ctx}]
  (secret :heroku/dyno-name))