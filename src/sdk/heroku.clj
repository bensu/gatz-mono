(ns sdk.heroku)

(defn dyno-name
  [{:keys [biff/secret] :as _ctx}]
  (secret :heroku/dyno-name))

(defn use-heroku-config [ctx]
  (let [dyno (dyno-name ctx)]
    (println "dyno" dyno)
    (assert (string? dyno))
    (-> ctx (assoc :heroku/dyno-name dyno))))

(defn singleton? [ctx]
  (let [dyno (dyno-name ctx)]
    (assert (string? dyno))
    (= dyno "web.1")))
